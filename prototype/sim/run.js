/**
 * Meta-game wrapper: simulates a full run from chapter 1 to last chapter.
 *
 * Per "案A": full-fidelity combat, but meta-game simplified:
 *  - Map: synthesized as a linear chain of N nodes per chapter (no branching).
 *    Mix follows chapter.mapRules.nodeRatios so node-type frequency is realistic.
 *  - Shop strategy: buy if affordable; pick highest curve-fit card (uncommon+);
 *    avoid duplicating already-3-of-a-kind in deck.
 *  - Rest: heal 30% of max HP.
 *  - Craft: upgrade a starter card (ext1001/1004/1008) to elite if any in deck.
 *  - Event: skip (no payoff modeled — events are out of combat-sim scope).
 *  - Reward: pick highest-scored card by simple curve heuristic.
 *  - LL ext: post-combat drop per main.js logic; auto-use when needed (lowest
 *    HP threshold; or save for boss).
 */

const engine = require("./engine");
const { makeCardLibrary, copyCard, makeStarterDeck } = require("./cards");
const { ENEMIES, BOSSES, CHAPTERS, HEROES, LL_EXT_POOL } = require("./data");
const playerAi = require("./player");

const NODES_PER_CHAPTER = 11; // tweak: fights+rest+shop+elite+craft+event ≈ chapter scope; +1 boss

// ── Map synthesis ────────────────────────────────────────────────────────
function synthesizeMap(chapter, rng) {
  const ratios = chapter.mapRules.nodeRatios;
  const types = ["fight", "rest", "shop", "elite", "craft", "event"];
  const nodes = [];
  // Generate NODES_PER_CHAPTER non-boss nodes, weighted by ratios
  for (let i = 0; i < NODES_PER_CHAPTER; i++) {
    const r = rng.next();
    let acc = 0;
    let chosen = "fight";
    for (const t of types) {
      acc += ratios[t] || 0;
      if (r < acc) { chosen = t; break; }
    }
    nodes.push(chosen);
  }
  // Always end with boss
  nodes.push("boss");
  return nodes;
}

// ── Reward / shop / craft strategy ──────────────────────────────────────
const STARTER_KEYS = new Set(["ext1001", "ext1004", "ext1008"]);
const UPGRADE = {
  ext1001: "ext2001", ext1002: "ext2002", ext1003: "ext2003",
  ext1004: "ext2004", ext1005: "ext2005", ext1006: "ext2006",
  ext1008: "ext2008", ext1011: "ext2011",
};

// Generic card power score — simple heuristic for picking
function cardPowerScore(key) {
  // Higher number = more useful
  // Hand-tuned; tweak if AI plays sub-optimally
  const T = {
    cd105: 95, cd102: 90, cd302: 105, cd304: 90, cd303: 92, cd205: 88,
    cd101: 70, cdH06: 75, ext2008: 70, cd106: 60, cd108: 55, cdH02: 60,
    cd202: 75, cd201: 65, cd204: 65, cdH05: 60, ext2004: 55,
    ext2001: 55, ext2006: 52, ext2011: 52, cdH01: 50, ext2013: 45,
    ext2002: 50, ext1008: 35, cd107: 40, cd203: 30, cd104: 35, cd103: 30, cd301: 25,
    cd305: 60, cd206: 18,
    ext2003: 45, cdH04: 50, cdH03: 50, ext2005: 50,
    ext1001: 18, ext1004: 22, ext1006: 18, ext1011: 18,
    ext1003: 25, ext1005: 30, ext1002: 22, ext1012: 22, ext1022: 22, ext1023: 18,
  };
  return T[key] ?? 20;
}

function pickReward(picks, deck) {
  if (!picks.length) return null;
  let best = null, bestScore = -Infinity;
  for (const k of picks) {
    let score = cardPowerScore(k);
    // Saturation penalty: avoid >2 copies
    const owned = deck.filter((c) => c.libraryKey === k).length;
    if (owned >= 2) score -= 25;
    if (owned >= 3) score -= 50;
    if (score > bestScore) { bestScore = score; best = k; }
  }
  return best;
}

