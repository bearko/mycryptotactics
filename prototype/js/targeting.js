/**
 * targeting.js — ターゲット解決の純粋関数群 (SPEC-005 Phase 2)
 *
 * カードに付与された target 仕様 (e.g. "enemy.foremost") を、
 * 戦闘状態 (combat.heroes / combat.enemies) からユニット配列へ解決する。
 *
 * このモジュールは副作用を持たず、document / 外部状態にも触らない。
 * Phase 3 で 3v3 UI / カードキャスト処理に組み込まれる。
 */

/**
 * 指定ポジションで生存しているユニットを返す。
 * @param {Unit[]} party 同陣営の配列（最大 3）
 * @param {0|1|2} position
 * @returns {Unit|null}
 */
export function aliveAt(party, position) {
  if (!Array.isArray(party)) return null;
  for (const u of party) {
    if (u && u.position === position && u.alive !== false && (u.hp == null || u.hp > 0)) return u;
  }
  return null;
}

/** 前衛 → 中衛 → 後衛 の順で最初に生存しているユニット */
export function foremostAlive(party) {
  for (let p = 0; p < 3; p++) {
    const u = aliveAt(party, p);
    if (u) return u;
  }
  return null;
}

/** 後衛 → 中衛 → 前衛 の順で最初に生存しているユニット */
export function rearmostAlive(party) {
  for (let p = 2; p >= 0; p--) {
    const u = aliveAt(party, p);
    if (u) return u;
  }
  return null;
}

/** ランダム 1 体（rng が無ければ Math.random） */
export function pickRandomAlive(party, rng) {
  const alive = (party || []).filter(u => u && u.alive !== false && (u.hp == null || u.hp > 0));
  if (alive.length === 0) return null;
  const r = typeof rng === "function" ? rng() : Math.random();
  return alive[Math.floor(r * alive.length)];
}

/** 与えた集計関数で最大値を持つユニット 1 体（同値時は先頭） */
export function pickByMax(party, fn) {
  let best = null, bestVal = -Infinity;
  for (const u of (party || [])) {
    if (!u || u.alive === false || (u.hp != null && u.hp <= 0)) continue;
    const v = fn(u);
    if (v > bestVal) { best = u; bestVal = v; }
  }
  return best;
}

/** 与えた集計関数で最小値を持つユニット 1 体（同値時は先頭） */
export function pickByMin(party, fn) {
  let best = null, bestVal = Infinity;
  for (const u of (party || [])) {
    if (!u || u.alive === false || (u.hp != null && u.hp <= 0)) continue;
    const v = fn(u);
    if (v < bestVal) { best = u; bestVal = v; }
  }
  return best;
}

/**
 * ターゲット仕様を解決し、ユニット配列を返す。
 * @param {string} spec - SPEC-005 §6 の語彙文字列
 * @param {Unit} caster - カードを使うキャスター
 * @param {{heroes:Unit[], enemies:Unit[], rng?:Function}} ctx
 * @returns {Unit[]} 0〜N 体（解決不可なら空配列）
 */
