/**
 * Heuristic auto-player. Decides which card to play each player turn.
 * Strategy: simple value heuristic (kept transparent so balance issues
 *   surface from data not AI quirks). Picks highest-utility card it can afford,
 *   plays repeatedly until no action can be taken, then ends turn.
 *
 * Utility heuristic:
 *   - Fatal-priority: any card likely to deal lethal -> very high score
 *   - Defense urgency: incoming damage > current effective HP -> guard/heal cards score boost
 *   - Permanent buff > one-shot effects when HP is safe
 *   - Cost-0 cards always preferred first
 *   - Draw cards play first if hand is small
 *
 * Returns a small estimate (no full lookahead) — good enough as baseline.
 */

const { phyIntDamageAfterCut, cutRateFromPhy, cutRateFromInt } = require("./engine");

// ── Estimate enemy intent damage to player (matches main.js estEnemyPhyDmg) ──
function estIncoming(s) {
  const it = s.enemyIntent;
  if (!it) return 0;
  const k = it.kind;
  if (k === "attack" || k === "attackPoison" || k === "attackBleed") {
    return phyIntDamageAfterCut(s.enemyPhy, it.phyPct, cutRateFromPhy(s.playerPhy));
  }
  if (k === "attackDouble") {
    return 2 * phyIntDamageAfterCut(s.enemyPhy, it.phyPct, cutRateFromPhy(s.playerPhy));
  }
  if (k === "attackInt") {
    return phyIntDamageAfterCut(s.enemyInt, it.intPct, cutRateFromInt(s.playerInt));
  }
  if (k === "attackIntDouble") {
    return 2 * phyIntDamageAfterCut(s.enemyInt, it.intPct, cutRateFromInt(s.playerInt));
  }
  if (k === "special") {
    return Math.floor((s.playerHpMax * it.pct) / 100);
  }
  return 0;
}

// Approximate damage of a phy-skill-pct card (avg of range)
function estPhyCard(s, lo, hi) {
  const pct = Math.floor((lo + hi) / 2);
  return phyIntDamageAfterCut(s.playerPhy, pct, cutRateFromPhy(s.enemyPhy));
}
function estIntCard(s, lo, hi) {
  const pct = Math.floor((lo + hi) / 2);
  return phyIntDamageAfterCut(s.playerInt, pct, cutRateFromInt(s.enemyInt));
}

