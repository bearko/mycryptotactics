import { img } from "./constants.js";
import {
  cutRateFromPhy,
  cutRateFromInt,
  randomSkillRatePct,
  phyIntDamageAfterCut,
  healingCoefficientIntCaster,
} from "./battle-mch.js";

export function battleIconUrl(iconFileName) {
  if (!iconFileName) return img("Image/BattleIcons/Parameters/phy.png");
  const normalized = iconFileName.toLowerCase();
  const folder =
    normalized.startsWith("buf_") || normalized.startsWith("dbf_")
      ? "Buffs"
      : "Parameters";
  return img("Image/BattleIcons/" + folder + "/" + normalized);
}

function avgPct(minPct, maxPct) {
  return Math.floor((minPct + maxPct) / 2);
}

function estPhyHit(playerPhy, enemyPhy, minPct, maxPct) {
  const pct = avgPct(minPct, maxPct);
  const cut = cutRateFromPhy(enemyPhy);
  return phyIntDamageAfterCut(playerPhy, pct, cut);
}

function estIntHit(playerInt, enemyInt, minPct, maxPct) {
  const pct = avgPct(minPct, maxPct);
  const cut = cutRateFromInt(enemyInt);
  return phyIntDamageAfterCut(playerInt, pct, cut);
}

function estHealInt(casterInt, targetPhy, minPct, maxPct) {
  const pct = avgPct(minPct, maxPct);
  const coef = healingCoefficientIntCaster(casterInt, targetPhy);
  return Math.max(0, Math.floor((coef * pct) / 100));
}

/**
 * @param {(msg: string) => void} clog
 * @param {{
 *   dealPhySkillToEnemy: (s: any, minPct: number, maxPct: number) => void,
 *   dealIntSkillToEnemy: (s: any, minPct: number, maxPct: number) => void,
 *   healPlayerFromIntSkill: (s: any, minPct: number, maxPct: number) => void,
 *   drawCards: (s: any, n: number) => void,
 *   playBattleSe: (kind: 'hit'|'heal'|'buff'|'debuff'|'area') => void,
 *   portraitFx: (who: 'player'|'enemy', kind: 'hit'|'heal'|'buff'|'debuff'|'area') => void,
 * }} api
 */
