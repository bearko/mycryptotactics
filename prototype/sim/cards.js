/**
 * Card library port — mirrors prototype/js/cards.js play() logic exactly.
 * Stripped of UI helpers (effectSummaryLines, previewLines, peekHelpKeys).
 * Uses battleApi from engine.js for damage/heal/draw side-effects.
 */

function makeCardLibrary(api) {
  return {
    ext1001: { libraryKey: "ext1001", cost: 1, type: "atk",
      play: (s) => api.dealPhySkillToEnemy(s, 50, 60) },
    ext1002: { libraryKey: "ext1002", cost: 1, type: "atk",
      play: (s) => { api.dealIntSkillToEnemy(s, 25, 30); s.enemyInt = Math.max(1, s.enemyInt - 2); } },
    ext1003: { libraryKey: "ext1003", cost: 1, type: "skl",
      play: (s) => api.healPlayerFromIntSkill(s, 30, 40) },
    ext1004: { libraryKey: "ext1004", cost: 1, type: "skl",
      play: (s) => { s.playerPhy += 2; s.playerGuard += 7; } },
    ext1005: { libraryKey: "ext1005", cost: 1, type: "skl",
      play: (s) => { s.playerAgi += 3; s.playerGuard += 3; s.bonusEnergyNext = (s.bonusEnergyNext || 0) + 1; } },
    ext1006: { libraryKey: "ext1006", cost: 1, type: "atk",
      play: (s) => api.dealPhySkillToEnemy(s, 45, 55) },
    ext1008: { libraryKey: "ext1008", cost: 1, type: "skl",
      play: (s) => { s.playerInt += 1; api.drawCards(s, 2); api.dealIntSkillToEnemy(s, 15, 20); } },
    ext1011: { libraryKey: "ext1011", cost: 1, type: "atk",
      play: (s) => api.dealPhySkillToEnemy(s, 45, 55) },
    ext1012: { libraryKey: "ext1012", cost: 1, type: "atk",
      play: (s) => {
        api.dealPhySkillToEnemy(s, 40, 40);
        const down = Math.max(1, Math.floor(s.playerPhy * 0.03));
        s.enemyAgi = Math.max(1, s.enemyAgi - down);
      } },
    ext1022: { libraryKey: "ext1022", cost: 1, type: "atk",
      play: (s) => {
        api.dealIntSkillToEnemy(s, 15, 20);
        const down = Math.max(1, Math.floor(s.playerInt * 0.06));
        s.enemyInt = Math.max(1, s.enemyInt - down);
      } },
    ext1023: { libraryKey: "ext1023", cost: 1, type: "atk",
      play: (s) => {
        api.dealPhySkillToEnemy(s, 30, 40);
        const down = Math.max(1, Math.floor(s.playerPhy * 0.09));
        s.playerPhy = Math.max(1, s.playerPhy - down);
      } },

    // Elite cards (rebalanced #22: cost 1 with stronger effects)
    ext2001: { libraryKey: "ext2001", cost: 1, type: "atk",
      play: (s) => api.dealPhySkillToEnemy(s, 65, 80) },
    ext2002: { libraryKey: "ext2002", cost: 1, type: "atk",
      play: (s) => {
        api.dealIntSkillToEnemy(s, 35, 45);
        s.enemyInt = Math.max(1, s.enemyInt - 3);
      } },
    ext2003: { libraryKey: "ext2003", cost: 0, type: "skl", exhaust: true,
      play: (s) => {
        const heal = Math.floor((s.playerInt + s.playerPhy) / 2);
        s.playerHp = Math.min(s.playerHpMax, s.playerHp + heal);
      } },
    ext2004: { libraryKey: "ext2004", cost: 1, type: "skl",
      play: (s) => { s.playerPhy += 3; s.playerGuard += 12; } },
    ext2005: { libraryKey: "ext2005", cost: 1, type: "skl",
      play: (s) => { s.playerGuard += 8; s.playerAgi += 2; } },
    ext2006: { libraryKey: "ext2006", cost: 1, type: "atk",
      play: (s) => api.dealPhySkillToEnemy(s, 60, 75) },
    ext2008: { libraryKey: "ext2008", cost: 1, type: "skl",
      play: (s) => { s.playerInt += 2; api.drawCards(s, 3); } },
    ext2011: { libraryKey: "ext2011", cost: 1, type: "atk",
      play: (s) => api.dealPhySkillToEnemy(s, 60, 75) },
    ext2013: { libraryKey: "ext2013", cost: 1, type: "atk",
      play: (s) => api.dealPhySkillToEnemy(s, 55, 70) },

    // 章 0 アバカス
    cd101: { libraryKey: "cd101", cost: 1, type: "atk",
      play: (s) => api.dealPhySkillToEnemy(s, 100, 100) },
    cd102: { libraryKey: "cd102", cost: 2, type: "atk",
      play: (s) => { api.dealPhySkillToEnemy(s, 70, 70); if (s.enemyHp > 0) api.dealPhySkillToEnemy(s, 70, 70); } },
    cd103: { libraryKey: "cd103", cost: 1, type: "skl",
      play: (s) => { s.playerGuard += 6; } },
    cd104: { libraryKey: "cd104", cost: 1, type: "skl",
      play: (s) => { s.energy = Math.min(s.energy + 1, (s.energyMax || 3) + 3); } },
    cd105: { libraryKey: "cd105", cost: 2, type: "atk",
      play: (s) => api.dealPhySkillToEnemy(s, 150, 150) },
    cd106: { libraryKey: "cd106", cost: 1, type: "skl",
      play: (s) => { s.playerPhy += 3; } },
    cd107: { libraryKey: "cd107", cost: 1, type: "skl",
      play: (s) => {
        const heal = Math.floor((s.playerInt + s.playerPhy) / 2);
        s.playerHp = Math.min(s.playerHpMax, s.playerHp + heal);
      } },
    cd108: { libraryKey: "cd108", cost: 0, type: "atk",
      play: (s) => { api.dealPhySkillToEnemy(s, 60, 60); s.phyPenaltyNext = (s.phyPenaltyNext || 0) + 3; } },

    // 章 1 ホレリス
    cdH01: { libraryKey: "cdH01", cost: 1, type: "atk", exhaust: true,
      play: (s) => api.dealPhySkillToEnemy(s, 80, 80) },
    cdH02: { libraryKey: "cdH02", cost: 1, type: "atk",
      play: (s) => { api.dealPhySkillToEnemy(s, 60, 60); if (s.enemyHp > 0) api.addBleedToEnemy(s, 1); } },
    cdH03: { libraryKey: "cdH03", cost: 1, type: "skl",
      play: (s) => { s.playerGuard += 8; s.playerAgi += 2; } },
    cdH04: { libraryKey: "cdH04", cost: 0, type: "skl", exhaust: true,
      play: (s) => {
        const heal = Math.floor((s.playerInt + s.playerPhy) / 2);
        s.playerHp = Math.min(s.playerHpMax, s.playerHp + heal);
      } },
    cdH05: { libraryKey: "cdH05", cost: 1, type: "atk",
      play: (s) => { api.dealPhySkillToEnemy(s, 50, 50); if (s.enemyHp > 0) api.dealPhySkillToEnemy(s, 50, 50); } },
    cdH06: { libraryKey: "cdH06", cost: 2, type: "skl",
      play: (s) => { s.playerInt += 2; api.drawCards(s, 3); } },

    // 章 2 アンティキティラ (chapter idx 2 in this code)
    cd201: { libraryKey: "cd201", cost: 1, type: "atk",
      play: (s) => { api.dealPhySkillToEnemy(s, 60, 60); if (s.enemyHp > 0) api.addPoisonToEnemy(s, 2); } },
    cd202: { libraryKey: "cd202", cost: 2, type: "atk",
      play: (s) => { api.dealPhySkillToEnemy(s, 90, 90); if (s.enemyHp > 0) api.addBleedToEnemy(s, 2); } },
    cd203: { libraryKey: "cd203", cost: 0, type: "skl",
      play: (s) => api.clearPlayerDebuffs(s) },
    cd204: { libraryKey: "cd204", cost: 2, type: "skl",
      play: (s) => { s.playerGuard += 12; } },
    cd205: { libraryKey: "cd205", cost: 1, type: "atk",
      play: (s) => { for (let i = 0; i < 3 && s.enemyHp > 0; i++) api.dealIntSkillToEnemy(s, 50, 50); } },
    cd206: { libraryKey: "cd206", cost: 0, type: "skl",
      play: (s) => api.addGold(s, 20) },

    // 章 3 アタナソフ → 実際は cd301-305 が章 2 アンティキティラ用
    cd301: { libraryKey: "cd301", cost: 1, type: "skl",
      play: (s) => api.addPlayerShield(s, 10) },
    cd302: { libraryKey: "cd302", cost: 3, type: "atk",
      play: (s) => api.dealPhySkillToEnemy(s, 200, 200) },
    cd303: { libraryKey: "cd303", cost: 2, type: "skl",
      play: (s) => { s.playerPhy += 5; s.playerInt += 5; } },
    cd304: { libraryKey: "cd304", cost: 2, type: "atk",
      play: (s) => api.dealIntSkillToEnemyCrit(s, 130, 130) },
    cd305: { libraryKey: "cd305", cost: 0, type: "skl",
      play: (s) => api.setDamageReducedThisTurn(s) },
  };
}

function copyCard(LIB, key) {
  const def = LIB[key];
  if (!def) throw new Error(`Unknown card key: ${key}`);
  return { ...def, play: def.play };
}

function makeStarterDeck(LIB, hero) {
  const d = [];
  const recipe = (hero && hero.starterDeck) || { ext1001: 5, ext1004: 4, ext1008: 1 };
  for (const [key, count] of Object.entries(recipe)) {
    for (let i = 0; i < count; i++) d.push(copyCard(LIB, key));
  }
  return d;
}

module.exports = { makeCardLibrary, copyCard, makeStarterDeck };