export function resolveTargets(spec, caster, ctx) {
  if (!spec) return [];
  const heroes = (ctx && ctx.heroes) || [];
  const enemies = (ctx && ctx.enemies) || [];
  const myParty = caster && caster.side === "enemy" ? enemies : heroes;
  const enemyParty = caster && caster.side === "enemy" ? heroes : enemies;
  const rng = ctx && ctx.rng;

  switch (spec) {
    case "self": return caster ? [caster] : [];

    case "ally.front":   return [aliveAt(myParty, 0)].filter(Boolean);
    case "ally.mid":     return [aliveAt(myParty, 1)].filter(Boolean);
    case "ally.back":    return [aliveAt(myParty, 2)].filter(Boolean);
    case "ally.foremost":return [foremostAlive(myParty)].filter(Boolean);
    case "ally.rearmost":return [rearmostAlive(myParty)].filter(Boolean);
    case "ally.all":     return myParty.filter(u => u && u.alive !== false && (u.hp == null || u.hp > 0));
    case "ally.random":  return [pickRandomAlive(myParty, rng)].filter(Boolean);
    case "ally.highest_phy": return [pickByMax(myParty, u => u.phy ?? 0)].filter(Boolean);
    case "ally.lowest_phy":  return [pickByMin(myParty, u => u.phy ?? 0)].filter(Boolean);
    case "ally.highest_int": return [pickByMax(myParty, u => u.int ?? 0)].filter(Boolean);
    case "ally.lowest_int":  return [pickByMin(myParty, u => u.int ?? 0)].filter(Boolean);
    case "ally.highest_hp":  return [pickByMax(myParty, u => u.hp ?? 0)].filter(Boolean);
    case "ally.lowest_hp":   return [pickByMin(myParty, u => u.hp ?? 0)].filter(Boolean);

    case "enemy.front":   return [aliveAt(enemyParty, 0)].filter(Boolean);
    case "enemy.mid":     return [aliveAt(enemyParty, 1)].filter(Boolean);
    case "enemy.back":    return [aliveAt(enemyParty, 2)].filter(Boolean);
    case "enemy.foremost":return [foremostAlive(enemyParty)].filter(Boolean);
    case "enemy.rearmost":return [rearmostAlive(enemyParty)].filter(Boolean);
    case "enemy.all":     return enemyParty.filter(u => u && u.alive !== false && (u.hp == null || u.hp > 0));
    case "enemy.random":  return [pickRandomAlive(enemyParty, rng)].filter(Boolean);
    case "enemy.highest_phy": return [pickByMax(enemyParty, u => u.phy ?? 0)].filter(Boolean);
    case "enemy.lowest_phy":  return [pickByMin(enemyParty, u => u.phy ?? 0)].filter(Boolean);
    case "enemy.highest_int": return [pickByMax(enemyParty, u => u.int ?? 0)].filter(Boolean);
    case "enemy.lowest_int":  return [pickByMin(enemyParty, u => u.int ?? 0)].filter(Boolean);
    case "enemy.highest_hp":  return [pickByMax(enemyParty, u => u.hp ?? 0)].filter(Boolean);
    case "enemy.lowest_hp":   return [pickByMin(enemyParty, u => u.hp ?? 0)].filter(Boolean);

    case "all":          return [...heroes, ...enemies].filter(u => u && u.alive !== false && (u.hp == null || u.hp > 0));
    case "all.random":   {
      const all = [...heroes, ...enemies].filter(u => u && u.alive !== false && (u.hp == null || u.hp > 0));
      return [pickRandomAlive(all, rng)].filter(Boolean);
    }

    default:
      // 未知の仕様 → 安全のため敵先頭に fallback
      return [foremostAlive(enemyParty)].filter(Boolean);
  }
}

/**
 * Unit を新規生成するファクトリ（ヒーロー / エネミー共通の最小スキーマ）。
 * 既存の startCombatFromMapNode の中で使い、combat.heroes / combat.enemies に積む。
 */
export function makeHeroUnit(opts) {
  return {
    side: "hero",
    position: opts.position ?? 0,
    alive: true,
    defId: opts.defId,
    name: opts.name,
    imgUrl: opts.imgUrl,
    hp: opts.hp, hpMax: opts.hpMax,
    phy: opts.phy, int: opts.int, agi: opts.agi,
    phyBase: opts.phyBase ?? opts.phy,
    intBase: opts.intBase ?? opts.int,
    agiBase: opts.agiBase ?? opts.agi,
    guard: 0, shield: 0, poison: 0, bleed: 0, vulnerable: 0,
    passiveKey: opts.passiveKey || null,
    passiveTriggered: false,
  };
}

export function makeEnemyUnit(opts) {
  return {
    side: "enemy",
    position: opts.position ?? 0,
    alive: true,
    defId: opts.defId,
    name: opts.name,
    imgId: opts.imgId,
    hp: opts.hp, hpMax: opts.hpMax,
    phy: opts.phy, int: opts.int, agi: opts.agi,
    phyBase: opts.phyBase ?? opts.phy,
    intBase: opts.intBase ?? opts.int,
    agiBase: opts.agiBase ?? opts.agi,
    guard: 0, shield: opts.shield || 0,
    poison: 0, bleed: 0, vulnerable: 0,
    intentRota: opts.intentRota || [],
    intentRotaIdx: 0,
    enemyIntent: null,
    bossPhase: opts.bossPhase ?? -1,
    bossDef: opts.bossDef || null,
    isBoss: !!opts.isBoss,
  };
}