function makeCardLibrary(clog, api) {
  const se = api.playBattleSe;
  const fx = api.portraitFx;
  return {
    ext1001: {
      libraryKey: "ext1001",
      extId: 1001,
      extNameJa: "ノービスブレード",
      skillNameJa: "ノービススラッシュ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      previewLines(s) {
        const d = estPhyHit(s.playerPhy, s.enemyPhy, 50, 60);
        return [`敵1体に ${d} ダメージ（PHY ${50}〜${60}% 想定）`];
      },
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
      previewLines(s) {
        const d = estIntHit(s.playerInt, s.enemyInt, 25, 30);
        return [`敵1体に ${d} ダメージ（INT ${25}〜${30}%）`, "敵の INT を 2 下げる"];
      },
      play(s) {
        api.dealIntSkillToEnemy(s, 25, 30);
        s.enemyInt = Math.max(1, s.enemyInt - 2);
        se("debuff");
        fx("enemy", "debuff");
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
      previewLines(s) {
        const lo = estHealInt(s.playerInt, s.playerPhy, 30, 30);
        const hi = estHealInt(s.playerInt, s.playerPhy, 40, 40);
        return [`HP を ${lo}〜${hi} 回復（INT 回復・係数反映）`];
      },
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
      previewLines() {
        return ["PHY を +2", "ガードを 7 得る（ターン終了まで有効）"];
      },
      play(s) {
        se("buff");
        fx("player", "buff");
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
      previewLines() {
        return [
          "AGI を +3",
          "ガードを 3 得る",
          "次の自分のターン開始時に ⚡+1（エナジー）",
        ];
      },
      play(s) {
        se("buff");
        fx("player", "buff");
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
      previewLines(s) {
        const d = estPhyHit(s.playerPhy, s.enemyPhy, 45, 55);
        return [`敵1体に ${d} ダメージ（PHY ${45}〜${55}%）`];
      },
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
      previewLines(s) {
        const d = estIntHit(s.playerInt + 1, s.enemyInt, 15, 20);
        return [
          "INT を +1",
          "カードを 2 枚引く",
          `その後、敵1体に ${d} ダメージ（INT+1 後・${15}〜${20}% 想定）`,
        ];
      },
      play(s) {
        api.playBattleSe("buff");
        fx("player", "buff");
        s.playerInt += 1;
        api.drawCards(s, 2);
        api.dealIntSkillToEnemy(s, 15, 20);
      },
    },
    ext1011: {
      libraryKey: "ext1011",
      extId: 1011,
      extNameJa: "アックス",
      skillNameJa: "ノービスチョップ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      previewLines(s) {
        const d = estPhyHit(s.playerPhy, s.enemyPhy, 45, 55);
        return [`敵1体に ${d} ダメージ（PHY ${45}〜${55}%）`];
      },
      play(s) {
        api.dealPhySkillToEnemy(s, 45, 55);
      },
    },
    ext1012: {
      libraryKey: "ext1012",
      extId: 1012,
      extNameJa: "ETHEREMON-EKOPI",
      skillNameJa: "エコピタックル",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      previewLines(s) {
        const d = estPhyHit(s.playerPhy, s.enemyPhy, 40, 40);
        const agiDown = Math.max(1, Math.floor(s.playerPhy * 0.03));
        return [`敵1体に ${d} ダメージ（PHY 40%）`, `自身の PHY の約 3% 分、敵の AGI を下げる（-${agiDown} 想定）`];
      },
      play(s) {
        api.dealPhySkillToEnemy(s, 40, 40);
        const down = Math.max(1, Math.floor(s.playerPhy * 0.03));
        s.enemyAgi = Math.max(1, s.enemyAgi - down);
        se("debuff");
        fx("enemy", "debuff");
        clog("敵 AGI -" + down);
      },
    },
    ext1022: {
      libraryKey: "ext1022",
      extId: 1022,
      extNameJa: "ドラゴン",
      skillNameJa: "ドラゴンブレス",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      previewLines(s) {
        const d = estIntHit(s.playerInt, s.enemyInt, 15, 20);
        const intDown = Math.max(1, Math.floor(s.playerInt * 0.06));
        return [
          `敵全体に相当する ${d} ダメージ（INT ${15}〜${20}%・単体敵プロト）`,
          `敵の INT を約 6% 下げる（-${intDown} 想定）`,
        ];
      },
      play(s) {
        se("area");
        api.dealIntSkillToEnemy(s, 15, 20);
        const down = Math.max(1, Math.floor(s.playerInt * 0.06));
        s.enemyInt = Math.max(1, s.enemyInt - down);
        se("debuff");
        fx("enemy", "debuff");
        clog("敵 INT -" + down);
      },
    },
    ext1023: {
      libraryKey: "ext1023",
      extId: 1023,
      extNameJa: "ブル",
      skillNameJa: "ブルラッシュ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      previewLines(s) {
        const d = estPhyHit(s.playerPhy, s.enemyPhy, 30, 40);
        const selfDown = Math.max(1, Math.floor(s.playerPhy * 0.09));
        return [
          `敵全体に相当する ${d} ダメージ（PHY ${30}〜${40}%・単体敵プロト）`,
          `反動で自身の PHY を約 9% 下げる（-${selfDown} 想定）`,
        ];
      },
      play(s) {
        se("area");
        api.dealPhySkillToEnemy(s, 30, 40);
        const down = Math.max(1, Math.floor(s.playerPhy * 0.09));
        s.playerPhy = Math.max(1, s.playerPhy - down);
        se("debuff");
        fx("player", "debuff");
        clog("自身 PHY -" + down);
      },
    },
    ext2001: {
      libraryKey: "ext2001",
      extId: 2001,
      extNameJa: "エリートブレード",
      skillNameJa: "エリートスラッシュ",
      skillIcon: "phy.png",
      cost: 2,
      type: "atk",
      previewLines(s) {
        const d = estPhyHit(s.playerPhy, s.enemyPhy, 55, 65);
        return [`敵1体に ${d} ダメージ（PHY ${55}〜${65}%）`];
      },
      play(s) {
        api.dealPhySkillToEnemy(s, 55, 65);
      },
    },
    ext2002: {
      libraryKey: "ext2002",
      extId: 2002,
      extNameJa: "エリートマスケット",
      skillNameJa: "エリートショット",
      skillIcon: "int.png",
      cost: 2,
      type: "atk",
      previewLines(s) {
        const d = estIntHit(s.playerInt, s.enemyInt, 30, 35);
        return [`敵全体に相当する ${d} ダメージ（INT ${30}〜${35}%・単体敵プロト）`];
      },
      play(s) {
        se("area");
        api.dealIntSkillToEnemy(s, 30, 35);
      },
    },
    ext2004: {
      libraryKey: "ext2004",
      extId: 2004,
      extNameJa: "エリートアーマー",
      skillNameJa: "エリートプロテクション",
      skillIcon: "BUF_phy.png",
      cost: 2,
      type: "skl",
      previewLines(s) {
        const lo = Math.max(1, Math.floor(s.playerPhy * 0.1));
        const hi = Math.max(1, Math.floor(s.playerPhy * 0.15));
        return [`自身の PHY を ${lo}〜${hi} アップ（約 10〜15%）`];
      },
      play(s) {
        se("buff");
        fx("player", "buff");
        const up = randomSkillRatePct(10, 15);
        const add = Math.max(1, Math.floor((s.playerPhy * up) / 100));
        s.playerPhy += add;
        clog("エリートプロテクション: PHY+" + add);
      },
    },
    ext2006: {
      libraryKey: "ext2006",
      extId: 2006,
      extNameJa: "エリートカタナ",
      skillNameJa: "エリートイアイ",
      skillIcon: "phy.png",
      cost: 2,
      type: "atk",
      previewLines(s) {
        const d = estPhyHit(s.playerPhy, s.enemyPhy, 50, 60);
        return [`敵1体に ${d} ダメージ（PHY ${50}〜${60}%）`];
      },
      play(s) {
        api.dealPhySkillToEnemy(s, 50, 60);
      },
    },
    ext2011: {
      libraryKey: "ext2011",
      extId: 2011,
      extNameJa: "エリートアックス",
      skillNameJa: "エリートチョップ",
      skillIcon: "phy.png",
      cost: 2,
      type: "atk",
      previewLines(s) {
        const d = estPhyHit(s.playerPhy, s.enemyPhy, 50, 60);
        return [`敵1体に ${d} ダメージ（PHY ${50}〜${60}%）`];
      },
      play(s) {
        api.dealPhySkillToEnemy(s, 50, 60);
      },
    },
    ext2013: {
      libraryKey: "ext2013",
      extId: 2013,
      extNameJa: "エリートユミ",
      skillNameJa: "エリートスナイプ",
      skillIcon: "phy.png",
      cost: 2,
      type: "atk",
      previewLines(s) {
        const d = estPhyHit(s.playerPhy, s.enemyPhy, 40, 50);
        return [`敵1体に ${d} ダメージ（PHY ${40}〜${50}%・高INT相手想定）`];
      },
      play(s) {
        api.dealPhySkillToEnemy(s, 40, 50);
      },
    },
  };
}

/** @param {object} api */
export function createCardRuntime(clog, api) {
  const CARD_LIBRARY = makeCardLibrary(clog, api);
  function copyCard(key) {
    const def = CARD_LIBRARY[key];
    return { ...def, play: def.play, previewLines: def.previewLines };
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
