/**
 * My Crypto Heroes 公式ヘルプに沿った戦闘計算のプロト実装。
 * 参照: ダメージとカット率、パラメータ、クリティカル、シールド
 * - https://www.mycryptoheroes.net/ja/help-posts/11ek6KSt0fq0x5gdUeKlie
 * - https://www.mycryptoheroes.net/ja/help-posts/7iMLBLL1sMJ9Rlk2Fv2Zmj
 * - https://www.mycryptoheroes.net/ja/help-posts/3HfmOjuWDSyw1isnhnLSfv
 * - https://www.mycryptoheroes.net/ja/help-posts/2mNToh5xAynqPi6V23S9xc
 *
 * ターン制プロト: チャージ廃止。AGI はクリティカル率のみに反映。
 */

/** PHY 攻撃に対するターゲットのカット率（%）= min(40, floor(PHY/2)) */
export function cutRateFromPhy(phy) {
  return Math.min(40, Math.floor(phy / 2));
}

/** INT 攻撃に対するターゲットのカット率（%）= min(40, floor(INT/2)) */
export function cutRateFromInt(intVal) {
  return Math.min(40, Math.floor(intVal / 2));
}

export function randomSkillRatePct(minPct, maxPct) {
  const lo = Math.min(minPct, maxPct);
  const hi = Math.max(minPct, maxPct);
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

/**
 * PHY/INT 依存ダメージ（カット率適用後、整数切り捨て）
 * Damage = floor(attackerStat * skillPct/100 * (100 - cutRate) / 100)
 */
export function phyIntDamageAfterCut(attackerStat, skillPct, cutRatePct) {
  const raw = (attackerStat * skillPct) / 100;
  return Math.max(0, Math.floor((raw * (100 - cutRatePct)) / 100));
}

/**
 * クリティカル追加分（MCH: バフデバフ無視の戦闘開始時基礎値で算出しカット率考慮）
 */
export function criticalBonusDamage(
  baseAttackerStat,
  skillPct,
  baseDefenderStatForCut,
  damageKind
) {
  const cut =
    damageKind === "phy"
      ? cutRateFromPhy(baseDefenderStatForCut)
      : cutRateFromInt(baseDefenderStatForCut);
  return phyIntDamageAfterCut(baseAttackerStat, skillPct, cut);
}

/** 回復係数（INT 回復）= (術者 INT + 対象 PHY) / 2 */
export function healingCoefficientIntCaster(casterInt, targetPhy) {
  return (casterInt + targetPhy) / 2;
}

/** PHY 回復係数 = (術者 PHY + 対象 INT) / 2 */
export function healingCoefficientPhyCaster(casterPhy, targetInt) {
  return (casterPhy + targetInt) / 2;
}

/** AGI → クリティカル率（%）プロト規約（上限 45%） */
export function critRateFromAgi(agi) {
  return Math.min(45, Math.max(0, Math.floor(agi / 2)));
}

export function rollCrit(critChancePct) {
  return Math.random() * 100 < critChancePct;
}

/**
 * シールド: PHY/INT 依存ダメージには無効。特殊ダメージのみシールドが先に削れる。
 *
 * SPEC-006 Phase 4f: target に unit (object) を渡すと per-hero shield を消費。
 * 文字列 ("player"/"enemy") の場合は legacy state.playerShield/enemyShield を使う。
 */
export function applyDamageThroughShield(state, target, rawDamage) {
  if (rawDamage <= 0) return 0;
  // 新パス: hero/enemy unit (object)
  if (target && typeof target === "object") {
    const u = target;
    const sh = u.shield || 0;
    if (sh <= 0) return rawDamage;
    if (rawDamage <= sh) {
      u.shield = sh - rawDamage;
      // heroes[0] / enemies[0] なら legacy mirror
      if (state?.heroes?.[0] === u) state.playerShield = u.shield;
      if (state?.enemies?.[0] === u) state.enemyShield = u.shield;
      return 0;
    }
    const overflow = rawDamage - sh;
    u.shield = 0;
    if (state?.heroes?.[0] === u) state.playerShield = 0;
    if (state?.enemies?.[0] === u) state.enemyShield = 0;
    return overflow;
  }
  // legacy パス
  const key = target === "player" ? "playerShield" : "enemyShield";
  let sh = state[key] || 0;
  if (sh <= 0) return rawDamage;
  if (rawDamage <= sh) {
    state[key] = sh - rawDamage;
    return 0;
  }
  const overflow = rawDamage - sh;
  state[key] = 0;
  return overflow;
}
