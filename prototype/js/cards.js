import { img } from "./constants.js";

export function battleIconUrl(iconFileName) {
  if (!iconFileName) return img("Image/BattleIcons/Parameters/phy.png");
  const normalized = iconFileName.toLowerCase();
  const folder =
    normalized.startsWith("buf_") || normalized.startsWith("dbf_") ? "Buffs" : "Parameters";
  return img("Image/BattleIcons/" + folder + "/" + normalized);
}

/**
 * @param {(msg: string) => void} clog
 * @param {{
 *   dealPhySkillToEnemy: (s: any, minPct: number, maxPct: number) => void,
 *   dealIntSkillToEnemy: (s: any, minPct: number, maxPct: number) => void,
 *   healPlayerFromIntSkill: (s: any, minPct: number, maxPct: number) => void,
 *   drawCards: (s: any, n: number) => void,
 * }} api
 */
function makeCardLibrary(clog, api) {
  return {
    ext1001: {
      libraryKey: "ext1001",
      extId: 1001,
      extNameJa: "ノービスブレード",
      skillNameJa: "ノービススラッシュ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      text: "先頭の敵に PHY の 50〜60%（MCH 式: カット率・クリ適用）",
      play(s) {
        api.dealPhySkillToEnemy(s, 50, 60);
      },
    },
    ext1002: {
      libraryKey: "ext1002",
      extId: 1002,
      extNameJa: "ノービスマスケット",
      skillNameJa: "ノービスショット",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      text: "敵全体 INT の 25〜30%（カット率適用）。INT デバフ -2",
      play(s) {
        api.dealIntSkillToEnemy(s, 25, 30);
        s.enemyInt = Math.max(1, s.enemyInt - 2);
        clog("敵 INT -2");
      },
    },
    ext1003: {
      libraryKey: "ext1003",
      extId: 1003,
      extNameJa: "ノービスペン",
      skillNameJa: "リカバリー",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      text: "回復係数×30〜40%（(自分INT+自分PHY)/2）",
      play(s) {
        api.healPlayerFromIntSkill(s, 30, 40);
      },
    },
    ext1004: {
      libraryKey: "ext1004",
      extId: 1004,
      extNameJa: "ノービスアーマー",
      skillNameJa: "ノービスプロテクション",
      skillIcon: "BUF_phy.png",
      cost: 1,
      type: "skl",
      text: "PHY+2。ガード（PHY依存の軽減値）+7",
      play(s) {
        s.playerPhy += 2;
        s.playerGuard += 7;
        clog("ノービスプロテクション: PHY+2、ガード+7");
      },
    },
    ext1005: {
      libraryKey: "ext1005",
      extId: 1005,
      extNameJa: "ノービスホース",
      skillNameJa: "ノービスチャージ",
      skillIcon: "BUF_agi.png",
      cost: 1,
      type: "skl",
      text: "AGI+3（クリ率↑）。ガード+3、次ターン⚡+1",
      play(s) {
        s.playerAgi += 3;
        s.playerGuard += 3;
        s.bonusEnergyNext = (s.bonusEnergyNext || 0) + 1;
        clog("ノービスチャージ: AGI+3、ガード+3、次ターン+⚡1");
      },
    },
    ext1006: {
      libraryKey: "ext1006",
      extId: 1006,
      extNameJa: "ノービスカタナ",
      skillNameJa: "ノービスイアイ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      text: "先頭の敵に PHY の 45〜55%（MCH 式）",
      play(s) {
        api.dealPhySkillToEnemy(s, 45, 55);
      },
    },
    ext1008: {
      libraryKey: "ext1008",
      extId: 1008,
      extNameJa: "ノービスブック",
      skillNameJa: "ノービスリーディング",
      skillIcon: "int.png",
      cost: 1,
      type: "skl",
      text: "INT+1。カード2枚。敵に INT 15〜20%",
      play(s) {
        s.playerInt += 1;
        api.drawCards(s, 2);
        api.dealIntSkillToEnemy(s, 15, 20);
      },
    },
  };
}

/** @param {object} api */
export function createCardRuntime(clog, api) {
  const CARD_LIBRARY = makeCardLibrary(clog, api);
  function copyCard(key) {
    const def = CARD_LIBRARY[key];
    return { ...def, play: def.play };
  }
  function makeStarterDeck() {
    const d = [];
    for (let i = 0; i < 5; i++) d.push(copyCard("ext1001"));
    for (let i = 0; i < 4; i++) d.push(copyCard("ext1004"));
    d.push(copyCard("ext1008"));
    return shuffle(d);
  }
  return { CARD_LIBRARY, copyCard, makeStarterDeck };
}

function shuffle(a) {
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export { shuffle };
