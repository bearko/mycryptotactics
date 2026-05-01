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

/** カード下の簡易効果行（「パラメーター名　数値」形式） */
/** @typedef {('guard'|'shield'|'energy'|'draw'|'phy'|'int'|'agi'|'hp')[]} PeekHelpKey */

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
      target: "enemy.foremost",
      effectSummaryLines(s) {
        const d = estPhyHit(s.playerPhy, s.enemyPhy, 50, 60);
        return [`敵にダメージ　${d}`];
      },
      peekHelpKeys() {
        return [];
      },
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
      target: "enemy.foremost",
      effectSummaryLines(s) {
        const d = estIntHit(s.playerInt, s.enemyInt, 25, 30);
        return [`敵にダメージ　${d}`, "INT　−2（敵）"];
      },
      peekHelpKeys() {
        return ["int"];
      },
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
      target: "self",
      effectSummaryLines(s) {
        const lo = estHealInt(s.playerInt, s.playerPhy, 30, 30);
        const hi = estHealInt(s.playerInt, s.playerPhy, 40, 40);
        return [`HP　+${lo}〜${hi}`];
      },
      peekHelpKeys() {
        return ["hp"];
      },
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
      target: "self",
      effectSummaryLines() {
        return ["PHY　+2", "ガード　+7"];
      },
      peekHelpKeys() {
        return ["phy", "guard"];
      },
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
      target: "self",
      effectSummaryLines() {
        return ["AGI　+3", "ガード　+3", "次ターン ⚡　+1"];
      },
      peekHelpKeys() {
        return ["agi", "guard", "energy"];
      },
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
      target: "enemy.foremost",
      effectSummaryLines(s) {
        const d = estPhyHit(s.playerPhy, s.enemyPhy, 45, 55);
        return [`敵にダメージ　${d}`];
      },
      peekHelpKeys() {
        return [];
      },
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
      target: "enemy.foremost",
      effectSummaryLines(s) {
        const d = estIntHit(s.playerInt + 1, s.enemyInt, 15, 20);
        return ["INT　+1", "ドロー　2", `敵にダメージ　${d}`];
      },
      peekHelpKeys() {
        return ["int", "draw"];
      },
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
      target: "enemy.foremost",
      effectSummaryLines(s) {
        const d = estPhyHit(s.playerPhy, s.enemyPhy, 45, 55);
        return [`敵にダメージ　${d}`];
      },
      peekHelpKeys() {
        return [];
      },
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
      target: "enemy.foremost",
      effectSummaryLines(s) {
        const d = estPhyHit(s.playerPhy, s.enemyPhy, 40, 40);
        const agiDown = Math.max(1, Math.floor(s.playerPhy * 0.03));
        return [`敵にダメージ　${d}`, `AGI　−${agiDown}（敵）`];
      },
      peekHelpKeys() {
        return ["agi"];
      },
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
      target: "enemy.foremost",
      effectSummaryLines(s) {
        const d = estIntHit(s.playerInt, s.enemyInt, 15, 20);
        const intDown = Math.max(1, Math.floor(s.playerInt * 0.06));
        return [`敵にダメージ　${d}`, `INT　−${intDown}（敵）`];
      },
      peekHelpKeys() {
        return ["int"];
      },
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
      target: "enemy.foremost",
      effectSummaryLines(s) {
        const d = estPhyHit(s.playerPhy, s.enemyPhy, 30, 40);
        const selfDown = Math.max(1, Math.floor(s.playerPhy * 0.09));
        return [`敵にダメージ　${d}`, `PHY　−${selfDown}（自分）`];
      },
      peekHelpKeys() {
        return ["phy"];
      },
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
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) {
        const d = estPhyHit(s.playerPhy, s.enemyPhy, 65, 80);
        return [`敵にダメージ　${d}`];
      },
      peekHelpKeys() {
        return [];
      },
      previewLines(s) {
        const d = estPhyHit(s.playerPhy, s.enemyPhy, 65, 80);
        return [`敵1体に ${d} ダメージ（PHY ${65}〜${80}%）`];
      },
      play(s) {
        api.dealPhySkillToEnemy(s, 65, 80);
      },
    },
    ext2002: {
      libraryKey: "ext2002",
      extId: 2002,
      extNameJa: "エリートマスケット",
      skillNameJa: "エリートショット",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) {
        const d = estIntHit(s.playerInt, s.enemyInt, 35, 45);
        return [`敵にダメージ　${d}`, "INT　−3（敵）"];
      },
      peekHelpKeys() {
        return ["int"];
      },
      previewLines(s) {
        const d = estIntHit(s.playerInt, s.enemyInt, 35, 45);
        return [`敵1体に ${d} ダメージ（INT ${35}〜${45}%）`, "敵の INT を 3 下げる"];
      },
      play(s) {
        api.dealIntSkillToEnemy(s, 35, 45);
        s.enemyInt = Math.max(1, s.enemyInt - 3);
        se("debuff");
        fx("enemy", "debuff");
        clog("敵 INT -3");
      },
    },
    ext2004: {
      libraryKey: "ext2004",
      extId: 2004,
      extNameJa: "エリートアーマー",
      skillNameJa: "エリートプロテクション",
      skillIcon: "BUF_phy.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines() {
        return ["PHY　+3", "ガード　+12"];
      },
      peekHelpKeys() {
        return ["phy", "guard"];
      },
      previewLines() {
        return ["PHY を +3", "ガードを 12 得る（ターン終了まで有効）"];
      },
      play(s) {
        se("buff");
        fx("player", "buff");
        s.playerPhy += 3;
        s.playerGuard += 12;
        clog("エリートプロテクション: PHY+3、ガード+12");
      },
    },
    ext2006: {
      libraryKey: "ext2006",
      extId: 2006,
      extNameJa: "エリートカタナ",
      skillNameJa: "エリートイアイ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) {
        const d = estPhyHit(s.playerPhy, s.enemyPhy, 60, 75);
        return [`敵にダメージ　${d}`];
      },
      peekHelpKeys() {
        return [];
      },
      previewLines(s) {
        const d = estPhyHit(s.playerPhy, s.enemyPhy, 60, 75);
        return [`敵1体に ${d} ダメージ（PHY ${60}〜${75}%）`];
      },
      play(s) {
        api.dealPhySkillToEnemy(s, 60, 75);
      },
    },
    ext2011: {
      libraryKey: "ext2011",
      extId: 2011,
      extNameJa: "エリートアックス",
      skillNameJa: "エリートチョップ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) {
        const d = estPhyHit(s.playerPhy, s.enemyPhy, 60, 75);
        return [`敵にダメージ　${d}`];
      },
      peekHelpKeys() {
        return [];
      },
      previewLines(s) {
        const d = estPhyHit(s.playerPhy, s.enemyPhy, 60, 75);
        return [`敵1体に ${d} ダメージ（PHY ${60}〜${75}%）`];
      },
      play(s) {
        api.dealPhySkillToEnemy(s, 60, 75);
      },
    },
    ext2013: {
      libraryKey: "ext2013",
      extId: 2013,
      extNameJa: "エリートユミ",
      skillNameJa: "エリートスナイプ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) {
        const d = estPhyHit(s.playerPhy, s.enemyPhy, 55, 70);
        return [`敵にダメージ　${d}`];
      },
      peekHelpKeys() {
        return [];
      },
      previewLines(s) {
        const d = estPhyHit(s.playerPhy, s.enemyPhy, 55, 70);
        return [`敵1体に ${d} ダメージ（PHY ${55}〜${70}%・高INT相手想定）`];
      },
      play(s) {
        api.dealPhySkillToEnemy(s, 55, 70);
      },
    },

    ext2003: {
      libraryKey: "ext2003",
      extId: 2003,
      extNameJa: "エリートペン",
      skillNameJa: "エリートリカバリー",
      skillIcon: "hp.png",
      cost: 0,
      type: "skl",
      target: "self",
      exhaust: true,
      effectSummaryLines(s) {
        const h = Math.floor((s.playerInt + s.playerPhy) / 2);
        return [`HP　+${h}`, "【消耗】"];
      },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) {
        const h = Math.floor((s.playerInt + s.playerPhy) / 2);
        return [`HP を ${h} 回復（(INT+PHY)÷2）`, "【消耗】使用後、山札に戻らず除外される"];
      },
      play(s) {
        const heal = Math.floor((s.playerInt + s.playerPhy) / 2);
        const before = s.playerHp;
        s.playerHp = Math.min(s.playerHpMax, s.playerHp + heal);
        if (s.playerHp > before) { se("heal"); fx("player", "heal"); }
        clog(`エリートリカバリー: HP+${s.playerHp - before}`);
      },
    },
    ext2005: {
      libraryKey: "ext2005",
      extId: 2005,
      extNameJa: "エリートホース",
      skillNameJa: "エリートチャージ",
      skillIcon: "BUF_agi.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines() { return ["ガード　+8", "AGI　+2（戦闘中ずっと）"]; },
      peekHelpKeys() { return ["guard", "agi"]; },
      previewLines() { return ["ガードを 8 得る", "AGI を +2（戦闘中ずっと）"]; },
      play(s) {
        se("buff"); fx("player", "buff");
        s.playerGuard += 8;
        s.playerAgi += 2;
        clog("エリートチャージ: ガード+8、AGI+2");
      },
    },
    ext2008: {
      libraryKey: "ext2008",
      extId: 2008,
      extNameJa: "エリートブック",
      skillNameJa: "エリートリーディング",
      skillIcon: "int.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines() { return ["INT　+2（戦闘中ずっと）", "ドロー　3"]; },
      peekHelpKeys() { return ["int", "draw"]; },
      previewLines() { return ["INT を +2（戦闘中ずっと）", "カードを 3 枚引く"]; },
      play(s) {
        se("buff"); fx("player", "buff");
        s.playerInt += 2;
        api.drawCards(s, 3);
        clog("エリートリーディング: INT+2、ドロー3");
      },
    },

    // ════════════════════════════════════════
    // 章 1 ── 戦国回廊 カードプール（SPEC-004 §6.4）
    // ════════════════════════════════════════
    cd101: {
      libraryKey: "cd101",
      extId: 1006,
      extNameJa: "ノービスカタナ",
      skillNameJa: "一刀",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) {
        const d = estPhyHit(s.playerPhy, s.enemyPhy, 100, 100);
        return [`敵にダメージ　${d}`];
      },
      peekHelpKeys() { return []; },
      previewLines(s) {
        const d = estPhyHit(s.playerPhy, s.enemyPhy, 100, 100);
        return [`敵1体に ${d} ダメージ（PHY 100%）`];
      },
      play(s) { api.dealPhySkillToEnemy(s, 100, 100); },
    },

    cd102: {
      libraryKey: "cd102",
      extId: 2011,
      extNameJa: "エリートアックス",
      skillNameJa: "エリートチョップ",
      skillIcon: "phy.png",
      cost: 2,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) {
        const d = estPhyHit(s.playerPhy, s.enemyPhy, 70, 70);
        return [`敵にダメージ　${d} ×2`];
      },
      peekHelpKeys() { return []; },
      previewLines(s) {
        const d = estPhyHit(s.playerPhy, s.enemyPhy, 70, 70);
        return [`敵1体に ${d} ×2 ダメージ（PHY 70% を 2 回）`];
      },
      play(s) {
        api.dealPhySkillToEnemy(s, 70, 70);
        if (s.enemyHp > 0) api.dealPhySkillToEnemy(s, 70, 70);
      },
    },

    cd103: {
      libraryKey: "cd103",
      extId: 1004,
      extNameJa: "ノービスアーマー",
      skillNameJa: "構え",
      skillIcon: "BUF_phy.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines() { return ["ガード　+6"]; },
      peekHelpKeys() { return ["guard"]; },
      previewLines() { return ["ガードを 6 得る（このターン中 PHY/INT ダメージ軽減）"]; },
      play(s) {
        se("buff"); fx("player", "buff");
        s.playerGuard += 6;
        clog("構え: ガード+6");
      },
    },

    cd104: {
      libraryKey: "cd104",
      extId: 1008,
      extNameJa: "ノービスブック",
      skillNameJa: "集中",
      skillIcon: "int.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines() { return ["⚡ +1（このターン）"]; },
      peekHelpKeys() { return ["energy"]; },
      previewLines() { return ["このターンのエナジーを 1 増やす"]; },
      play(s) {
        se("buff"); fx("player", "buff");
        s.energy = Math.min(s.energy + 1, (s.energyMax || 3) + 3);
        clog("集中: ⚡+1");
      },
    },

    cd105: {
      libraryKey: "cd105",
      extId: 2001,
      extNameJa: "エリートブレード",
      skillNameJa: "エリートスラッシュ",
      skillIcon: "phy.png",
      cost: 2,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) {
        const d = estPhyHit(s.playerPhy, s.enemyPhy, 150, 150);
        return [`敵にダメージ　${d}`];
      },
      peekHelpKeys() { return []; },
      previewLines(s) {
        const d = estPhyHit(s.playerPhy, s.enemyPhy, 150, 150);
        return [`敵1体に ${d} ダメージ（PHY 150%）`];
      },
      play(s) { api.dealPhySkillToEnemy(s, 150, 150); },
    },

    cd106: {
      libraryKey: "cd106",
      extId: 2004,
      extNameJa: "エリートアーマー",
      skillNameJa: "鼓舞",
      skillIcon: "BUF_phy.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines() { return ["PHY　+3（戦闘中ずっと）"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines() { return ["PHY を +3（戦闘中ずっと。次の戦闘では戻る）"]; },
      play(s) {
        se("buff"); fx("player", "buff");
        s.playerPhy += 3;
        clog("鼓舞: PHY+3");
      },
    },

    cd107: {
      libraryKey: "cd107",
      extId: 1003,
      extNameJa: "ノービスペン",
      skillNameJa: "治療",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) {
        const h = Math.floor((s.playerInt + s.playerPhy) / 2);
        return [`HP　+${h}`];
      },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) {
        const h = Math.floor((s.playerInt + s.playerPhy) / 2);
        return [`HP を ${h} 回復（(INT+PHY)÷2）`];
      },
      play(s) {
        const heal = Math.floor((s.playerInt + s.playerPhy) / 2);
        const before = s.playerHp;
        s.playerHp = Math.min(s.playerHpMax, s.playerHp + heal);
        if (s.playerHp > before) {
          se("heal"); fx("player", "heal");
        }
        clog(`治療: HP+${s.playerHp - before}`);
      },
    },

    cd108: {
      libraryKey: "cd108",
      extId: 1023,
      extNameJa: "ブル",
      skillNameJa: "突撃",
      skillIcon: "phy.png",
      cost: 0,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) {
        const d = estPhyHit(s.playerPhy, s.enemyPhy, 60, 60);
        return [`敵にダメージ　${d}`, "次ターン PHY -3"];
      },
      peekHelpKeys() { return ["phy"]; },
      previewLines(s) {
        const d = estPhyHit(s.playerPhy, s.enemyPhy, 60, 60);
        return [`敵1体に ${d} ダメージ（PHY 60%）`, "次のターン開始時に PHY が -3 される"];
      },
      play(s) {
        api.dealPhySkillToEnemy(s, 60, 60);
        s.phyPenaltyNext = (s.phyPenaltyNext || 0) + 3;
        clog("突撃: 次ターン PHY-3");
      },
    },

    // ════════════════════════════════════════
    // 章 1 ── ホレリス カードプール
    // ════════════════════════════════════════
    cdH01: {
      libraryKey: "cdH01",
      extId: 2006,
      extNameJa: "エリートカタナ",
      skillNameJa: "エリートイアイ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      exhaust: true,
      effectSummaryLines(s) {
        const d = estPhyHit(s.playerPhy, s.enemyPhy, 80, 80);
        return [`敵にダメージ　${d}`, "【消耗】"];
      },
      peekHelpKeys() { return []; },
      previewLines(s) {
        const d = estPhyHit(s.playerPhy, s.enemyPhy, 80, 80);
        return [`敵1体に ${d} ダメージ（PHY 80%）`, "【消耗】使用後、山札に戻らず除外される"];
      },
      play(s) { api.dealPhySkillToEnemy(s, 80, 80); },
    },

    cdH02: {
      libraryKey: "cdH02",
      extId: 1002,
      extNameJa: "ノービスマスケット",
      skillNameJa: "出血弾・速射",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) {
        const d = estPhyHit(s.playerPhy, s.enemyPhy, 60, 60);
        return [`敵にダメージ　${d}`, "出血　×1（敵）"];
      },
      peekHelpKeys() { return []; },
      previewLines(s) {
        const d = estPhyHit(s.playerPhy, s.enemyPhy, 60, 60);
        return [`敵1体に ${d} ダメージ（PHY 60%）`, "敵に出血 ×1 付与"];
      },
      play(s) {
        api.dealPhySkillToEnemy(s, 60, 60);
        if (s.enemyHp > 0) api.addBleedToEnemy(s, 1);
      },
    },

    cdH03: {
      libraryKey: "cdH03",
      extId: 2005,
      extNameJa: "エリートホース",
      skillNameJa: "疾風の構え",
      skillIcon: "BUF_agi.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines() { return ["ガード　+8", "AGI　+2（戦闘中ずっと）"]; },
      peekHelpKeys() { return ["guard", "agi"]; },
      previewLines() {
        return ["ガードを 8 得る", "AGI を +2（戦闘中ずっと）"];
      },
      play(s) {
        se("buff"); fx("player", "buff");
        s.playerGuard += 8;
        s.playerAgi += 2;
        clog("疾風の構え: ガード+8、AGI+2");
      },
    },

    cdH04: {
      libraryKey: "cdH04",
      extId: 2003,
      extNameJa: "エリートペン",
      skillNameJa: "エリートリカバリー",
      skillIcon: "hp.png",
      cost: 0,
      type: "skl",
      target: "self",
      exhaust: true,
      effectSummaryLines(s) {
        const h = Math.floor((s.playerInt + s.playerPhy) / 2);
        return [`HP　+${h}`, "【消耗】"];
      },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) {
        const h = Math.floor((s.playerInt + s.playerPhy) / 2);
        return [`HP を ${h} 回復（(INT+PHY)÷2）`, "【消耗】使用後、山札に戻らず除外される"];
      },
      play(s) {
        const heal = Math.floor((s.playerInt + s.playerPhy) / 2);
        const before = s.playerHp;
        s.playerHp = Math.min(s.playerHpMax, s.playerHp + heal);
        if (s.playerHp > before) { se("heal"); fx("player", "heal"); }
        clog(`緊急回復: HP+${s.playerHp - before}`);
      },
    },

    cdH05: {
      libraryKey: "cdH05",
      extId: 1007,
      extNameJa: "ノービスユミ",
      skillNameJa: "連矢",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) {
        const d = estPhyHit(s.playerPhy, s.enemyPhy, 50, 50);
        return [`敵にダメージ　${d} ×2`];
      },
      peekHelpKeys() { return []; },
      previewLines(s) {
        const d = estPhyHit(s.playerPhy, s.enemyPhy, 50, 50);
        return [`敵1体に ${d} ×2 ダメージ（PHY 50% を 2 回）`];
      },
      play(s) {
        api.dealPhySkillToEnemy(s, 50, 50);
        if (s.enemyHp > 0) api.dealPhySkillToEnemy(s, 50, 50);
      },
    },

    cdH06: {
      libraryKey: "cdH06",
      extId: 2008,
      extNameJa: "エリートブック",
      skillNameJa: "エリートリーディング",
      skillIcon: "int.png",
      cost: 2,
      type: "skl",
      target: "self",
      effectSummaryLines() { return ["INT　+2（戦闘中ずっと）", "ドロー　3"]; },
      peekHelpKeys() { return ["int", "draw"]; },
      previewLines() { return ["INT を +2（戦闘中ずっと）", "カードを 3 枚引く"]; },
      play(s) {
        se("buff"); fx("player", "buff");
        s.playerInt += 2;
        api.drawCards(s, 3);
        clog("知識の爆発: INT+2、ドロー3");
      },
    },

    // ════════════════════════════════════════
    // 章 2 ── 大航海の港 カードプール（SPEC-004 §7.4）
    // ════════════════════════════════════════
    cd201: {
      libraryKey: "cd201",
      extId: 1001,
      extNameJa: "ノービスブレード",
      skillNameJa: "毒の刃",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) {
        const d = estPhyHit(s.playerPhy, s.enemyPhy, 60, 60);
        return [`敵にダメージ　${d}`, "毒　×2（敵）"];
      },
      peekHelpKeys() { return []; },
      previewLines(s) {
        const d = estPhyHit(s.playerPhy, s.enemyPhy, 60, 60);
        return [`敵1体に ${d} ダメージ（PHY 60%）`, "敵に毒 ×2 付与（毎ターン 2 ダメージ）"];
      },
      play(s) {
        api.dealPhySkillToEnemy(s, 60, 60);
        if (s.enemyHp > 0) api.addPoisonToEnemy(s, 2);
      },
    },

    cd202: {
      libraryKey: "cd202",
      extId: 2013,
      extNameJa: "エリートユミ",
      skillNameJa: "エリートスナイプ",
      skillIcon: "phy.png",
      cost: 2,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) {
        const d = estPhyHit(s.playerPhy, s.enemyPhy, 90, 90);
        return [`敵にダメージ　${d}`, "出血　×2（敵）"];
      },
      peekHelpKeys() { return []; },
      previewLines(s) {
        const d = estPhyHit(s.playerPhy, s.enemyPhy, 90, 90);
        return [`敵1体に ${d} ダメージ（PHY 90%）`, "敵に出血 ×2 付与（被攻撃時 +2 追加ダメージ）"];
      },
      play(s) {
        api.dealPhySkillToEnemy(s, 90, 90);
        if (s.enemyHp > 0) api.addBleedToEnemy(s, 2);
      },
    },

    cd203: {
      libraryKey: "cd203",
      extId: 1003,
      extNameJa: "ノービスペン",
      skillNameJa: "解毒",
      skillIcon: "hp.png",
      cost: 0,
      type: "skl",
      target: "self",
      effectSummaryLines() { return ["毒・出血 解除（自分）"]; },
      peekHelpKeys() { return []; },
      previewLines() { return ["自分の毒スタックと出血スタックをすべて解除する"]; },
      play(s) { api.clearPlayerDebuffs(s); },
    },

    cd204: {
      libraryKey: "cd204",
      extId: 2004,
      extNameJa: "エリートアーマー",
      skillNameJa: "エリートプロテクション",
      skillIcon: "BUF_phy.png",
      cost: 2,
      type: "skl",
      target: "self",
      effectSummaryLines() { return ["ガード　+12"]; },
      peekHelpKeys() { return ["guard"]; },
      previewLines() { return ["ガードを 12 得る（このターン中 PHY/INT ダメージ軽減）"]; },
      play(s) {
        se("buff"); fx("player", "buff");
        s.playerGuard += 12;
        clog("防御陣: ガード+12");
      },
    },

    cd205: {
      libraryKey: "cd205",
      extId: 2002,
      extNameJa: "エリートマスケット",
      skillNameJa: "エリートショット",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) {
        const d = estIntHit(s.playerInt, s.enemyInt, 50, 50);
        return [`敵にダメージ　${d} ×3`];
      },
      peekHelpKeys() { return []; },
      previewLines(s) {
        const d = estIntHit(s.playerInt, s.enemyInt, 50, 50);
        return [`敵1体に ${d} ×3 ダメージ（INT 50% を 3 回）`];
      },
      play(s) {
        for (let i = 0; i < 3 && s.enemyHp > 0; i++) {
          api.dealIntSkillToEnemy(s, 50, 50);
        }
      },
    },

    cd206: {
      libraryKey: "cd206",
      extId: 1008,
      extNameJa: "ノービスブック",
      skillNameJa: "投資",
      skillIcon: "int.png",
      cost: 0,
      type: "skl",
      target: "self",
      effectSummaryLines() { return ["GUM　+20"]; },
      peekHelpKeys() { return []; },
      previewLines() { return ["ゴールド（GUM）を 20 得る"]; },
      play(s) { api.addGold(20); },
    },

    // ════════════════════════════════════════
    // 章 3 ── 決定の街 カードプール（SPEC-004 §8.4）
    // ════════════════════════════════════════
    cd301: {
      libraryKey: "cd301",
      extId: 1005,
      extNameJa: "ノービスホース",
      skillNameJa: "鋼の盾",
      skillIcon: "BUF_agi.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines() { return ["シールド　+10"]; },
      peekHelpKeys() { return ["shield"]; },
      previewLines() { return ["シールドを 10 得る（特殊ダメージのみ吸収）"]; },
      play(s) { api.addPlayerShield(s, 10); },
    },

    cd302: {
      libraryKey: "cd302",
      extId: 1011,
      extNameJa: "アックス",
      skillNameJa: "ノービスチョップ",
      skillIcon: "phy.png",
      cost: 3,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) {
        const d = estPhyHit(s.playerPhy, s.enemyPhy, 200, 200);
        return [`敵にダメージ　${d}`];
      },
      peekHelpKeys() { return []; },
      previewLines(s) {
        const d = estPhyHit(s.playerPhy, s.enemyPhy, 200, 200);
        return [`敵1体に ${d} ダメージ（PHY 200%）`];
      },
      play(s) { api.dealPhySkillToEnemy(s, 200, 200); },
    },

    cd303: {
      libraryKey: "cd303",
      extId: 2004,
      extNameJa: "エリートアーマー",
      skillNameJa: "エリートプロテクション",
      skillIcon: "BUF_phy.png",
      cost: 2,
      type: "skl",
      target: "self",
      effectSummaryLines() { return ["PHY　+5", "INT　+5（戦闘中ずっと）"]; },
      peekHelpKeys() { return ["phy", "int"]; },
      previewLines() { return ["PHY を +5、INT を +5（戦闘中ずっと）"]; },
      play(s) {
        se("buff"); fx("player", "buff");
        s.playerPhy += 5;
        s.playerInt += 5;
        clog("戦術指揮: PHY+5、INT+5");
      },
    },

    cd304: {
      libraryKey: "cd304",
      extId: 1022,
      extNameJa: "ドラゴン",
      skillNameJa: "ドラゴンブレス",
      skillIcon: "int.png",
      cost: 2,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) {
        const d = estIntHit(s.playerInt, s.enemyInt, 130, 130);
        return [`敵にダメージ　${d}`, "クリ確定"];
      },
      peekHelpKeys() { return []; },
      previewLines(s) {
        const d = estIntHit(s.playerInt, s.enemyInt, 130, 130);
        return [`敵1体に ${d} ダメージ（INT 130%）`, "クリティカル確定（追加ダメージあり）"];
      },
      play(s) { api.dealIntSkillToEnemyCrit(s, 130, 130); },
    },

    cd305: {
      libraryKey: "cd305",
      extId: 1005,
      extNameJa: "ノービスホース",
      skillNameJa: "ノービスチャージ",
      skillIcon: "BUF_agi.png",
      cost: 0,
      type: "skl",
      target: "self",
      effectSummaryLines() { return ["被ダメージ ½（このターン）"]; },
      peekHelpKeys() { return ["guard"]; },
      previewLines() { return ["このターン（ターン終了まで）受けるダメージをすべて半減する"]; },
      play(s) { api.setDamageReducedThisTurn(s); },
    },
