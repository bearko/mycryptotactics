/**
 * passive-runtime.js — SPEC-006 §18: パッシブ trigger DSL の実行系
 *
 * `prototype/data/passives.js` (codemod 出力) で定義された PassiveDef を
 * 戦闘中の各 hook 点から dispatch する。
 *
 * 同期実行制約 (§18.6.1):
 *   `self.died` trigger は applyHpDeltaToHero 内で同期発動する必要がある。
 */

import { resolveTargets } from "./targeting.js";

// ─── PassiveDef レジストリ ──────────────────────────────────────────
// PASSIVES (passives-generated.js, codemod 出力 210 体) と SAMPLE_PASSIVES
// (passives-sample.js, 手動検証 5 体) を init で順に register する。
// 同 key は後勝ちのため SAMPLE が PASSIVES を上書きする。
//
// PassiveDef shape (TypeScript-like 注釈):
//   {
//     passiveKey: string,           // ヒーロー識別子 (heroes.json の passiveKey と一致)
//     trigger: TriggerKind,         // §18.1 の trigger 種別
//     triggerRate?: number,         // 確率発動 (0.0-1.0)、省略時 1.0
//     oncePerCombat?: boolean,      // 戦闘中 1 回限定 (default: false)
//     threshold?: number,           // hpBelow / statRatioAbove の閾値 (0.0-1.0)
//     effects: PassiveEffect[],     // 発動時の処理列
//     cutinSkillName?: string,      // カットイン表示名 (省略時はカットインなし)
//     notes?: string,               // QA/監査用の備考。runtime は読まない (debug only)。
//                                   //  例: "元 DB の効果が解析不能 → PHY+1 fallback"
//                                   //      "天草四郎 statRatioBelow → combat.started 代替"
//   }
let PASSIVE_REGISTRY = {};

/** PassiveDef を登録 (アプリ起動時に呼ぶ) */
export function registerPassives(defs) {
  if (!defs) return;
  for (const [key, def] of Object.entries(defs)) {
    PASSIVE_REGISTRY[key] = def;
  }
}

export function getRegisteredPassive(passiveKey) {
  return PASSIVE_REGISTRY[passiveKey] || null;
}

/** デバッグ用: 登録済みパッシブ一覧 */
export function _debugListPassives() { return Object.keys(PASSIVE_REGISTRY); }

/** デバッグ用: notes 付き PassiveDef を一覧 (QA で fallback 状況を監査する用) */
export function _debugListPassivesWithNotes() {
  return Object.entries(PASSIVE_REGISTRY)
    .filter(([, def]) => def && typeof def.notes === "string" && def.notes.length > 0)
    .map(([key, def]) => ({ passiveKey: key, notes: def.notes }));
}

// ─── trigger 種別 (§18.1) ──────────────────────────────────────────
// combat.started / self.cardPlayed / self.tookDamage / self.died /
// self.hpBelow / party.hpBelow / enemy.hpBelow / self.statRatioAbove /
// enemy.cardPlayed

// ─── trigger 別バランス倍率 (β1 仕様) ─────────────────────────────
// self.cardPlayed は毎カードごと発動するためそのまま 1x。
// 発動機会の少ない trigger は元 DB 数値だけでは弱すぎるので倍率で底上げ。
// 倍率は damage coef / heal coef / buffStat value / addGuard|addShield /
// applyStatus stacks / drawCards / addEnergy 等の数値フィールドに乗る。
// (revive.coef.hpRatio や閾値系の threshold には適用しない)
export const TRIGGER_BUFF_MULTIPLIER = {
  "combat.started":      3,  // バトル開始時 (1 戦闘 1 回 限定がほとんど)
  "self.tookDamage":     2,  // 被ダメージ後 (確率発動が多い)
  "self.hpBelow":        4,  // HP 低下トリガ
  "party.hpBelow":       4,
  "enemy.hpBelow":       4,
  "self.statRatioAbove": 4,  // ステ比トリガ (パラメータ低下系の代替分類)
  "self.died":           5,  // 死亡時 (1 戦闘 1 回)
  "self.cardPlayed":     1,  // カード使用後 (発動機会多 → そのまま)
  "enemy.cardPlayed":    1,  // 敵カード使用後 (発動機会多)
};

