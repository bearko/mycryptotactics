/**
 * Headless combat engine — mirrors prototype/js/main.js + battle-mch.js + ll-extensions.js logic
 * deterministic via seeded RNG, no DOM/audio side-effects.
 *
 * Source-of-truth references (kept inline as comments):
 * - battle-mch.js: damage math
 * - main.js:1208 combat state shape
 * - main.js:1360 startPlayerTurn
 * - main.js:1343 advanceEnemyIntent
 * - main.js:596+ damage helpers
 * - main.js:1727 applyKaihimePassive
 * - main.js:1747 applyZhangPassive
 * - main.js:1393 doyle passive
 * - main.js:1792 enemyTurn
 */

// ─── Seeded RNG (mulberry32) ────────────────────────────────────────────
function makeRng(seed) {
  let a = (seed >>> 0) || 0xdeadbeef;
  return {
    next() {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    int(lo, hi) {
      return lo + Math.floor(this.next() * (hi - lo + 1));
    },
    pick(arr) {
      return arr[Math.floor(this.next() * arr.length)];
    },
    chance(p) {
      return this.next() < p;
    },
  };
}

// ─── Damage math (battle-mch.js port) ───────────────────────────────────
const cutRateFromPhy = (phy) => Math.min(40, Math.floor(phy / 2));
const cutRateFromInt = (i) => Math.min(40, Math.floor(i / 2));
const critRateFromAgi = (agi) => Math.min(45, Math.max(0, Math.floor(agi / 2)));

function phyIntDamageAfterCut(stat, skillPct, cutPct) {
  const raw = (stat * skillPct) / 100;
  return Math.max(0, Math.floor((raw * (100 - cutPct)) / 100));
}
function criticalBonusDamage(baseAtk, skillPct, baseDef, kind) {
  const cut = kind === "phy" ? cutRateFromPhy(baseDef) : cutRateFromInt(baseDef);
  return phyIntDamageAfterCut(baseAtk, skillPct, cut);
}

function randomSkillRatePct(rng, lo, hi) {
  const a = Math.min(lo, hi),
    b = Math.max(lo, hi);
  return a + Math.floor(rng.next() * (b - a + 1));
}

function rollCrit(rng, critPct) {
  return rng.next() * 100 < critPct;
}

function applyDamageThroughShield(s, target, raw) {
  if (raw <= 0) return 0;
  const k = target === "player" ? "playerShield" : "enemyShield";
  let sh = s[k] || 0;
  if (sh <= 0) return raw;
  if (raw <= sh) {
    s[k] = sh - raw;
    return 0;
  }
  s[k] = 0;
  return raw - sh;
}

function applyGuardToDamage(s, target, raw) {
  const k = target === "player" ? "playerGuard" : "enemyGuard";
  let g = s[k] || 0;
  if (g <= 0 || raw <= 0) return raw;
  const use = Math.min(g, raw);
  s[k] = g - use;
  return raw - use;
}

function checkResurrection(s) {
  if (s.playerHp <= 0 && s.hasResurrection) {
    s.playerHp = 1;
    s.hasResurrection = false;
    return true;
  }
  return false;
}

// ─── Player → Enemy damage ──────────────────────────────────────────────
function dealPhySkillToEnemy(s, skillPct) {
  const cut = cutRateFromPhy(s.enemyPhy);
  let base = phyIntDamageAfterCut(s.playerPhy, skillPct, cut);
  let crit = 0;
  if (rollCrit(s.rng, critRateFromAgi(s.playerAgi))) {
    crit = criticalBonusDamage(s.playerPhyBase, skillPct, s.enemyPhyBase, "phy");
  }
  let total = base + crit + (s.enemyVulnerable || 0);
  s.enemyVulnerable = 0;
  if ((s.enemyBleed || 0) > 0) total += s.enemyBleed;
  total = applyGuardToDamage(s, "enemy", total);
  s.enemyHp = Math.max(0, s.enemyHp - total);
}
function dealPhySkillToEnemyRange(s, lo, hi) {
  dealPhySkillToEnemy(s, randomSkillRatePct(s.rng, lo, hi));
}
function dealIntSkillToEnemy(s, lo, hi, forceCrit = false) {
  const skillPct = randomSkillRatePct(s.rng, lo, hi);
  const cut = cutRateFromInt(s.enemyInt);
  let base = phyIntDamageAfterCut(s.playerInt, skillPct, cut);
  let crit = 0;
  if (forceCrit || rollCrit(s.rng, critRateFromAgi(s.playerAgi))) {
    crit = criticalBonusDamage(s.playerIntBase, skillPct, s.enemyIntBase, "int");
  }
  let total = base + crit;
  total = applyGuardToDamage(s, "enemy", total);
  s.enemyHp = Math.max(0, s.enemyHp - total);
}
function healPlayerFromIntSkill(s, lo, hi) {
  const pct = randomSkillRatePct(s.rng, lo, hi);
  const coef = (s.playerInt + s.playerPhy) / 2;
  const heal = Math.max(0, Math.floor((coef * pct) / 100));
  s.playerHp = Math.min(s.playerHpMax, s.playerHp + heal);
}

// ─── Enemy → Player damage ──────────────────────────────────────────────
function dealPhySkillFromEnemyToPlayer(s, skillPct) {
  const cut = cutRateFromPhy(s.playerPhy);
  let base = phyIntDamageAfterCut(s.enemyPhy, skillPct, cut);
  let crit = 0;
  if (rollCrit(s.rng, critRateFromAgi(s.enemyAgi))) {
    crit = criticalBonusDamage(s.enemyPhyBase, skillPct, s.playerPhyBase, "phy");
  }
  let total = base + crit;
  if ((s.playerBleed || 0) > 0) total += s.playerBleed;
  if (s.damageReducedThisTurn) total = Math.ceil(total / 2);
  total = applyGuardToDamage(s, "player", total);
  s.playerHp = Math.max(0, s.playerHp - total);
  checkResurrection(s);
  if (s.heroPassive === "zhang" && s.playerHp > 0 && s.enemyHp > 0 && s.rng.next() < 0.5) {
    s._zhangCounterPending = true;
  }
}
function dealIntSkillFromEnemyToPlayer(s, skillPct) {
  const cut = cutRateFromInt(s.playerInt);
  let base = phyIntDamageAfterCut(s.enemyInt, skillPct, cut);
  let crit = 0;
  if (rollCrit(s.rng, critRateFromAgi(s.enemyAgi))) {
    crit = criticalBonusDamage(s.enemyIntBase, skillPct, s.playerIntBase, "int");
  }
  let total = base + crit;
  if (s.damageReducedThisTurn) total = Math.ceil(total / 2);
  total = applyGuardToDamage(s, "player", total);
  s.playerHp = Math.max(0, s.playerHp - total);
  checkResurrection(s);
  if (s.heroPassive === "zhang" && s.playerHp > 0 && s.enemyHp > 0 && s.rng.next() < 0.5) {
    s._zhangCounterPending = true;
  }
}
function dealSpecialMaxHpPercentToPlayer(s, pct) {
  let raw = Math.max(0, Math.floor((s.playerHpMax * pct) / 100));
  if (s.damageReducedThisTurn) raw = Math.ceil(raw / 2);
  raw = applyDamageThroughShield(s, "player", raw);
  s.playerHp = Math.max(0, s.playerHp - raw);
  checkResurrection(s);
}

// ─── Card-side mutators (api passed to card library) ────────────────────
function makeBattleApi() {
  return {
    dealPhySkillToEnemy: (s, lo, hi) => dealPhySkillToEnemyRange(s, lo, hi),
    dealIntSkillToEnemy: (s, lo, hi) => dealIntSkillToEnemy(s, lo, hi, false),
    dealIntSkillToEnemyCrit: (s, lo, hi) => dealIntSkillToEnemy(s, lo, hi, true),
    healPlayerFromIntSkill,
    drawCards,
    addPoisonToEnemy(s, n) {
      s.enemyPoison = (s.enemyPoison || 0) + n;
    },
    addBleedToEnemy(s, n) {
      s.enemyBleed = (s.enemyBleed || 0) + n;
    },
    clearPlayerDebuffs(s) {
      s.playerPoison = 0;
      s.playerBleed = 0;
    },
    addPlayerShield(s, amt) {
      s.playerShield = (s.playerShield || 0) + amt;
    },
    addGold(s, amt) {
      // mediated via run state; we tag the combat for the run loop to pick up
      s._goldDelta = (s._goldDelta || 0) + amt;
    },
    setDamageReducedThisTurn(s) {
      s.damageReducedThisTurn = true;
    },
    // SE/FX no-ops
    playBattleSe() {},
    portraitFx() {},
  };
}

// ─── Deck helpers ───────────────────────────────────────────────────────
function shuffle(rng, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function drawCards(s, n) {
  for (let i = 0; i < n; i++) {
    if (!s.drawPile.length) {
      if (!s.discardPile.length) break;
      s.drawPile = shuffle(s.rng, s.discardPile);
      s.discardPile = [];
    }
    if (!s.drawPile.length) break;
    s.hand.push(s.drawPile.pop());
  }
}

// ─── LL Extension effects ───────────────────────────────────────────────
function applyLlExtEffect(s, ext) {
  switch (ext.effectKey) {
    case "blade":
      dealPhySkillToEnemyRange(s, 300, 400);
      break;
    case "grande":
      dealIntSkillToEnemy(s, 400, 500, false);
      break;
    case "pen":
      healPlayerFromIntSkill(s, 200, 250);
      break;
    case "armor":
      s.playerPhy += Math.floor(s.playerPhy * 0.5);
      s.playerGuard = (s.playerGuard || 0) + 20;
      break;
    case "blue":
      healPlayerFromIntSkill(s, 200, 250);
      s.playerInt += 4;
      break;
    case "fish":
      healPlayerFromIntSkill(s, 150, 200);
      s.playerPhy += 3;
      s.hasResurrection = true;
      break;
  }
}

// ─── Combat lifecycle ───────────────────────────────────────────────────
function makeCombat({ rng, deck, hero, enemyDef, isBoss = false, isElite = false, copyCard, hpCarry, hpMaxCarry }) {
  // boss phases
  let intentRota, bossPhase, bossDef = null;
  if (isBoss && enemyDef.phases) {
    bossPhase = 0;
    bossDef = enemyDef;
    intentRota = enemyDef.phases[0].intentRota;
  } else {
    bossPhase = -1;
    intentRota = enemyDef.intentRota;
  }
  const pPhy = hero.basePhy, pInt = hero.baseInt, pAgi = hero.baseAgi;
  const s = {
    rng,
    heroPassive: hero.passiveKey,
    deck: deck.map((c) => ({ ...c })),
    drawPile: [],
    discardPile: [],
    exhaustPile: [],
    hand: [],
    playerHp: hpCarry ?? hero.hpMax,
    playerHpMax: hpMaxCarry ?? hero.hpMax,
    playerPhy: pPhy, playerInt: pInt, playerAgi: pAgi,
    playerPhyBase: pPhy, playerIntBase: pInt, playerAgiBase: pAgi,
    playerGuard: 0, playerShield: 0,
    playerPoison: 0, playerBleed: 0,
    energy: 3, energyMax: 3, bonusEnergyNext: 0, phyPenaltyNext: 0,
    damageReducedThisTurn: false,
    enemyHp: enemyDef.hp, enemyHpMax: enemyDef.hp,
    enemyPhy: enemyDef.phy, enemyInt: enemyDef.int, enemyAgi: enemyDef.agi,
    enemyPhyBase: enemyDef.phy, enemyIntBase: enemyDef.int, enemyAgiBase: enemyDef.agi,
    enemyGuard: 0, enemyShield: enemyDef.initialShield || 0,
    enemyPoison: 0, enemyBleed: 0, enemyVulnerable: 0,
    enemyIntent: null, intentRota, intentRotaIdx: 0,
    isBoss, bossPhase, bossDef,
    enemyDef,
    isElite,
    turn: 1,
    doylePassiveTriggered: false,
    hasResurrection: false,
    _zhangCounterPending: false,
    _goldDelta: 0,
    _logTurns: [], // diagnostic
  };
  s.drawPile = shuffle(rng, s.deck.map((c) => copyCard(c.libraryKey)));
  return s;
}

function advanceEnemyIntent(s) {
  if (s.isBoss && s.bossDef?.phases?.length > 1) {
    const hp50 = s.enemyHpMax * 0.5;
    const newPhase = s.enemyHp <= hp50 ? 1 : 0;
    if (newPhase !== s.bossPhase) {
      s.bossPhase = newPhase;
      s.intentRota = s.bossDef.phases[newPhase].intentRota;
      s.intentRotaIdx = 0;
    }
  }
  s.enemyIntent = s.intentRota[s.intentRotaIdx % s.intentRota.length];
  s.intentRotaIdx++;
}

function startPlayerTurn(s) {
  s.playerGuard = 0;
  s.damageReducedThisTurn = false;
  if ((s.playerPoison || 0) > 0) {
    s.playerHp = Math.max(0, s.playerHp - s.playerPoison);
    checkResurrection(s);
    if (s.playerHp <= 0) return false;
  }
  if ((s.enemyPoison || 0) > 0) {
    s.enemyHp = Math.max(0, s.enemyHp - s.enemyPoison);
    if (s.enemyHp <= 0) return true; // win flag handled by caller via enemyHp check
  }
  if ((s.phyPenaltyNext || 0) > 0) {
    s.playerPhy = Math.max(1, s.playerPhy - s.phyPenaltyNext);
    s.phyPenaltyNext = 0;
  }
  // Doyle passive
  if (s.heroPassive === "doyle" && !s.doylePassiveTriggered && s.playerHp < s.playerHpMax * 0.7) {
    s.playerInt += 3;
    s.doylePassiveTriggered = true;
  }
  s.energy = s.energyMax + (s.bonusEnergyNext || 0);
  s.bonusEnergyNext = 0;
  drawCards(s, 5);
  advanceEnemyIntent(s);
  return null; // continue
}

function applyKaihimePassive(s) {
  if (s.heroPassive !== "kaihime") return;
  if (s.enemyHp <= 0) return;
  if (s.rng.next() >= 0.5) return;
  const dmg = Math.max(1, Math.floor(s.playerPhy * 0.5));
  s.enemyHp = Math.max(0, s.enemyHp - dmg);
}
function applyZhangPassive(s) {
  if (!s._zhangCounterPending) return;
  s._zhangCounterPending = false;
  if (s.playerHp <= 0 || s.enemyHp <= 0) return;
  const dmg = Math.max(1, Math.floor(s.playerPhy * 0.2));
  s.enemyHp = Math.max(0, s.enemyHp - dmg);
}

function playCard(s, idx) {
  const card = s.hand[idx];
  if (!card || card.cost > s.energy) return false;
  s.energy -= card.cost;
  s.hand.splice(idx, 1);
  if (card.exhaust) s.exhaustPile.push(card);
  else s.discardPile.push(card);
  card.play(s);
  if (s.enemyHp <= 0) return true; // win flagged
  applyKaihimePassive(s);
  return true;
}

function endPlayerTurn(s) {
  // discard remaining hand
  s.discardPile.push(...s.hand);
  s.hand = [];
}

function enemyTurn(s) {
  const it = s.enemyIntent;
  if (!it) {
    s.turn++;
    return startPlayerTurn(s);
  }
  switch (it.kind) {
    case "attack":
      dealPhySkillFromEnemyToPlayer(s, it.phyPct);
      break;
    case "attackPoison":
      dealPhySkillFromEnemyToPlayer(s, it.phyPct);
      if (s.playerHp > 0 && (it.poisonStacks || 0) > 0)
        s.playerPoison = (s.playerPoison || 0) + it.poisonStacks;
      break;
    case "attackBleed":
      dealPhySkillFromEnemyToPlayer(s, it.phyPct);
      if (s.playerHp > 0 && (it.bleedStacks || 0) > 0)
        s.playerBleed = (s.playerBleed || 0) + it.bleedStacks;
      break;
    case "attackDouble":
      dealPhySkillFromEnemyToPlayer(s, it.phyPct);
      if (s.playerHp > 0) dealPhySkillFromEnemyToPlayer(s, it.phyPct);
      break;
    case "attackInt":
      dealIntSkillFromEnemyToPlayer(s, it.intPct);
      break;
    case "attackIntDouble":
      dealIntSkillFromEnemyToPlayer(s, it.intPct);
      if (s.playerHp > 0) dealIntSkillFromEnemyToPlayer(s, it.intPct);
      break;
    case "healSelf": {
      const heal = Math.max(1, Math.floor((s.enemyHpMax * it.pct) / 100));
      s.enemyHp = Math.min(s.enemyHpMax, s.enemyHp + heal);
      break;
    }
    case "buffSelf":
      if (it.phyAdd) s.enemyPhy += it.phyAdd;
      if (it.intAdd) s.enemyInt += it.intAdd;
      break;
    case "guard":
      s.enemyGuard += it.value;
      break;
    case "special":
      dealSpecialMaxHpPercentToPlayer(s, it.pct);
      break;
  }
  if (s.playerHp <= 0) return false;
  applyZhangPassive(s);
  if (s.enemyHp <= 0) return true;
  s.turn++;
  return startPlayerTurn(s);
}

module.exports = {
  makeRng,
  makeBattleApi,
  makeCombat,
  startPlayerTurn,
  playCard,
  endPlayerTurn,
  enemyTurn,
  applyLlExtEffect,
  shuffle,
  drawCards,
  // exposed for diagnostics
  cutRateFromPhy, cutRateFromInt, critRateFromAgi,
  phyIntDamageAfterCut,
};