// Cumulative card pool up to current chapter
function cumulativeCardPool(chapterIdx) {
  const pool = [];
  for (let i = 0; i <= chapterIdx; i++) pool.push(...CHAPTERS[i].cardPool);
  return pool;
}

// ── Simulate one combat ─────────────────────────────────────────────────
function simulateCombat(rs, enemyDef, opts, runtime) {
  const { isBoss = false, isElite = false } = opts;
  const s = engine.makeCombat({
    rng: rs.rng,
    deck: rs.deck,
    hero: rs.hero,
    enemyDef,
    isBoss,
    isElite,
    copyCard: (k) => copyCard(runtime.LIB, k),
    hpCarry: rs.playerHp,
    hpMaxCarry: rs.playerHpMax,
  });
  // start first player turn
  let cont = engine.startPlayerTurn(s);
  if (cont === false) return { result: "lose", state: s };
  // initial intent already advanced

  // Optional: use LL ext at combat start vs boss if very strong
  // Skipped for now—heuristic: only use LL ext when player HP < 35%

  let turnCap = 30;
  while (turnCap-- > 0) {
    if (s.enemyHp <= 0) break;
    if (s.playerHp <= 0) break;

    // Use LL ext defensively
    if (rs.llExtSlots) {
      for (let i = 0; i < rs.llExtSlots.length; i++) {
        const ext = rs.llExtSlots[i];
        if (!ext) continue;
        const incoming = playerAi.estIncoming(s);
        const isLethalNow = incoming >= s.playerHp;
        const isPenOrFish = ext.effectKey === "pen" || ext.effectKey === "fish";
        const isBlade = ext.effectKey === "blade" || ext.effectKey === "grande";
        const lowHp = s.playerHp < s.playerHpMax * 0.4;
        const useNow =
          (isPenOrFish && lowHp) ||
          (isLethalNow && (ext.effectKey === "armor" || ext.effectKey === "pen" || ext.effectKey === "fish")) ||
          (isBlade && isBoss && s.enemyHp >= s.enemyHpMax * 0.5);
        if (useNow) {
          rs.llExtSlots[i] = null;
          engine.applyLlExtEffect(s, ext);
          if (s.enemyHp <= 0) break;
        }
      }
    }
    if (s.enemyHp <= 0) break;

    const decision = playerAi.playTurn(s, { engine });
    if (decision === "win") break;
    if (decision === "lose") break;
    engine.endPlayerTurn(s);
    const turnRet = engine.enemyTurn(s);
    if (s.playerHp <= 0) break;
    if (s.enemyHp <= 0) break;
    // turnRet === false means player died during enemy turn (handled above)
  }

  // Outcome
  if (s.enemyHp <= 0 && s.playerHp > 0) {
    rs.playerHp = s.playerHp;
    if (s._goldDelta) rs.gold += s._goldDelta;
    return { result: "win", state: s, turns: s.turn };
  }
  return { result: "lose", state: s, turns: s.turn };
}

// ── Run-state init ──────────────────────────────────────────────────────
function makeRun(rng, hero, runtime) {
  const deck = makeStarterDeck(runtime.LIB);
  return {
    rng,
    hero,
    chapterIdx: 0,
    deck,
    playerHp: hero.hpMax,
    playerHpMax: hero.hpMax,
    gold: 75,
    llExtSlots: [null, null],
    nodesCleared: 0,
    failures: [],
  };
}

// ── Process a single non-combat node ────────────────────────────────────
function handleNonCombatNode(rs, type, runtime) {
  if (type === "rest") {
    const heal = Math.floor(rs.playerHpMax * 0.3);
    rs.playerHp = Math.min(rs.playerHpMax, rs.playerHp + heal);
  } else if (type === "shop") {
    if (rs.gold < 50) return;
    const pool = cumulativeCardPool(rs.chapterIdx);
    const offers = engine.shuffle(rs.rng, pool).slice(0, 5);
    const pick = pickReward(offers, rs.deck);
    if (pick) {
      rs.gold -= 50;
      rs.deck.push(copyCard(runtime.LIB, pick));
    }
  } else if (type === "craft") {
    // upgrade first starter found
    for (let i = 0; i < rs.deck.length; i++) {
      const k = rs.deck[i].libraryKey;
      if (UPGRADE[k] && rs.gold >= 30) {
        rs.gold -= 30;
        rs.deck[i] = copyCard(runtime.LIB, UPGRADE[k]);
        return;
      }
    }
  } else if (type === "event") {
    // skip
  }
}