// ── Card-specific scoring table ──────────────────────────────────────────
// Returns { score, expectedDamage } where higher score = play sooner
function scoreCard(card, s, ctx) {
  const incoming = ctx.incoming;
  const overkillMargin = ctx.enemyHp;
  const energyAfter = s.energy - card.cost;
  if (card.cost > s.energy) return { score: -Infinity, dmg: 0 };

  let score = 0;
  let dmg = 0;

  switch (card.libraryKey) {
    // ── Cheap PHY attacks ───────────────────────────────────────
    case "ext1001": dmg = estPhyCard(s, 50, 60); score = 30 + dmg; break;
    case "ext1006": dmg = estPhyCard(s, 45, 55); score = 28 + dmg; break;
    case "ext1011": dmg = estPhyCard(s, 45, 55); score = 28 + dmg; break;
    case "ext1012": dmg = estPhyCard(s, 40, 40); score = 26 + dmg + 5; break; // +AGI debuff
    case "ext1023": dmg = estPhyCard(s, 30, 40); score = 18 + dmg - 5; break; // -PHY self
    case "ext2001": dmg = estPhyCard(s, 55, 65); score = 35 + dmg; break;
    case "ext2006": dmg = estPhyCard(s, 50, 60); score = 32 + dmg; break;
    case "ext2011": dmg = estPhyCard(s, 50, 60); score = 32 + dmg; break;
    case "ext2013": dmg = estPhyCard(s, 40, 50); score = 26 + dmg; break;
    case "cd101":   dmg = estPhyCard(s, 100, 100); score = 50 + dmg; break;
    case "cd102":   dmg = 2 * estPhyCard(s, 70, 70); score = 70 + dmg; break;
    case "cd105":   dmg = estPhyCard(s, 150, 150); score = 80 + dmg; break;
    case "cd108":   dmg = estPhyCard(s, 60, 60); score = 50 + dmg + 8; break; // cost 0
    case "cd302":   dmg = estPhyCard(s, 200, 200); score = 100 + dmg; break;
    case "cdH01":   dmg = estPhyCard(s, 80, 80); score = 35 + dmg; break;
    case "cdH02":   dmg = estPhyCard(s, 60, 60); score = 30 + dmg + 6; break; // bleed
    case "cdH05":   dmg = 2 * estPhyCard(s, 50, 50); score = 50 + dmg; break;
    case "cd201":   dmg = estPhyCard(s, 60, 60); score = 30 + dmg + 8; break; // poison x2
    case "cd202":   dmg = estPhyCard(s, 90, 90); score = 50 + dmg + 6; break;
    // ── INT attacks ─────────────────────────────────────────────
    case "ext1002": dmg = estIntCard(s, 25, 30); score = 20 + dmg + 4; break; // -INT
    case "ext1008": dmg = estIntCard(s, 15, 20); score = 25 + dmg + 12; break; // INT+1 + draw 2
    case "ext1022": dmg = estIntCard(s, 15, 20); score = 18 + dmg + 4; break;
    case "ext2002": dmg = estIntCard(s, 30, 35); score = 28 + dmg; break;
    case "ext2008": score = 35; break; // INT+2 perm + draw 3 (no immediate dmg)
    case "cdH06":   score = 35; break; // same
    case "cd205":   dmg = 3 * estIntCard(s, 50, 50); score = 60 + dmg; break;
    case "cd304":   dmg = estIntCard(s, 130, 130) * 2; score = 75 + dmg; break; // crit guaranteed
    // ── Heals ───────────────────────────────────────────────────
    case "ext1003": case "cd107": {
      const coef = (s.playerInt + s.playerPhy) / 2;
      const heal = Math.floor((coef * 35) / 100);
      const missing = s.playerHpMax - s.playerHp;
      score = Math.min(heal, missing) * (incoming > 0 ? 1.4 : 0.6) - card.cost * 5;
      break;
    }
    case "ext2003": case "cdH04": {
      const heal = Math.floor((s.playerInt + s.playerPhy) / 2);
      const missing = s.playerHpMax - s.playerHp;
      score = Math.min(heal, missing) * (incoming > 0 ? 1.5 : 0.7) + 10; // cost 0
      break;
    }
    // ── Defense ─────────────────────────────────────────────────
    case "ext1004": score = (incoming > 0 ? 7 + 2 : 14) + Math.min(7, incoming); break; // PHY+2 perm + g7
    case "ext1005": score = 8 + 5 + 6; break; // AGI+3 + g3 + ⚡next
    case "ext2005": score = 14 + 8; break; // g8 + AGI+2 perm
    case "cd103":   score = 6 + Math.min(6, incoming); break;
    case "cd204":   score = 12 + Math.min(12, incoming); break;
    case "cd301":   score = 8; break; // shield (only special dmg)
    case "cd305":   score = (incoming > 12 ? 50 : 14); break; // halve damage
    case "cdH03":   score = 14 + 5; break;
    // ── Stat buffs (perm) ───────────────────────────────────────
    case "cd106":   score = 18; break; // PHY+3 perm
    case "cd303":   score = 28; break; // PHY+5 INT+5
    case "ext2004": score = 16; break; // PHY% boost
    // ── Utility ─────────────────────────────────────────────────
    case "cd104":   score = (s.energy <= 0 ? 30 : 5); break; // ⚡+1 turn
    case "cd203":   score = (s.playerPoison + s.playerBleed > 0 ? 28 : -5); break;
    case "cd206":   score = 4; break; // gold +20 (low priority in combat)
    default:        score = 1;
  }

  // Lethal bonus: if this card alone (or combined with stack on subsequent plays) likely kills
  if (dmg > 0 && dmg >= overkillMargin) score += 200;

  // Discount over-cost when energy is plentiful
  score -= card.cost * 1.5;

  return { score, dmg };
}

// Decide and execute one player turn. Returns when no plays remain.
function playTurn(s, runtime) {
  const { engine } = runtime;
  let safety = 30;
  while (safety-- > 0 && s.hand.length > 0 && s.enemyHp > 0 && s.playerHp > 0) {
    const incoming = estIncoming(s);
    const ctx = { incoming, enemyHp: s.enemyHp };
    let bestIdx = -1, bestScore = -Infinity, bestDmg = 0;
    for (let i = 0; i < s.hand.length; i++) {
      const card = s.hand[i];
      if (card.cost > s.energy) continue;
      const { score, dmg } = scoreCard(card, s, ctx);
      if (score > bestScore) { bestScore = score; bestIdx = i; bestDmg = dmg; }
    }
    if (bestIdx < 0 || bestScore < 0) break;
    const won = engine.playCard(s, bestIdx);
    if (s.enemyHp <= 0) return "win";
    if (s.playerHp <= 0) return "lose";
    if (!won) break;
  }
  return "continue";
}

module.exports = { playTurn, estIncoming, scoreCard };