// ─── auto-generated CU extensions (Common+Uncommon, 347 cards) ───
    ext1009: {
      libraryKey: "ext1009",
      extId: 1009,
      extNameJa: "ノービスリング",
      skillNameJa: "ノービスブライト",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 30, 40)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 30〜40% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 30, 40)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 30, 40);
      },
    },
    ext1010: {
      libraryKey: "ext1010",
      extId: 1010,
      extNameJa: "ノービスシールド",
      skillNameJa: "ノービスバッシュ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 25, 30)}`, "AGI\u3000-1（敵）"]; },
      peekHelpKeys() { return ["agi"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 25, 30)} ダメージ（PHY 25〜30%）`, "敵の AGI を -1"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 25, 30);
        s.enemyAgi = Math.max(1, s.enemyAgi + (-1)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext1013: {
      libraryKey: "ext1013",
      extId: 1013,
      extNameJa: "ユミ",
      skillNameJa: "ヤブサメ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 35, 45)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 35, 45)} ダメージ（PHY 35〜45%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 35, 45);
      },
    },
    ext1014: {
      libraryKey: "ext1014",
      extId: 1014,
      extNameJa: "クロススピア",
      skillNameJa: "モロテヅキ",
      skillIcon: "phy.png",
      cost: 2,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines() { return [`敵にダメージ ×2`]; },
      peekHelpKeys() { return []; },
      previewLines() { return [`敵1体に PHY 20〜25% × 2 回ダメージ`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 20, 25);
        if (s.enemyHp > 0) api.dealPhySkillToEnemy(s, 20, 25);
      },
    },
    ext1015: {
      libraryKey: "ext1015",
      extId: 1015,
      extNameJa: "ハルバード",
      skillNameJa: "スイングダウン",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 40, 50)}`, "毒 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 40, 50)} ダメージ（PHY 40〜50%）`, "敵に毒 ×1 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 40, 50);
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext1016: {
      libraryKey: "ext1016",
      extId: 1016,
      extNameJa: "スクロール",
      skillNameJa: "タクティクス",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 15, 20)}`, "毒 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 15, 20)} ダメージ（INT 15〜20%・1v1=単体）`, "敵に毒 ×1 付与"]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 15, 20);
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext1017: {
      libraryKey: "ext1017",
      extId: 1017,
      extNameJa: "ネックレス",
      skillNameJa: "ヒーリング",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 10, 10)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 10〜10% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 10, 10)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 10, 10);
      },
    },
    ext1018: {
      libraryKey: "ext1018",
      extId: 1018,
      extNameJa: "カブト",
      skillNameJa: "デバインプロテクション",
      skillIcon: "BUF_phy.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines() { return ["PHY\u3000+1", "INT\u3000+1"]; },
      peekHelpKeys() { return ["phy", "int"]; },
      previewLines() { return ["PHY を +1", "INT を +1"]; },
      play(s) {
        s.playerPhy += 1;
        s.playerInt += 1;
      },
    },
    ext1019: {
      libraryKey: "ext1019",
      extId: 1019,
      extNameJa: "タートル",
      skillNameJa: "キキョウ",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 10, 10), "PHY\u3000+1", "INT\u3000+1"]; },
      peekHelpKeys() { return ["hp", "phy", "int"]; },
      previewLines(s) { return [`HP を回復係数 10〜10% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 10, 10)}）`, "PHY を +1", "INT を +1"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 10, 10);
        s.playerPhy += 1;
        s.playerInt += 1;
      },
    },
    ext1020: {
      libraryKey: "ext1020",
      extId: 1020,
      extNameJa: "ルースター",
      skillNameJa: "グンケイ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 20, 25)}`, "AGI\u3000+1"]; },
      peekHelpKeys() { return ["agi"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 20, 25)} ダメージ（PHY 20〜25%）`, "AGI を +1"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 20, 25);
        s.playerAgi += 1;
      },
    },
    ext1021: {
      libraryKey: "ext1021",
      extId: 1021,
      extNameJa: "タイガー",
      skillNameJa: "コガ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 35, 40)}`, "PHY\u3000+1"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 35, 40)} ダメージ（PHY 35〜40%）`, "PHY を +1"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 35, 40);
        s.playerPhy += 1;
      },
    },
    ext1024: {
      libraryKey: "ext1024",
      extId: 1024,
      extNameJa: "エレファント",
      skillNameJa: "ハッショウ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 15, 20)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 15, 20)} ダメージ（PHY 15〜20%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 15, 20);
      },
    },
    ext1025: {
      libraryKey: "ext1025",
      extId: 1025,
      extNameJa: "モンキー",
      skillNameJa: "サルヂエ",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 10, 15)}`, "出血 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 10, 15)} ダメージ（INT 10〜15%）`, "敵に出血 ×1 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 10, 15);
        api.addBleedToEnemy(s, 1);
      },
    },
    ext1026: {
      libraryKey: "ext1026",
      extId: 1026,
      extNameJa: "スネーク",
      skillNameJa: "ウワバミ",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 12, 32)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 12〜32% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 12, 32)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 12, 32);
      },
    },
    ext1027: {
      libraryKey: "ext1027",
      extId: 1027,
      extNameJa: "ドッグ",
      skillNameJa: "リョウケン",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 30, 40)}`, "INT\u3000-1（敵）"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 30, 40)} ダメージ（INT 30〜40%）`, "敵の INT を -1"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 30, 40);
        s.enemyInt = Math.max(1, s.enemyInt + (-1)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext1028: {
      libraryKey: "ext1028",
      extId: 1028,
      extNameJa: "レイピア",
      skillNameJa: "ファント",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 40, 50)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 40, 50)} ダメージ（PHY 40〜50%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 40, 50);
      },
    },
    ext1029: {
      libraryKey: "ext1029",
      extId: 1029,
      extNameJa: "リボルバー",
      skillNameJa: "ファニングショット",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 35, 45)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 35, 45)} ダメージ（INT 35〜45%）`]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 35, 45);
      },
    },
    ext1030: {
      libraryKey: "ext1030",
      extId: 1030,
      extNameJa: "ゴブレット",
      skillNameJa: "チアーズ！",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 30, 40)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 30〜40% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 30, 40)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 30, 40);
      },
    },
    ext1031: {
      libraryKey: "ext1031",
      extId: 1031,
      extNameJa: "ブーツ",
      skillNameJa: "ダッシュ",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 15, 20), "AGI\u3000+1"]; },
      peekHelpKeys() { return ["hp", "agi"]; },
      previewLines(s) { return [`HP を回復係数 15〜20% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 15, 20)}）`, "AGI を +1"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 15, 20);
        s.playerAgi += 1;
      },
    },
    ext1032: {
      libraryKey: "ext1032",
      extId: 1032,
      extNameJa: "センス",
      skillNameJa: "シラビョウシ",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 15, 20)}`, "HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 10, 10)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 15, 20)} ダメージ（INT 15〜20%・1v1=単体）`, `HP を回復係数 10〜10% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 10, 10)}）`]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 15, 20);
        api.healPlayerFromIntSkill(s, 10, 10);
      },
    },
    ext1033: {
      libraryKey: "ext1033",
      extId: 1033,
      extNameJa: "MCHメダル",
      skillNameJa: "Master Nobの御加護",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 2, 2), "PHY\u3000+1", "INT\u3000+1", "AGI\u3000+1"]; },
      peekHelpKeys() { return ["hp", "phy", "int", "agi"]; },
      previewLines(s) { return [`HP を回復係数 2〜2% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 2, 2)}）`, "PHY を +1", "INT を +1", "AGI を +1"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 2, 2);
        s.playerPhy += 1;
        s.playerInt += 1;
        s.playerAgi += 1;
      },
    },
    ext1034: {
      libraryKey: "ext1034",
      extId: 1034,
      extNameJa: "ハンマー",
      skillNameJa: "ストローク",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 40, 50)}`, "PHY\u3000+1"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 40, 50)} ダメージ（PHY 40〜50%）`, "PHY を +1"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 40, 50);
        s.playerPhy += 1;
      },
    },
    ext1035: {
      libraryKey: "ext1035",
      extId: 1035,
      extNameJa: "ボウガン",
      skillNameJa: "サイレントシュート",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 35, 45)}`, "INT\u3000+1"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 35, 45)} ダメージ（INT 35〜45%）`, "INT を +1"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 35, 45);
        s.playerInt += 1;
      },
    },
    ext1036: {
      libraryKey: "ext1036",
      extId: 1036,
      extNameJa: "クラウン",
      skillNameJa: "マジェスティ",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 30, 40), "AGI\u3000+1"]; },
      peekHelpKeys() { return ["hp", "agi"]; },
      previewLines(s) { return [`HP を回復係数 30〜40% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 30, 40)}）`, "AGI を +1"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 30, 40);
        s.playerAgi += 1;
      },
    },
    ext1037: {
      libraryKey: "ext1037",
      extId: 1037,
      extNameJa: "グンバイ",
      skillNameJa: "グンバイヘイホウ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 25, 30)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 25, 30)} ダメージ（PHY 25〜30%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 25, 30);
      },
    },
    ext1038: {
      libraryKey: "ext1038",
      extId: 1038,
      extNameJa: "ステアリング",
      skillNameJa: "ハリケーン",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 20, 20)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 20, 20)} ダメージ（PHY 20〜20%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 20, 20);
      },
    },
    ext1039: {
      libraryKey: "ext1039",
      extId: 1039,
      extNameJa: "ストロベリー",
      skillNameJa: "イチゴジェラート",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 25, 35)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 25〜35% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 25, 35)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 25, 35);
      },
    },
    ext1040: {
      libraryKey: "ext1040",
      extId: 1040,
      extNameJa: "タンジェリン",
      skillNameJa: "フライングタンジェリン",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 30, 30)}`, "PHY\u3000-1（敵）"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 30, 30)} ダメージ（PHY 30〜30%）`, "敵の PHY を -1"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 30, 30);
        s.enemyPhy = Math.max(1, s.enemyPhy + (-1)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext1041: {
      libraryKey: "ext1041",
      extId: 1041,
      extNameJa: "ライム",
      skillNameJa: "シトラススプラッシュ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 30, 40)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 30, 40)} ダメージ（PHY 30〜40%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 30, 40);
      },
    },
    ext1042: {
      libraryKey: "ext1042",
      extId: 1042,
      extNameJa: "グラファイト",
      skillNameJa: "電気伝導",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 20, 30)}`, "毒 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 20, 30)} ダメージ（PHY 20〜30%）`, "敵に毒 ×1 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 20, 30);
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext1043: {
      libraryKey: "ext1043",
      extId: 1043,
      extNameJa: "グレープ",
      skillNameJa: "ボルドー",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 20, 30)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 20, 30)} ダメージ（INT 20〜30%・1v1=単体）`]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 20, 30);
      },
    },
    ext1044: {
      libraryKey: "ext1044",
      extId: 1044,
      extNameJa: "セージ",
      skillNameJa: "ハーブティー",
      skillIcon: "DBF_phy.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      effectSummaryLines() { return ["出血 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines() { return ["敵に出血 ×1 付与"]; },
      play(s) {
        api.addBleedToEnemy(s, 1);
      },
    },
    ext1045: {
      libraryKey: "ext1045",
      extId: 1045,
      extNameJa: "ブルーベリー",
      skillNameJa: "インクベリー",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 40, 40)}`, "毒 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 40, 40)} ダメージ（INT 40〜40%）`, "敵に毒 ×1 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 40, 40);
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext1046: {
      libraryKey: "ext1046",
      extId: 1046,
      extNameJa: "ルビー",
      skillNameJa: "ブリリアントカット",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 15, 20)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 15, 20)} ダメージ（PHY 15〜20%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 15, 20);
      },
    },
    ext1047: {
      libraryKey: "ext1047",
      extId: 1047,
      extNameJa: "シップ",
      skillNameJa: "カノン砲",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 0, 30)}`, `敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 0, 30)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 0, 30)} ダメージ（PHY 0〜30%）`, `敵1体に ${estIntHit(s.playerInt, s.enemyInt, 0, 30)} ダメージ（INT 0〜30%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 0, 30);
        api.dealIntSkillToEnemy(s, 0, 30);
      },
    },
    ext1048: {
      libraryKey: "ext1048",
      extId: 1048,
      extNameJa: "ナイフ",
      skillNameJa: "リッパー",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 40, 50)}`, "毒 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 40, 50)} ダメージ（PHY 40〜50%）`, "敵に毒 ×1 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 40, 50);
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext1049: {
      libraryKey: "ext1049",
      extId: 1049,
      extNameJa: "アルケブス",
      skillNameJa: "狙撃兵",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 35, 45)}`, "毒 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 35, 45)} ダメージ（INT 35〜45%）`, "敵に毒 ×1 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 35, 45);
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext1050: {
      libraryKey: "ext1050",
      extId: 1050,
      extNameJa: "リソグラフィー",
      skillNameJa: "アポカリプス",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 10, 20)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 10〜20% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 10, 20)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 10, 20);
      },
    },
    ext1051: {
      libraryKey: "ext1051",
      extId: 1051,
      extNameJa: "ウィップ",
      skillNameJa: "ラッシング",
      skillIcon: "phy.png",
      cost: 2,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines() { return [`敵にダメージ ×2`]; },
      peekHelpKeys() { return []; },
      previewLines() { return [`敵1体に PHY 13〜28% × 2 回ダメージ`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 13, 28);
        if (s.enemyHp > 0) api.dealPhySkillToEnemy(s, 13, 28);
      },
    },
    ext1055: {
      libraryKey: "ext1055",
      extId: 1055,
      extNameJa: "とっておきのアイスクリーム",
      skillNameJa: "アイスクリームの恨みを受けよ！",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 10, 20)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 10, 20)} ダメージ（INT 10〜20%）`]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 10, 20);
      },
    },
    ext1056: {
      libraryKey: "ext1056",
      extId: 1056,
      extNameJa: "シックル",
      skillNameJa: "ハーベスト",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 45, 55)}`, "INT\u3000-1（敵）"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 45, 55)} ダメージ（PHY 45〜55%）`, "敵の INT を -1"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 45, 55);
        s.enemyInt = Math.max(1, s.enemyInt + (-1)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext1057: {
      libraryKey: "ext1057",
      extId: 1057,
      extNameJa: "ワンド",
      skillNameJa: "スイング",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 35, 45)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 35, 45)} ダメージ（INT 35〜45%）`]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 35, 45);
      },
    },
    ext1058: {
      libraryKey: "ext1058",
      extId: 1058,
      extNameJa: "サケ",
      skillNameJa: "ヒャクヤク",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 30, 40), "PHY\u3000-2（敵）", "AGI\u3000-2（敵）"]; },
      peekHelpKeys() { return ["hp", "phy", "agi"]; },
      previewLines(s) { return [`HP を回復係数 30〜40% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 30, 40)}）`, "敵の PHY を -2", "敵の AGI を -2"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 30, 40);
        s.enemyPhy = Math.max(1, s.enemyPhy + (-2)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
        s.enemyAgi = Math.max(1, s.enemyAgi + (-2)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext1059: {
      libraryKey: "ext1059",
      extId: 1059,
      extNameJa: "ハット",
      skillNameJa: "エレガンス",
      skillIcon: "BUF_int.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines() { return ["INT\u3000+1"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines() { return ["INT を +1"]; },
      play(s) {
        s.playerInt += 1;
      },
    },
    ext1060: {
      libraryKey: "ext1060",
      extId: 1060,
      extNameJa: "ヒョウタンツギ",
      skillNameJa: "新種のキノコ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 45, 45)}`, "出血 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 45, 45)} ダメージ（PHY 45〜45%）`, "敵に出血 ×1 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 45, 45);
        api.addBleedToEnemy(s, 1);
      },
    },
    ext1061: {
      libraryKey: "ext1061",
      extId: 1061,
      extNameJa: "マント",
      skillNameJa: "フェーバー",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 30, 40)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 30〜40% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 30, 40)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 30, 40);
      },
    },
    ext1063: {
      libraryKey: "ext1063",
      extId: 1063,
      extNameJa: "ピエロ",
      skillNameJa: "ジャグリング",
      skillIcon: "DBF_phy.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      effectSummaryLines() { return ["出血 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines() { return ["敵に出血 ×1 付与"]; },
      play(s) {
        api.addBleedToEnemy(s, 1);
      },
    },
    ext1064: {
      libraryKey: "ext1064",
      extId: 1064,
      extNameJa: "フルート",
      skillNameJa: "フラジオレット",
      skillIcon: "DBF_phy.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      effectSummaryLines() { return ["毒 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines() { return ["敵に毒 ×1 付与"]; },
      play(s) {
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext1065: {
      libraryKey: "ext1065",
      extId: 1065,
      extNameJa: "ハープ",
      skillNameJa: "オクターブ",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 35, 45)}`, "出血 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 35, 45)} ダメージ（INT 35〜45%）`, "敵に出血 ×1 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 35, 45);
        api.addBleedToEnemy(s, 1);
      },
    },
    ext1066: {
      libraryKey: "ext1066",
      extId: 1066,
      extNameJa: "マラカス",
      skillNameJa: "マンボ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 40, 50)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 40, 50)} ダメージ（PHY 40〜50%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 40, 50);
      },
    },
    ext1067: {
      libraryKey: "ext1067",
      extId: 1067,
      extNameJa: "ホルン",
      skillNameJa: "ゲシュトップフト",
      skillIcon: "DBF_agi.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      effectSummaryLines() { return ["AGI\u3000-2（敵）"]; },
      peekHelpKeys() { return ["agi"]; },
      previewLines() { return ["敵の AGI を -2"]; },
      play(s) {
        s.enemyAgi = Math.max(1, s.enemyAgi + (-2)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext1068: {
      libraryKey: "ext1068",
      extId: 1068,
      extNameJa: "クラヴィア",
      skillNameJa: "三重奏",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 50, 60)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 50, 60)} ダメージ（PHY 50〜60%・代替効果）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 50, 60);
      },
    },
    ext1069: {
      libraryKey: "ext1069",
      extId: 1069,
      extNameJa: "ヴァイオリン",
      skillNameJa: "メヌエット",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 25, 35)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 25〜35% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 25, 35)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 25, 35);
      },
    },
    ext1070: {
      libraryKey: "ext1070",
      extId: 1070,
      extNameJa: "ニコ",
      skillNameJa: "洛陽",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 40, 50)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 40, 50)} ダメージ（INT 40〜50%）`]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 40, 50);
      },
    },
    ext1071: {
      libraryKey: "ext1071",
      extId: 1071,
      extNameJa: "ドラム",
      skillNameJa: "8ビート",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 12, 12)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 12〜12% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 12, 12)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 12, 12);
      },
    },
    ext1072: {
      libraryKey: "ext1072",
      extId: 1072,
      extNameJa: "シタール",
      skillNameJa: "ミズラーブ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 45, 45)}`, "毒 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 45, 45)} ダメージ（PHY 45〜45%）`, "敵に毒 ×1 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 45, 45);
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext1073: {
      libraryKey: "ext1073",
      extId: 1073,
      extNameJa: "マレット",
      skillNameJa: "ショック",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 35, 50)}`, "出血 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 35, 50)} ダメージ（PHY 35〜50%）`, "敵に出血 ×1 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 35, 50);
        api.addBleedToEnemy(s, 1);
      },
    },
    ext1074: {
      libraryKey: "ext1074",
      extId: 1074,
      extNameJa: "ハンドカノン",
      skillNameJa: "火槍術・舞破",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 35, 45)}`, "出血 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 35, 45)} ダメージ（INT 35〜45%）`, "敵に出血 ×1 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 35, 45);
        api.addBleedToEnemy(s, 1);
      },
    },
    ext1075: {
      libraryKey: "ext1075",
      extId: 1075,
      extNameJa: "グラス",
      skillNameJa: "ビジョン",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 30, 40), "INT\u3000-2（敵）"]; },
      peekHelpKeys() { return ["hp", "int"]; },
      previewLines(s) { return [`HP を回復係数 30〜40% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 30, 40)}）`, "敵の INT を -2"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 30, 40);
        s.enemyInt = Math.max(1, s.enemyInt + (-2)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext1079: {
      libraryKey: "ext1079",
      extId: 1079,
      extNameJa: "スタッフ",
      skillNameJa: "クラッシュ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 25, 30)}`, "PHY\u3000+1"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 25, 30)} ダメージ（PHY 25〜30%）`, "PHY を +1"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 25, 30);
        s.playerPhy += 1;
      },
    },
    ext1080: {
      libraryKey: "ext1080",
      extId: 1080,
      extNameJa: "ホーキ",
      skillNameJa: "スイープ",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 15, 25)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 15, 25)} ダメージ（INT 15〜25%・1v1=単体）`]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 15, 25);
      },
    },
    ext1081: {
      libraryKey: "ext1081",
      extId: 1081,
      extNameJa: "ヨロイ",
      skillNameJa: "シュラウド",
      skillIcon: "BUF_phy.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines() { return ["PHY\u3000+1", "INT\u3000+1"]; },
      peekHelpKeys() { return ["phy", "int"]; },
      previewLines() { return ["PHY を +1", "INT を +1"]; },
      play(s) {
        s.playerPhy += 1;
        s.playerInt += 1;
      },
    },
    ext1082: {
      libraryKey: "ext1082",
      extId: 1082,
      extNameJa: "ツインブレード",
      skillNameJa: "ツインスラッシュ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 35, 40)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 35, 40)} ダメージ（PHY 35〜40%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 35, 40);
      },
    },
    ext1085: {
      libraryKey: "ext1085",
      extId: 1085,
      extNameJa: "バイナンスチャリティメダル",
      skillNameJa: "バイナンスチャリティの御加護",
      skillIcon: "guard.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines() { return ["ガード\u3000+6"]; },
      peekHelpKeys() { return ["guard"]; },
      previewLines() { return ["ガードを 6 得る（StS 風代替効果）"]; },
      play(s) {
        s.playerGuard += 6; api.playBattleSe("buff"); api.portraitFx("player", "buff");
      },
    },
    ext1086: {
      libraryKey: "ext1086",
      extId: 1086,
      extNameJa: "アンモナイト",
      skillNameJa: "螺旋",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 50, 60)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 50, 60)} ダメージ（INT 50〜60%・代替効果）`]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 50, 60);
      },
    },
    ext1087: {
      libraryKey: "ext1087",
      extId: 1087,
      extNameJa: "プテラノドン",
      skillNameJa: "ブレイズ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 75, 80)}`, "出血 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 75, 80)} ダメージ（PHY 75〜80%）`, "敵に出血 ×1 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 75, 80);
        api.addBleedToEnemy(s, 1);
      },
    },
    ext1088: {
      libraryKey: "ext1088",
      extId: 1088,
      extNameJa: "ブレク",
      skillNameJa: "グリッター",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 5, 5)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 5〜5% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 5, 5)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 5, 5);
      },
    },
    ext1089: {
      libraryKey: "ext1089",
      extId: 1089,
      extNameJa: "プレシオサウルス",
      skillNameJa: "タイダルボア",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 8, 8)}`, "INT\u3000-1（敵）", "毒 ×1（敵）"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 8, 8)} ダメージ（PHY 8〜8%）`, "敵の INT を -1", "敵に毒 ×1 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 8, 8);
        s.enemyInt = Math.max(1, s.enemyInt + (-1)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext1090: {
      libraryKey: "ext1090",
      extId: 1090,
      extNameJa: "ぐらふぁいとみやげ",
      skillNameJa: "ぐらふぁいとに行ってきました",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 30, 40)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 30〜40% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 30, 40)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 30, 40);
      },
    },
    ext1091: {
      libraryKey: "ext1091",
      extId: 1091,
      extNameJa: "ロンギスクアマ",
      skillNameJa: "エンシェント フェザー",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 30, 45)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 30〜45% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 30, 45)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 30, 45);
      },
    },
    ext1092: {
      libraryKey: "ext1092",
      extId: 1092,
      extNameJa: "ステゴエッグ",
      skillNameJa: "生命の息吹",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 45, 45)}`, "毒 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 45, 45)} ダメージ（INT 45〜45%）`, "敵に毒 ×1 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 45, 45);
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext1093: {
      libraryKey: "ext1093",
      extId: 1093,
      extNameJa: "メガロキャビア",
      skillNameJa: "至高の前菜",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 30, 30)}`, "AGI\u3000+1"]; },
      peekHelpKeys() { return ["agi"]; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 30, 30)} ダメージ（INT 30〜30%）`, "AGI を +1"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 30, 30);
        s.playerAgi += 1;
      },
    },
    ext1094: {
      libraryKey: "ext1094",
      extId: 1094,
      extNameJa: "パキケファロエッグ",
      skillNameJa: "ツボコリコリ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 35, 45)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 35, 45)} ダメージ（PHY 35〜45%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 35, 45);
      },
    },
    ext1095: {
      libraryKey: "ext1095",
      extId: 1095,
      extNameJa: "采配",
      skillNameJa: "シケツジュツ",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 25, 25), "出血 ×1（敵）"]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 25〜25% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 25, 25)}）`, "敵に出血 ×1 付与"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 25, 25);
        api.addBleedToEnemy(s, 1);
      },
    },
    ext1096: {
      libraryKey: "ext1096",
      extId: 1096,
      extNameJa: "ベルト",
      skillNameJa: "ドミネイト",
      skillIcon: "DBF_int.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      effectSummaryLines() { return ["PHY\u3000-2（敵）", "INT\u3000-2（敵）"]; },
      peekHelpKeys() { return ["phy", "int"]; },
      previewLines() { return ["敵の PHY を -2", "敵の INT を -2"]; },
      play(s) {
        s.enemyPhy = Math.max(1, s.enemyPhy + (-2)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
        s.enemyInt = Math.max(1, s.enemyInt + (-2)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext1097: {
      libraryKey: "ext1097",
      extId: 1097,
      extNameJa: "クロー",
      skillNameJa: "SNIKT",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 40, 50)}`, "HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 18, 28), "毒 ×1（敵）"]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 40, 50)} ダメージ（PHY 40〜50%）`, `HP を回復係数 18〜28% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 18, 28)}）`, "敵に毒 ×1 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 40, 50);
        api.healPlayerFromIntSkill(s, 18, 28);
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext1098: {
      libraryKey: "ext1098",
      extId: 1098,
      extNameJa: "ギョク",
      skillNameJa: "フォーチュン",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 35, 45)}`, "HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 18, 28), "毒 ×1（敵）"]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 35, 45)} ダメージ（INT 35〜45%）`, `HP を回復係数 18〜28% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 18, 28)}）`, "敵に毒 ×1 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 35, 45);
        api.healPlayerFromIntSkill(s, 18, 28);
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext1099: {
      libraryKey: "ext1099",
      extId: 1099,
      extNameJa: "ガントレット",
      skillNameJa: "ウィズスタンド",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 20, 20)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 20, 20)} ダメージ（PHY 20〜20%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 20, 20);
      },
    },
    ext1100: {
      libraryKey: "ext1100",
      extId: 1100,
      extNameJa: "魔法剣",
      skillNameJa: "リーフブレード",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 45, 50)}`, "PHY\u3000+3", "毒 ×1（敵）"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 45, 50)} ダメージ（PHY 45〜50%）`, "PHY を +3", "敵に毒 ×1 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 45, 50);
        s.playerPhy += 3;
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext1102: {
      libraryKey: "ext1102",
      extId: 1102,
      extNameJa: "モノクル",
      skillNameJa: "貴族のたしなみ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 84, 84)}`, "PHY\u3000+1"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 84, 84)} ダメージ（PHY 84〜84%）`, "PHY を +1"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 84, 84);
        s.playerPhy += 1;
      },
    },
    ext1103: {
      libraryKey: "ext1103",
      extId: 1103,
      extNameJa: "御札",
      skillNameJa: "符撃",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 84, 84)}`, "INT\u3000+1"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 84, 84)} ダメージ（INT 84〜84%）`, "INT を +1"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 84, 84);
        s.playerInt += 1;
      },
    },
    ext1104: {
      libraryKey: "ext1104",
      extId: 1104,
      extNameJa: "見習い筆パレ",
      skillNameJa: "Artいいね！よろしくお願いします！",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 16, 16)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 16, 16)} ダメージ（PHY 16〜16%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 16, 16);
      },
    },
    ext1105: {
      libraryKey: "ext1105",
      extId: 1105,
      extNameJa: "鏡",
      skillNameJa: "レディエイション",
      skillIcon: "DBF_phy.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      effectSummaryLines() { return ["毒 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines() { return ["敵に毒 ×1 付与"]; },
      play(s) {
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext1106: {
      libraryKey: "ext1106",
      extId: 1106,
      extNameJa: "待合せ場所のモアイ像",
      skillNameJa: "ぐらふぁい島の観光名所に来ています",
      skillIcon: "DBF_phy.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      effectSummaryLines() { return ["毒 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines() { return ["敵に毒 ×1 付与"]; },
      play(s) {
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext1107: {
      libraryKey: "ext1107",
      extId: 1107,
      extNameJa: "ベーグルの粘土像",
      skillNameJa: "フィッシング デラウェア",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 53, 53)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 53, 53)} ダメージ（INT 53〜53%）`]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 53, 53);
      },
    },
    ext1108: {
      libraryKey: "ext1108",
      extId: 1108,
      extNameJa: "お手伝いゴーレム",
      skillNameJa: "ちゃぶ台返しちゃった",
      skillIcon: "DBF_phy.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      effectSummaryLines() { return ["PHY\u3000-1（敵）"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines() { return ["敵の PHY を -1"]; },
      play(s) {
        s.enemyPhy = Math.max(1, s.enemyPhy + (-1)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext1109: {
      libraryKey: "ext1109",
      extId: 1109,
      extNameJa: "すかる",
      skillNameJa: "旗揚げ",
      skillIcon: "DBF_phy.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      effectSummaryLines() { return ["出血 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines() { return ["敵に出血 ×1 付与"]; },
      play(s) {
        api.addBleedToEnemy(s, 1);
      },
    },
    ext1110: {
      libraryKey: "ext1110",
      extId: 1110,
      extNameJa: "闇リボン",
      skillNameJa: "闇のちょうちょ結び",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 41, 41)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 41, 41)} ダメージ（PHY 41〜41%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 41, 41);
      },
    },
    ext1111: {
      libraryKey: "ext1111",
      extId: 1111,
      extNameJa: "懐中時計",
      skillNameJa: "クロックワーク",
      skillIcon: "guard.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines() { return ["ガード\u3000+6"]; },
      peekHelpKeys() { return ["guard"]; },
      previewLines() { return ["ガードを 6 得る（StS 風代替効果）"]; },
      play(s) {
        s.playerGuard += 6; api.playBattleSe("buff"); api.portraitFx("player", "buff");
      },
    },
    ext1112: {
      libraryKey: "ext1112",
      extId: 1112,
      extNameJa: "モンシロちゃん",
      skillNameJa: "鱗粉",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 50, 55)}`, "INT\u3000+1"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 50, 55)} ダメージ（INT 50〜55%）`, "INT を +1"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 50, 55);
        s.playerInt += 1;
      },
    },
    ext1113: {
      libraryKey: "ext1113",
      extId: 1113,
      extNameJa: "パロットエッグ",
      skillNameJa: "ぴよぴよ",
      skillIcon: "BUF_agi.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines() { return ["AGI\u3000+3", "毒 ×1（敵）"]; },
      peekHelpKeys() { return ["agi"]; },
      previewLines() { return ["AGI を +3", "敵に毒 ×1 付与"]; },
      play(s) {
        s.playerAgi += 3;
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext1115: {
      libraryKey: "ext1115",
      extId: 1115,
      extNameJa: "まっすーの中古チャリ",
      skillNameJa: "カリスマの立ちこぎ",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 50, 50)}`, "毒 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 50, 50)} ダメージ（INT 50〜50%）`, "敵に毒 ×1 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 50, 50);
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext1116: {
      libraryKey: "ext1116",
      extId: 1116,
      extNameJa: "帝国式魔導機甲兵 一般兵用量産機",
      skillNameJa: "壱式通常弾",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 23, 23)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 23, 23)} ダメージ（PHY 23〜23%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 23, 23);
      },
    },
    ext1117: {
      libraryKey: "ext1117",
      extId: 1117,
      extNameJa: "ライドラゴンベビー",
      skillNameJa: "あの雲の上を飛びたくて",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 92, 92)}`, "INT\u3000-2（敵）"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 92, 92)} ダメージ（PHY 92〜92%）`, "敵の INT を -2"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 92, 92);
        s.enemyInt = Math.max(1, s.enemyInt + (-2)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext1118: {
      libraryKey: "ext1118",
      extId: 1118,
      extNameJa: "フェリス・ホイール",
      skillNameJa: "シカゴ万博の名物",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 22, 22)}`, "INT\u3000-2（敵）"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 22, 22)} ダメージ（PHY 22〜22%）`, "敵の INT を -2"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 22, 22);
        s.enemyInt = Math.max(1, s.enemyInt + (-2)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext1119: {
      libraryKey: "ext1119",
      extId: 1119,
      extNameJa: "パンダマシン",
      skillNameJa: "100GUM入れてね",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 8, 8)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 8〜8% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 8, 8)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 8, 8);
      },
    },
    ext1120: {
      libraryKey: "ext1120",
      extId: 1120,
      extNameJa: "べびぺが",
      skillNameJa: "フェザータッチ",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 42, 42)}`, "毒 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 42, 42)} ダメージ（INT 42〜42%・1v1=単体）`, "敵に毒 ×1 付与"]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 42, 42);
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext1121: {
      libraryKey: "ext1121",
      extId: 1121,
      extNameJa: "みにロケット",
      skillNameJa: "ベビーランス",
      skillIcon: "guard.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines() { return ["ガード\u3000+6"]; },
      peekHelpKeys() { return ["guard"]; },
      previewLines() { return ["ガードを 6 得る（StS 風代替効果）"]; },
      play(s) {
        s.playerGuard += 6; api.playBattleSe("buff"); api.portraitFx("player", "buff");
      },
    },
    ext1122: {
      libraryKey: "ext1122",
      extId: 1122,
      extNameJa: "始まりの丸太",
      skillNameJa: "イカダ以下だ",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 40, 40), "出血 ×1（敵）"]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 40〜40% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 40, 40)}）`, "敵に出血 ×1 付与"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 40, 40);
        api.addBleedToEnemy(s, 1);
      },
    },
    ext1123: {
      libraryKey: "ext1123",
      extId: 1123,
      extNameJa: "魔導のクリスタル鉱山を発掘する魔導機械エメ・ラ・ルド・テレスター(破)",
      skillNameJa: "魔導ドリルブレイク",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 46, 46)}`, "出血 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 46, 46)} ダメージ（PHY 46〜46%）`, "敵に出血 ×1 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 46, 46);
        api.addBleedToEnemy(s, 1);
      },
    },
    ext1124: {
      libraryKey: "ext1124",
      extId: 1124,
      extNameJa: "手裏剣",
      skillNameJa: "打剣",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 30, 40)}`, "AGI\u3000-2（敵）"]; },
      peekHelpKeys() { return ["agi"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 30, 40)} ダメージ（PHY 30〜40%）`, "敵の AGI を -2"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 30, 40);
        s.enemyAgi = Math.max(1, s.enemyAgi + (-2)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext1125: {
      libraryKey: "ext1125",
      extId: 1125,
      extNameJa: "カエルベビー",
      skillNameJa: "フロッグフォース",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 15, 20)}`, "PHY\u3000+1"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 15, 20)} ダメージ（PHY 15〜20%）`, "PHY を +1"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 15, 20);
        s.playerPhy += 1;
      },
    },
    ext1126: {
      libraryKey: "ext1126",
      extId: 1126,
      extNameJa: "冬の甘えんぼ王子ウィンター",
      skillNameJa: "アイシクル",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 15, 20)}`, "INT\u3000+1"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 15, 20)} ダメージ（INT 15〜20%・1v1=単体）`, "INT を +1"]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 15, 20);
        s.playerInt += 1;
      },
    },
    ext1127: {
      libraryKey: "ext1127",
      extId: 1127,
      extNameJa: "こけし",
      skillNameJa: "邪気払い",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 40, 40)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 40〜40% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 40, 40)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 40, 40);
      },
    },
    ext1128: {
      libraryKey: "ext1128",
      extId: 1128,
      extNameJa: "SDNメダル[C]",
      skillNameJa: "Stake POWER!",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 30, 35)}`, `敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 30, 35)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 30, 35)} ダメージ（PHY 30〜35%）`, `敵1体に ${estIntHit(s.playerInt, s.enemyInt, 30, 35)} ダメージ（INT 30〜35%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 30, 35);
        api.dealIntSkillToEnemy(s, 30, 35);
      },
    },
    ext1129: {
      libraryKey: "ext1129",
      extId: 1129,
      extNameJa: "パンケーキ",
      skillNameJa: "もちもちふわふわ",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 20, 40)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 20〜40% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 20, 40)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 20, 40);
      },
    },
    ext1130: {
      libraryKey: "ext1130",
      extId: 1130,
      extNameJa: "レーザーガン",
      skillNameJa: "プラズマショット",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 40, 40)}`, "PHY\u3000+3", "出血 ×1（敵）"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 40, 40)} ダメージ（INT 40〜40%）`, "PHY を +3", "敵に出血 ×1 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 40, 40);
        s.playerPhy += 3;
        api.addBleedToEnemy(s, 1);
      },
    },
    ext1131: {
      libraryKey: "ext1131",
      extId: 1131,
      extNameJa: "百姓バッタ",
      skillNameJa: "晴耕雨読",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 7, 7)}`, "毒 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 7, 7)} ダメージ（INT 7〜7%・1v1=単体）`, "敵に毒 ×1 付与"]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 7, 7);
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext1132: {
      libraryKey: "ext1132",
      extId: 1132,
      extNameJa: "リミュラス",
      skillNameJa: "白亜の光",
      skillIcon: "guard.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines() { return ["ガード\u3000+6"]; },
      peekHelpKeys() { return ["guard"]; },
      previewLines() { return ["ガードを 6 得る（StS 風代替効果）"]; },
      play(s) {
        s.playerGuard += 6; api.playBattleSe("buff"); api.portraitFx("player", "buff");
      },
    },
    ext1133: {
      libraryKey: "ext1133",
      extId: 1133,
      extNameJa: "熱処理されたモスエッグ",
      skillNameJa: "栄養たっぷり召し上がれ",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 8, 8), "INT\u3000+1"]; },
      peekHelpKeys() { return ["hp", "int"]; },
      previewLines(s) { return [`HP を回復係数 8〜8% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 8, 8)}）`, "INT を +1"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 8, 8);
        s.playerInt += 1;
      },
    },
    ext1134: {
      libraryKey: "ext1134",
      extId: 1134,
      extNameJa: "スコーピオン",
      skillNameJa: "ニードル",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 38, 38)}`, "毒 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 38, 38)} ダメージ（PHY 38〜38%）`, "敵に毒 ×1 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 38, 38);
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext1135: {
      libraryKey: "ext1135",
      extId: 1135,
      extNameJa: "象蟲ベビー（ぞうむし）",
      skillNameJa: "純真な心",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 53, 53)}`, "AGI\u3000+1"]; },
      peekHelpKeys() { return ["agi"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 53, 53)} ダメージ（PHY 53〜53%）`, "AGI を +1"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 53, 53);
        s.playerAgi += 1;
      },
    },
    ext1136: {
      libraryKey: "ext1136",
      extId: 1136,
      extNameJa: "べびーとる",
      skillNameJa: "じまんのツノ",
      skillIcon: "guard.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines() { return ["ガード\u3000+6"]; },
      peekHelpKeys() { return ["guard"]; },
      previewLines() { return ["ガードを 6 得る（StS 風代替効果）"]; },
      play(s) {
        s.playerGuard += 6; api.playBattleSe("buff"); api.portraitFx("player", "buff");
      },
    },
    ext1137: {
      libraryKey: "ext1137",
      extId: 1137,
      extNameJa: "ハチミツ",
      skillNameJa: "ハニートラップ",
      skillIcon: "BUF_agi.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines() { return ["AGI\u3000+1", "毒 ×1（敵）"]; },
      peekHelpKeys() { return ["agi"]; },
      previewLines() { return ["AGI を +1", "敵に毒 ×1 付与"]; },
      play(s) {
        s.playerAgi += 1;
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext1138: {
      libraryKey: "ext1138",
      extId: 1138,
      extNameJa: "Worker Ant",
      skillNameJa: "Hard work",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 85, 85), "PHY\u3000+1"]; },
      peekHelpKeys() { return ["hp", "phy"]; },
      previewLines(s) { return [`HP を回復係数 85〜85% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 85, 85)}）`, "PHY を +1"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 85, 85);
        s.playerPhy += 1;
      },
    },
    ext1139: {
      libraryKey: "ext1139",
      extId: 1139,
      extNameJa: "放浪紋白",
      skillNameJa: "ちゅるちゅる",
      skillIcon: "guard.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines() { return ["ガード\u3000+6"]; },
      peekHelpKeys() { return ["guard"]; },
      previewLines() { return ["ガードを 6 得る（StS 風代替効果）"]; },
      play(s) {
        s.playerGuard += 6; api.playBattleSe("buff"); api.portraitFx("player", "buff");
      },
    },
    ext1140: {
      libraryKey: "ext1140",
      extId: 1140,
      extNameJa: "オリフラム",
      skillNameJa: "プレジャリージェンス",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 45, 50), "INT\u3000+3"]; },
      peekHelpKeys() { return ["hp", "int"]; },
      previewLines(s) { return [`HP を回復係数 45〜50% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 45, 50)}）`, "INT を +3"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 45, 50);
        s.playerInt += 3;
      },
    },
    ext1141: {
      libraryKey: "ext1141",
      extId: 1141,
      extNameJa: "羽織",
      skillNameJa: "いきちょん",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 40, 65)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 40, 65)} ダメージ（PHY 40〜65%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 40, 65);
      },
    },
    ext1142: {
      libraryKey: "ext1142",
      extId: 1142,
      extNameJa: "竹皮包みおむすび",
      skillNameJa: "桜ヒラヒラ",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 50, 60)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 50, 60)} ダメージ（INT 50〜60%・代替効果）`]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 50, 60);
      },
    },
    ext1143: {
      libraryKey: "ext1143",
      extId: 1143,
      extNameJa: "地球スーパーボール",
      skillNameJa: "跳ねる惑星",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 10, 35)}`, "毒 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 10, 35)} ダメージ（INT 10〜35%）`, "敵に毒 ×1 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 10, 35);
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext1147: {
      libraryKey: "ext1147",
      extId: 1147,
      extNameJa: "シールドシステム",
      skillNameJa: "シールドジェネレーター",
      skillIcon: "guard.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines() { return ["ガード\u3000+6"]; },
      peekHelpKeys() { return ["guard"]; },
      previewLines() { return ["ガードを 6 得る（StS 風代替効果）"]; },
      play(s) {
        s.playerGuard += 6; api.playBattleSe("buff"); api.portraitFx("player", "buff");
      },
    },
    ext1148: {
      libraryKey: "ext1148",
      extId: 1148,
      extNameJa: "RYU.phy",
      skillNameJa: "RYUクロー",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 20, 20)}`, "毒 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 20, 20)} ダメージ（PHY 20〜20%）`, "敵に毒 ×1 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 20, 20);
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext1149: {
      libraryKey: "ext1149",
      extId: 1149,
      extNameJa: "RYU.int",
      skillNameJa: "RYUブレス",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 20, 20)}`, "毒 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 20, 20)} ダメージ（INT 20〜20%・1v1=単体）`, "敵に毒 ×1 付与"]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 20, 20);
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext1150: {
      libraryKey: "ext1150",
      extId: 1150,
      extNameJa: "ランタン",
      skillNameJa: "コンバスチョン",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 12, 12)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 12, 12)} ダメージ（INT 12〜12%・1v1=単体）`]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 12, 12);
      },
    },
    ext1151: {
      libraryKey: "ext1151",
      extId: 1151,
      extNameJa: "ハンバーガー",
      skillNameJa: "とろけるチーズの魔法",
      skillIcon: "DBF_phy.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      effectSummaryLines() { return ["毒 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines() { return ["敵に毒 ×1 付与"]; },
      play(s) {
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext1152: {
      libraryKey: "ext1152",
      extId: 1152,
      extNameJa: "メイス",
      skillNameJa: "メイスブロー",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 45, 55)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 45, 55)} ダメージ（PHY 45〜55%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 45, 55);
      },
    },
    ext1153: {
      libraryKey: "ext1153",
      extId: 1153,
      extNameJa: "木製パンジャンドラム",
      skillNameJa: "ローリングウェポン",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 45, 55)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 45, 55)} ダメージ（INT 45〜55%・1v1=単体）`]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 45, 55);
      },
    },
    ext1154: {
      libraryKey: "ext1154",
      extId: 1154,
      extNameJa: "お手軽カップラーメン",
      skillNameJa: "三分即席",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 14, 24), "AGI\u3000+3"]; },
      peekHelpKeys() { return ["hp", "agi"]; },
      previewLines(s) { return [`HP を回復係数 14〜24% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 14, 24)}）`, "AGI を +3"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 14, 24);
        s.playerAgi += 3;
      },
    },
    ext1155: {
      libraryKey: "ext1155",
      extId: 1155,
      extNameJa: "スワン？",
      skillNameJa: "ペダルローイング？",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 35, 45)}`, "PHY\u3000-2（敵）", "出血 ×1（敵）"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 35, 45)} ダメージ（PHY 35〜45%）`, "敵の PHY を -2", "敵に出血 ×1 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 35, 45);
        s.enemyPhy = Math.max(1, s.enemyPhy + (-2)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
        api.addBleedToEnemy(s, 1);
      },
    },
    ext1156: {
      libraryKey: "ext1156",
      extId: 1156,
      extNameJa: "棒磁石",
      skillNameJa: "マグナビゲート",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 35, 45)}`, "INT\u3000-2（敵）", "出血 ×1（敵）"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 35, 45)} ダメージ（INT 35〜45%）`, "敵の INT を -2", "敵に出血 ×1 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 35, 45);
        s.enemyInt = Math.max(1, s.enemyInt + (-2)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
        api.addBleedToEnemy(s, 1);
      },
    },
    ext1157: {
      libraryKey: "ext1157",
      extId: 1157,
      extNameJa: "巻き寿司",
      skillNameJa: "シャリ",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 115, 120)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 115〜120% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 115, 120)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 115, 120);
      },
    },
    ext1158: {
      libraryKey: "ext1158",
      extId: 1158,
      extNameJa: "サイバースタッフ",
      skillNameJa: "エナジーコンバート",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 50, 55)}`, "INT\u3000+3"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 50, 55)} ダメージ（INT 50〜55%）`, "INT を +3"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 50, 55);
        s.playerInt += 3;
      },
    },
    ext1159: {
      libraryKey: "ext1159",
      extId: 1159,
      extNameJa: "りんご",
      skillNameJa: "アート・ハート",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 40, 45)}`, "INT\u3000+3", "毒 ×1（敵）"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 40, 45)} ダメージ（PHY 40〜45%）`, "INT を +3", "敵に毒 ×1 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 40, 45);
        s.playerInt += 3;
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext1160: {
      libraryKey: "ext1160",
      extId: 1160,
      extNameJa: "ミニアクアリウム",
      skillNameJa: "流体制御",
      skillIcon: "DBF_phy.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      effectSummaryLines() { return ["毒 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines() { return ["敵に毒 ×1 付与"]; },
      play(s) {
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext1161: {
      libraryKey: "ext1161",
      extId: 1161,
      extNameJa: "サイバーソード",
      skillNameJa: "ファイナルギャンビット",
      skillIcon: "BUF_phy.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines() { return ["PHY\u3000+3", "INT\u3000+3"]; },
      peekHelpKeys() { return ["phy", "int"]; },
      previewLines() { return ["PHY を +3", "INT を +3"]; },
      play(s) {
        s.playerPhy += 3;
        s.playerInt += 3;
      },
    },
    ext1162: {
      libraryKey: "ext1162",
      extId: 1162,
      extNameJa: "マンドラゴラの種",
      skillNameJa: "呪われし種子",
      skillIcon: "DBF_agi.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      effectSummaryLines() { return ["AGI\u3000-2（敵）", "毒 ×1（敵）"]; },
      peekHelpKeys() { return ["agi"]; },
      previewLines() { return ["敵の AGI を -2", "敵に毒 ×1 付与"]; },
      play(s) {
        s.enemyAgi = Math.max(1, s.enemyAgi + (-2)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext1163: {
      libraryKey: "ext1163",
      extId: 1163,
      extNameJa: "豆盆栽",
      skillNameJa: "有機的アート",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 5, 10), "PHY\u3000+3", "INT\u3000+3"]; },
      peekHelpKeys() { return ["hp", "phy", "int"]; },
      previewLines(s) { return [`HP を回復係数 5〜10% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 5, 10)}）`, "PHY を +3", "INT を +3"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 5, 10);
        s.playerPhy += 3;
        s.playerInt += 3;
      },
    },
    ext1164: {
      libraryKey: "ext1164",
      extId: 1164,
      extNameJa: "メリケンサック",
      skillNameJa: "リーチング・シャドウ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 50, 60)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 50, 60)} ダメージ（PHY 50〜60%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 50, 60);
      },
    },
    ext1165: {
      libraryKey: "ext1165",
      extId: 1165,
      extNameJa: "オルゴール",
      skillNameJa: "メロディ・ラウンド",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 50, 60)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 50, 60)} ダメージ（INT 50〜60%）`]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 50, 60);
      },
    },
    ext1169: {
      libraryKey: "ext1169",
      extId: 1169,
      extNameJa: "カエルの標本",
      skillNameJa: "両生の知恵の雨",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 15, 20)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 15, 20)} ダメージ（INT 15〜20%・1v1=単体）`]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 15, 20);
      },
    },
    ext1170: {
      libraryKey: "ext1170",
      extId: 1170,
      extNameJa: "パイプ椅子",
      skillNameJa: "着席",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 90, 110), "PHY\u3000+1", "出血 ×1（敵）"]; },
      peekHelpKeys() { return ["hp", "phy"]; },
      previewLines(s) { return [`HP を回復係数 90〜110% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 90, 110)}）`, "PHY を +1", "敵に出血 ×1 付与"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 90, 110);
        s.playerPhy += 1;
        api.addBleedToEnemy(s, 1);
      },
    },
    ext1171: {
      libraryKey: "ext1171",
      extId: 1171,
      extNameJa: "糸切り鋏",
      skillNameJa: "テンポトリム",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 50, 60)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 50, 60)} ダメージ（PHY 50〜60%・代替効果）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 50, 60);
      },
    },
    ext1172: {
      libraryKey: "ext1172",
      extId: 1172,
      extNameJa: "バリバリ財布",
      skillNameJa: "資産凍結",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines() { return ["ドロー　1"]; },
      peekHelpKeys() { return ["draw"]; },
      previewLines() { return ["カードを 1 枚引く（StS 風代替効果）"]; },
      play(s) {
        api.drawCards(s, 1);
      },
    },
    ext1173: {
      libraryKey: "ext1173",
      extId: 1173,
      extNameJa: "木霊のタリスマン",
      skillNameJa: "ファントムシュート",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 20, 20)}`, "出血 ×1（敵）", "毒 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 20, 20)} ダメージ（INT 20〜20%）`, "敵に出血 ×1 付与", "敵に毒 ×1 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 20, 20);
        api.addBleedToEnemy(s, 1);
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext1174: {
      libraryKey: "ext1174",
      extId: 1174,
      extNameJa: "プリティーセット",
      skillNameJa: "マジカルヒーリング",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 15, 20)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 15〜20% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 15, 20)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 15, 20);
      },
    },
    ext1175: {
      libraryKey: "ext1175",
      extId: 1175,
      extNameJa: "幼獣の小角",
      skillNameJa: "ホーンオーラ",
      skillIcon: "guard.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines() { return ["ガード\u3000+6"]; },
      peekHelpKeys() { return ["guard"]; },
      previewLines() { return ["ガードを 6 得る（StS 風代替効果）"]; },
      play(s) {
        s.playerGuard += 6; api.playBattleSe("buff"); api.portraitFx("player", "buff");
      },
    },
    ext1176: {
      libraryKey: "ext1176",
      extId: 1176,
      extNameJa: "いちごカップケーキ",
      skillNameJa: "甘酸っぱい",
      skillIcon: "DBF_phy.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      effectSummaryLines() { return ["毒 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines() { return ["敵に毒 ×1 付与"]; },
      play(s) {
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext1177: {
      libraryKey: "ext1177",
      extId: 1177,
      extNameJa: "ゴーレムの胎芽",
      skillNameJa: "ナチュレ・ストライド",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 25, 30)}`, "PHY\u3000+1"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 25, 30)} ダメージ（PHY 25〜30%）`, "PHY を +1"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 25, 30);
        s.playerPhy += 1;
      },
    },
    ext1178: {
      libraryKey: "ext1178",
      extId: 1178,
      extNameJa: "マジックカード",
      skillNameJa: "マジックチャント",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 25, 30)}`, "INT\u3000+1"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 25, 30)} ダメージ（INT 25〜30%）`, "INT を +1"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 25, 30);
        s.playerInt += 1;
      },
    },
    ext1179: {
      libraryKey: "ext1179",
      extId: 1179,
      extNameJa: "ネズミ捕り",
      skillNameJa: "ノックアウト・トラップ",
      skillIcon: "DBF_int.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      effectSummaryLines() { return ["INT\u3000-2（敵）", "AGI\u3000-2（敵）", "出血 ×1（敵）"]; },
      peekHelpKeys() { return ["int", "agi"]; },
      previewLines() { return ["敵の INT を -2", "敵の AGI を -2", "敵に出血 ×1 付与"]; },
      play(s) {
        s.enemyInt = Math.max(1, s.enemyInt + (-2)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
        s.enemyAgi = Math.max(1, s.enemyAgi + (-2)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
        api.addBleedToEnemy(s, 1);
      },
    },
    ext1180: {
      libraryKey: "ext1180",
      extId: 1180,
      extNameJa: "子猫&草じゃらし",
      skillNameJa: "ゴロゴロ惑乱",
      skillIcon: "DBF_agi.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      effectSummaryLines() { return ["PHY\u3000-2（敵）", "AGI\u3000-2（敵）", "毒 ×1（敵）"]; },
      peekHelpKeys() { return ["phy", "agi"]; },
      previewLines() { return ["敵の PHY を -2", "敵の AGI を -2", "敵に毒 ×1 付与"]; },
      play(s) {
        s.enemyPhy = Math.max(1, s.enemyPhy + (-2)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
        s.enemyAgi = Math.max(1, s.enemyAgi + (-2)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext1181: {
      libraryKey: "ext1181",
      extId: 1181,
      extNameJa: "こっくりさん",
      skillNameJa: "肩が凝る",
      skillIcon: "guard.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines() { return ["ガード\u3000+6"]; },
      peekHelpKeys() { return ["guard"]; },
      previewLines() { return ["ガードを 6 得る（StS 風代替効果）"]; },
      play(s) {
        s.playerGuard += 6; api.playBattleSe("buff"); api.portraitFx("player", "buff");
      },
    },
    ext1182: {
      libraryKey: "ext1182",
      extId: 1182,
      extNameJa: "ワンルーム",
      skillNameJa: "箱庭リノベーション",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 50, 60)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 50, 60)} ダメージ（INT 50〜60%・代替効果）`]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 50, 60);
      },
    },
    ext1183: {
      libraryKey: "ext1183",
      extId: 1183,
      extNameJa: "フレイル",
      skillNameJa: "鉄球一閃",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 50, 60)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 50, 60)} ダメージ（PHY 50〜60%・代替効果）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 50, 60);
      },
    },
    ext1184: {
      libraryKey: "ext1184",
      extId: 1184,
      extNameJa: "リーフワーム",
      skillNameJa: "バズ・ファズ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 50, 60)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 50, 60)} ダメージ（PHY 50〜60%・代替効果）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 50, 60);
      },
    },
    ext1185: {
      libraryKey: "ext1185",
      extId: 1185,
      extNameJa: "パールシードラゴン",
      skillNameJa: "ジェムコイル・エンブレイス",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 35, 35)}`, "PHY\u3000+3", "AGI\u3000-2（敵）"]; },
      peekHelpKeys() { return ["phy", "agi"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 35, 35)} ダメージ（PHY 35〜35%）`, "PHY を +3", "敵の AGI を -2"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 35, 35);
        s.playerPhy += 3;
        s.enemyAgi = Math.max(1, s.enemyAgi + (-2)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext1186: {
      libraryKey: "ext1186",
      extId: 1186,
      extNameJa: "ひよこスネーク",
      skillNameJa: "獣翼アップリフト",
      skillIcon: "guard.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines() { return ["ガード\u3000+6"]; },
      peekHelpKeys() { return ["guard"]; },
      previewLines() { return ["ガードを 6 得る（StS 風代替効果）"]; },
      play(s) {
        s.playerGuard += 6; api.playBattleSe("buff"); api.portraitFx("player", "buff");
      },
    },
    ext1187: {
      libraryKey: "ext1187",
      extId: 1187,
      extNameJa: "ジャベリン",
      skillNameJa: "インペイルチャージ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 35, 45)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 35, 45)} ダメージ（PHY 35〜45%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 35, 45);
      },
    },
    ext1188: {
      libraryKey: "ext1188",
      extId: 1188,
      extNameJa: "ブーメラン",
      skillNameJa: "リターンシュート",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 35, 45)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 35, 45)} ダメージ（INT 35〜45%）`]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 35, 45);
      },
    },
    ext1189: {
      libraryKey: "ext1189",
      extId: 1189,
      extNameJa: "小石竜",
      skillNameJa: "イルミネーションバースト",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 20, 25)}`, `敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 20, 25)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 20, 25)} ダメージ（PHY 20〜25%）`, `敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 20, 25)} ダメージ（INT 20〜25%・1v1=単体）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 20, 25);
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 20, 25);
      },
    },
    ext1190: {
      libraryKey: "ext1190",
      extId: 1190,
      extNameJa: "ビニール傘",
      skillNameJa: "レインヴェール",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 20, 20)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 20〜20% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 20, 20)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 20, 20);
      },
    },
    ext1191: {
      libraryKey: "ext1191",
      extId: 1191,
      extNameJa: "梨",
      skillNameJa: "静穏の収穫",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 35, 40)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 35, 40)} ダメージ（PHY 35〜40%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 35, 40);
      },
    },
    ext1192: {
      libraryKey: "ext1192",
      extId: 1192,
      extNameJa: "チャクラム",
      skillNameJa: "マインドオービット",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 30, 40)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 30, 40)} ダメージ（INT 30〜40%・1v1=単体）`]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 30, 40);
      },
    },
    ext1193: {
      libraryKey: "ext1193",
      extId: 1193,
      extNameJa: "ベビーボンネット",
      skillNameJa: "ミティゲーション",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 45, 55)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 45〜55% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 45, 55)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 45, 55);
      },
    },
    ext1194: {
      libraryKey: "ext1194",
      extId: 1194,
      extNameJa: "ライオンキッド",
      skillNameJa: "レオハウリング",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 36, 46)}`, "毒 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 36, 46)} ダメージ（PHY 36〜46%）`, "敵に毒 ×1 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 36, 46);
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext2007: {
      libraryKey: "ext2007",
      extId: 2007,
      extNameJa: "キューティー・キャット",
      skillNameJa: "キューティー・キャット",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 30, 30), "毒 ×1（敵）"]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 30〜30% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 30, 30)}）`, "敵に毒 ×1 付与"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 30, 30);
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext2009: {
      libraryKey: "ext2009",
      extId: 2009,
      extNameJa: "エリートリング",
      skillNameJa: "エリートブライト",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 40, 50)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 40〜50% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 40, 50)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 40, 50);
      },
    },
    ext2010: {
      libraryKey: "ext2010",
      extId: 2010,
      extNameJa: "エリートシールド",
      skillNameJa: "エリートバッシュ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 27, 32)}`, "AGI\u3000-1（敵）"]; },
      peekHelpKeys() { return ["agi"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 27, 32)} ダメージ（PHY 27〜32%）`, "敵の AGI を -1"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 27, 32);
        s.enemyAgi = Math.max(1, s.enemyAgi + (-1)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext2012: {
      libraryKey: "ext2012",
      extId: 2012,
      extNameJa: "ETHEREMON-MALAKEL’E",
      skillNameJa: "やっちゃえ! マラケレI!",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 30, 30)}`, "毒 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 30, 30)} ダメージ（INT 30〜30%）`, "敵に毒 ×1 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 30, 30);
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext2014: {
      libraryKey: "ext2014",
      extId: 2014,
      extNameJa: "エリートクロススピア",
      skillNameJa: "エリートモロテヅキ",
      skillIcon: "phy.png",
      cost: 2,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines() { return [`敵にダメージ ×2`]; },
      peekHelpKeys() { return []; },
      previewLines() { return [`敵1体に PHY 22〜27% × 2 回ダメージ`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 22, 27);
        if (s.enemyHp > 0) api.dealPhySkillToEnemy(s, 22, 27);
      },
    },
    ext2015: {
      libraryKey: "ext2015",
      extId: 2015,
      extNameJa: "エリートハルバード",
      skillNameJa: "エリート スイングダウン",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 45, 55)}`, "毒 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 45, 55)} ダメージ（PHY 45〜55%）`, "敵に毒 ×1 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 45, 55);
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext2016: {
      libraryKey: "ext2016",
      extId: 2016,
      extNameJa: "エリートスクロール",
      skillNameJa: "エリートタクティクス",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 20, 25)}`, "毒 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 20, 25)} ダメージ（INT 20〜25%・1v1=単体）`, "敵に毒 ×1 付与"]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 20, 25);
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext2017: {
      libraryKey: "ext2017",
      extId: 2017,
      extNameJa: "エリートネックレス",
      skillNameJa: "エリートヒーリング",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 10, 15)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 10〜15% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 10, 15)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 10, 15);
      },
    },
    ext2018: {
      libraryKey: "ext2018",
      extId: 2018,
      extNameJa: "エリートカブト",
      skillNameJa: "エリートデバインプロテクション",
      skillIcon: "BUF_phy.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines() { return ["PHY\u3000+1", "INT\u3000+1"]; },
      peekHelpKeys() { return ["phy", "int"]; },
      previewLines() { return ["PHY を +1", "INT を +1"]; },
      play(s) {
        s.playerPhy += 1;
        s.playerInt += 1;
      },
    },
    ext2019: {
      libraryKey: "ext2019",
      extId: 2019,
      extNameJa: "エリートタートル",
      skillNameJa: "エリートキキョウ",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 15, 15), "PHY\u3000+1", "INT\u3000+1"]; },
      peekHelpKeys() { return ["hp", "phy", "int"]; },
      previewLines(s) { return [`HP を回復係数 15〜15% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 15, 15)}）`, "PHY を +1", "INT を +1"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 15, 15);
        s.playerPhy += 1;
        s.playerInt += 1;
      },
    },
    ext2020: {
      libraryKey: "ext2020",
      extId: 2020,
      extNameJa: "エリートルースター",
      skillNameJa: "エリートグンケイ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 25, 30)}`, "AGI\u3000+1"]; },
      peekHelpKeys() { return ["agi"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 25, 30)} ダメージ（PHY 25〜30%）`, "AGI を +1"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 25, 30);
        s.playerAgi += 1;
      },
    },
    ext2021: {
      libraryKey: "ext2021",
      extId: 2021,
      extNameJa: "エリートタイガー",
      skillNameJa: "エリートコガ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 45, 50)}`, "PHY\u3000+1"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 45, 50)} ダメージ（PHY 45〜50%）`, "PHY を +1"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 45, 50);
        s.playerPhy += 1;
      },
    },
    ext2022: {
      libraryKey: "ext2022",
      extId: 2022,
      extNameJa: "エリートドラゴン",
      skillNameJa: "エリートフクリュウ",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 15, 20)}`, "INT\u3000-1（敵）"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 15, 20)} ダメージ（INT 15〜20%・1v1=単体）`, "敵の INT を -1"]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 15, 20);
        s.enemyInt = Math.max(1, s.enemyInt + (-1)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext2023: {
      libraryKey: "ext2023",
      extId: 2023,
      extNameJa: "エリートブル",
      skillNameJa: "エリートギュウキ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 35, 45)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 35, 45)} ダメージ（PHY 35〜45%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 35, 45);
      },
    },
    ext2024: {
      libraryKey: "ext2024",
      extId: 2024,
      extNameJa: "エリートエレファント",
      skillNameJa: "エリートハッショウ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 20, 25)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 20, 25)} ダメージ（PHY 20〜25%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 20, 25);
      },
    },
    ext2025: {
      libraryKey: "ext2025",
      extId: 2025,
      extNameJa: "エリートモンキー",
      skillNameJa: "エリートサルヂエ",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 15, 20)}`, "出血 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 15, 20)} ダメージ（INT 15〜20%）`, "敵に出血 ×1 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 15, 20);
        api.addBleedToEnemy(s, 1);
      },
    },
    ext2026: {
      libraryKey: "ext2026",
      extId: 2026,
      extNameJa: "エリートスネーク",
      skillNameJa: "エリートウワバミ",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 14, 34)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 14〜34% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 14, 34)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 14, 34);
      },
    },
    ext2027: {
      libraryKey: "ext2027",
      extId: 2027,
      extNameJa: "エリートドッグ",
      skillNameJa: "エリートリョウケン",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 35, 45)}`, "INT\u3000-1（敵）"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 35, 45)} ダメージ（INT 35〜45%）`, "敵の INT を -1"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 35, 45);
        s.enemyInt = Math.max(1, s.enemyInt + (-1)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext2028: {
      libraryKey: "ext2028",
      extId: 2028,
      extNameJa: "エリートレイピア",
      skillNameJa: "エリートファント",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 45, 55)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 45, 55)} ダメージ（PHY 45〜55%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 45, 55);
      },
    },
    ext2029: {
      libraryKey: "ext2029",
      extId: 2029,
      extNameJa: "エリートリボルバー",
      skillNameJa: "エリートファニングショット",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 40, 50)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 40, 50)} ダメージ（INT 40〜50%）`]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 40, 50);
      },
    },
    ext2030: {
      libraryKey: "ext2030",
      extId: 2030,
      extNameJa: "エリートゴブレット",
      skillNameJa: "エリートチアーズ！",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 35, 45)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 35〜45% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 35, 45)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 35, 45);
      },
    },
    ext2031: {
      libraryKey: "ext2031",
      extId: 2031,
      extNameJa: "エリートブーツ",
      skillNameJa: "エリートダッシュ",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 20, 25), "AGI\u3000+1"]; },
      peekHelpKeys() { return ["hp", "agi"]; },
      previewLines(s) { return [`HP を回復係数 20〜25% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 20, 25)}）`, "AGI を +1"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 20, 25);
        s.playerAgi += 1;
      },
    },
    ext2032: {
      libraryKey: "ext2032",
      extId: 2032,
      extNameJa: "エリートセンス",
      skillNameJa: "エリートシラビョウシ",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 20, 25)}`, "HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 10, 10)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 20, 25)} ダメージ（INT 20〜25%・1v1=単体）`, `HP を回復係数 10〜10% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 10, 10)}）`]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 20, 25);
        api.healPlayerFromIntSkill(s, 10, 10);
      },
    },
    ext2033: {
      libraryKey: "ext2033",
      extId: 2033,
      extNameJa: "エリートMCHメダル",
      skillNameJa: "エリートMaster Nobの御加護",
      skillIcon: "BUF_phy.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines() { return ["PHY\u3000+1", "INT\u3000+1", "AGI\u3000+1"]; },
      peekHelpKeys() { return ["phy", "int", "agi"]; },
      previewLines() { return ["PHY を +1", "INT を +1", "AGI を +1"]; },
      play(s) {
        s.playerPhy += 1;
        s.playerInt += 1;
        s.playerAgi += 1;
      },
    },
    ext2034: {
      libraryKey: "ext2034",
      extId: 2034,
      extNameJa: "エリートハンマー",
      skillNameJa: "エリートストローク",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 45, 55)}`, "PHY\u3000+1"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 45, 55)} ダメージ（PHY 45〜55%）`, "PHY を +1"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 45, 55);
        s.playerPhy += 1;
      },
    },
    ext2035: {
      libraryKey: "ext2035",
      extId: 2035,
      extNameJa: "エリートボウガン",
      skillNameJa: "エリートサイレントシュート",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 40, 50)}`, "INT\u3000+1"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 40, 50)} ダメージ（INT 40〜50%）`, "INT を +1"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 40, 50);
        s.playerInt += 1;
      },
    },
    ext2036: {
      libraryKey: "ext2036",
      extId: 2036,
      extNameJa: "エリートクラウン",
      skillNameJa: "エリートマジェスティ",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 35, 45), "AGI\u3000+1"]; },
      peekHelpKeys() { return ["hp", "agi"]; },
      previewLines(s) { return [`HP を回復係数 35〜45% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 35, 45)}）`, "AGI を +1"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 35, 45);
        s.playerAgi += 1;
      },
    },
    ext2037: {
      libraryKey: "ext2037",
      extId: 2037,
      extNameJa: "エリートグンバイ",
      skillNameJa: "エリートグンバイヘイホウ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 27, 32)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 27, 32)} ダメージ（PHY 27〜32%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 27, 32);
      },
    },
    ext2038: {
      libraryKey: "ext2038",
      extId: 2038,
      extNameJa: "エリートステアリング",
      skillNameJa: "エリートハリケーン",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 20, 20)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 20, 20)} ダメージ（PHY 20〜20%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 20, 20);
      },
    },
    ext2039: {
      libraryKey: "ext2039",
      extId: 2039,
      extNameJa: "エリートストロベリー",
      skillNameJa: "エリートイチゴジェラート",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 30, 40)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 30〜40% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 30, 40)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 30, 40);
      },
    },
    ext2040: {
      libraryKey: "ext2040",
      extId: 2040,
      extNameJa: "エリートタンジェリン",
      skillNameJa: "エリートフライングタンジェリン",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 35, 35)}`, "PHY\u3000-1（敵）"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 35, 35)} ダメージ（PHY 35〜35%）`, "敵の PHY を -1"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 35, 35);
        s.enemyPhy = Math.max(1, s.enemyPhy + (-1)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext2041: {
      libraryKey: "ext2041",
      extId: 2041,
      extNameJa: "エリートライム",
      skillNameJa: "エリートシトラススプラッシュ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 35, 45)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 35, 45)} ダメージ（PHY 35〜45%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 35, 45);
      },
    },
    ext2042: {
      libraryKey: "ext2042",
      extId: 2042,
      extNameJa: "エリートグラファイト",
      skillNameJa: "エリート電気伝導",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 20, 40)}`, "毒 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 20, 40)} ダメージ（PHY 20〜40%）`, "敵に毒 ×1 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 20, 40);
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext2043: {
      libraryKey: "ext2043",
      extId: 2043,
      extNameJa: "エリートグレープ",
      skillNameJa: "エリートボルドー",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 25, 35)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 25, 35)} ダメージ（INT 25〜35%・1v1=単体）`]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 25, 35);
      },
    },
    ext2044: {
      libraryKey: "ext2044",
      extId: 2044,
      extNameJa: "エリートセージ",
      skillNameJa: "エリートハーブティー",
      skillIcon: "DBF_phy.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      effectSummaryLines() { return ["出血 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines() { return ["敵に出血 ×1 付与"]; },
      play(s) {
        api.addBleedToEnemy(s, 1);
      },
    },
    ext2045: {
      libraryKey: "ext2045",
      extId: 2045,
      extNameJa: "エリートブルーベリー",
      skillNameJa: "エリートインクベリー",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 40, 40)}`, "毒 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 40, 40)} ダメージ（INT 40〜40%）`, "敵に毒 ×1 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 40, 40);
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext2046: {
      libraryKey: "ext2046",
      extId: 2046,
      extNameJa: "エリートルビー",
      skillNameJa: "エリートブリリアントカット",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 20, 25)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 20, 25)} ダメージ（PHY 20〜25%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 20, 25);
      },
    },
    ext2047: {
      libraryKey: "ext2047",
      extId: 2047,
      extNameJa: "エリートシップ",
      skillNameJa: "エリートカノン砲",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 0, 40)}`, `敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 0, 40)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 0, 40)} ダメージ（PHY 0〜40%）`, `敵1体に ${estIntHit(s.playerInt, s.enemyInt, 0, 40)} ダメージ（INT 0〜40%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 0, 40);
        api.dealIntSkillToEnemy(s, 0, 40);
      },
    },
    ext2048: {
      libraryKey: "ext2048",
      extId: 2048,
      extNameJa: "エリートナイフ",
      skillNameJa: "エリートリッパー",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 45, 55)}`, "毒 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 45, 55)} ダメージ（PHY 45〜55%）`, "敵に毒 ×1 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 45, 55);
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext2049: {
      libraryKey: "ext2049",
      extId: 2049,
      extNameJa: "エリートアルケブス",
      skillNameJa: "エリート狙撃兵",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 40, 50)}`, "毒 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 40, 50)} ダメージ（INT 40〜50%）`, "敵に毒 ×1 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 40, 50);
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext2050: {
      libraryKey: "ext2050",
      extId: 2050,
      extNameJa: "エリートリソグラフィー",
      skillNameJa: "エリートアポカリプス",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 15, 25)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 15〜25% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 15, 25)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 15, 25);
      },
    },
    ext2051: {
      libraryKey: "ext2051",
      extId: 2051,
      extNameJa: "エリートウィップ",
      skillNameJa: "エリートラッシング",
      skillIcon: "phy.png",
      cost: 2,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines() { return [`敵にダメージ ×2`]; },
      peekHelpKeys() { return []; },
      previewLines() { return [`敵1体に PHY 16〜31% × 2 回ダメージ`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 16, 31);
        if (s.enemyHp > 0) api.dealPhySkillToEnemy(s, 16, 31);
      },
    },
    ext2052: {
      libraryKey: "ext2052",
      extId: 2052,
      extNameJa: "モーショボー",
      skillNameJa: "愛を乞う鳥のさえずり",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 40, 40)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 40, 40)} ダメージ（INT 40〜40%）`]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 40, 40);
      },
    },
    ext2053: {
      libraryKey: "ext2053",
      extId: 2053,
      extNameJa: "知恵の女神ミネルヴァ",
      skillNameJa: "クインクアトリア",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 50, 60)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 50, 60)} ダメージ（INT 50〜60%・代替効果）`]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 50, 60);
      },
    },
    ext2054: {
      libraryKey: "ext2054",
      extId: 2054,
      extNameJa: "ヴァンパイアロード",
      skillNameJa: "不死族の王",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 15, 15)}`, "HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 50, 50)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 15, 15)} ダメージ（PHY 15〜15%）`, `HP を回復係数 50〜50% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 50, 50)}）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 15, 15);
        api.healPlayerFromIntSkill(s, 50, 50);
      },
    },
    ext2055: {
      libraryKey: "ext2055",
      extId: 2055,
      extNameJa: "とっておきのおはぎ",
      skillNameJa: "おはぎの恨みを受けよ！",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 15, 25)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 15, 25)} ダメージ（INT 15〜25%）`]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 15, 25);
      },
    },
    ext2056: {
      libraryKey: "ext2056",
      extId: 2056,
      extNameJa: "エリートシックル",
      skillNameJa: "エリートハーベスト",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 50, 60)}`, "INT\u3000-1（敵）"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 50, 60)} ダメージ（PHY 50〜60%）`, "敵の INT を -1"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 50, 60);
        s.enemyInt = Math.max(1, s.enemyInt + (-1)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext2057: {
      libraryKey: "ext2057",
      extId: 2057,
      extNameJa: "エリートワンド",
      skillNameJa: "エリートスイング",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 40, 50)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 40, 50)} ダメージ（INT 40〜50%）`]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 40, 50);
      },
    },
    ext2058: {
      libraryKey: "ext2058",
      extId: 2058,
      extNameJa: "エリートサケ",
      skillNameJa: "エリートヒャクヤク",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 35, 45), "PHY\u3000-2（敵）", "AGI\u3000-2（敵）"]; },
      peekHelpKeys() { return ["hp", "phy", "agi"]; },
      previewLines(s) { return [`HP を回復係数 35〜45% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 35, 45)}）`, "敵の PHY を -2", "敵の AGI を -2"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 35, 45);
        s.enemyPhy = Math.max(1, s.enemyPhy + (-2)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
        s.enemyAgi = Math.max(1, s.enemyAgi + (-2)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext2059: {
      libraryKey: "ext2059",
      extId: 2059,
      extNameJa: "エリートハット",
      skillNameJa: "エリートエレガンス",
      skillIcon: "BUF_int.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines() { return ["INT\u3000+1"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines() { return ["INT を +1"]; },
      play(s) {
        s.playerInt += 1;
      },
    },
    ext2060: {
      libraryKey: "ext2060",
      extId: 2060,
      extNameJa: "ロビタ",
      skillNameJa: "レオナの記憶",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 45, 45)}`, "出血 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 45, 45)} ダメージ（PHY 45〜45%）`, "敵に出血 ×1 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 45, 45);
        api.addBleedToEnemy(s, 1);
      },
    },
    ext2061: {
      libraryKey: "ext2061",
      extId: 2061,
      extNameJa: "エリートマント",
      skillNameJa: "エリートフェーバー",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 40, 50)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 40〜50% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 40, 50)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 40, 50);
      },
    },
    ext2062: {
      libraryKey: "ext2062",
      extId: 2062,
      extNameJa: "創輝剣ベルテ",
      skillNameJa: "グロウ・レゾナンス",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 45, 55)}`, "出血 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 45, 55)} ダメージ（PHY 45〜55%）`, "敵に出血 ×1 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 45, 55);
        api.addBleedToEnemy(s, 1);
      },
    },
    ext2063: {
      libraryKey: "ext2063",
      extId: 2063,
      extNameJa: "エリートピエロ",
      skillNameJa: "エリートジャグリング",
      skillIcon: "DBF_phy.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      effectSummaryLines() { return ["出血 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines() { return ["敵に出血 ×1 付与"]; },
      play(s) {
        api.addBleedToEnemy(s, 1);
      },
    },
    ext2064: {
      libraryKey: "ext2064",
      extId: 2064,
      extNameJa: "エリートフルート",
      skillNameJa: "エリートフラジオレット",
      skillIcon: "DBF_phy.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      effectSummaryLines() { return ["毒 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines() { return ["敵に毒 ×1 付与"]; },
      play(s) {
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext2065: {
      libraryKey: "ext2065",
      extId: 2065,
      extNameJa: "エリートハープ",
      skillNameJa: "エリートオクターブ",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 40, 50)}`, "出血 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 40, 50)} ダメージ（INT 40〜50%）`, "敵に出血 ×1 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 40, 50);
        api.addBleedToEnemy(s, 1);
      },
    },
    ext2066: {
      libraryKey: "ext2066",
      extId: 2066,
      extNameJa: "エリートマラカス",
      skillNameJa: "エリートマンボ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 45, 55)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 45, 55)} ダメージ（PHY 45〜55%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 45, 55);
      },
    },
    ext2067: {
      libraryKey: "ext2067",
      extId: 2067,
      extNameJa: "エリートホルン",
      skillNameJa: "エリートゲシュトップフト",
      skillIcon: "DBF_agi.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      effectSummaryLines() { return ["AGI\u3000-2（敵）"]; },
      peekHelpKeys() { return ["agi"]; },
      previewLines() { return ["敵の AGI を -2"]; },
      play(s) {
        s.enemyAgi = Math.max(1, s.enemyAgi + (-2)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext2068: {
      libraryKey: "ext2068",
      extId: 2068,
      extNameJa: "エリートクラヴィア",
      skillNameJa: "エリート三重奏",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 50, 60)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 50, 60)} ダメージ（PHY 50〜60%・代替効果）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 50, 60);
      },
    },
    ext2069: {
      libraryKey: "ext2069",
      extId: 2069,
      extNameJa: "エリートヴァイオリン",
      skillNameJa: "エリートメヌエット",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 30, 40)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 30〜40% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 30, 40)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 30, 40);
      },
    },
    ext2070: {
      libraryKey: "ext2070",
      extId: 2070,
      extNameJa: "エリートニコ",
      skillNameJa: "エリート洛陽",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 45, 55)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 45, 55)} ダメージ（INT 45〜55%）`]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 45, 55);
      },
    },
    ext2071: {
      libraryKey: "ext2071",
      extId: 2071,
      extNameJa: "エリートドラム",
      skillNameJa: "エリート8ビート",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 15, 15)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 15〜15% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 15, 15)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 15, 15);
      },
    },
    ext2072: {
      libraryKey: "ext2072",
      extId: 2072,
      extNameJa: "エリートシタール",
      skillNameJa: "エリートミズラーブ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 45, 45)}`, "毒 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 45, 45)} ダメージ（PHY 45〜45%）`, "敵に毒 ×1 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 45, 45);
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext2073: {
      libraryKey: "ext2073",
      extId: 2073,
      extNameJa: "エリートマレット",
      skillNameJa: "エリートショック",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 40, 55)}`, "出血 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 40, 55)} ダメージ（PHY 40〜55%）`, "敵に出血 ×1 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 40, 55);
        api.addBleedToEnemy(s, 1);
      },
    },
    ext2074: {
      libraryKey: "ext2074",
      extId: 2074,
      extNameJa: "エリートハンドカノン",
      skillNameJa: "エリート火槍術・舞破",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 40, 50)}`, "出血 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 40, 50)} ダメージ（INT 40〜50%）`, "敵に出血 ×1 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 40, 50);
        api.addBleedToEnemy(s, 1);
      },
    },
    ext2075: {
      libraryKey: "ext2075",
      extId: 2075,
      extNameJa: "エリートグラス",
      skillNameJa: "エリートビジョン",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 35, 45), "INT\u3000-2（敵）"]; },
      peekHelpKeys() { return ["hp", "int"]; },
      previewLines(s) { return [`HP を回復係数 35〜45% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 35, 45)}）`, "敵の INT を -2"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 35, 45);
        s.enemyInt = Math.max(1, s.enemyInt + (-2)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext2076: {
      libraryKey: "ext2076",
      extId: 2076,
      extNameJa: "炎の鬣",
      skillNameJa: "ブレンネン・メーネ",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 15, 35)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 15, 35)} ダメージ（INT 15〜35%）`]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 15, 35);
      },
    },
    ext2077: {
      libraryKey: "ext2077",
      extId: 2077,
      extNameJa: "長靴をはいた猫",
      skillNameJa: "緑のマジックボトル",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 5, 5)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 5, 5)} ダメージ（PHY 5〜5%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 5, 5);
      },
    },
    ext2079: {
      libraryKey: "ext2079",
      extId: 2079,
      extNameJa: "エリートスタッフ",
      skillNameJa: "エリートクラッシュ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 25, 30)}`, "PHY\u3000+1"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 25, 30)} ダメージ（PHY 25〜30%）`, "PHY を +1"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 25, 30);
        s.playerPhy += 1;
      },
    },
    ext2080: {
      libraryKey: "ext2080",
      extId: 2080,
      extNameJa: "エリートホーキ",
      skillNameJa: "エリートスイープ",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 20, 30)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 20, 30)} ダメージ（INT 20〜30%・1v1=単体）`]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 20, 30);
      },
    },
    ext2081: {
      libraryKey: "ext2081",
      extId: 2081,
      extNameJa: "エリートヨロイ",
      skillNameJa: "エリートシュラウド",
      skillIcon: "BUF_phy.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines() { return ["PHY\u3000+1", "INT\u3000+1"]; },
      peekHelpKeys() { return ["phy", "int"]; },
      previewLines() { return ["PHY を +1", "INT を +1"]; },
      play(s) {
        s.playerPhy += 1;
        s.playerInt += 1;
      },
    },
    ext2082: {
      libraryKey: "ext2082",
      extId: 2082,
      extNameJa: "エリートツインブレード",
      skillNameJa: "エリートツインスラッシュ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 40, 45)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 40, 45)} ダメージ（PHY 40〜45%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 40, 45);
      },
    },
    ext2083: {
      libraryKey: "ext2083",
      extId: 2083,
      extNameJa: "エリートMCSメダル",
      skillNameJa: "エリート神の御加護",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 20, 30)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 20〜30% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 20, 30)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 20, 30);
      },
    },
    ext2084: {
      libraryKey: "ext2084",
      extId: 2084,
      extNameJa: "夕焼けのパンダの釣り師",
      skillNameJa: "夕まずめ",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 15, 25)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 15〜25% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 15, 25)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 15, 25);
      },
    },
    ext2085: {
      libraryKey: "ext2085",
      extId: 2085,
      extNameJa: "エリートバイナンスチャリティメダル",
      skillNameJa: "エリートバイナンスチャリティの御加護",
      skillIcon: "guard.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines() { return ["ガード\u3000+6"]; },
      peekHelpKeys() { return ["guard"]; },
      previewLines() { return ["ガードを 6 得る（StS 風代替効果）"]; },
      play(s) {
        s.playerGuard += 6; api.playBattleSe("buff"); api.portraitFx("player", "buff");
      },
    },
    ext2086: {
      libraryKey: "ext2086",
      extId: 2086,
      extNameJa: "エリートアンモナイト",
      skillNameJa: "エリート螺旋",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 50, 60)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 50, 60)} ダメージ（INT 50〜60%・代替効果）`]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 50, 60);
      },
    },
    ext2087: {
      libraryKey: "ext2087",
      extId: 2087,
      extNameJa: "エリートプテラノドン",
      skillNameJa: "メガブレイズ",
      skillIcon: "phy.png",
      cost: 2,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 80, 85)}`, "出血 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 80, 85)} ダメージ（PHY 80〜85%）`, "敵に出血 ×1 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 80, 85);
        api.addBleedToEnemy(s, 1);
      },
    },
    ext2088: {
      libraryKey: "ext2088",
      extId: 2088,
      extNameJa: "ブレックス",
      skillNameJa: "エリートグリッター",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 5, 10)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 5〜10% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 5, 10)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 5, 10);
      },
    },
    ext2089: {
      libraryKey: "ext2089",
      extId: 2089,
      extNameJa: "エリートプレシオサウルス",
      skillNameJa: "エリートタイダルボア",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 10, 10)}`, "INT\u3000-1（敵）", "毒 ×1（敵）"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 10, 10)} ダメージ（PHY 10〜10%）`, "敵の INT を -1", "敵に毒 ×1 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 10, 10);
        s.enemyInt = Math.max(1, s.enemyInt + (-1)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext2090: {
      libraryKey: "ext2090",
      extId: 2090,
      extNameJa: "トリケラベビー",
      skillNameJa: "TCファイトα",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 35, 45)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 35〜45% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 35, 45)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 35, 45);
      },
    },
    ext2091: {
      libraryKey: "ext2091",
      extId: 2091,
      extNameJa: "エリートロンギスクアマ",
      skillNameJa: "エリート エンシェント フェザー",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 35, 50)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 35〜50% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 35, 50)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 35, 50);
      },
    },
    ext2092: {
      libraryKey: "ext2092",
      extId: 2092,
      extNameJa: "ステゴベビー",
      skillNameJa: "自我の目醒め",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 45, 45)}`, "毒 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 45, 45)} ダメージ（INT 45〜45%）`, "敵に毒 ×1 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 45, 45);
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext2093: {
      libraryKey: "ext2093",
      extId: 2093,
      extNameJa: "エリートメガロドン",
      skillNameJa: "大海を夢見て",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 35, 35)}`, "AGI\u3000+1"]; },
      peekHelpKeys() { return ["agi"]; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 35, 35)} ダメージ（INT 35〜35%）`, "AGI を +1"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 35, 35);
        s.playerAgi += 1;
      },
    },
    ext2094: {
      libraryKey: "ext2094",
      extId: 2094,
      extNameJa: "エリートパキケファロ",
      skillNameJa: "しっぽビターン！",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 40, 50)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 40, 50)} ダメージ（PHY 40〜50%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 40, 50);
      },
    },
    ext2095: {
      libraryKey: "ext2095",
      extId: 2095,
      extNameJa: "エリート采配",
      skillNameJa: "エリートシケツジュツ",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 30, 30), "出血 ×1（敵）"]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 30〜30% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 30, 30)}）`, "敵に出血 ×1 付与"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 30, 30);
        api.addBleedToEnemy(s, 1);
      },
    },
    ext2096: {
      libraryKey: "ext2096",
      extId: 2096,
      extNameJa: "エリートベルト",
      skillNameJa: "エリートドミネイト",
      skillIcon: "DBF_int.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      effectSummaryLines() { return ["PHY\u3000-2（敵）", "INT\u3000-2（敵）"]; },
      peekHelpKeys() { return ["phy", "int"]; },
      previewLines() { return ["敵の PHY を -2", "敵の INT を -2"]; },
      play(s) {
        s.enemyPhy = Math.max(1, s.enemyPhy + (-2)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
        s.enemyInt = Math.max(1, s.enemyInt + (-2)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext2097: {
      libraryKey: "ext2097",
      extId: 2097,
      extNameJa: "エリートクロー",
      skillNameJa: "エリートSNIKT",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 45, 55)}`, "HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 21, 31), "毒 ×1（敵）"]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 45, 55)} ダメージ（PHY 45〜55%）`, `HP を回復係数 21〜31% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 21, 31)}）`, "敵に毒 ×1 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 45, 55);
        api.healPlayerFromIntSkill(s, 21, 31);
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext2098: {
      libraryKey: "ext2098",
      extId: 2098,
      extNameJa: "エリートギョク",
      skillNameJa: "エリートフォーチュン",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 40, 50)}`, "HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 21, 31), "毒 ×1（敵）"]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 40, 50)} ダメージ（INT 40〜50%）`, `HP を回復係数 21〜31% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 21, 31)}）`, "敵に毒 ×1 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 40, 50);
        api.healPlayerFromIntSkill(s, 21, 31);
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext2099: {
      libraryKey: "ext2099",
      extId: 2099,
      extNameJa: "エリートガントレット",
      skillNameJa: "エリートウィズスタンド",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 20, 20)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 20, 20)} ダメージ（PHY 20〜20%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 20, 20);
      },
    },
    ext2100: {
      libraryKey: "ext2100",
      extId: 2100,
      extNameJa: "エリート魔法剣",
      skillNameJa: "アクアブレード",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 50, 55)}`, "PHY\u3000+4", "毒 ×1（敵）"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 50, 55)} ダメージ（PHY 50〜55%）`, "PHY を +4", "敵に毒 ×1 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 50, 55);
        s.playerPhy += 4;
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext2101: {
      libraryKey: "ext2101",
      extId: 2101,
      extNameJa: "リリエッタの盾",
      skillNameJa: "鉄壁の防御",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 50, 50)}`, "PHY\u3000+2"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 50, 50)} ダメージ（PHY 50〜50%）`, "PHY を +2"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 50, 50);
        s.playerPhy += 2;
      },
    },
    ext2102: {
      libraryKey: "ext2102",
      extId: 2102,
      extNameJa: "名執事のモノクル",
      skillNameJa: "お帰りなさいませ。ご主人様。",
      skillIcon: "phy.png",
      cost: 2,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 89, 89)}`, "PHY\u3000+1"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 89, 89)} ダメージ（PHY 89〜89%）`, "PHY を +1"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 89, 89);
        s.playerPhy += 1;
      },
    },
    ext2103: {
      libraryKey: "ext2103",
      extId: 2103,
      extNameJa: "霊符",
      skillNameJa: "霊撃",
      skillIcon: "int.png",
      cost: 2,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 89, 89)}`, "INT\u3000+1"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 89, 89)} ダメージ（INT 89〜89%）`, "INT を +1"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 89, 89);
        s.playerInt += 1;
      },
    },
    ext2104: {
      libraryKey: "ext2104",
      extId: 2104,
      extNameJa: "エリート筆パレ",
      skillNameJa: "GOOD！Art",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 19, 19)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 19, 19)} ダメージ（PHY 19〜19%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 19, 19);
      },
    },
    ext2105: {
      libraryKey: "ext2105",
      extId: 2105,
      extNameJa: "エリート鏡",
      skillNameJa: "エリートレディエイション",
      skillIcon: "DBF_phy.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      effectSummaryLines() { return ["毒 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines() { return ["敵に毒 ×1 付与"]; },
      play(s) {
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext2106: {
      libraryKey: "ext2106",
      extId: 2106,
      extNameJa: "ぐらふぁい島モアイの目覚",
      skillNameJa: "ぐらふぁい島の霊力開花",
      skillIcon: "DBF_phy.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      effectSummaryLines() { return ["毒 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines() { return ["敵に毒 ×1 付与"]; },
      play(s) {
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext2107: {
      libraryKey: "ext2107",
      extId: 2107,
      extNameJa: "アバカスの着せ替え人形",
      skillNameJa: "ロールバック マイハート",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 56, 56)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 56, 56)} ダメージ（INT 56〜56%）`]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 56, 56);
      },
    },
    ext2108: {
      libraryKey: "ext2108",
      extId: 2108,
      extNameJa: "ゴーレムソルジャー",
      skillNameJa: "悪魔の囁き",
      skillIcon: "DBF_phy.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      effectSummaryLines() { return ["PHY\u3000-1（敵）"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines() { return ["敵の PHY を -1"]; },
      play(s) {
        s.enemyPhy = Math.max(1, s.enemyPhy + (-1)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext2109: {
      libraryKey: "ext2109",
      extId: 2109,
      extNameJa: "エリートスカル",
      skillNameJa: "メアリーおいろけの術",
      skillIcon: "DBF_phy.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      effectSummaryLines() { return ["出血 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines() { return ["敵に出血 ×1 付与"]; },
      play(s) {
        api.addBleedToEnemy(s, 1);
      },
    },
    ext2110: {
      libraryKey: "ext2110",
      extId: 2110,
      extNameJa: "悪魔金魚リボン",
      skillNameJa: "秘めし想いはかくも儚き",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 46, 46)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 46, 46)} ダメージ（PHY 46〜46%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 46, 46);
      },
    },
    ext2111: {
      libraryKey: "ext2111",
      extId: 2111,
      extNameJa: "エリート懐中時計",
      skillNameJa: "エリートクロックワーク",
      skillIcon: "guard.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines() { return ["ガード\u3000+6"]; },
      peekHelpKeys() { return ["guard"]; },
      previewLines() { return ["ガードを 6 得る（StS 風代替効果）"]; },
      play(s) {
        s.playerGuard += 6; api.playBattleSe("buff"); api.portraitFx("player", "buff");
      },
    },
    ext2112: {
      libraryKey: "ext2112",
      extId: 2112,
      extNameJa: "ハイフェアリー",
      skillNameJa: "青い光",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 55, 60)}`, "INT\u3000+1"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 55, 60)} ダメージ（INT 55〜60%）`, "INT を +1"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 55, 60);
        s.playerInt += 1;
      },
    },
    ext2113: {
      libraryKey: "ext2113",
      extId: 2113,
      extNameJa: "パロパロ",
      skillNameJa: "つがいの囀り",
      skillIcon: "BUF_agi.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines() { return ["AGI\u3000+4", "毒 ×1（敵）"]; },
      peekHelpKeys() { return ["agi"]; },
      previewLines() { return ["AGI を +4", "敵に毒 ×1 付与"]; },
      play(s) {
        s.playerAgi += 4;
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext2115: {
      libraryKey: "ext2115",
      extId: 2115,
      extNameJa: "にゃ～さんのスクーター",
      skillNameJa: "ちょっとビール買ってくる",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 55, 55)}`, "毒 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 55, 55)} ダメージ（INT 55〜55%）`, "敵に毒 ×1 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 55, 55);
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext2116: {
      libraryKey: "ext2116",
      extId: 2116,
      extNameJa: "帝国式魔導機甲兵 隊長機",
      skillNameJa: "弐式徹甲弾",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 26, 26)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 26, 26)} ダメージ（PHY 26〜26%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 26, 26);
      },
    },
    ext2117: {
      libraryKey: "ext2117",
      extId: 2117,
      extNameJa: "ライドラゴン",
      skillNameJa: "新鮮みかんをお届けに",
      skillIcon: "phy.png",
      cost: 2,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 97, 97)}`, "INT\u3000-3（敵）"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 97, 97)} ダメージ（PHY 97〜97%）`, "敵の INT を -3"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 97, 97);
        s.enemyInt = Math.max(1, s.enemyInt + (-3)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext2118: {
      libraryKey: "ext2118",
      extId: 2118,
      extNameJa: "エリートフェリス・ホイール",
      skillNameJa: "リンカーン・パークのランドマーク",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 27, 27)}`, "INT\u3000-3（敵）"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 27, 27)} ダメージ（PHY 27〜27%）`, "敵の INT を -3"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 27, 27);
        s.enemyInt = Math.max(1, s.enemyInt + (-3)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext2119: {
      libraryKey: "ext2119",
      extId: 2119,
      extNameJa: "脱走パンダマシン",
      skillNameJa: "GUM食ってる場合じゃねぇ！",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 11, 11)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 11〜11% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 11, 11)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 11, 11);
      },
    },
    ext2120: {
      libraryKey: "ext2120",
      extId: 2120,
      extNameJa: "ちびぺが",
      skillNameJa: "小さなはばたき",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 47, 47)}`, "毒 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 47, 47)} ダメージ（INT 47〜47%・1v1=単体）`, "敵に毒 ×1 付与"]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 47, 47);
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext2121: {
      libraryKey: "ext2121",
      extId: 2121,
      extNameJa: "実はミサイル",
      skillNameJa: "マスク砲",
      skillIcon: "guard.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines() { return ["ガード\u3000+6"]; },
      peekHelpKeys() { return ["guard"]; },
      previewLines() { return ["ガードを 6 得る（StS 風代替効果）"]; },
      play(s) {
        s.playerGuard += 6; api.playBattleSe("buff"); api.portraitFx("player", "buff");
      },
    },
    ext2122: {
      libraryKey: "ext2122",
      extId: 2122,
      extNameJa: "エリートイカダ",
      skillNameJa: "ホタルイカダ",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 45, 45), "出血 ×1（敵）"]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 45〜45% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 45, 45)}）`, "敵に出血 ×1 付与"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 45, 45);
        api.addBleedToEnemy(s, 1);
      },
    },
    ext2123: {
      libraryKey: "ext2123",
      extId: 2123,
      extNameJa: "緋の海を探索する魔導海底探索機ジャンヌ・ザ・オメガ",
      skillNameJa: "深海ダコが泣いても許さない魔導電流",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 51, 51)}`, "出血 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 51, 51)} ダメージ（PHY 51〜51%）`, "敵に出血 ×1 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 51, 51);
        api.addBleedToEnemy(s, 1);
      },
    },
    ext2124: {
      libraryKey: "ext2124",
      extId: 2124,
      extNameJa: "エリート手裏剣",
      skillNameJa: "エリート打剣",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 35, 45)}`, "AGI\u3000-3（敵）"]; },
      peekHelpKeys() { return ["agi"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 35, 45)} ダメージ（PHY 35〜45%）`, "敵の AGI を -3"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 35, 45);
        s.enemyAgi = Math.max(1, s.enemyAgi + (-3)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext2125: {
      libraryKey: "ext2125",
      extId: 2125,
      extNameJa: "カエルキッズ",
      skillNameJa: "エリートフロッグフォース",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 20, 25)}`, "PHY\u3000+2"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 20, 25)} ダメージ（PHY 20〜25%）`, "PHY を +2"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 20, 25);
        s.playerPhy += 2;
      },
    },
    ext2126: {
      libraryKey: "ext2126",
      extId: 2126,
      extNameJa: "氷のおてんば王女アイス",
      skillNameJa: "エリートアイシクル",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 20, 25)}`, "INT\u3000+2"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 20, 25)} ダメージ（INT 20〜25%・1v1=単体）`, "INT を +2"]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 20, 25);
        s.playerInt += 2;
      },
    },
    ext2127: {
      libraryKey: "ext2127",
      extId: 2127,
      extNameJa: "わらべ人形",
      skillNameJa: "エリート邪気払い",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 45, 45)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 45〜45% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 45, 45)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 45, 45);
      },
    },
    ext2128: {
      libraryKey: "ext2128",
      extId: 2128,
      extNameJa: "SDNメダル[U]",
      skillNameJa: "Elite Stake POWER!",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 35, 35)}`, `敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 35, 35)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 35, 35)} ダメージ（PHY 35〜35%）`, `敵1体に ${estIntHit(s.playerInt, s.enemyInt, 35, 35)} ダメージ（INT 35〜35%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 35, 35);
        api.dealIntSkillToEnemy(s, 35, 35);
      },
    },
    ext2129: {
      libraryKey: "ext2129",
      extId: 2129,
      extNameJa: "エリートパンケーキ",
      skillNameJa: "エリートもちもちふわふわ",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 25, 40)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 25〜40% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 25, 40)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 25, 40);
      },
    },
    ext2130: {
      libraryKey: "ext2130",
      extId: 2130,
      extNameJa: "エリートレーザーガン",
      skillNameJa: "エリートプラズマショット",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 45, 45)}`, "PHY\u3000+4", "出血 ×1（敵）"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 45, 45)} ダメージ（INT 45〜45%）`, "PHY を +4", "敵に出血 ×1 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 45, 45);
        s.playerPhy += 4;
        api.addBleedToEnemy(s, 1);
      },
    },
    ext2131: {
      libraryKey: "ext2131",
      extId: 2131,
      extNameJa: "鍛冶バッタ",
      skillNameJa: "千磨百錬",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 10, 10)}`, "毒 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 10, 10)} ダメージ（INT 10〜10%・1v1=単体）`, "敵に毒 ×1 付与"]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 10, 10);
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext2132: {
      libraryKey: "ext2132",
      extId: 2132,
      extNameJa: "エリートリミュラス",
      skillNameJa: "ジュラの光",
      skillIcon: "guard.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines() { return ["ガード\u3000+6"]; },
      peekHelpKeys() { return ["guard"]; },
      previewLines() { return ["ガードを 6 得る（StS 風代替効果）"]; },
      play(s) {
        s.playerGuard += 6; api.playBattleSe("buff"); api.portraitFx("player", "buff");
      },
    },
    ext2133: {
      libraryKey: "ext2133",
      extId: 2133,
      extNameJa: "貴重なタンパク源モスラーヴァ",
      skillNameJa: "ジューシー＆クリーミー",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 11, 11), "INT\u3000+1"]; },
      peekHelpKeys() { return ["hp", "int"]; },
      previewLines(s) { return [`HP を回復係数 11〜11% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 11, 11)}）`, "INT を +1"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 11, 11);
        s.playerInt += 1;
      },
    },
    ext2134: {
      libraryKey: "ext2134",
      extId: 2134,
      extNameJa: "エリートスコーピオン",
      skillNameJa: "テラーニードル",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 43, 43)}`, "毒 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 43, 43)} ダメージ（PHY 43〜43%）`, "敵に毒 ×1 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 43, 43);
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext2135: {
      libraryKey: "ext2135",
      extId: 2135,
      extNameJa: "小象蟲し（こぞうむ）バイト•リーダー",
      skillNameJa: "ワンオペの精神",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 58, 58)}`, "AGI\u3000+1"]; },
      peekHelpKeys() { return ["agi"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 58, 58)} ダメージ（PHY 58〜58%）`, "AGI を +1"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 58, 58);
        s.playerAgi += 1;
      },
    },
    ext2136: {
      libraryKey: "ext2136",
      extId: 2136,
      extNameJa: "ちびーとる",
      skillNameJa: "森いちばんのツノ",
      skillIcon: "guard.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines() { return ["ガード\u3000+6"]; },
      peekHelpKeys() { return ["guard"]; },
      previewLines() { return ["ガードを 6 得る（StS 風代替効果）"]; },
      play(s) {
        s.playerGuard += 6; api.playBattleSe("buff"); api.portraitFx("player", "buff");
      },
    },
    ext2137: {
      libraryKey: "ext2137",
      extId: 2137,
      extNameJa: "ハッチ",
      skillNameJa: "ママは何処",
      skillIcon: "BUF_agi.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines() { return ["AGI\u3000+1", "毒 ×1（敵）"]; },
      peekHelpKeys() { return ["agi"]; },
      previewLines() { return ["AGI を +1", "敵に毒 ×1 付与"]; },
      play(s) {
        s.playerAgi += 1;
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext2138: {
      libraryKey: "ext2138",
      extId: 2138,
      extNameJa: "Engineer Ant",
      skillNameJa: "Efficient anthill design",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 90, 90), "PHY\u3000+1"]; },
      peekHelpKeys() { return ["hp", "phy"]; },
      previewLines(s) { return [`HP を回復係数 90〜90% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 90, 90)}）`, "PHY を +1"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 90, 90);
        s.playerPhy += 1;
      },
    },
    ext2139: {
      libraryKey: "ext2139",
      extId: 2139,
      extNameJa: "虹彩紋桃",
      skillNameJa: "すごいちゅるちゅる",
      skillIcon: "guard.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines() { return ["ガード\u3000+6"]; },
      peekHelpKeys() { return ["guard"]; },
      previewLines() { return ["ガードを 6 得る（StS 風代替効果）"]; },
      play(s) {
        s.playerGuard += 6; api.playBattleSe("buff"); api.portraitFx("player", "buff");
      },
    },
    ext2140: {
      libraryKey: "ext2140",
      extId: 2140,
      extNameJa: "エリートオリフラム",
      skillNameJa: "エリートプレジャリージェンス",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 50, 55), "INT\u3000+4"]; },
      peekHelpKeys() { return ["hp", "int"]; },
      previewLines(s) { return [`HP を回復係数 50〜55% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 50, 55)}）`, "INT を +4"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 50, 55);
        s.playerInt += 4;
      },
    },
    ext2141: {
      libraryKey: "ext2141",
      extId: 2141,
      extNameJa: "紋付羽織",
      skillNameJa: "江戸・第一礼装",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 45, 70)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 45, 70)} ダメージ（PHY 45〜70%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 45, 70);
      },
    },
    ext2142: {
      libraryKey: "ext2142",
      extId: 2142,
      extNameJa: "おにぎり弁当",
      skillNameJa: "お花見ウキウキ",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 50, 60)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 50, 60)} ダメージ（INT 50〜60%・代替効果）`]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 50, 60);
      },
    },
    ext2143: {
      libraryKey: "ext2143",
      extId: 2143,
      extNameJa: "アンティーク地球儀",
      skillNameJa: "ソラに想いを馳せる",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 15, 40)}`, "毒 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 15, 40)} ダメージ（INT 15〜40%）`, "敵に毒 ×1 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 15, 40);
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext2147: {
      libraryKey: "ext2147",
      extId: 2147,
      extNameJa: "エリートシールドシステム",
      skillNameJa: "エリートシールドジェネレーター",
      skillIcon: "guard.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines() { return ["ガード\u3000+6"]; },
      peekHelpKeys() { return ["guard"]; },
      previewLines() { return ["ガードを 6 得る（StS 風代替効果）"]; },
      play(s) {
        s.playerGuard += 6; api.playBattleSe("buff"); api.portraitFx("player", "buff");
      },
    },
    ext2148: {
      libraryKey: "ext2148",
      extId: 2148,
      extNameJa: "RYUJI.phy",
      skillNameJa: "エリートRYUクロー",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 25, 25)}`, "毒 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 25, 25)} ダメージ（PHY 25〜25%）`, "敵に毒 ×1 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 25, 25);
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext2149: {
      libraryKey: "ext2149",
      extId: 2149,
      extNameJa: "RYUJI.int",
      skillNameJa: "エリートRYUブレス",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 25, 25)}`, "毒 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 25, 25)} ダメージ（INT 25〜25%・1v1=単体）`, "敵に毒 ×1 付与"]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 25, 25);
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext2150: {
      libraryKey: "ext2150",
      extId: 2150,
      extNameJa: "エリートランタン",
      skillNameJa: "エリートコンバスチョン",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 14, 14)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 14, 14)} ダメージ（INT 14〜14%・1v1=単体）`]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 14, 14);
      },
    },
    ext2151: {
      libraryKey: "ext2151",
      extId: 2151,
      extNameJa: "フィッシュサンド",
      skillNameJa: "さわやか海の恵みサンド",
      skillIcon: "DBF_phy.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      effectSummaryLines() { return ["毒 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines() { return ["敵に毒 ×1 付与"]; },
      play(s) {
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext2152: {
      libraryKey: "ext2152",
      extId: 2152,
      extNameJa: "エリートメイス",
      skillNameJa: "エリートメイスブロー",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 50, 60)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 50, 60)} ダメージ（PHY 50〜60%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 50, 60);
      },
    },
    ext2153: {
      libraryKey: "ext2153",
      extId: 2153,
      extNameJa: "鉄製パンジャンドラム",
      skillNameJa: "エリートローリングウェポン",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 50, 60)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 50, 60)} ダメージ（INT 50〜60%・1v1=単体）`]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 50, 60);
      },
    },
    ext2154: {
      libraryKey: "ext2154",
      extId: 2154,
      extNameJa: "濃厚油そば",
      skillNameJa: "やみつきの味",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 18, 28), "AGI\u3000+4"]; },
      peekHelpKeys() { return ["hp", "agi"]; },
      previewLines(s) { return [`HP を回復係数 18〜28% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 18, 28)}）`, "AGI を +4"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 18, 28);
        s.playerAgi += 4;
      },
    },
    ext2155: {
      libraryKey: "ext2155",
      extId: 2155,
      extNameJa: "スワンレディ",
      skillNameJa: "エリートペダルローイング",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 40, 50)}`, "PHY\u3000-3（敵）", "出血 ×1（敵）"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 40, 50)} ダメージ（PHY 40〜50%）`, "敵の PHY を -3", "敵に出血 ×1 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 40, 50);
        s.enemyPhy = Math.max(1, s.enemyPhy + (-3)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
        api.addBleedToEnemy(s, 1);
      },
    },
    ext2156: {
      libraryKey: "ext2156",
      extId: 2156,
      extNameJa: "コンパス",
      skillNameJa: "エリートマグナビゲート",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 40, 50)}`, "INT\u3000-3（敵）", "出血 ×1（敵）"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 40, 50)} ダメージ（INT 40〜50%）`, "敵の INT を -3", "敵に出血 ×1 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 40, 50);
        s.enemyInt = Math.max(1, s.enemyInt + (-3)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
        api.addBleedToEnemy(s, 1);
      },
    },
    ext2157: {
      libraryKey: "ext2157",
      extId: 2157,
      extNameJa: "並寿司",
      skillNameJa: "高級なシャリ",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 120, 125)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 120〜125% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 120, 125)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 120, 125);
      },
    },
    ext2158: {
      libraryKey: "ext2158",
      extId: 2158,
      extNameJa: "エリートサイバースタッフ",
      skillNameJa: "エリートエナジーコンバート",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 55, 60)}`, "INT\u3000+4"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 55, 60)} ダメージ（INT 55〜60%）`, "INT を +4"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 55, 60);
        s.playerInt += 4;
      },
    },
    ext2159: {
      libraryKey: "ext2159",
      extId: 2159,
      extNameJa: "葉とらずりんご",
      skillNameJa: "エリートアート・ハート",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 45, 50)}`, "INT\u3000+4", "毒 ×1（敵）"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 45, 50)} ダメージ（PHY 45〜50%）`, "INT を +4", "敵に毒 ×1 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 45, 50);
        s.playerInt += 4;
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext2160: {
      libraryKey: "ext2160",
      extId: 2160,
      extNameJa: "金魚鉢",
      skillNameJa: "エリート流体制御",
      skillIcon: "DBF_phy.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      effectSummaryLines() { return ["毒 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines() { return ["敵に毒 ×1 付与"]; },
      play(s) {
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext2161: {
      libraryKey: "ext2161",
      extId: 2161,
      extNameJa: "エリートサイバーソード",
      skillNameJa: "エリートファイナルギャンビット",
      skillIcon: "BUF_phy.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines() { return ["PHY\u3000+4", "INT\u3000+4"]; },
      peekHelpKeys() { return ["phy", "int"]; },
      previewLines() { return ["PHY を +4", "INT を +4"]; },
      play(s) {
        s.playerPhy += 4;
        s.playerInt += 4;
      },
    },
    ext2162: {
      libraryKey: "ext2162",
      extId: 2162,
      extNameJa: "マンドラゴラベビー",
      skillNameJa: "呪いの泣き声",
      skillIcon: "DBF_agi.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      effectSummaryLines() { return ["AGI\u3000-3（敵）", "毒 ×1（敵）"]; },
      peekHelpKeys() { return ["agi"]; },
      previewLines() { return ["敵の AGI を -3", "敵に毒 ×1 付与"]; },
      play(s) {
        s.enemyAgi = Math.max(1, s.enemyAgi + (-3)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext2163: {
      libraryKey: "ext2163",
      extId: 2163,
      extNameJa: "苔玉盆栽",
      skillNameJa: "エリート有機的アート",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 8, 12), "PHY\u3000+3", "INT\u3000+3"]; },
      peekHelpKeys() { return ["hp", "phy", "int"]; },
      previewLines(s) { return [`HP を回復係数 8〜12% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 8, 12)}）`, "PHY を +3", "INT を +3"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 8, 12);
        s.playerPhy += 3;
        s.playerInt += 3;
      },
    },
    ext2164: {
      libraryKey: "ext2164",
      extId: 2164,
      extNameJa: "エリートメリケンサック",
      skillNameJa: "エリートリーチング・シャドウ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 55, 65)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 55, 65)} ダメージ（PHY 55〜65%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 55, 65);
      },
    },
    ext2165: {
      libraryKey: "ext2165",
      extId: 2165,
      extNameJa: "ピアノ・オルゴール",
      skillNameJa: "ピアノメロディ・ラウンド",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 55, 65)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 55, 65)} ダメージ（INT 55〜65%）`]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 55, 65);
      },
    },
    ext2169: {
      libraryKey: "ext2169",
      extId: 2169,
      extNameJa: "アンモナイトの標本",
      skillNameJa: "太古の渦巻く記憶",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 20, 25)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 20, 25)} ダメージ（INT 20〜25%・1v1=単体）`]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 20, 25);
      },
    },
    ext2170: {
      libraryKey: "ext2170",
      extId: 2170,
      extNameJa: "オフィスチェア",
      skillNameJa: "エリート着席",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 95, 115), "PHY\u3000+1", "出血 ×1（敵）"]; },
      peekHelpKeys() { return ["hp", "phy"]; },
      previewLines(s) { return [`HP を回復係数 95〜115% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 95, 115)}）`, "PHY を +1", "敵に出血 ×1 付与"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 95, 115);
        s.playerPhy += 1;
        api.addBleedToEnemy(s, 1);
      },
    },
    ext2171: {
      libraryKey: "ext2171",
      extId: 2171,
      extNameJa: "理容師の鋏",
      skillNameJa: "エリートテンポトリム",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 50, 60)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 50, 60)} ダメージ（PHY 50〜60%・代替効果）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 50, 60);
      },
    },
    ext2172: {
      libraryKey: "ext2172",
      extId: 2172,
      extNameJa: "がま口財布",
      skillNameJa: "エリート資産凍結",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines() { return ["ドロー　1"]; },
      peekHelpKeys() { return ["draw"]; },
      previewLines() { return ["カードを 1 枚引く（StS 風代替効果）"]; },
      play(s) {
        api.drawCards(s, 1);
      },
    },
    ext2173: {
      libraryKey: "ext2173",
      extId: 2173,
      extNameJa: "クリスタルのタリスマン",
      skillNameJa: "エリートファントムシュート",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 25, 25)}`, "出血 ×1（敵）", "毒 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 25, 25)} ダメージ（INT 25〜25%）`, "敵に出血 ×1 付与", "敵に毒 ×1 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 25, 25);
        api.addBleedToEnemy(s, 1);
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext2174: {
      libraryKey: "ext2174",
      extId: 2174,
      extNameJa: "ドリームセット",
      skillNameJa: "エリートマジカルヒーリング",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 15, 20)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 15〜20% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 15, 20)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 15, 20);
      },
    },
    ext2175: {
      libraryKey: "ext2175",
      extId: 2175,
      extNameJa: "ジャッカロープホーン",
      skillNameJa: "エリートホーンオーラ",
      skillIcon: "guard.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines() { return ["ガード\u3000+6"]; },
      peekHelpKeys() { return ["guard"]; },
      previewLines() { return ["ガードを 6 得る（StS 風代替効果）"]; },
      play(s) {
        s.playerGuard += 6; api.playBattleSe("buff"); api.portraitFx("player", "buff");
      },
    },
    ext2176: {
      libraryKey: "ext2176",
      extId: 2176,
      extNameJa: "ストロベリースポンジケーキ",
      skillNameJa: "エリート甘酸っぱい",
      skillIcon: "DBF_phy.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      effectSummaryLines() { return ["毒 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines() { return ["敵に毒 ×1 付与"]; },
      play(s) {
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext2177: {
      libraryKey: "ext2177",
      extId: 2177,
      extNameJa: "ゴーレムポーン",
      skillNameJa: "エリートナチュレ・ストライド",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 30, 35)}`, "PHY\u3000+1"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 30, 35)} ダメージ（PHY 30〜35%）`, "PHY を +1"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 30, 35);
        s.playerPhy += 1;
      },
    },
    ext2178: {
      libraryKey: "ext2178",
      extId: 2178,
      extNameJa: "エリートマジックカード",
      skillNameJa: "エリートマジックチャント",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 30, 35)}`, "INT\u3000+1"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 30, 35)} ダメージ（INT 30〜35%）`, "INT を +1"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 30, 35);
        s.playerInt += 1;
      },
    },
    ext2179: {
      libraryKey: "ext2179",
      extId: 2179,
      extNameJa: "籠罠",
      skillNameJa: "エリートノックアウト・トラップ",
      skillIcon: "DBF_int.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      effectSummaryLines() { return ["INT\u3000-3（敵）", "AGI\u3000-3（敵）", "出血 ×1（敵）"]; },
      peekHelpKeys() { return ["int", "agi"]; },
      previewLines() { return ["敵の INT を -3", "敵の AGI を -3", "敵に出血 ×1 付与"]; },
      play(s) {
        s.enemyInt = Math.max(1, s.enemyInt + (-3)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
        s.enemyAgi = Math.max(1, s.enemyAgi + (-3)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
        api.addBleedToEnemy(s, 1);
      },
    },
    ext2180: {
      libraryKey: "ext2180",
      extId: 2180,
      extNameJa: "三毛猫&レトロじゃらし",
      skillNameJa: "エリートゴロゴロ惑乱",
      skillIcon: "DBF_agi.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      effectSummaryLines() { return ["PHY\u3000-3（敵）", "AGI\u3000-3（敵）", "毒 ×1（敵）"]; },
      peekHelpKeys() { return ["phy", "agi"]; },
      previewLines() { return ["敵の PHY を -3", "敵の AGI を -3", "敵に毒 ×1 付与"]; },
      play(s) {
        s.enemyPhy = Math.max(1, s.enemyPhy + (-3)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
        s.enemyAgi = Math.max(1, s.enemyAgi + (-3)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext2181: {
      libraryKey: "ext2181",
      extId: 2181,
      extNameJa: "低級精霊召喚セット",
      skillNameJa: "低位の霊圧",
      skillIcon: "guard.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines() { return ["ガード\u3000+6"]; },
      peekHelpKeys() { return ["guard"]; },
      previewLines() { return ["ガードを 6 得る（StS 風代替効果）"]; },
      play(s) {
        s.playerGuard += 6; api.playBattleSe("buff"); api.portraitFx("player", "buff");
      },
    },
    ext2182: {
      libraryKey: "ext2182",
      extId: 2182,
      extNameJa: "二階建て",
      skillNameJa: "エリート箱庭リノベーション",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 50, 60)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 50, 60)} ダメージ（INT 50〜60%・代替効果）`]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 50, 60);
      },
    },
    ext2183: {
      libraryKey: "ext2183",
      extId: 2183,
      extNameJa: "エリートフレイル",
      skillNameJa: "エリート鉄球一閃",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 50, 60)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 50, 60)} ダメージ（PHY 50〜60%・代替効果）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 50, 60);
      },
    },
    ext2184: {
      libraryKey: "ext2184",
      extId: 2184,
      extNameJa: "グラスゼミ",
      skillNameJa: "エリートバズ・ファズ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 50, 60)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 50, 60)} ダメージ（PHY 50〜60%・代替効果）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 50, 60);
      },
    },
    ext2185: {
      libraryKey: "ext2185",
      extId: 2185,
      extNameJa: "金鉱石竜",
      skillNameJa: "エリートジェムコイル・エンブレイス",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 40, 40)}`, "PHY\u3000+3", "AGI\u3000-3（敵）"]; },
      peekHelpKeys() { return ["phy", "agi"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 40, 40)} ダメージ（PHY 40〜40%）`, "PHY を +3", "敵の AGI を -3"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 40, 40);
        s.playerPhy += 3;
        s.enemyAgi = Math.max(1, s.enemyAgi + (-3)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext2186: {
      libraryKey: "ext2186",
      extId: 2186,
      extNameJa: "ハトねこ",
      skillNameJa: "エリート獣翼アップリフト",
      skillIcon: "guard.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines() { return ["ガード\u3000+6"]; },
      peekHelpKeys() { return ["guard"]; },
      previewLines() { return ["ガードを 6 得る（StS 風代替効果）"]; },
      play(s) {
        s.playerGuard += 6; api.playBattleSe("buff"); api.portraitFx("player", "buff");
      },
    },
    ext2187: {
      libraryKey: "ext2187",
      extId: 2187,
      extNameJa: "エリートジャベリン",
      skillNameJa: "エリートインペイルチャージ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 40, 50)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 40, 50)} ダメージ（PHY 40〜50%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 40, 50);
      },
    },
    ext2188: {
      libraryKey: "ext2188",
      extId: 2188,
      extNameJa: "エリートブーメラン",
      skillNameJa: "エリートリターンシュート",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 40, 50)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 40, 50)} ダメージ（INT 40〜50%）`]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 40, 50);
      },
    },
    ext2189: {
      libraryKey: "ext2189",
      extId: 2189,
      extNameJa: "エメラルドドラゴン",
      skillNameJa: "エリートイルミネーションバースト",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 25, 25)}`, `敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 25, 25)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 25, 25)} ダメージ（PHY 25〜25%）`, `敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 25, 25)} ダメージ（INT 25〜25%・1v1=単体）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 25, 25);
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 25, 25);
      },
    },
    ext2190: {
      libraryKey: "ext2190",
      extId: 2190,
      extNameJa: "紳士用傘",
      skillNameJa: "エリートレインヴェール",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 25, 25)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 25〜25% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 25, 25)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 25, 25);
      },
    },
    ext2191: {
      libraryKey: "ext2191",
      extId: 2191,
      extNameJa: "エリート梨",
      skillNameJa: "静穏の収穫・弐",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 40, 45)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 40, 45)} ダメージ（PHY 40〜45%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 40, 45);
      },
    },
    ext2192: {
      libraryKey: "ext2192",
      extId: 2192,
      extNameJa: "エリートチャクラム",
      skillNameJa: "エリートマインドオービット",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 35, 45)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 35, 45)} ダメージ（INT 35〜45%・1v1=単体）`]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 35, 45);
      },
    },
    ext2193: {
      libraryKey: "ext2193",
      extId: 2193,
      extNameJa: "クロリスのボンネット",
      skillNameJa: "エリートミティゲーション",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 50, 60)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 50〜60% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 50, 60)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 50, 60);
      },
    },
    ext2194: {
      libraryKey: "ext2194",
      extId: 2194,
      extNameJa: "ライオンツイン",
      skillNameJa: "エリートレオハウリング",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 39, 49)}`, "毒 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 39, 49)} ダメージ（PHY 39〜49%）`, "敵に毒 ×1 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 39, 49);
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext2600: {
      libraryKey: "ext2600",
      extId: 2600,
      extNameJa: "魔法剣タケミカヅチ",
      skillNameJa: "おのれマルコス！",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 50, 55)}`, "PHY\u3000+4", "毒 ×1（敵）"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 50, 55)} ダメージ（PHY 50〜55%）`, "PHY を +4", "敵に毒 ×1 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 50, 55);
        s.playerPhy += 4;
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext2640: {
      libraryKey: "ext2640",
      extId: 2640,
      extNameJa: "オリフラム・オブ・パイレーツ",
      skillNameJa: "海神の扇動",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 50, 55), "INT\u3000+4"]; },
      peekHelpKeys() { return ["hp", "int"]; },
      previewLines(s) { return [`HP を回復係数 50〜55% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 50, 55)}）`, "INT を +4"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 50, 55);
        s.playerInt += 4;
      },
    },
    ext2647: {
      libraryKey: "ext2647",
      extId: 2647,
      extNameJa: "クラブシェル",
      skillNameJa: "硬度250Hv",
      skillIcon: "guard.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines() { return ["ガード\u3000+6"]; },
      peekHelpKeys() { return ["guard"]; },
      previewLines() { return ["ガードを 6 得る（StS 風代替効果）"]; },
      play(s) {
        s.playerGuard += 6; api.playBattleSe("buff"); api.portraitFx("player", "buff");
      },
    },
    ext2651: {
      libraryKey: "ext2651",
      extId: 2651,
      extNameJa: "人知超越の鍵",
      skillNameJa: "シンギュラリティ",
      skillIcon: "DBF_phy.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      effectSummaryLines() { return ["毒 ×1（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines() { return ["敵に毒 ×1 付与"]; },
      play(s) {
        api.addPoisonToEnemy(s, 1);
      },
    },
    ext2674: {
      libraryKey: "ext2674",
      extId: 2674,
      extNameJa: "魔法使い猫",
      skillNameJa: "解呪のおまじない",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 15, 20)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 15〜20% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 15, 20)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 15, 20);
      },
    },
  };
}

