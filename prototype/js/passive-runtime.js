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

    // 発動: cutin → effects 順次実行
    if (def.cutinSkillName && _effectHandlers?.showCutin) {
      _effectHandlers.showCutin(hero, def.cutinSkillName);
    }
    for (const effect of def.effects || []) {
      applyPassiveEffect(s, hero, effect);
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
  for (const effect of def.effects || []) {
    applyPassiveEffect(s, hero, effect);
  }
  markTriggered(hero, def);
}