/** effect の数値フィールドを倍率適用 (元 effect は破壊しない) */
function multiplyEffect(effect, mult) {
  if (!effect || mult === 1 || !Number.isFinite(mult)) return effect;
  const out = { ...effect };
  // revive はバランスではなく機構なので倍率適用しない
  if (out.action === "revive") return out;
  if (out.coef && typeof out.coef === "object") {
    const newCoef = {};
    for (const [k, v] of Object.entries(out.coef)) {
      newCoef[k] = (typeof v === "number") ? v * mult : v;
    }
    out.coef = newCoef;
  }
  if (typeof out.value === "number") out.value = out.value * mult;
  if (typeof out.pct === "number") out.pct = out.pct * mult;
  if (typeof out.stacks === "number") out.stacks = Math.max(1, Math.round(out.stacks * mult));
  return out;
}

function multiplierFor(triggerKind) {
  return TRIGGER_BUFF_MULTIPLIER[triggerKind] ?? 1;
}

// ─── trigger ごとのフィルタ ─────────────────────────────────────────

/** trigger と現在の戦闘状態を見て発動可否を判定 */
function shouldFire(s, hero, def, ctx = {}) {
  if (!hero || hero.alive === false || (hero.hp ?? 0) <= 0) {
    // self.died は死亡時の発動なので生存チェックを除外
    if (def.trigger !== "self.died") return false;
  }
  // oncePerCombat
  if (def.oncePerCombat !== false) {
    if (!hero.passiveTriggered) hero.passiveTriggered = {};
    if (hero.passiveTriggered[def.passiveKey]) return false;
  }
  // triggerRate (確率発動)
  const rate = def.triggerRate;
  if (typeof rate === "number" && rate < 1) {
    if (Math.random() >= rate) return false;
  }
  // threshold 系
  if (def.trigger === "self.hpBelow" && def.threshold != null) {
    if ((hero.hp / hero.hpMax) >= def.threshold) return false;
  }
  if (def.trigger === "party.hpBelow" && def.threshold != null) {
    const total = (s.heroes || []).reduce((sum, h) => sum + (h?.hp ?? 0), 0);
    const totalMax = (s.heroes || []).reduce((sum, h) => sum + (h?.hpMax ?? 0), 0);
    if (totalMax === 0 || (total / totalMax) >= def.threshold) return false;
  }
  if (def.trigger === "enemy.hpBelow" && def.threshold != null) {
    const total = (s.enemies || []).reduce((sum, e) => sum + (e?.hp ?? 0), 0);
    const totalMax = (s.enemies || []).reduce((sum, e) => sum + (e?.hpMax ?? 0), 0);
    if (totalMax === 0 || (total / totalMax) >= def.threshold) return false;
  }
  if (def.trigger === "self.statRatioAbove" && def.threshold != null) {
    const cur = (hero.phy || 0) + (hero.int || 0) + (hero.agi || 0);
    const base = (hero.phyBase || 0) + (hero.intBase || 0) + (hero.agiBase || 0);
    if (base === 0 || (cur / base) < def.threshold) return false;
  }
  return true;
}

/** 発動マーク */
function markTriggered(hero, def) {
  if (def.oncePerCombat === false) return;
  if (!hero.passiveTriggered) hero.passiveTriggered = {};
  hero.passiveTriggered[def.passiveKey] = true;
}

// ─── effect 実行 ────────────────────────────────────────────────────
// effects: [{ target, action, ...params }]
// dependent on combat helpers (applyHpDeltaToHero / applyHpDeltaToEnemy / addStatusToHero)
// → exporting registerEffectHandlers で main.js から後で注入

let _effectHandlers = null;

/** main.js が起動時に effect handler を注入する */
export function registerEffectHandlers(handlers) {
  _effectHandlers = handlers;
}

/** 単一 effect を実行 */
export function applyPassiveEffect(s, caster, effect) {
  if (!_effectHandlers) {
    console.warn("[passive-runtime] effect handlers not registered yet");
    return;
  }
  const targets = resolveTargets(effect.target, caster, s);
  if (!targets || targets.length === 0) return;
  const handler = _effectHandlers[effect.action];
  if (typeof handler !== "function") {
    console.warn(`[passive-runtime] unknown action: ${effect.action}`);
    return;
  }
  for (const tgt of targets) {
    try { handler(s, caster, tgt, effect); }
    catch (e) { console.error(`[passive-runtime] action ${effect.action} failed`, e); }
  }
}

// ─── trigger dispatch ───────────────────────────────────────────────

