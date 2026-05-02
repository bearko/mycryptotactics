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

// ─── 説明文 (passiveDesc) の数値倍率書き換え ──────────────────────
// "戦闘開始時に発動・敵にPHYの40%ダメージ" を mult=3 で書き換えると
// "戦闘開始時に発動・敵にPHYの120%ダメージ" になる。
// trigger 句 (HP%未満 / 確率% / 1回だけ等) は触らず、effects 部のみ
// 正規表現置換。stacks 系は最小 1 で四捨五入。
function rewriteEffectNumbers(body, mult) {
  if (!body || mult === 1) return body;
  const round = (n) => Math.round(n);
  const stack = (n) => Math.max(1, Math.round(n));

  // PHY/INT N% ダメージ — 接頭辞 (敵に / 先頭の敵に / 中衛の敵に等) は match 範囲外。
  // 「敵に」を起点にすると「先頭の敵に...」も同じ regex が拾うので、別 regex で
  // ダブルマッチさせない (旧版でこのバグあり、self.tookDamage の zhang が 80% 化していた)
  body = body.replace(
    /(敵に(?:PHY|INT)(?:の)?)(\d+)(?:[~〜](\d+))?(%(?:追加)?ダメージ)/g,
    (_full, p1, lo, hi, p4) => hi
      ? `${p1}${round(+lo * mult)}〜${round(+hi * mult)}${p4}`
      : `${p1}${round(+lo * mult)}${p4}`,
  );
  // 自身のPHY/INT/AGI を Nアップ
  body = body.replace(
    /(自身の(?:PHY|INT|AGI)を)(\d+)(アップ)/g,
    (_, p1, n, p3) => `${p1}${round(+n * mult)}${p3}`,
  );
  // 自身のPHY/INT/AGI+N
  body = body.replace(
    /(自身の(?:PHY|INT|AGI))\+(\d+)/g,
    (_, p1, n) => `${p1}+${round(+n * mult)}`,
  );
  // 短縮形: " INT +3" / "PHY +5" (自身の prefix 抜け、e.g. doyle "INT +3")
  body = body.replace(
    /(^|[\s・／])(PHY|INT|AGI)\s*\+\s*(\d+)/g,
    (_, sep, stat, n) => `${sep}${stat} +${round(+n * mult)}`,
  );
  // 自身のXを最大YのN%アップ
  body = body.replace(
    /(自身の(?:PHY|INT|AGI)を最大(?:PHY|INT|AGI)の)(\d+)(%アップ)/g,
    (_, p1, n, p3) => `${p1}${round(+n * mult)}${p3}`,
  );
  // PHYとINTを互いの値のN%アップ
  body = body.replace(
    /(PHYとINTを互いの値の)(\d+)(%アップ)/g,
    (_, p1, n, p3) => `${p1}${round(+n * mult)}${p3}`,
  );
  // 敵のXをN%ダウン
  body = body.replace(
    /(敵の(?:PHY|INT|AGI)を)(\d+)(%ダウン)/g,
    (_, p1, n, p3) => `${p1}${round(+n * mult)}${p3}`,
  );
  // 敵のX-N
  body = body.replace(
    /(敵の(?:PHY|INT|AGI))-(\d+)/g,
    (_, p1, n) => `${p1}-${round(+n * mult)}`,
  );
  // 敵に毒/出血 ×N 付与 (× は ASCII x も許容)
  body = body.replace(
    /(敵に(?:毒|出血)[×x])(\d+)(付与)/g,
    (_, p1, n, p3) => `${p1}${stack(+n * mult)}${p3}`,
  );
  // ガード/シールド +N
  body = body.replace(
    /((?:ガード|シールド))\+(\d+)/g,
    (_, p1, n) => `${p1}+${round(+n * mult)}`,
  );
  // HPを最大HPのN%回復
  body = body.replace(
    /(HPを最大HPの)(\d+)(%回復)/g,
    (_, p1, n, p3) => `${p1}${round(+n * mult)}${p3}`,
  );
  // HPを回復係数のN(〜N)%回復
  body = body.replace(
    /(HPを回復係数の)(\d+)(?:[~〜](\d+))?(%回復)/g,
    (_, p1, lo, hi, p4) => hi
      ? `${p1}${round(+lo * mult)}〜${round(+hi * mult)}${p4}`
      : `${p1}${round(+lo * mult)}${p4}`,
  );
  return body;
}

/** 説明文 (passiveDesc) の効果数値を trigger 倍率で書き換える。
 *  passiveKey 未登録 / 倍率 1 の場合は元 desc をそのまま返す。 */
export function multiplyPassiveDescription(passiveKey, desc) {
  if (!desc) return desc;
  const def = getRegisteredPassive(passiveKey);
  if (!def) return desc;
  const mult = multiplierFor(def.trigger);
  if (mult === 1) return desc;
  // 「<trigger 句>に発動・<body>」を分離して body のみ書き換え
  const m = desc.match(/^(.+?に発動・)(.+)$/);
  if (m) return m[1] + rewriteEffectNumbers(m[2], mult);
  // 「に発動・」が無い場合は全体を body と見なす
  return rewriteEffectNumbers(desc, mult);
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
    // self.cardPlayed: caster (= カード使用者、card.caster ロールから resolve) と
    // 一致するヒーローのみ。前衛死亡時は foremost caster が中衛に shift するので、
    // その場合は中衛の passive が発動する。
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