// ── LL ext drop after non-boss/elite combat (mirrors main.js) ──────────
function maybeLlDrop(rs, isElite) {
  if (rs.chapterIdx < 1) return;
  const hasEmpty = rs.llExtSlots.some((x) => x === null);
  if (!hasEmpty) return;
  const chance = isElite ? 1.0 : 0.10;
  if (rs.rng.next() < chance) {
    const drop = LL_EXT_POOL[Math.floor(rs.rng.next() * LL_EXT_POOL.length)];
    const idx = rs.llExtSlots.indexOf(null);
    rs.llExtSlots[idx] = drop;
  }
}

// ── Run a full chapter sequence ─────────────────────────────────────────
function simulateChapter(rs, runtime, log) {
  const ch = CHAPTERS[rs.chapterIdx];
  const rng = rs.rng;
  const map = synthesizeMap(ch, rng);
  for (const nodeType of map) {
    if (rs.playerHp <= 0) break;

    if (nodeType === "fight" || nodeType === "elite" || nodeType === "boss") {
      let enemyDef, isBoss = false, isElite = false;
      if (nodeType === "boss") {
        enemyDef = BOSSES[ch.bossId];
        isBoss = true;
      } else {
        const pool = nodeType === "elite" ? ch.elitePool : ch.enemyPool;
        const eid = pool[Math.floor(rng.next() * pool.length)];
        enemyDef = ENEMIES[eid];
        isElite = nodeType === "elite";
      }
      if (!enemyDef) {
        log.push({ chapter: ch.id, error: "missingEnemy", nodeType });
        continue;
      }
      const out = simulateCombat(rs, enemyDef, { isBoss, isElite }, runtime);
      log.push({
        chapter: ch.id,
        node: nodeType,
        enemy: enemyDef.name,
        result: out.result,
        turns: out.turns,
        hpAfter: out.state.playerHp,
        hpMax: rs.playerHpMax,
      });
      if (out.result === "lose") {
        rs.failures.push({ chapter: ch.id, node: nodeType, enemy: enemyDef.name, turns: out.turns });
        rs.playerHp = 0;
        return false;
      }
      // gold
      const earn = isBoss ? ch.bossRewardGold : isElite ? 45 : 28;
      rs.gold += earn;
      // ll ext drop (non-boss only per main.js? actually main.js does it for all wins)
      maybeLlDrop(rs, isElite);
      // pick reward (skip if no card pool)
      const pool = cumulativeCardPool(rs.chapterIdx);
      const offers = engine.shuffle(rng, pool).slice(0, 3);
      const pick = pickReward(offers, rs.deck);
      if (pick) rs.deck.push(copyCard(runtime.LIB, pick));
      rs.nodesCleared++;
    } else {
      handleNonCombatNode(rs, nodeType, runtime);
    }
  }
  return true;
}

function simulateRun({ seed, hero, log = [] }) {
  const rng = engine.makeRng(seed);
  const api = engine.makeBattleApi();
  const LIB = makeCardLibrary(api);
  const runtime = { LIB };
  const rs = makeRun(rng, hero, runtime);
  for (let i = 0; i < CHAPTERS.length; i++) {
    rs.chapterIdx = i;
    const ok = simulateChapter(rs, runtime, log);
    if (!ok) {
      return {
        completed: false,
        chapterReached: i + 1,
        nodesCleared: rs.nodesCleared,
        failures: rs.failures,
        finalHp: 0,
        log,
        seed, heroKey: hero.key,
      };
    }
    // chapter cleared; deck/hp carry over
  }
  return {
    completed: true,
    chapterReached: CHAPTERS.length,
    nodesCleared: rs.nodesCleared,
    failures: rs.failures,
    finalHp: rs.playerHp,
    finalHpMax: rs.playerHpMax,
    finalDeckSize: rs.deck.length,
    log,
    seed, heroKey: hero.key,
  };
}

module.exports = { simulateRun, simulateCombat, makeRun, NODES_PER_CHAPTER };