/** 全ヒーロー (oncePerCombat 管理は §18 の hero.passiveTriggered Set) を scan し、
 *  trigger に合致する PassiveDef を 1 回 dispatch する。
 *  ctx は trigger 種別ごとの追加情報 (caster card など) */
export function applyPassiveTrigger(s, kind, ctx = {}) {
  if (!s) return;
  const heroes = s.heroes || [];
  // self.cardPlayed のような hook では ctx.caster (=カード使用者) を優先
  // それ以外は scan (各 hero の passiveKey を見て登録済みなら発動候補)
  for (const hero of heroes) {
    if (!hero) continue;
    const def = getRegisteredPassive(hero.passiveKey);
    if (!def || def.trigger !== kind) continue;
    // self.cardPlayed なら caster と一致するヒーローのみ
    if (kind === "self.cardPlayed" && ctx.caster && hero !== ctx.caster) continue;
    // self.tookDamage なら被弾ヒーローのみ
    if (kind === "self.tookDamage" && ctx.hero && hero !== ctx.hero) continue;
    // self.died なら死亡ヒーローのみ
    if (kind === "self.died" && ctx.hero && hero !== ctx.hero) continue;
    if (!shouldFire(s, hero, def, ctx)) continue;

    // 発動: cutin → effects 順次実行 (trigger 別倍率を適用)
    if (def.cutinSkillName && _effectHandlers?.showCutin) {
      _effectHandlers.showCutin(hero, def.cutinSkillName);
    }
    const mult = multiplierFor(def.trigger);
    for (const effect of def.effects || []) {
      applyPassiveEffect(s, hero, multiplyEffect(effect, mult));
    }
    markTriggered(hero, def);
  }
}

/** applyPassiveTrigger の async 版。
 *  各ヒーローの cutinSkillName を順次 await 表示してから effects を実行する。
 *  combat.started のように複数ヒーローのパッシブが同時発動する場面で、
 *  「前衛 → 中衛 → 後衛」の順にカットインを連続再生したい場合に使う。 */
export async function applyPassiveTriggerAsync(s, kind, ctx = {}) {
  if (!s) return;
  const heroes = s.heroes || [];
  for (const hero of heroes) {
    if (!hero) continue;
    const def = getRegisteredPassive(hero.passiveKey);
    if (!def || def.trigger !== kind) continue;
    if (kind === "self.cardPlayed" && ctx.caster && hero !== ctx.caster) continue;
    if (kind === "self.tookDamage" && ctx.hero && hero !== ctx.hero) continue;
    if (kind === "self.died" && ctx.hero && hero !== ctx.hero) continue;
    if (!shouldFire(s, hero, def, ctx)) continue;

    // 1. カットイン表示 (await: showCutinAsync があれば優先)
    if (def.cutinSkillName) {
      if (typeof _effectHandlers?.showCutinAsync === "function") {
        try { await _effectHandlers.showCutinAsync(hero, def.cutinSkillName); }
        catch (e) { console.error("[passive-runtime] showCutinAsync failed", e); }
      } else if (typeof _effectHandlers?.showCutin === "function") {
        _effectHandlers.showCutin(hero, def.cutinSkillName);
      }
    }
    // 2. effects 順次実行 (trigger 別倍率を適用)
    const mult = multiplierFor(def.trigger);
    for (const effect of def.effects || []) {
      applyPassiveEffect(s, hero, multiplyEffect(effect, mult));
    }
    markTriggered(hero, def);
  }
}

/** HP/statRatio 系の閾値ベース trigger を hero 状態変化のたびにチェック
 *  (applyHpDeltaToHero などから呼ぶ) */
export function checkPassiveThresholds(s, hero) {
  if (!s || !hero) return;
  const def = getRegisteredPassive(hero.passiveKey);
  if (!def) return;
  if (!["self.hpBelow", "party.hpBelow", "enemy.hpBelow", "self.statRatioAbove"].includes(def.trigger)) return;
  if (!shouldFire(s, hero, def)) return;

  if (def.cutinSkillName && _effectHandlers?.showCutin) {
    _effectHandlers.showCutin(hero, def.cutinSkillName);
  }
  const mult = multiplierFor(def.trigger);
  for (const effect of def.effects || []) {
    applyPassiveEffect(s, hero, multiplyEffect(effect, mult));
  }
  markTriggered(hero, def);
}
