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
      cost: 2,
      type: "atk",
      effectSummaryLines(s) {
        const d = estPhyHit(s.playerPhy, s.enemyPhy, 55, 65);
        return [`敵にダメージ　${d}`];
      },
      peekHelpKeys() {
        return [];
      },
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
      effectSummaryLines(s) {
        const d = estIntHit(s.playerInt, s.enemyInt, 30, 35);
        return [`敵にダメージ　${d}`];
      },
      peekHelpKeys() {
        return [];
      },
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
      effectSummaryLines(s) {
        const lo = Math.max(1, Math.floor(s.playerPhy * 0.1));
        const hi = Math.max(1, Math.floor(s.playerPhy * 0.15));
        return [`PHY　+${lo}〜${hi}`];
      },
      peekHelpKeys() {
        return ["phy"];
      },
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
      effectSummaryLines(s) {
        const d = estPhyHit(s.playerPhy, s.enemyPhy, 50, 60);
        return [`敵にダメージ　${d}`];
      },
      peekHelpKeys() {
        return [];
      },
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
      effectSummaryLines(s) {
        const d = estPhyHit(s.playerPhy, s.enemyPhy, 50, 60);
        return [`敵にダメージ　${d}`];
      },
      peekHelpKeys() {
        return [];
      },
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
      effectSummaryLines(s) {
        const d = estPhyHit(s.playerPhy, s.enemyPhy, 40, 50);
        return [`敵にダメージ　${d}`];
      },
      peekHelpKeys() {
        return [];
      },
      previewLines(s) {
        const d = estPhyHit(s.playerPhy, s.enemyPhy, 40, 50);
        return [`敵1体に ${d} ダメージ（PHY ${40}〜${50}%・高INT相手想定）`];
      },
      play(s) {
        api.dealPhySkillToEnemy(s, 40, 50);
      },
    },

    // ════════════════════════════════════════
    // 章 1 ── 戦国回廊 カードプール（SPEC-004 §6.4）
    // ════════════════════════════════════════
    cd101: {
      libraryKey: "cd101",
      extId: 1006,
      extNameJa: "一刀",
      skillNameJa: "一刀",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
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
      extNameJa: "二段斬り",
      skillNameJa: "二段斬り",
      skillIcon: "phy.png",
      cost: 2,
      type: "atk",
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
      extNameJa: "構え",
      skillNameJa: "構え",
      skillIcon: "BUF_phy.png",
      cost: 1,
      type: "skl",
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
      extNameJa: "集中",
      skillNameJa: "集中",
      skillIcon: "int.png",
      cost: 1,
      type: "skl",
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
      extNameJa: "一閃",
      skillNameJa: "一閃",
      skillIcon: "phy.png",
      cost: 2,
      type: "atk",
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
      extNameJa: "鼓舞",
      skillNameJa: "鼓舞",
      skillIcon: "BUF_phy.png",
      cost: 1,
      type: "skl",
      effectSummaryLines() { return ["PHY　+3（永続）"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines() { return ["PHY を +3（このランの残り全ての戦闘で有効）"]; },
      play(s) {
        se("buff"); fx("player", "buff");
        s.playerPhy += 3;
        clog("鼓舞: PHY+3");
      },
    },

    cd107: {
      libraryKey: "cd107",
      extId: 1003,
      extNameJa: "治療",
      skillNameJa: "治療",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
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
      extNameJa: "突撃",
      skillNameJa: "突撃",
      skillIcon: "phy.png",
      cost: 0,
      type: "atk",
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
    // 章 2 ── 大航海の港 カードプール（SPEC-004 §7.4）
    // ════════════════════════════════════════
    cd201: {
      libraryKey: "cd201",
      extId: 1001,
      extNameJa: "毒の刃",
      skillNameJa: "毒の刃",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
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
      extNameJa: "出血弾",
      skillNameJa: "出血弾",
      skillIcon: "phy.png",
      cost: 2,
      type: "atk",
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
      extNameJa: "解毒",
      skillNameJa: "解毒",
      skillIcon: "hp.png",
      cost: 0,
      type: "skl",
      effectSummaryLines() { return ["毒・出血 解除（自分）"]; },
      peekHelpKeys() { return []; },
      previewLines() { return ["自分の毒スタックと出血スタックをすべて解除する"]; },
      play(s) { api.clearPlayerDebuffs(s); },
    },

    cd204: {
      libraryKey: "cd204",
      extId: 2004,
      extNameJa: "防御陣",
      skillNameJa: "防御陣",
      skillIcon: "BUF_phy.png",
      cost: 2,
      type: "skl",
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
      extNameJa: "連射",
      skillNameJa: "連射",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
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
      extNameJa: "投資",
      skillNameJa: "投資",
      skillIcon: "int.png",
      cost: 0,
      type: "skl",
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
      extNameJa: "鋼の盾",
      skillNameJa: "鋼の盾",
      skillIcon: "BUF_agi.png",
      cost: 1,
      type: "skl",
      effectSummaryLines() { return ["シールド　+10"]; },
      peekHelpKeys() { return ["shield"]; },
      previewLines() { return ["シールドを 10 得る（特殊ダメージのみ吸収）"]; },
      play(s) { api.addPlayerShield(s, 10); },
    },

    cd302: {
      libraryKey: "cd302",
      extId: 1011,
      extNameJa: "大鎚",
      skillNameJa: "大鎚",
      skillIcon: "phy.png",
      cost: 3,
      type: "atk",
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
      extNameJa: "戦術指揮",
      skillNameJa: "戦術指揮",
      skillIcon: "BUF_phy.png",
      cost: 2,
      type: "skl",
      effectSummaryLines() { return ["PHY　+5", "INT　+5（永続）"]; },
      peekHelpKeys() { return ["phy", "int"]; },
      previewLines() { return ["PHY を +5、INT を +5（永続）"]; },
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
      extNameJa: "必殺の閃光",
      skillNameJa: "必殺の閃光",
      skillIcon: "int.png",
      cost: 2,
      type: "atk",
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
      extNameJa: "不屈",
      skillNameJa: "不屈",
      skillIcon: "BUF_agi.png",
      cost: 0,
      type: "skl",
      effectSummaryLines() { return ["被ダメージ ½（このターン）"]; },
      peekHelpKeys() { return ["guard"]; },
      previewLines() { return ["このターン（ターン終了まで）受けるダメージをすべて半減する"]; },
      play(s) { api.setDamageReducedThisTurn(s); },
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