/** @param {object} api */
export function createCardRuntime(clog, api) {
  const CARD_LIBRARY = makeCardLibrary(clog, api);
  function copyCard(key) {
    const def = CARD_LIBRARY[key];
    return {
      ...def,
      play: def.play,
      previewLines: def.previewLines,
      effectSummaryLines: def.effectSummaryLines,
      peekHelpKeys: def.peekHelpKeys,
    };
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

/**
 * カードレアリティ定義（SPEC §カードレアリティ）
 * ここを編集するだけで全カードのレアリティ（枠色）を変更できます。
 *
 * 値: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
 * 色: common=#0984E3 / uncommon=#00B894 / rare=#FDCB6E / epic=#E17055 / legendary=#D63031
 */
export const CARD_RARITIES = {
  // ─── スターターカード ──────────────────────────────────────────────
  ext1001: 'common',    // ノービスブレード
  ext1002: 'common',    // ノービスマスケット
  ext1003: 'common',    // ノービスペン
  ext1004: 'common',    // ノービスアーマー
  ext1005: 'uncommon',  // ノービスホース（次ターンエナジー）
  ext1006: 'common',    // ノービスカタナ
  ext1008: 'common',    // ノービスブック（INT+ドロー+ダメージ）
  ext1011: 'common',    // アックス
  ext1012: 'common',    // ETHEREMON-EKOPI
  ext1022: 'uncommon',  // ドラゴン（全体+INT debuff）
  ext1023: 'common',    // ブル（全体+自己PHYダウン）
  ext2001: 'uncommon',  // エリートブレード
  ext2002: 'uncommon',  // エリートマスケット（全体）
  ext2003: 'uncommon',  // エリートペン（HP回復・消耗）
  ext2004: 'uncommon',  // エリートアーマー（PHY%アップ）
  ext2005: 'uncommon',  // エリートホース（ガード+AGI永続）
  ext2006: 'uncommon',  // エリートカタナ
  ext2008: 'uncommon',  // エリートブック（INT+ドロー）
  ext2011: 'uncommon',  // エリートアックス
  ext2013: 'uncommon',  // エリートユミ

  // ─── 章0 アバカス カードプール ────────────────────────────────────
  cd101:   'uncommon',  // 一刀（PHY100%）
  cd102:   'rare',      // 二段斬り（PHY70%×2）
  cd103:   'common',    // 構え（ガード+6）
  cd104:   'uncommon',  // 集中（エナジー+1）
  cd105:   'rare',      // 一閃（PHY150%）
  cd106:   'uncommon',  // 鼓舞（PHY+3永続）
  cd107:   'uncommon',  // 治療（HP回復）
  cd108:   'uncommon',  // 突撃（コスト0+次ターンペナルティ）

  // ─── 章1 ホレリス カードプール ────────────────────────────────────
  cdH01:   'rare',      // 抜刀・一閃（PHY80%・消耗）
  cdH02:   'uncommon',  // 出血弾・速射（PHY+出血×1）
  cdH03:   'uncommon',  // 疾風の構え（ガード+8+AGI永続）
  cdH04:   'rare',      // 緊急回復（コスト0・消耗）
  cdH05:   'uncommon',  // 連矢（PHY50%×2）
  cdH06:   'rare',      // 知識の爆発（INT+2+ドロー3）

  // ─── 章2 アンティキティラ カードプール ───────────────────────────
  cd301:   'uncommon',  // 鋼の盾（シールド+10）
  cd302:   'epic',      // 大鎚（PHY200%）
  cd303:   'epic',      // 戦術指揮（PHY+5+INT+5永続）
  cd304:   'rare',      // 必殺の閃光（INT130%クリ確定）
  cd305:   'rare',      // 不屈（このターン被ダメ半減）

  // ─── 章3 アタナソフ カードプール ─────────────────────────────────
  cd201:   'uncommon',  // 毒の刃（PHY+毒×2）
  cd202:   'rare',      // エリートスナイプ（PHY90%+出血×2）
  cd203:   'common',    // 解毒（コスト0・デバフ解除）
  cd204:   'rare',      // エリートプロテクション（ガード+12）
  cd205:   'rare',      // エリートショット（INT×3）
  cd206:   'uncommon',  // 投資（GUM+20）
// ─── auto-generated CARD_RARITIES entries ───
  ext1009: 'common',
  ext1010: 'common',
  ext1013: 'common',
  ext1014: 'common',
  ext1015: 'common',
  ext1016: 'common',
  ext1017: 'common',
  ext1018: 'common',
  ext1019: 'common',
  ext1020: 'common',
  ext1021: 'common',
  ext1024: 'common',
  ext1025: 'common',
  ext1026: 'common',
  ext1027: 'common',
  ext1028: 'common',
  ext1029: 'common',
  ext1030: 'common',
  ext1031: 'common',
  ext1032: 'common',
  ext1033: 'common',
  ext1034: 'common',
  ext1035: 'common',
  ext1036: 'common',
  ext1037: 'common',
  ext1038: 'common',
  ext1039: 'common',
  ext1040: 'common',
  ext1041: 'common',
  ext1042: 'common',
  ext1043: 'common',
  ext1044: 'common',
  ext1045: 'common',
  ext1046: 'common',
  ext1047: 'common',
  ext1048: 'common',
  ext1049: 'common',
  ext1050: 'common',
  ext1051: 'common',
  ext1055: 'common',
  ext1056: 'common',
  ext1057: 'common',
  ext1058: 'common',
  ext1059: 'common',
  ext1060: 'common',
  ext1061: 'common',
  ext1063: 'common',
  ext1064: 'common',
  ext1065: 'common',
  ext1066: 'common',
  ext1067: 'common',
  ext1068: 'common',
  ext1069: 'common',
  ext1070: 'common',
  ext1071: 'common',
  ext1072: 'common',
  ext1073: 'common',
  ext1074: 'common',
  ext1075: 'common',
  ext1079: 'common',
  ext1080: 'common',
  ext1081: 'common',
  ext1082: 'common',
  ext1085: 'common',
  ext1086: 'common',
  ext1087: 'common',
  ext1088: 'common',
  ext1089: 'common',
  ext1090: 'common',
  ext1091: 'common',
  ext1092: 'common',
  ext1093: 'common',
  ext1094: 'common',
  ext1095: 'common',
  ext1096: 'common',
  ext1097: 'common',
  ext1098: 'common',
  ext1099: 'common',
  ext1100: 'common',
  ext1102: 'common',
  ext1103: 'common',
  ext1104: 'common',
  ext1105: 'common',
  ext1106: 'common',
  ext1107: 'common',
  ext1108: 'common',
  ext1109: 'common',
  ext1110: 'common',
  ext1111: 'common',
  ext1112: 'common',
  ext1113: 'common',
  ext1115: 'common',
  ext1116: 'common',
  ext1117: 'common',
  ext1118: 'common',
  ext1119: 'common',
  ext1120: 'common',
  ext1121: 'common',
  ext1122: 'common',
  ext1123: 'common',
  ext1124: 'common',
  ext1125: 'common',
  ext1126: 'common',
  ext1127: 'common',
  ext1128: 'common',
  ext1129: 'common',
  ext1130: 'common',
  ext1131: 'common',
  ext1132: 'common',
  ext1133: 'common',
  ext1134: 'common',
  ext1135: 'common',
  ext1136: 'common',
  ext1137: 'common',
  ext1138: 'common',
  ext1139: 'common',
  ext1140: 'common',
  ext1141: 'common',
  ext1142: 'common',
  ext1143: 'common',
  ext1147: 'common',
  ext1148: 'common',
  ext1149: 'common',
  ext1150: 'common',
  ext1151: 'common',
  ext1152: 'common',
  ext1153: 'common',
  ext1154: 'common',
  ext1155: 'common',
  ext1156: 'common',
  ext1157: 'common',
  ext1158: 'common',
  ext1159: 'common',
  ext1160: 'common',
  ext1161: 'common',
  ext1162: 'common',
  ext1163: 'common',
  ext1164: 'common',
  ext1165: 'common',
  ext1169: 'common',
  ext1170: 'common',
  ext1171: 'common',
  ext1172: 'common',
  ext1173: 'common',
  ext1174: 'common',
  ext1175: 'common',
  ext1176: 'common',
  ext1177: 'common',
  ext1178: 'common',
  ext1179: 'common',
  ext1180: 'common',
  ext1181: 'common',
  ext1182: 'common',
  ext1183: 'common',
  ext1184: 'common',
  ext1185: 'common',
  ext1186: 'common',
  ext1187: 'common',
  ext1188: 'common',
  ext1189: 'common',
  ext1190: 'common',
  ext1191: 'common',
  ext1192: 'common',
  ext1193: 'common',
  ext1194: 'common',
  ext2007: 'uncommon',
  ext2009: 'uncommon',
  ext2010: 'uncommon',
  ext2012: 'uncommon',
  ext2014: 'uncommon',
  ext2015: 'uncommon',
  ext2016: 'uncommon',
  ext2017: 'uncommon',
  ext2018: 'uncommon',
  ext2019: 'uncommon',
  ext2020: 'uncommon',
  ext2021: 'uncommon',
  ext2022: 'uncommon',
  ext2023: 'uncommon',
  ext2024: 'uncommon',
  ext2025: 'uncommon',
  ext2026: 'uncommon',
  ext2027: 'uncommon',
  ext2028: 'uncommon',
  ext2029: 'uncommon',
  ext2030: 'uncommon',
  ext2031: 'uncommon',
  ext2032: 'uncommon',
  ext2033: 'uncommon',
  ext2034: 'uncommon',
  ext2035: 'uncommon',
  ext2036: 'uncommon',
  ext2037: 'uncommon',
  ext2038: 'uncommon',
  ext2039: 'uncommon',
  ext2040: 'uncommon',
  ext2041: 'uncommon',
  ext2042: 'uncommon',
  ext2043: 'uncommon',
  ext2044: 'uncommon',
  ext2045: 'uncommon',
  ext2046: 'uncommon',
  ext2047: 'uncommon',
  ext2048: 'uncommon',
  ext2049: 'uncommon',
  ext2050: 'uncommon',
  ext2051: 'uncommon',
  ext2052: 'uncommon',
  ext2053: 'uncommon',
  ext2054: 'uncommon',
  ext2055: 'uncommon',
  ext2056: 'uncommon',
  ext2057: 'uncommon',
  ext2058: 'uncommon',
  ext2059: 'uncommon',
  ext2060: 'uncommon',
  ext2061: 'uncommon',
  ext2062: 'uncommon',
  ext2063: 'uncommon',
  ext2064: 'uncommon',
  ext2065: 'uncommon',
  ext2066: 'uncommon',
  ext2067: 'uncommon',
  ext2068: 'uncommon',
  ext2069: 'uncommon',
  ext2070: 'uncommon',
  ext2071: 'uncommon',
  ext2072: 'uncommon',
  ext2073: 'uncommon',
  ext2074: 'uncommon',
  ext2075: 'uncommon',
  ext2076: 'uncommon',
  ext2077: 'uncommon',
  ext2079: 'uncommon',
  ext2080: 'uncommon',
  ext2081: 'uncommon',
  ext2082: 'uncommon',
  ext2083: 'uncommon',
  ext2084: 'uncommon',
  ext2085: 'uncommon',
  ext2086: 'uncommon',
  ext2087: 'uncommon',
  ext2088: 'uncommon',
  ext2089: 'uncommon',
  ext2090: 'uncommon',
  ext2091: 'uncommon',
  ext2092: 'uncommon',
  ext2093: 'uncommon',
  ext2094: 'uncommon',
  ext2095: 'uncommon',
  ext2096: 'uncommon',
  ext2097: 'uncommon',
  ext2098: 'uncommon',
  ext2099: 'uncommon',
  ext2100: 'uncommon',
  ext2101: 'uncommon',
  ext2102: 'uncommon',
  ext2103: 'uncommon',
  ext2104: 'uncommon',
  ext2105: 'uncommon',
  ext2106: 'uncommon',
  ext2107: 'uncommon',
  ext2108: 'uncommon',
  ext2109: 'uncommon',
  ext2110: 'uncommon',
  ext2111: 'uncommon',
  ext2112: 'uncommon',
  ext2113: 'uncommon',
  ext2115: 'uncommon',
  ext2116: 'uncommon',
  ext2117: 'uncommon',
  ext2118: 'uncommon',
  ext2119: 'uncommon',
  ext2120: 'uncommon',
  ext2121: 'uncommon',
  ext2122: 'uncommon',
  ext2123: 'uncommon',
  ext2124: 'uncommon',
  ext2125: 'uncommon',
  ext2126: 'uncommon',
  ext2127: 'uncommon',
  ext2128: 'uncommon',
  ext2129: 'uncommon',
  ext2130: 'uncommon',
  ext2131: 'uncommon',
  ext2132: 'uncommon',
  ext2133: 'uncommon',
  ext2134: 'uncommon',
  ext2135: 'uncommon',
  ext2136: 'uncommon',
  ext2137: 'uncommon',
  ext2138: 'uncommon',
  ext2139: 'uncommon',
  ext2140: 'uncommon',
  ext2141: 'uncommon',
  ext2142: 'uncommon',
  ext2143: 'uncommon',
  ext2147: 'uncommon',
  ext2148: 'uncommon',
  ext2149: 'uncommon',
  ext2150: 'uncommon',
  ext2151: 'uncommon',
  ext2152: 'uncommon',
  ext2153: 'uncommon',
  ext2154: 'uncommon',
  ext2155: 'uncommon',
  ext2156: 'uncommon',
  ext2157: 'uncommon',
  ext2158: 'uncommon',
  ext2159: 'uncommon',
  ext2160: 'uncommon',
  ext2161: 'uncommon',
  ext2162: 'uncommon',
  ext2163: 'uncommon',
  ext2164: 'uncommon',
  ext2165: 'uncommon',
  ext2169: 'uncommon',
  ext2170: 'uncommon',
  ext2171: 'uncommon',
  ext2172: 'uncommon',
  ext2173: 'uncommon',
  ext2174: 'uncommon',
  ext2175: 'uncommon',
  ext2176: 'uncommon',
  ext2177: 'uncommon',
  ext2178: 'uncommon',
  ext2179: 'uncommon',
  ext2180: 'uncommon',
  ext2181: 'uncommon',
  ext2182: 'uncommon',
  ext2183: 'uncommon',
  ext2184: 'uncommon',
  ext2185: 'uncommon',
  ext2186: 'uncommon',
  ext2187: 'uncommon',
  ext2188: 'uncommon',
  ext2189: 'uncommon',
  ext2190: 'uncommon',
  ext2191: 'uncommon',
  ext2192: 'uncommon',
  ext2193: 'uncommon',
  ext2194: 'uncommon',
  ext2600: 'uncommon',
  ext2640: 'uncommon',
  ext2647: 'uncommon',
  ext2651: 'uncommon',
  ext2674: 'uncommon',
};

/**
 * カードランクアップ系列（ノービス → エリート）
 * クラフトノードの「打ち直し」で使用。
 * キーのカードを値のカードに 1 段階アップグレードできる。
 */
export const CARD_UPGRADE_SERIES = {
  ext1001: 'ext2001',  // ノービスブレード → エリートブレード
  ext1002: 'ext2002',  // ノービスマスケット → エリートマスケット
  ext1003: 'ext2003',  // ノービスペン → エリートペン
  ext1004: 'ext2004',  // ノービスアーマー → エリートアーマー
  ext1005: 'ext2005',  // ノービスホース → エリートホース
  ext1006: 'ext2006',  // ノービスカタナ → エリートカタナ
  ext1008: 'ext2008',  // ノービスブック → エリートブック
  ext1011: 'ext2011',  // アックス → エリートアックス
};
