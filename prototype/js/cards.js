import { img } from "./constants.js";

export function battleIconUrl(iconFileName) {
  if (!iconFileName) return img("Image/BattleIcons/Parameters/phy.png");
  const normalized = iconFileName.toLowerCase();
  const folder =
    normalized.startsWith("buf_") || normalized.startsWith("dbf_") ? "Buffs" : "Parameters";
  return img("Image/BattleIcons/" + folder + "/" + normalized);
}

/** @param {(msg: string) => void} clog */
function makeCardLibrary(clog, dealDamage, drawCards) {
  return {
    ext1001: {
      libraryKey: "ext1001",
      extId: 1001,
      extNameJa: "ノービスブレード",
      skillNameJa: "ノービススラッシュ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      text: "先頭の敵に PHY の 50〜60% 相当のダメージ（プロト: 7）",
      play(s) {
        dealDamage(s, 7);
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
      text: "敵全体 INT ダメージの簡略：5 ダメージ＋脆弱",
      play(s) {
        dealDamage(s, 5);
        s.enemyVulnerable = Math.max(s.enemyVulnerable || 0, 3);
        clog("敵に脆弱（次の攻撃で追加ダメージ）");
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
      text: "最低 HP の味方＝自分を 30〜40% 回復のイメージ（プロト: +8）",
      play(s) {
        const heal = 8;
        const before = s.playerHp;
        s.playerHp = Math.min(s.playerHpMax, s.playerHp + heal);
        clog("リカバリー: HP +" + (s.playerHp - before));
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
      text: "PHY 5〜10% アップのイメージでブロック +7",
      play(s) {
        s.playerBlock += 7;
        clog("ノービスプロテクション: ブロック +7");
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
      text: "AGI 10% アップのイメージ：ブロック +3、次ターン ⚡+1",
      play(s) {
        s.playerBlock += 3;
        s.bonusEnergyNext = (s.bonusEnergyNext || 0) + 1;
        clog("ノービスチャージ: 次ターン +⚡1");
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
      text: "先頭の敵に PHY の 45〜55% 相当（プロト: 8）",
      play(s) {
        dealDamage(s, 8);
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
      text: "敵全体 INT のイメージでカードを 2 枚引く",
      play(s) {
        drawCards(s, 2);
      },
    },
  };
}

export function createCardRuntime(clog, dealDamage, drawCards) {
  const CARD_LIBRARY = makeCardLibrary(clog, dealDamage, drawCards);
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
