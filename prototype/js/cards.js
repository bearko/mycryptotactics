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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 50-60%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 25-30%" },
        { target: "enemy.foremost", text: "敵INT -2" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT30-40%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "PHY +2" },
        { target: "self", text: "ガード +7" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "AGI +3" },
        { target: "self", text: "ガード +3" },
        { target: "self", text: "次ターン ⚡+1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 45-55%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "INT +1" },
        { target: "self", text: "ドロー +2" },
        { target: "enemy.foremost", text: "INTダメ 15-20%" }
      ],
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
      skillNameJa: "バイセクト",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 45-55%" }
      ],
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
      skillNameJa: "ゴー!エコピー!",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: 攻撃 + 敵 AGI ダウン
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 40%" },
        { target: "enemy.foremost", text: "敵AGI -3%" }
      ],
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
      skillNameJa: "フクリュウ",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: 攻撃 + 敵 INT ダウン
      effects: [
        { target: "enemy.foremost", text: "INTダメ 15-20%" },
        { target: "enemy.foremost", text: "敵INT -6%" }
      ],
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
      skillNameJa: "ギュウキ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: 攻撃 + 自身 PHY ダウン
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 30-40%" },
        { target: "self", text: "PHY -9%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 65-80%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 35-45%" },
        { target: "enemy.foremost", text: "敵INT -3" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "PHY +3" },
        { target: "self", text: "ガード +12" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 60-75%" }
      ],
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
      skillNameJa: "エリートバイセクト",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 60-75%" }
      ],
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
      skillNameJa: "エリートヤブサメ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 55-70%" }
      ],
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
      caster: "foremost",
      // SPEC-006: HP 回復 (INT+PHY)/2 + 消耗
      effects: [
        { target: "self", text: "HP回復 (INT+PHY)÷2" },
        { target: "self", text: "【消耗】" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "ガード +8" },
        { target: "self", text: "AGI +2" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "INT +2" },
        { target: "self", text: "ドロー +3" }
      ],
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
      extNameJa: "練習用の太刀",
      skillNameJa: "一刀",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 100-100%" }
      ],
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
      extNameJa: "アバカスの斧",
      skillNameJa: "二段斬り",
      skillIcon: "phy.png",
      cost: 2,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 70-70%" },
        { target: "enemy.foremost", text: "PHYダメ 70-70%" }
      ],
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
      extNameJa: "練習用の胴当て",
      skillNameJa: "構え",
      skillIcon: "BUF_phy.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "ガード +6" }
      ],
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
      extNameJa: "練習用の教本",
      skillNameJa: "集中",
      skillIcon: "int.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: ⚡ +1 (このターンのみ)
      effects: [
        { target: "self", text: "⚡ +1 (このターン)" }
      ],
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
      extNameJa: "アバカスの剣",
      skillNameJa: "一閃",
      skillIcon: "phy.png",
      cost: 2,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 150-150%" }
      ],
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
      extNameJa: "アバカスの戦旗",
      skillNameJa: "鼓舞",
      skillIcon: "BUF_phy.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "PHY +3" }
      ],
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
      extNameJa: "練習用の薬草",
      skillNameJa: "治療",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: HP 回復 (INT+PHY)/2
      effects: [
        { target: "self", text: "HP回復 (INT+PHY)÷2" }
      ],
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
      extNameJa: "アバカスの突角",
      skillNameJa: "突撃",
      skillIcon: "phy.png",
      cost: 0,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 60-60%" },
        { target: "self", text: "次ターン PHY -3" }
      ],
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
      extNameJa: "ホレリスの居合刀",
      skillNameJa: "抜刀・一閃",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 80-80%" }
      ],
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
      extNameJa: "ホレリスの速射銃",
      skillNameJa: "出血弾・速射",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 60-60%" },
        { target: "enemy.foremost", text: "出血 ×1" }
      ],
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
      extNameJa: "ホレリスの軍馬",
      skillNameJa: "疾風の構え",
      skillIcon: "BUF_agi.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "ガード +8" },
        { target: "self", text: "AGI +2" }
      ],
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
      extNameJa: "ホレリスの霊薬",
      skillNameJa: "緊急回復",
      skillIcon: "hp.png",
      cost: 0,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: HP 回復 (INT+PHY)/2 + 消耗
      effects: [
        { target: "self", text: "HP回復 (INT+PHY)÷2" },
        { target: "self", text: "【消耗】" }
      ],
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
      extId: 1013,
      extNameJa: "ホレリスの連弓",
      skillNameJa: "連矢",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 50-50%" },
        { target: "enemy.foremost", text: "PHYダメ 50-50%" }
      ],
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
      extNameJa: "ホレリスの知恵書",
      skillNameJa: "知識の爆発",
      skillIcon: "int.png",
      cost: 2,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "INT +2" },
        { target: "self", text: "ドロー +3" }
      ],
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
      extNameJa: "アタナソフの毒刃",
      skillNameJa: "毒の刃",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 60-60%" },
        { target: "enemy.foremost", text: "毒 ×2" }
      ],
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
      extNameJa: "アタナソフの長弓",
      skillNameJa: "エリートスナイプ",
      skillIcon: "phy.png",
      cost: 2,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 90-90%" },
        { target: "enemy.foremost", text: "出血 ×2" }
      ],
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
      extNameJa: "アタナソフの解毒草",
      skillNameJa: "解毒",
      skillIcon: "hp.png",
      cost: 0,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "状態異常解除" }
      ],
      effectSummaryLines() { return ["毒・出血 解除（自分）"]; },
      peekHelpKeys() { return []; },
      previewLines() { return ["自分の毒スタックと出血スタックをすべて解除する"]; },
      play(s) { api.clearPlayerDebuffs(s); },
    },

    cd204: {
      libraryKey: "cd204",
      extId: 2004,
      extNameJa: "アタナソフの戦衣",
      skillNameJa: "エリートプロテクション",
      skillIcon: "BUF_phy.png",
      cost: 2,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "ガード +12" }
      ],
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
      extNameJa: "アタナソフの連弾銃",
      skillNameJa: "エリートショット",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: 3 連撃 (auto-derive 補足)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 50% ×3" }
      ],
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
      extNameJa: "アタナソフの投資帳",
      skillNameJa: "投資",
      skillIcon: "int.png",
      cost: 0,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: GUM 獲得 (メタ効果、戦闘外通貨)
      effects: [
        { target: "self", text: "GUM +20" }
      ],
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
      extNameJa: "古代の盾",
      skillNameJa: "鋼の盾",
      skillIcon: "BUF_agi.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "シールド +10" }
      ],
      effectSummaryLines() { return ["シールド　+10"]; },
      peekHelpKeys() { return ["shield"]; },
      previewLines() { return ["シールドを 10 得る（特殊ダメージのみ吸収）"]; },
      play(s) { api.addPlayerShield(s, 10); },
    },

    cd302: {
      libraryKey: "cd302",
      extId: 1011,
      extNameJa: "古代の大鎚",
      skillNameJa: "大鎚",
      skillIcon: "phy.png",
      cost: 3,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 200-200%" }
      ],
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
      extNameJa: "古代の軍旗",
      skillNameJa: "戦術指揮",
      skillIcon: "BUF_phy.png",
      cost: 2,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "PHY +5" },
        { target: "self", text: "INT +5" }
      ],
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
      extNameJa: "古代の宝珠",
      skillNameJa: "必殺の閃光",
      skillIcon: "int.png",
      cost: 2,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 130-130% (CRIT固定)" }
      ],
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
      extNameJa: "古代の脚甲",
      skillNameJa: "不屈",
      skillIcon: "BUF_agi.png",
      cost: 0,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "被ダメ半減 (1ターン)" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT30-40%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 25-30%" },
        { target: "enemy.foremost", text: "敵AGI -1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 35-45%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 20-25%" },
        { target: "enemy.foremost", text: "PHYダメ 20-25%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 40-50%" },
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 15-20%" },
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT10-10%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "PHY +1" },
        { target: "self", text: "INT +1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT10-10%" },
        { target: "self", text: "PHY +1" },
        { target: "self", text: "INT +1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 20-25%" },
        { target: "self", text: "AGI +1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 35-40%" },
        { target: "self", text: "PHY +1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 15-20%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 10-15%" },
        { target: "enemy.foremost", text: "出血 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT12-32%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 30-40%" },
        { target: "enemy.foremost", text: "敵INT -1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 40-50%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 35-45%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT30-40%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT15-20%" },
        { target: "self", text: "AGI +1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 15-20%" },
        { target: "self", text: "HP回復 INT10-10%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT2-2%" },
        { target: "self", text: "PHY +1" },
        { target: "self", text: "INT +1" },
        { target: "self", text: "AGI +1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 40-50%" },
        { target: "self", text: "PHY +1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 35-45%" },
        { target: "self", text: "INT +1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT30-40%" },
        { target: "self", text: "AGI +1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 25-30%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 20-20%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT25-35%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 30-30%" },
        { target: "enemy.foremost", text: "敵PHY -1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 30-40%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 20-30%" },
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 20-30%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "出血 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 40-40%" },
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 15-20%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 0-30%" },
        { target: "enemy.foremost", text: "INTダメ 0-30%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 40-50%" },
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 35-45%" },
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT10-20%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 13-28%" },
        { target: "enemy.foremost", text: "PHYダメ 13-28%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 10-20%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 45-55%" },
        { target: "enemy.foremost", text: "敵INT -1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 35-45%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT30-40%" },
        { target: "self", text: "敵PHY -2" },
        { target: "self", text: "敵AGI -2" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "INT +1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 45-45%" },
        { target: "enemy.foremost", text: "出血 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT30-40%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "出血 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 35-45%" },
        { target: "enemy.foremost", text: "出血 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 40-50%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "敵AGI -2" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 50-60%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT25-35%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 40-50%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT12-12%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 45-45%" },
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 35-50%" },
        { target: "enemy.foremost", text: "出血 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 35-45%" },
        { target: "enemy.foremost", text: "出血 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT30-40%" },
        { target: "self", text: "敵INT -2" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 25-30%" },
        { target: "self", text: "PHY +1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 15-25%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "PHY +1" },
        { target: "self", text: "INT +1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 35-40%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "ガード +6" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 50-60%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 75-80%" },
        { target: "enemy.foremost", text: "出血 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT5-5%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 8-8%" },
        { target: "enemy.foremost", text: "敵INT -1" },
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT30-40%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT30-45%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 45-45%" },
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 30-30%" },
        { target: "self", text: "AGI +1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 35-45%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT25-25%" },
        { target: "self", text: "出血 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "敵PHY -2" },
        { target: "enemy.foremost", text: "敵INT -2" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 40-50%" },
        { target: "self", text: "HP回復 INT18-28%" },
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 35-45%" },
        { target: "self", text: "HP回復 INT18-28%" },
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 20-20%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 45-50%" },
        { target: "self", text: "PHY +3" },
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 84-84%" },
        { target: "self", text: "PHY +1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 84-84%" },
        { target: "self", text: "INT +1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 16-16%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 53-53%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "敵PHY -1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "出血 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 41-41%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "ガード +6" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 50-55%" },
        { target: "self", text: "INT +1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "AGI +3" },
        { target: "self", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 50-50%" },
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 23-23%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 92-92%" },
        { target: "enemy.foremost", text: "敵INT -2" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 22-22%" },
        { target: "enemy.foremost", text: "敵INT -2" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT8-8%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 42-42%" },
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "ガード +6" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT40-40%" },
        { target: "self", text: "出血 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 46-46%" },
        { target: "enemy.foremost", text: "出血 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 30-40%" },
        { target: "enemy.foremost", text: "敵AGI -2" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 15-20%" },
        { target: "self", text: "PHY +1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 15-20%" },
        { target: "self", text: "INT +1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT40-40%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 30-35%" },
        { target: "enemy.foremost", text: "INTダメ 30-35%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT20-40%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 40-40%" },
        { target: "self", text: "PHY +3" },
        { target: "enemy.foremost", text: "出血 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 7-7%" },
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "ガード +6" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT8-8%" },
        { target: "self", text: "INT +1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 38-38%" },
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 53-53%" },
        { target: "self", text: "AGI +1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "ガード +6" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "AGI +1" },
        { target: "self", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT85-85%" },
        { target: "self", text: "PHY +1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "ガード +6" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT45-50%" },
        { target: "self", text: "INT +3" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 40-65%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 50-60%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 10-35%" },
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "ガード +6" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 20-20%" },
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 20-20%" },
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 12-12%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 45-55%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 45-55%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT14-24%" },
        { target: "self", text: "AGI +3" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 35-45%" },
        { target: "enemy.foremost", text: "敵PHY -2" },
        { target: "enemy.foremost", text: "出血 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 35-45%" },
        { target: "enemy.foremost", text: "敵INT -2" },
        { target: "enemy.foremost", text: "出血 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT115-120%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 50-55%" },
        { target: "self", text: "INT +3" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 40-45%" },
        { target: "self", text: "INT +3" },
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "PHY +3" },
        { target: "self", text: "INT +3" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "敵AGI -2" },
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT5-10%" },
        { target: "self", text: "PHY +3" },
        { target: "self", text: "INT +3" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 50-60%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 50-60%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 15-20%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT90-110%" },
        { target: "self", text: "PHY +1" },
        { target: "self", text: "出血 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 50-60%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "ドロー +1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 20-20%" },
        { target: "enemy.foremost", text: "出血 ×1" },
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT15-20%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "ガード +6" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 25-30%" },
        { target: "self", text: "PHY +1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 25-30%" },
        { target: "self", text: "INT +1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "敵INT -2" },
        { target: "enemy.foremost", text: "敵AGI -2" },
        { target: "enemy.foremost", text: "出血 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "敵PHY -2" },
        { target: "enemy.foremost", text: "敵AGI -2" },
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "ガード +6" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 50-60%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 50-60%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 50-60%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 35-35%" },
        { target: "self", text: "PHY +3" },
        { target: "enemy.foremost", text: "敵AGI -2" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "ガード +6" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 35-45%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 35-45%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 20-25%" },
        { target: "enemy.foremost", text: "INTダメ 20-25%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT20-20%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 35-40%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 30-40%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT45-55%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 36-46%" },
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT30-30%" },
        { target: "self", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT40-50%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 27-32%" },
        { target: "enemy.foremost", text: "敵AGI -1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 30-30%" },
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 22-27%" },
        { target: "enemy.foremost", text: "PHYダメ 22-27%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 45-55%" },
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 20-25%" },
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT10-15%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "PHY +1" },
        { target: "self", text: "INT +1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT15-15%" },
        { target: "self", text: "PHY +1" },
        { target: "self", text: "INT +1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 25-30%" },
        { target: "self", text: "AGI +1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 45-50%" },
        { target: "self", text: "PHY +1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 15-20%" },
        { target: "enemy.foremost", text: "敵INT -1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 35-45%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 20-25%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 15-20%" },
        { target: "enemy.foremost", text: "出血 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT14-34%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 35-45%" },
        { target: "enemy.foremost", text: "敵INT -1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 45-55%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 40-50%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT35-45%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT20-25%" },
        { target: "self", text: "AGI +1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 20-25%" },
        { target: "self", text: "HP回復 INT10-10%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "PHY +1" },
        { target: "self", text: "INT +1" },
        { target: "self", text: "AGI +1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 45-55%" },
        { target: "self", text: "PHY +1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 40-50%" },
        { target: "self", text: "INT +1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT35-45%" },
        { target: "self", text: "AGI +1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 27-32%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 20-20%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT30-40%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 35-35%" },
        { target: "enemy.foremost", text: "敵PHY -1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 35-45%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 20-40%" },
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 25-35%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "出血 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 40-40%" },
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 20-25%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 0-40%" },
        { target: "enemy.foremost", text: "INTダメ 0-40%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 45-55%" },
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 40-50%" },
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT15-25%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 16-31%" },
        { target: "enemy.foremost", text: "PHYダメ 16-31%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 40-40%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 50-60%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 15-15%" },
        { target: "self", text: "HP回復 INT50-50%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 15-25%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 50-60%" },
        { target: "enemy.foremost", text: "敵INT -1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 40-50%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT35-45%" },
        { target: "self", text: "敵PHY -2" },
        { target: "self", text: "敵AGI -2" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "INT +1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 45-45%" },
        { target: "enemy.foremost", text: "出血 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT40-50%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 45-55%" },
        { target: "enemy.foremost", text: "出血 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "出血 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 40-50%" },
        { target: "enemy.foremost", text: "出血 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 45-55%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "敵AGI -2" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 50-60%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT30-40%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 45-55%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT15-15%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 45-45%" },
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 40-55%" },
        { target: "enemy.foremost", text: "出血 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 40-50%" },
        { target: "enemy.foremost", text: "出血 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT35-45%" },
        { target: "self", text: "敵INT -2" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 15-35%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 5-5%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 25-30%" },
        { target: "self", text: "PHY +1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 20-30%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "PHY +1" },
        { target: "self", text: "INT +1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 40-45%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT20-30%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT15-25%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "ガード +6" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 50-60%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 80-85%" },
        { target: "enemy.foremost", text: "出血 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT5-10%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 10-10%" },
        { target: "enemy.foremost", text: "敵INT -1" },
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT35-45%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT35-50%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 45-45%" },
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 35-35%" },
        { target: "self", text: "AGI +1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 40-50%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT30-30%" },
        { target: "self", text: "出血 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "敵PHY -2" },
        { target: "enemy.foremost", text: "敵INT -2" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 45-55%" },
        { target: "self", text: "HP回復 INT21-31%" },
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 40-50%" },
        { target: "self", text: "HP回復 INT21-31%" },
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 20-20%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 50-55%" },
        { target: "self", text: "PHY +4" },
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 50-50%" },
        { target: "self", text: "PHY +2" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 89-89%" },
        { target: "self", text: "PHY +1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 89-89%" },
        { target: "self", text: "INT +1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 19-19%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 56-56%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "敵PHY -1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "出血 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 46-46%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "ガード +6" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 55-60%" },
        { target: "self", text: "INT +1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "AGI +4" },
        { target: "self", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 55-55%" },
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 26-26%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 97-97%" },
        { target: "enemy.foremost", text: "敵INT -3" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 27-27%" },
        { target: "enemy.foremost", text: "敵INT -3" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT11-11%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 47-47%" },
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "ガード +6" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT45-45%" },
        { target: "self", text: "出血 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 51-51%" },
        { target: "enemy.foremost", text: "出血 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 35-45%" },
        { target: "enemy.foremost", text: "敵AGI -3" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 20-25%" },
        { target: "self", text: "PHY +2" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 20-25%" },
        { target: "self", text: "INT +2" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT45-45%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 35-35%" },
        { target: "enemy.foremost", text: "INTダメ 35-35%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT25-40%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 45-45%" },
        { target: "self", text: "PHY +4" },
        { target: "enemy.foremost", text: "出血 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 10-10%" },
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "ガード +6" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT11-11%" },
        { target: "self", text: "INT +1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 43-43%" },
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 58-58%" },
        { target: "self", text: "AGI +1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "ガード +6" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "AGI +1" },
        { target: "self", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT90-90%" },
        { target: "self", text: "PHY +1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "ガード +6" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT50-55%" },
        { target: "self", text: "INT +4" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 45-70%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 50-60%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 15-40%" },
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "ガード +6" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 25-25%" },
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 25-25%" },
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 14-14%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 50-60%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 50-60%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT18-28%" },
        { target: "self", text: "AGI +4" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 40-50%" },
        { target: "enemy.foremost", text: "敵PHY -3" },
        { target: "enemy.foremost", text: "出血 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 40-50%" },
        { target: "enemy.foremost", text: "敵INT -3" },
        { target: "enemy.foremost", text: "出血 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT120-125%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 55-60%" },
        { target: "self", text: "INT +4" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 45-50%" },
        { target: "self", text: "INT +4" },
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "PHY +4" },
        { target: "self", text: "INT +4" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "敵AGI -3" },
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT8-12%" },
        { target: "self", text: "PHY +3" },
        { target: "self", text: "INT +3" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 55-65%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 55-65%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 20-25%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT95-115%" },
        { target: "self", text: "PHY +1" },
        { target: "self", text: "出血 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 50-60%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "ドロー +1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 25-25%" },
        { target: "enemy.foremost", text: "出血 ×1" },
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT15-20%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "ガード +6" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 30-35%" },
        { target: "self", text: "PHY +1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 30-35%" },
        { target: "self", text: "INT +1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "敵INT -3" },
        { target: "enemy.foremost", text: "敵AGI -3" },
        { target: "enemy.foremost", text: "出血 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "敵PHY -3" },
        { target: "enemy.foremost", text: "敵AGI -3" },
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "ガード +6" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 50-60%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 50-60%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 50-60%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 40-40%" },
        { target: "self", text: "PHY +3" },
        { target: "enemy.foremost", text: "敵AGI -3" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "ガード +6" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 40-50%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 40-50%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 25-25%" },
        { target: "enemy.foremost", text: "INTダメ 25-25%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT25-25%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 40-45%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 35-45%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT50-60%" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 39-49%" },
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 50-55%" },
        { target: "self", text: "PHY +4" },
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT50-55%" },
        { target: "self", text: "INT +4" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "ガード +6" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "毒 ×1" }
      ],
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
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT15-20%" }
      ],
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 15, 20)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 15〜20% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 15, 20)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 15, 20);
      },
    },
// ─── auto-generated Rare extensions (185 cards) ───
    ext3001: {
      libraryKey: "ext3001",
      extId: 3001,
      extNameJa: "ブレイブブレード",
      skillNameJa: "ブレイブスラッシュ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 60-70%" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 60, 70)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 60, 70)} ダメージ（PHY 60〜70%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 60, 70);
      },
    },
    ext3002: {
      libraryKey: "ext3002",
      extId: 3002,
      extNameJa: "ブレイブマスケット",
      skillNameJa: "ブレイブショット",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 35-40%" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 35, 40)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 35, 40)} ダメージ（INT 35〜40%・1v1=単体）`]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 35, 40);
      },
    },
    ext3003: {
      libraryKey: "ext3003",
      extId: 3003,
      extNameJa: "ウィズダムペン",
      skillNameJa: "ウィズダムリカバリー",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT50-60%" }
      ],
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 50, 60)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 50〜60% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 50, 60)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 50, 60);
      },
    },
    ext3004: {
      libraryKey: "ext3004",
      extId: 3004,
      extNameJa: "ブレイブアーマー",
      skillNameJa: "ブレイブプロテクション",
      skillIcon: "BUF_phy.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "PHY +2" }
      ],
      effectSummaryLines() { return ["PHY\u3000+2"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines() { return ["PHY を +2"]; },
      play(s) {
        s.playerPhy += 2;
      },
    },
    ext3005: {
      libraryKey: "ext3005",
      extId: 3005,
      extNameJa: "ブレイブホース",
      skillNameJa: "ブレイブチャージ",
      skillIcon: "BUF_agi.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "AGI +2" }
      ],
      effectSummaryLines() { return ["AGI\u3000+2"]; },
      peekHelpKeys() { return ["agi"]; },
      previewLines() { return ["AGI を +2"]; },
      play(s) {
        s.playerAgi += 2;
      },
    },
    ext3006: {
      libraryKey: "ext3006",
      extId: 3006,
      extNameJa: "ブレイブカタナ",
      skillNameJa: "ブレイブイアイ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 55-65%" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 55, 65)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 55, 65)} ダメージ（PHY 55〜65%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 55, 65);
      },
    },
    ext3007: {
      libraryKey: "ext3007",
      extId: 3007,
      extNameJa: "キューティー・九尾",
      skillNameJa: "キューティー・九尾",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 45-45%" },
        { target: "enemy.foremost", text: "出血 ×2" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 45, 45)}`, "出血 ×2（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 45, 45)} ダメージ（INT 45〜45%）`, "敵に出血 ×2 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 45, 45);
        api.addBleedToEnemy(s, 2);
      },
    },
    ext3008: {
      libraryKey: "ext3008",
      extId: 3008,
      extNameJa: "ウィズダムブック",
      skillNameJa: "ウィズダムリーディング",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 35-40%" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 35, 40)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 35, 40)} ダメージ（INT 35〜40%・1v1=単体）`]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 35, 40);
      },
    },
    ext3009: {
      libraryKey: "ext3009",
      extId: 3009,
      extNameJa: "ウィズダムリング",
      skillNameJa: "ウィズダムブライト",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT50-60%" }
      ],
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 50, 60)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 50〜60% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 50, 60)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 50, 60);
      },
    },
    ext3010: {
      libraryKey: "ext3010",
      extId: 3010,
      extNameJa: "ブレイブシールド",
      skillNameJa: "ブレイブバッシュ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 30-35%" },
        { target: "enemy.foremost", text: "敵AGI -1" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 30, 35)}`, "AGI\u3000-1（敵）"]; },
      peekHelpKeys() { return ["agi"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 30, 35)} ダメージ（PHY 30〜35%）`, "敵の AGI を -1"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 30, 35);
        s.enemyAgi = Math.max(1, s.enemyAgi + (-1)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext3011: {
      libraryKey: "ext3011",
      extId: 3011,
      extNameJa: "ブレイブアックス",
      skillNameJa: "ブレイブバイセクト",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 55-65%" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 55, 65)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 55, 65)} ダメージ（PHY 55〜65%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 55, 65);
      },
    },
    ext3012: {
      libraryKey: "ext3012",
      extId: 3012,
      extNameJa: "ETHEREMON-MAPLA",
      skillNameJa: "任せた! マプラ!",
      skillIcon: "hp.png",
      cost: 2,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT25-30%" }
      ],
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 25, 30)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 25〜30% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 25, 30)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 25, 30);
      },
    },
    ext3013: {
      libraryKey: "ext3013",
      extId: 3013,
      extNameJa: "ブレイブユミ",
      skillNameJa: "ブレイブヤブサメ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 45-55%" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 45, 55)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 45, 55)} ダメージ（PHY 45〜55%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 45, 55);
      },
    },
    ext3014: {
      libraryKey: "ext3014",
      extId: 3014,
      extNameJa: "ブレイブクロススピア",
      skillNameJa: "ブレイブモロテヅキ",
      skillIcon: "phy.png",
      cost: 2,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 25-30%" },
        { target: "enemy.foremost", text: "PHYダメ 25-30%" }
      ],
      effectSummaryLines() { return [`敵にダメージ ×2`]; },
      peekHelpKeys() { return []; },
      previewLines() { return [`敵1体に PHY 25〜30% × 2 回ダメージ`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 25, 30);
        if (s.enemyHp > 0) api.dealPhySkillToEnemy(s, 25, 30);
      },
    },
    ext3015: {
      libraryKey: "ext3015",
      extId: 3015,
      extNameJa: "ブレイブハルバード",
      skillNameJa: "ブレイブ スイングダウン",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 50-60%" },
        { target: "enemy.foremost", text: "毒 ×2" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 50, 60)}`, "毒 ×2（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 50, 60)} ダメージ（PHY 50〜60%）`, "敵に毒 ×2 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 50, 60);
        api.addPoisonToEnemy(s, 2);
      },
    },
    ext3016: {
      libraryKey: "ext3016",
      extId: 3016,
      extNameJa: "ウィズダムスクロール",
      skillNameJa: "ウィズダムタクティクス",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 25-30%" },
        { target: "enemy.foremost", text: "毒 ×2" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 25, 30)}`, "毒 ×2（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 25, 30)} ダメージ（INT 25〜30%・1v1=単体）`, "敵に毒 ×2 付与"]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 25, 30);
        api.addPoisonToEnemy(s, 2);
      },
    },
    ext3017: {
      libraryKey: "ext3017",
      extId: 3017,
      extNameJa: "ウィズダムネックレス",
      skillNameJa: "ウィズダムヒーリング",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT10-20%" }
      ],
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 10, 20)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 10〜20% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 10, 20)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 10, 20);
      },
    },
    ext3018: {
      libraryKey: "ext3018",
      extId: 3018,
      extNameJa: "ブレイブカブト",
      skillNameJa: "ブレイブデバインプロテクション",
      skillIcon: "BUF_phy.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "PHY +1" },
        { target: "self", text: "INT +1" }
      ],
      effectSummaryLines() { return ["PHY\u3000+1", "INT\u3000+1"]; },
      peekHelpKeys() { return ["phy", "int"]; },
      previewLines() { return ["PHY を +1", "INT を +1"]; },
      play(s) {
        s.playerPhy += 1;
        s.playerInt += 1;
      },
    },
    ext3019: {
      libraryKey: "ext3019",
      extId: 3019,
      extNameJa: "ウィズダムタートル",
      skillNameJa: "ウィズダムキキョウ",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT20-20%" },
        { target: "self", text: "PHY +1" },
        { target: "self", text: "INT +1" }
      ],
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 20, 20), "PHY\u3000+1", "INT\u3000+1"]; },
      peekHelpKeys() { return ["hp", "phy", "int"]; },
      previewLines(s) { return [`HP を回復係数 20〜20% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 20, 20)}）`, "PHY を +1", "INT を +1"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 20, 20);
        s.playerPhy += 1;
        s.playerInt += 1;
      },
    },
    ext3020: {
      libraryKey: "ext3020",
      extId: 3020,
      extNameJa: "ブレイブルースター",
      skillNameJa: "ブレイブグンケイ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 30-35%" },
        { target: "self", text: "AGI +1" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 30, 35)}`, "AGI\u3000+1"]; },
      peekHelpKeys() { return ["agi"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 30, 35)} ダメージ（PHY 30〜35%）`, "AGI を +1"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 30, 35);
        s.playerAgi += 1;
      },
    },
    ext3021: {
      libraryKey: "ext3021",
      extId: 3021,
      extNameJa: "ブレイブタイガー",
      skillNameJa: "ブレイブコガ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 45-50%" },
        { target: "self", text: "PHY +1" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 45, 50)}`, "PHY\u3000+1"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 45, 50)} ダメージ（PHY 45〜50%）`, "PHY を +1"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 45, 50);
        s.playerPhy += 1;
      },
    },
    ext3022: {
      libraryKey: "ext3022",
      extId: 3022,
      extNameJa: "ウィズダムドラゴン",
      skillNameJa: "ウィズダムフクリュウ",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 20-25%" },
        { target: "enemy.foremost", text: "敵INT -1" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 20, 25)}`, "INT\u3000-1（敵）"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 20, 25)} ダメージ（INT 20〜25%・1v1=単体）`, "敵の INT を -1"]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 20, 25);
        s.enemyInt = Math.max(1, s.enemyInt + (-1)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext3023: {
      libraryKey: "ext3023",
      extId: 3023,
      extNameJa: "ブレイブブル",
      skillNameJa: "ブレイブギュウキ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 40-50%" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 40, 50)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 40, 50)} ダメージ（PHY 40〜50%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 40, 50);
      },
    },
    ext3024: {
      libraryKey: "ext3024",
      extId: 3024,
      extNameJa: "ブレイブエレファント",
      skillNameJa: "ブレイブハッショウ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 25-30%" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 25, 30)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 25, 30)} ダメージ（PHY 25〜30%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 25, 30);
      },
    },
    ext3025: {
      libraryKey: "ext3025",
      extId: 3025,
      extNameJa: "ウィズダムモンキー",
      skillNameJa: "ウィズダムサルヂエ",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 20-25%" },
        { target: "enemy.foremost", text: "出血 ×2" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 20, 25)}`, "出血 ×2（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 20, 25)} ダメージ（INT 20〜25%）`, "敵に出血 ×2 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 20, 25);
        api.addBleedToEnemy(s, 2);
      },
    },
    ext3026: {
      libraryKey: "ext3026",
      extId: 3026,
      extNameJa: "ウィズダムスネーク",
      skillNameJa: "ウィズダムウワバミ",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT16-36%" }
      ],
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 16, 36)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 16〜36% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 16, 36)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 16, 36);
      },
    },
    ext3027: {
      libraryKey: "ext3027",
      extId: 3027,
      extNameJa: "ウィズダムドッグ",
      skillNameJa: "ウィズダムリョウケン",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 40-50%" },
        { target: "enemy.foremost", text: "敵INT -1" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 40, 50)}`, "INT\u3000-1（敵）"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 40, 50)} ダメージ（INT 40〜50%）`, "敵の INT を -1"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 40, 50);
        s.enemyInt = Math.max(1, s.enemyInt + (-1)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext3028: {
      libraryKey: "ext3028",
      extId: 3028,
      extNameJa: "ブレイブレイピア",
      skillNameJa: "ブレイブファント",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 50-60%" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 50, 60)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 50, 60)} ダメージ（PHY 50〜60%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 50, 60);
      },
    },
    ext3029: {
      libraryKey: "ext3029",
      extId: 3029,
      extNameJa: "ウィズダムリボルバー",
      skillNameJa: "ウィズダムファニングショット",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 45-55%" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 45, 55)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 45, 55)} ダメージ（INT 45〜55%）`]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 45, 55);
      },
    },
    ext3030: {
      libraryKey: "ext3030",
      extId: 3030,
      extNameJa: "ウィズダムゴブレット",
      skillNameJa: "ウィズダムチアーズ！",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT40-50%" }
      ],
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 40, 50)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 40〜50% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 40, 50)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 40, 50);
      },
    },
    ext3031: {
      libraryKey: "ext3031",
      extId: 3031,
      extNameJa: "ブレイブブーツ",
      skillNameJa: "ブレイブダッシュ",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT25-30%" },
        { target: "self", text: "AGI +1" }
      ],
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 25, 30), "AGI\u3000+1"]; },
      peekHelpKeys() { return ["hp", "agi"]; },
      previewLines(s) { return [`HP を回復係数 25〜30% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 25, 30)}）`, "AGI を +1"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 25, 30);
        s.playerAgi += 1;
      },
    },
    ext3032: {
      libraryKey: "ext3032",
      extId: 3032,
      extNameJa: "ウィズダムセンス",
      skillNameJa: "ウィズダムシラビョウシ",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 25-30%" },
        { target: "self", text: "HP回復 INT10-10%" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 25, 30)}`, "HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 10, 10)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 25, 30)} ダメージ（INT 25〜30%・1v1=単体）`, `HP を回復係数 10〜10% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 10, 10)}）`]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 25, 30);
        api.healPlayerFromIntSkill(s, 10, 10);
      },
    },
    ext3033: {
      libraryKey: "ext3033",
      extId: 3033,
      extNameJa: "ウィズダムMCHメダル",
      skillNameJa: "ウィズダムMaster Nobの御加護",
      skillIcon: "BUF_phy.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "PHY +1" },
        { target: "self", text: "INT +1" },
        { target: "self", text: "AGI +1" }
      ],
      effectSummaryLines() { return ["PHY\u3000+1", "INT\u3000+1", "AGI\u3000+1"]; },
      peekHelpKeys() { return ["phy", "int", "agi"]; },
      previewLines() { return ["PHY を +1", "INT を +1", "AGI を +1"]; },
      play(s) {
        s.playerPhy += 1;
        s.playerInt += 1;
        s.playerAgi += 1;
      },
    },
    ext3034: {
      libraryKey: "ext3034",
      extId: 3034,
      extNameJa: "ブレイブハンマー",
      skillNameJa: "ブレイブストローク",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 50-60%" },
        { target: "self", text: "PHY +1" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 50, 60)}`, "PHY\u3000+1"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 50, 60)} ダメージ（PHY 50〜60%）`, "PHY を +1"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 50, 60);
        s.playerPhy += 1;
      },
    },
    ext3035: {
      libraryKey: "ext3035",
      extId: 3035,
      extNameJa: "ウィズダムボウガン",
      skillNameJa: "ウィズダムサイレントシュート",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 45-55%" },
        { target: "self", text: "INT +1" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 45, 55)}`, "INT\u3000+1"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 45, 55)} ダメージ（INT 45〜55%）`, "INT を +1"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 45, 55);
        s.playerInt += 1;
      },
    },
    ext3036: {
      libraryKey: "ext3036",
      extId: 3036,
      extNameJa: "ウィズダムクラウン",
      skillNameJa: "ウィズダムマジェスティ",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT40-50%" },
        { target: "self", text: "AGI +1" }
      ],
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 40, 50), "AGI\u3000+1"]; },
      peekHelpKeys() { return ["hp", "agi"]; },
      previewLines(s) { return [`HP を回復係数 40〜50% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 40, 50)}）`, "AGI を +1"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 40, 50);
        s.playerAgi += 1;
      },
    },
    ext3037: {
      libraryKey: "ext3037",
      extId: 3037,
      extNameJa: "ブレイブグンバイ",
      skillNameJa: "ブレイブグンバイヘイホウ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 30-35%" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 30, 35)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 30, 35)} ダメージ（PHY 30〜35%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 30, 35);
      },
    },
    ext3038: {
      libraryKey: "ext3038",
      extId: 3038,
      extNameJa: "ブレイブステアリング",
      skillNameJa: "ブレイブハリケーン",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 20-20%" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 20, 20)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 20, 20)} ダメージ（PHY 20〜20%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 20, 20);
      },
    },
    ext3039: {
      libraryKey: "ext3039",
      extId: 3039,
      extNameJa: "ブレイブストロベリー",
      skillNameJa: "ブレイブイチゴジェラート",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT35-45%" }
      ],
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 35, 45)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 35〜45% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 35, 45)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 35, 45);
      },
    },
    ext3040: {
      libraryKey: "ext3040",
      extId: 3040,
      extNameJa: "ブレイブタンジェリン",
      skillNameJa: "ブレイブフライングタンジェリン",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 40-40%" },
        { target: "enemy.foremost", text: "敵PHY -1" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 40, 40)}`, "PHY\u3000-1（敵）"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 40, 40)} ダメージ（PHY 40〜40%）`, "敵の PHY を -1"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 40, 40);
        s.enemyPhy = Math.max(1, s.enemyPhy + (-1)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext3041: {
      libraryKey: "ext3041",
      extId: 3041,
      extNameJa: "ブレイブライム",
      skillNameJa: "ブレイブシトラススプラッシュ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 40-50%" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 40, 50)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 40, 50)} ダメージ（PHY 40〜50%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 40, 50);
      },
    },
    ext3042: {
      libraryKey: "ext3042",
      extId: 3042,
      extNameJa: "ブレイブグラファイト",
      skillNameJa: "ブレイブ電気伝導",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 25-45%" },
        { target: "enemy.foremost", text: "毒 ×2" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 25, 45)}`, "毒 ×2（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 25, 45)} ダメージ（PHY 25〜45%）`, "敵に毒 ×2 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 25, 45);
        api.addPoisonToEnemy(s, 2);
      },
    },
    ext3043: {
      libraryKey: "ext3043",
      extId: 3043,
      extNameJa: "ウィズダムグレープ",
      skillNameJa: "ウィズダムボルドー",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 30-40%" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 30, 40)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 30, 40)} ダメージ（INT 30〜40%・1v1=単体）`]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 30, 40);
      },
    },
    ext3044: {
      libraryKey: "ext3044",
      extId: 3044,
      extNameJa: "ブレイブセージ",
      skillNameJa: "ブレイブハーブティー",
      skillIcon: "DBF_phy.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "出血 ×2" }
      ],
      effectSummaryLines() { return ["出血 ×2（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines() { return ["敵に出血 ×2 付与"]; },
      play(s) {
        api.addBleedToEnemy(s, 2);
      },
    },
    ext3045: {
      libraryKey: "ext3045",
      extId: 3045,
      extNameJa: "ウィズダムブルーベリー",
      skillNameJa: "ウィズダムインクベリー",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 45-45%" },
        { target: "enemy.foremost", text: "毒 ×2" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 45, 45)}`, "毒 ×2（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 45, 45)} ダメージ（INT 45〜45%）`, "敵に毒 ×2 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 45, 45);
        api.addPoisonToEnemy(s, 2);
      },
    },
    ext3046: {
      libraryKey: "ext3046",
      extId: 3046,
      extNameJa: "ウィズダムルビー",
      skillNameJa: "ウィズダムブリリアントカット",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 25-30%" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 25, 30)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 25, 30)} ダメージ（PHY 25〜30%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 25, 30);
      },
    },
    ext3047: {
      libraryKey: "ext3047",
      extId: 3047,
      extNameJa: "ブレイブシップ",
      skillNameJa: "ブレイブカノン砲",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 0-55%" },
        { target: "enemy.foremost", text: "INTダメ 0-55%" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 0, 55)}`, `敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 0, 55)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 0, 55)} ダメージ（PHY 0〜55%）`, `敵1体に ${estIntHit(s.playerInt, s.enemyInt, 0, 55)} ダメージ（INT 0〜55%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 0, 55);
        api.dealIntSkillToEnemy(s, 0, 55);
      },
    },
    ext3048: {
      libraryKey: "ext3048",
      extId: 3048,
      extNameJa: "ブレイブナイフ",
      skillNameJa: "ブレイブリッパー",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 50-60%" },
        { target: "enemy.foremost", text: "毒 ×2" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 50, 60)}`, "毒 ×2（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 50, 60)} ダメージ（PHY 50〜60%）`, "敵に毒 ×2 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 50, 60);
        api.addPoisonToEnemy(s, 2);
      },
    },
    ext3049: {
      libraryKey: "ext3049",
      extId: 3049,
      extNameJa: "ウィズダムアルケブス",
      skillNameJa: "ウィズダム狙撃兵",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 45-55%" },
        { target: "enemy.foremost", text: "毒 ×2" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 45, 55)}`, "毒 ×2（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 45, 55)} ダメージ（INT 45〜55%）`, "敵に毒 ×2 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 45, 55);
        api.addPoisonToEnemy(s, 2);
      },
    },
    ext3050: {
      libraryKey: "ext3050",
      extId: 3050,
      extNameJa: "ウィズダムリソグラフィー",
      skillNameJa: "ウィズダムアポカリプス",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT20-30%" }
      ],
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 20, 30)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 20〜30% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 20, 30)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 20, 30);
      },
    },
    ext3051: {
      libraryKey: "ext3051",
      extId: 3051,
      extNameJa: "ブレイブウィップ",
      skillNameJa: "ブレイブラッシング",
      skillIcon: "phy.png",
      cost: 2,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 19-34%" },
        { target: "enemy.foremost", text: "PHYダメ 19-34%" }
      ],
      effectSummaryLines() { return [`敵にダメージ ×2`]; },
      peekHelpKeys() { return []; },
      previewLines() { return [`敵1体に PHY 19〜34% × 2 回ダメージ`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 19, 34);
        if (s.enemyHp > 0) api.dealPhySkillToEnemy(s, 19, 34);
      },
    },
    ext3055: {
      libraryKey: "ext3055",
      extId: 3055,
      extNameJa: "とっておきのシュークリーム",
      skillNameJa: "シュークリームの恨みを受けよ！",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 20-30%" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 20, 30)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 20, 30)} ダメージ（INT 20〜30%）`]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 20, 30);
      },
    },
    ext3056: {
      libraryKey: "ext3056",
      extId: 3056,
      extNameJa: "ブレイブシックル",
      skillNameJa: "ブレイブハーベスト",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 55-65%" },
        { target: "enemy.foremost", text: "敵INT -1" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 55, 65)}`, "INT\u3000-1（敵）"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 55, 65)} ダメージ（PHY 55〜65%）`, "敵の INT を -1"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 55, 65);
        s.enemyInt = Math.max(1, s.enemyInt + (-1)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext3057: {
      libraryKey: "ext3057",
      extId: 3057,
      extNameJa: "ウィズダムワンド",
      skillNameJa: "ウィズダムスイング",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 45-55%" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 45, 55)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 45, 55)} ダメージ（INT 45〜55%）`]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 45, 55);
      },
    },
    ext3058: {
      libraryKey: "ext3058",
      extId: 3058,
      extNameJa: "ブレイブサケ",
      skillNameJa: "ブレイブヒャクヤク",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT40-50%" },
        { target: "self", text: "敵PHY -3" },
        { target: "self", text: "敵AGI -3" }
      ],
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 40, 50), "PHY\u3000-3（敵）", "AGI\u3000-3（敵）"]; },
      peekHelpKeys() { return ["hp", "phy", "agi"]; },
      previewLines(s) { return [`HP を回復係数 40〜50% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 40, 50)}）`, "敵の PHY を -3", "敵の AGI を -3"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 40, 50);
        s.enemyPhy = Math.max(1, s.enemyPhy + (-3)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
        s.enemyAgi = Math.max(1, s.enemyAgi + (-3)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext3059: {
      libraryKey: "ext3059",
      extId: 3059,
      extNameJa: "ウィズダムハット",
      skillNameJa: "ウィズダムエレガンス",
      skillIcon: "BUF_int.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "INT +2" }
      ],
      effectSummaryLines() { return ["INT\u3000+2"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines() { return ["INT を +2"]; },
      play(s) {
        s.playerInt += 2;
      },
    },
    ext3060: {
      libraryKey: "ext3060",
      extId: 3060,
      extNameJa: "ユニコ",
      skillNameJa: "愛を取らないでください",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 50-50%" },
        { target: "enemy.foremost", text: "出血 ×2" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 50, 50)}`, "出血 ×2（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 50, 50)} ダメージ（PHY 50〜50%）`, "敵に出血 ×2 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 50, 50);
        api.addBleedToEnemy(s, 2);
      },
    },
    ext3061: {
      libraryKey: "ext3061",
      extId: 3061,
      extNameJa: "ブレイブマント",
      skillNameJa: "ブレイブフェーバー",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT50-60%" }
      ],
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 50, 60)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 50〜60% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 50, 60)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 50, 60);
      },
    },
    ext3062: {
      libraryKey: "ext3062",
      extId: 3062,
      extNameJa: "創聖剣ベラネル",
      skillNameJa: "ホーリー・レゾナンス",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 50-60%" },
        { target: "enemy.foremost", text: "出血 ×2" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 50, 60)}`, "出血 ×2（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 50, 60)} ダメージ（PHY 50〜60%）`, "敵に出血 ×2 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 50, 60);
        api.addBleedToEnemy(s, 2);
      },
    },
    ext3063: {
      libraryKey: "ext3063",
      extId: 3063,
      extNameJa: "ウィズダムピエロ",
      skillNameJa: "ウィズダムジャグリング",
      skillIcon: "DBF_phy.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "出血 ×2" }
      ],
      effectSummaryLines() { return ["出血 ×2（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines() { return ["敵に出血 ×2 付与"]; },
      play(s) {
        api.addBleedToEnemy(s, 2);
      },
    },
    ext3064: {
      libraryKey: "ext3064",
      extId: 3064,
      extNameJa: "ウィズダムフルート",
      skillNameJa: "ウィズダムフラジオレット",
      skillIcon: "DBF_phy.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "毒 ×2" }
      ],
      effectSummaryLines() { return ["毒 ×2（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines() { return ["敵に毒 ×2 付与"]; },
      play(s) {
        api.addPoisonToEnemy(s, 2);
      },
    },
    ext3065: {
      libraryKey: "ext3065",
      extId: 3065,
      extNameJa: "ウィズダムハープ",
      skillNameJa: "ウィズダムオクターブ",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 45-55%" },
        { target: "enemy.foremost", text: "出血 ×2" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 45, 55)}`, "出血 ×2（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 45, 55)} ダメージ（INT 45〜55%）`, "敵に出血 ×2 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 45, 55);
        api.addBleedToEnemy(s, 2);
      },
    },
    ext3066: {
      libraryKey: "ext3066",
      extId: 3066,
      extNameJa: "ブレイブマラカス",
      skillNameJa: "ブレイブマンボ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 50-60%" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 50, 60)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 50, 60)} ダメージ（PHY 50〜60%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 50, 60);
      },
    },
    ext3067: {
      libraryKey: "ext3067",
      extId: 3067,
      extNameJa: "ウィズダムホルン",
      skillNameJa: "ウィズダムゲシュトップフト",
      skillIcon: "DBF_agi.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "敵AGI -3" }
      ],
      effectSummaryLines() { return ["AGI\u3000-3（敵）"]; },
      peekHelpKeys() { return ["agi"]; },
      previewLines() { return ["敵の AGI を -3"]; },
      play(s) {
        s.enemyAgi = Math.max(1, s.enemyAgi + (-3)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext3068: {
      libraryKey: "ext3068",
      extId: 3068,
      extNameJa: "ブレイブクラヴィア",
      skillNameJa: "ブレイブ三重奏",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 50-60%" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 50, 60)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 50, 60)} ダメージ（PHY 50〜60%・代替効果）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 50, 60);
      },
    },
    ext3069: {
      libraryKey: "ext3069",
      extId: 3069,
      extNameJa: "ウィズダムヴァイオリン",
      skillNameJa: "ウィズダムメヌエット",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT35-45%" }
      ],
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 35, 45)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 35〜45% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 35, 45)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 35, 45);
      },
    },
    ext3070: {
      libraryKey: "ext3070",
      extId: 3070,
      extNameJa: "ウィズダムニコ",
      skillNameJa: "ウィズダム洛陽",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 50-60%" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 50, 60)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 50, 60)} ダメージ（INT 50〜60%）`]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 50, 60);
      },
    },
    ext3071: {
      libraryKey: "ext3071",
      extId: 3071,
      extNameJa: "ブレイブドラム",
      skillNameJa: "ブレイブ8ビート",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT19-19%" }
      ],
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 19, 19)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 19〜19% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 19, 19)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 19, 19);
      },
    },
    ext3072: {
      libraryKey: "ext3072",
      extId: 3072,
      extNameJa: "ブレイブシタール",
      skillNameJa: "ブレイブミズラーブ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 50-50%" },
        { target: "enemy.foremost", text: "毒 ×2" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 50, 50)}`, "毒 ×2（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 50, 50)} ダメージ（PHY 50〜50%）`, "敵に毒 ×2 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 50, 50);
        api.addPoisonToEnemy(s, 2);
      },
    },
    ext3073: {
      libraryKey: "ext3073",
      extId: 3073,
      extNameJa: "ピコピコハンマー",
      skillNameJa: "ブレイブピコピコ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 45-60%" },
        { target: "enemy.foremost", text: "出血 ×2" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 45, 60)}`, "出血 ×2（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 45, 60)} ダメージ（PHY 45〜60%）`, "敵に出血 ×2 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 45, 60);
        api.addBleedToEnemy(s, 2);
      },
    },
    ext3074: {
      libraryKey: "ext3074",
      extId: 3074,
      extNameJa: "ウィズダムハンドカノン",
      skillNameJa: "ウィズダム火槍術・舞破",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 45-55%" },
        { target: "enemy.foremost", text: "出血 ×2" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 45, 55)}`, "出血 ×2（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 45, 55)} ダメージ（INT 45〜55%）`, "敵に出血 ×2 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 45, 55);
        api.addBleedToEnemy(s, 2);
      },
    },
    ext3075: {
      libraryKey: "ext3075",
      extId: 3075,
      extNameJa: "ウィズダムグラス",
      skillNameJa: "ウィズダムビジョン",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT40-50%" },
        { target: "self", text: "敵INT -3" }
      ],
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 40, 50), "INT\u3000-3（敵）"]; },
      peekHelpKeys() { return ["hp", "int"]; },
      previewLines(s) { return [`HP を回復係数 40〜50% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 40, 50)}）`, "敵の INT を -3"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 40, 50);
        s.enemyInt = Math.max(1, s.enemyInt + (-3)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext3079: {
      libraryKey: "ext3079",
      extId: 3079,
      extNameJa: "ブレイブスタッフ",
      skillNameJa: "ブレイブクラッシュ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 30-35%" },
        { target: "self", text: "PHY +1" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 30, 35)}`, "PHY\u3000+1"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 30, 35)} ダメージ（PHY 30〜35%）`, "PHY を +1"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 30, 35);
        s.playerPhy += 1;
      },
    },
    ext3080: {
      libraryKey: "ext3080",
      extId: 3080,
      extNameJa: "魔女のホーキ",
      skillNameJa: "ウィッチスイープ",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 25-35%" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 25, 35)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 25, 35)} ダメージ（INT 25〜35%・1v1=単体）`]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 25, 35);
      },
    },
    ext3081: {
      libraryKey: "ext3081",
      extId: 3081,
      extNameJa: "ブレイブヨロイ",
      skillNameJa: "ブレイブシュラウド",
      skillIcon: "BUF_phy.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "PHY +2" },
        { target: "self", text: "INT +2" }
      ],
      effectSummaryLines() { return ["PHY\u3000+2", "INT\u3000+2"]; },
      peekHelpKeys() { return ["phy", "int"]; },
      previewLines() { return ["PHY を +2", "INT を +2"]; },
      play(s) {
        s.playerPhy += 2;
        s.playerInt += 2;
      },
    },
    ext3082: {
      libraryKey: "ext3082",
      extId: 3082,
      extNameJa: "ブレイブツインブレード",
      skillNameJa: "ブレイブツインスラッシュ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 45-50%" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 45, 50)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 45, 50)} ダメージ（PHY 45〜50%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 45, 50);
      },
    },
    ext3083: {
      libraryKey: "ext3083",
      extId: 3083,
      extNameJa: "ウィズダムMCSメダル",
      skillNameJa: "ウィズダム神の御加護",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT25-35%" }
      ],
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 25, 35)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 25〜35% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 25, 35)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 25, 35);
      },
    },
    ext3085: {
      libraryKey: "ext3085",
      extId: 3085,
      extNameJa: "ウィズダムバイナンスチャリティメダル",
      skillNameJa: "ウィズダムバイナンスチャリティの御加護",
      skillIcon: "guard.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "ガード +6" }
      ],
      effectSummaryLines() { return ["ガード\u3000+6"]; },
      peekHelpKeys() { return ["guard"]; },
      previewLines() { return ["ガードを 6 得る（StS 風代替効果）"]; },
      play(s) {
        s.playerGuard += 6; api.playBattleSe("buff"); api.portraitFx("player", "buff");
      },
    },
    ext3086: {
      libraryKey: "ext3086",
      extId: 3086,
      extNameJa: "ステラアンモナイト",
      skillNameJa: "ウィズダム螺旋",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 50-60%" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 50, 60)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 50, 60)} ダメージ（INT 50〜60%・代替効果）`]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 50, 60);
      },
    },
    ext3087: {
      libraryKey: "ext3087",
      extId: 3087,
      extNameJa: "ブレイブプテラノドン",
      skillNameJa: "ギガブレイズ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 85-90%" },
        { target: "enemy.foremost", text: "出血 ×2" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 85, 90)}`, "出血 ×2（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 85, 90)} ダメージ（PHY 85〜90%）`, "敵に出血 ×2 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 85, 90);
        api.addBleedToEnemy(s, 2);
      },
    },
    ext3088: {
      libraryKey: "ext3088",
      extId: 3088,
      extNameJa: "ブレブレックス",
      skillNameJa: "ブレイブグリッター",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT10-15%" }
      ],
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 10, 15)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 10〜15% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 10, 15)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 10, 15);
      },
    },
    ext3089: {
      libraryKey: "ext3089",
      extId: 3089,
      extNameJa: "ブレイブプレシオサウルス",
      skillNameJa: "ブレイブタイダルボア",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 12-12%" },
        { target: "enemy.foremost", text: "敵INT -1" },
        { target: "enemy.foremost", text: "毒 ×2" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 12, 12)}`, "INT\u3000-1（敵）", "毒 ×2（敵）"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 12, 12)} ダメージ（PHY 12〜12%）`, "敵の INT を -1", "敵に毒 ×2 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 12, 12);
        s.enemyInt = Math.max(1, s.enemyInt + (-1)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
        api.addPoisonToEnemy(s, 2);
      },
    },
    ext3090: {
      libraryKey: "ext3090",
      extId: 3090,
      extNameJa: "トリケラウォリア",
      skillNameJa: "TCファイトβ",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT40-50%" }
      ],
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 40, 50)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 40〜50% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 40, 50)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 40, 50);
      },
    },
    ext3091: {
      libraryKey: "ext3091",
      extId: 3091,
      extNameJa: "晴天の使い",
      skillNameJa: "紫夜曙光",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT40-55%" }
      ],
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 40, 55)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 40〜55% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 40, 55)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 40, 55);
      },
    },
    ext3092: {
      libraryKey: "ext3092",
      extId: 3092,
      extNameJa: "ステゴキッズ",
      skillNameJa: "はじめてのおつかい",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 50-50%" },
        { target: "enemy.foremost", text: "毒 ×2" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 50, 50)}`, "毒 ×2（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 50, 50)} ダメージ（INT 50〜50%）`, "敵に毒 ×2 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 50, 50);
        api.addPoisonToEnemy(s, 2);
      },
    },
    ext3093: {
      libraryKey: "ext3093",
      extId: 3093,
      extNameJa: "ウィズダムメガロドン",
      skillNameJa: "シャークトルネード",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 40-40%" },
        { target: "self", text: "AGI +1" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 40, 40)}`, "AGI\u3000+1"]; },
      peekHelpKeys() { return ["agi"]; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 40, 40)} ダメージ（INT 40〜40%）`, "AGI を +1"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 40, 40);
        s.playerAgi += 1;
      },
    },
    ext3094: {
      libraryKey: "ext3094",
      extId: 3094,
      extNameJa: "ブレイブパキケファロ",
      skillNameJa: "頭突きどーん！",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 45-55%" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 45, 55)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 45, 55)} ダメージ（PHY 45〜55%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 45, 55);
      },
    },
    ext3095: {
      libraryKey: "ext3095",
      extId: 3095,
      extNameJa: "ウィズダム采配",
      skillNameJa: "ウィズダムシケツジュツ",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT35-35%" },
        { target: "self", text: "出血 ×2" }
      ],
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 35, 35), "出血 ×2（敵）"]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 35〜35% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 35, 35)}）`, "敵に出血 ×2 付与"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 35, 35);
        api.addBleedToEnemy(s, 2);
      },
    },
    ext3096: {
      libraryKey: "ext3096",
      extId: 3096,
      extNameJa: "ブレイブベルト",
      skillNameJa: "ブレイブドミネイト",
      skillIcon: "DBF_int.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "敵PHY -3" },
        { target: "enemy.foremost", text: "敵INT -3" }
      ],
      effectSummaryLines() { return ["PHY\u3000-3（敵）", "INT\u3000-3（敵）"]; },
      peekHelpKeys() { return ["phy", "int"]; },
      previewLines() { return ["敵の PHY を -3", "敵の INT を -3"]; },
      play(s) {
        s.enemyPhy = Math.max(1, s.enemyPhy + (-3)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
        s.enemyInt = Math.max(1, s.enemyInt + (-3)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext3097: {
      libraryKey: "ext3097",
      extId: 3097,
      extNameJa: "ブレイブクロー",
      skillNameJa: "ブレイブSNIKT",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 50-60%" },
        { target: "self", text: "HP回復 INT24-34%" },
        { target: "enemy.foremost", text: "毒 ×2" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 50, 60)}`, "HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 24, 34), "毒 ×2（敵）"]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 50, 60)} ダメージ（PHY 50〜60%）`, `HP を回復係数 24〜34% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 24, 34)}）`, "敵に毒 ×2 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 50, 60);
        api.healPlayerFromIntSkill(s, 24, 34);
        api.addPoisonToEnemy(s, 2);
      },
    },
    ext3098: {
      libraryKey: "ext3098",
      extId: 3098,
      extNameJa: "ウィズダムギョク",
      skillNameJa: "ウィズダムフォーチュン",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 45-55%" },
        { target: "self", text: "HP回復 INT24-34%" },
        { target: "enemy.foremost", text: "毒 ×2" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 45, 55)}`, "HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 24, 34), "毒 ×2（敵）"]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 45, 55)} ダメージ（INT 45〜55%）`, `HP を回復係数 24〜34% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 24, 34)}）`, "敵に毒 ×2 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 45, 55);
        api.healPlayerFromIntSkill(s, 24, 34);
        api.addPoisonToEnemy(s, 2);
      },
    },
    ext3099: {
      libraryKey: "ext3099",
      extId: 3099,
      extNameJa: "ブレイブガントレット",
      skillNameJa: "ブレイブウィズスタンド",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 20-20%" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 20, 20)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 20, 20)} ダメージ（PHY 20〜20%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 20, 20);
      },
    },
    ext3100: {
      libraryKey: "ext3100",
      extId: 3100,
      extNameJa: "ブレイブ魔法剣",
      skillNameJa: "ブレイズブレード",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 55-60%" },
        { target: "self", text: "PHY +5" },
        { target: "enemy.foremost", text: "毒 ×2" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 55, 60)}`, "PHY\u3000+5", "毒 ×2（敵）"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 55, 60)} ダメージ（PHY 55〜60%）`, "PHY を +5", "敵に毒 ×2 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 55, 60);
        s.playerPhy += 5;
        api.addPoisonToEnemy(s, 2);
      },
    },
    ext3101: {
      libraryKey: "ext3101",
      extId: 3101,
      extNameJa: "モクク",
      skillNameJa: "癒しボイス",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT40-40%" }
      ],
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 40, 40)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 40〜40% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 40, 40)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 40, 40);
      },
    },
    ext3102: {
      libraryKey: "ext3102",
      extId: 3102,
      extNameJa: "怪盗紳士の片眼鏡",
      skillNameJa: "お宝はいただいた！",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 94-94%" },
        { target: "self", text: "PHY +1" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 94, 94)}`, "PHY\u3000+1"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 94, 94)} ダメージ（PHY 94〜94%）`, "PHY を +1"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 94, 94);
        s.playerPhy += 1;
      },
    },
    ext3103: {
      libraryKey: "ext3103",
      extId: 3103,
      extNameJa: "攻符　三柱陣",
      skillNameJa: "三方封滅",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 94-94%" },
        { target: "self", text: "INT +1" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 94, 94)}`, "INT\u3000+1"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 94, 94)} ダメージ（INT 94〜94%）`, "INT を +1"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 94, 94);
        s.playerInt += 1;
      },
    },
    ext3104: {
      libraryKey: "ext3104",
      extId: 3104,
      extNameJa: "神絵師の筆パレ",
      skillNameJa: "COOL！！Art",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 22-22%" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 22, 22)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 22, 22)} ダメージ（PHY 22〜22%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 22, 22);
      },
    },
    ext3105: {
      libraryKey: "ext3105",
      extId: 3105,
      extNameJa: "女優鏡",
      skillNameJa: "美しい薔薇には棘がある",
      skillIcon: "DBF_phy.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "毒 ×2" }
      ],
      effectSummaryLines() { return ["毒 ×2（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines() { return ["敵に毒 ×2 付与"]; },
      play(s) {
        api.addPoisonToEnemy(s, 2);
      },
    },
    ext3106: {
      libraryKey: "ext3106",
      extId: 3106,
      extNameJa: "ぐらふぁい島モアイの息吹",
      skillNameJa: "深呼吸からの仕返し",
      skillIcon: "DBF_phy.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "毒 ×2" }
      ],
      effectSummaryLines() { return ["毒 ×2（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines() { return ["敵に毒 ×2 付与"]; },
      play(s) {
        api.addPoisonToEnemy(s, 2);
      },
    },
    ext3107: {
      libraryKey: "ext3107",
      extId: 3107,
      extNameJa: "アンティキティラの貴婦像",
      skillNameJa: "ディープラーニング レディー・フィンガー",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 59-59%" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 59, 59)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 59, 59)} ダメージ（INT 59〜59%）`]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 59, 59);
      },
    },
    ext3108: {
      libraryKey: "ext3108",
      extId: 3108,
      extNameJa: "ブラッドゴーレム",
      skillNameJa: "血の復讐",
      skillIcon: "DBF_phy.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "敵PHY -2" }
      ],
      effectSummaryLines() { return ["PHY\u3000-2（敵）"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines() { return ["敵の PHY を -2"]; },
      play(s) {
        s.enemyPhy = Math.max(1, s.enemyPhy + (-2)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext3109: {
      libraryKey: "ext3109",
      extId: 3109,
      extNameJa: "ウィズダムスカル",
      skillNameJa: "略奪者のギミック",
      skillIcon: "DBF_phy.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "出血 ×2" }
      ],
      effectSummaryLines() { return ["出血 ×2（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines() { return ["敵に出血 ×2 付与"]; },
      play(s) {
        api.addBleedToEnemy(s, 2);
      },
    },
    ext3110: {
      libraryKey: "ext3110",
      extId: 3110,
      extNameJa: "闇アマテラスの落としたリボン",
      skillNameJa: "結うはお前の髪か命か",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 51-51%" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 51, 51)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 51, 51)} ダメージ（PHY 51〜51%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 51, 51);
      },
    },
    ext3111: {
      libraryKey: "ext3111",
      extId: 3111,
      extNameJa: "賢者の懐中時計",
      skillNameJa: "気高き愚行",
      skillIcon: "guard.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "ガード +6" }
      ],
      effectSummaryLines() { return ["ガード\u3000+6"]; },
      peekHelpKeys() { return ["guard"]; },
      previewLines() { return ["ガードを 6 得る（StS 風代替効果）"]; },
      play(s) {
        s.playerGuard += 6; api.playBattleSe("buff"); api.portraitFx("player", "buff");
      },
    },
    ext3112: {
      libraryKey: "ext3112",
      extId: 3112,
      extNameJa: "シルフ",
      skillNameJa: "風の光",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 60-65%" },
        { target: "self", text: "INT +1" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 60, 65)}`, "INT\u3000+1"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 60, 65)} ダメージ（INT 60〜65%）`, "INT を +1"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 60, 65);
        s.playerInt += 1;
      },
    },
    ext3113: {
      libraryKey: "ext3113",
      extId: 3113,
      extNameJa: "ウィズダムパロット",
      skillNameJa: "希望の囀り",
      skillIcon: "BUF_agi.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "AGI +5" },
        { target: "self", text: "毒 ×2" }
      ],
      effectSummaryLines() { return ["AGI\u3000+5", "毒 ×2（敵）"]; },
      peekHelpKeys() { return ["agi"]; },
      previewLines() { return ["AGI を +5", "敵に毒 ×2 付与"]; },
      play(s) {
        s.playerAgi += 5;
        api.addPoisonToEnemy(s, 2);
      },
    },
    ext3115: {
      libraryKey: "ext3115",
      extId: 3115,
      extNameJa: "Senmu V-RED",
      skillNameJa: "専務が全部やる",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 60-60%" },
        { target: "enemy.foremost", text: "毒 ×2" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 60, 60)}`, "毒 ×2（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 60, 60)} ダメージ（INT 60〜60%）`, "敵に毒 ×2 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 60, 60);
        api.addPoisonToEnemy(s, 2);
      },
    },
    ext3116: {
      libraryKey: "ext3116",
      extId: 3116,
      extNameJa: "帝国式魔導機甲兵 指揮官機",
      skillNameJa: "参式高速徹甲弾",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 29-29%" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 29, 29)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 29, 29)} ダメージ（PHY 29〜29%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 29, 29);
      },
    },
    ext3117: {
      libraryKey: "ext3117",
      extId: 3117,
      extNameJa: "翠翼の騎龍",
      skillNameJa: "龍戦争の希望を乗せて",
      skillIcon: "phy.png",
      cost: 2,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 102-102%" },
        { target: "enemy.foremost", text: "敵INT -3" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 102, 102)}`, "INT\u3000-3（敵）"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 102, 102)} ダメージ（PHY 102〜102%）`, "敵の INT を -3"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 102, 102);
        s.enemyInt = Math.max(1, s.enemyInt + (-3)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext3118: {
      libraryKey: "ext3118",
      extId: 3118,
      extNameJa: "ブレイブフェリス・ホイール",
      skillNameJa: "セントルイス万博の稼ぎ頭",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 32-32%" },
        { target: "enemy.foremost", text: "敵INT -4" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 32, 32)}`, "INT\u3000-4（敵）"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 32, 32)} ダメージ（PHY 32〜32%）`, "敵の INT を -4"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 32, 32);
        s.enemyInt = Math.max(1, s.enemyInt + (-4)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext3119: {
      libraryKey: "ext3119",
      extId: 3119,
      extNameJa: "野生化パンダマシン",
      skillNameJa: "笹うめ〜",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT14-14%" }
      ],
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 14, 14)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 14〜14% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 14, 14)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 14, 14);
      },
    },
    ext3120: {
      libraryKey: "ext3120",
      extId: 3120,
      extNameJa: "フォーチュン ペガサス",
      skillNameJa: "幸せを運ぶ翼",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 52-52%" },
        { target: "enemy.foremost", text: "毒 ×2" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 52, 52)}`, "毒 ×2（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 52, 52)} ダメージ（INT 52〜52%・1v1=単体）`, "敵に毒 ×2 付与"]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 52, 52);
        api.addPoisonToEnemy(s, 2);
      },
    },
    ext3121: {
      libraryKey: "ext3121",
      extId: 3121,
      extNameJa: "ロケットスター",
      skillNameJa: "SpaceX",
      skillIcon: "guard.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "ガード +6" }
      ],
      effectSummaryLines() { return ["ガード\u3000+6"]; },
      peekHelpKeys() { return ["guard"]; },
      previewLines() { return ["ガードを 6 得る（StS 風代替効果）"]; },
      play(s) {
        s.playerGuard += 6; api.playBattleSe("buff"); api.portraitFx("player", "buff");
      },
    },
    ext3122: {
      libraryKey: "ext3122",
      extId: 3122,
      extNameJa: "ウィズダムイカダ",
      skillNameJa: "ヤリイカダ",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT50-50%" },
        { target: "self", text: "出血 ×2" }
      ],
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 50, 50), "出血 ×2（敵）"]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 50〜50% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 50, 50)}）`, "敵に出血 ×2 付与"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 50, 50);
        api.addBleedToEnemy(s, 2);
      },
    },
    ext3123: {
      libraryKey: "ext3123",
      extId: 3123,
      extNameJa: "魔導1000年戦争時代に一般市民が愛用した魔導戦車ジュウ・ザ・トロール",
      skillNameJa: "魔導ミサイル",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 56-56%" },
        { target: "enemy.foremost", text: "出血 ×2" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 56, 56)}`, "出血 ×2（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 56, 56)} ダメージ（PHY 56〜56%）`, "敵に出血 ×2 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 56, 56);
        api.addBleedToEnemy(s, 2);
      },
    },
    ext3124: {
      libraryKey: "ext3124",
      extId: 3124,
      extNameJa: "ブレイブ手裏剣",
      skillNameJa: "ブレイブ打剣",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 40-50%" },
        { target: "enemy.foremost", text: "敵AGI -4" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 40, 50)}`, "AGI\u3000-4（敵）"]; },
      peekHelpKeys() { return ["agi"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 40, 50)} ダメージ（PHY 40〜50%）`, "敵の AGI を -4"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 40, 50);
        s.enemyAgi = Math.max(1, s.enemyAgi + (-4)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext3125: {
      libraryKey: "ext3125",
      extId: 3125,
      extNameJa: "カエル王子",
      skillNameJa: "ブレイブフロッグフォース",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 25-30%" },
        { target: "self", text: "PHY +2" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 25, 30)}`, "PHY\u3000+2"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 25, 30)} ダメージ（PHY 25〜30%）`, "PHY を +2"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 25, 30);
        s.playerPhy += 2;
      },
    },
    ext3126: {
      libraryKey: "ext3126",
      extId: 3126,
      extNameJa: "鋭氷の王位継承者コールド",
      skillNameJa: "ウィズダムアイシクル",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 25-30%" },
        { target: "self", text: "INT +2" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 25, 30)}`, "INT\u3000+2"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 25, 30)} ダメージ（INT 25〜30%・1v1=単体）`, "INT を +2"]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 25, 30);
        s.playerInt += 2;
      },
    },
    ext3127: {
      libraryKey: "ext3127",
      extId: 3127,
      extNameJa: "市松人形",
      skillNameJa: "呪い返し人形",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT50-50%" }
      ],
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 50, 50)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 50〜50% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 50, 50)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 50, 50);
      },
    },
    ext3128: {
      libraryKey: "ext3128",
      extId: 3128,
      extNameJa: "SDNメダル[R]",
      skillNameJa: "Brave Stake POWER!",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 35-40%" },
        { target: "enemy.foremost", text: "INTダメ 35-40%" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 35, 40)}`, `敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 35, 40)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 35, 40)} ダメージ（PHY 35〜40%）`, `敵1体に ${estIntHit(s.playerInt, s.enemyInt, 35, 40)} ダメージ（INT 35〜40%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 35, 40);
        api.dealIntSkillToEnemy(s, 35, 40);
      },
    },
    ext3129: {
      libraryKey: "ext3129",
      extId: 3129,
      extNameJa: "スウィートパンケーキ",
      skillNameJa: "スウィートもちもちふわふわ",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT25-45%" }
      ],
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 25, 45)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 25〜45% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 25, 45)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 25, 45);
      },
    },
    ext3130: {
      libraryKey: "ext3130",
      extId: 3130,
      extNameJa: "ウィズダムレーザーガン",
      skillNameJa: "ウィズダムプラズマショット",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 50-50%" },
        { target: "self", text: "PHY +5" },
        { target: "enemy.foremost", text: "出血 ×2" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 50, 50)}`, "PHY\u3000+5", "出血 ×2（敵）"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 50, 50)} ダメージ（INT 50〜50%）`, "PHY を +5", "敵に出血 ×2 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 50, 50);
        s.playerPhy += 5;
        api.addBleedToEnemy(s, 2);
      },
    },
    ext3131: {
      libraryKey: "ext3131",
      extId: 3131,
      extNameJa: "バッタ商人",
      skillNameJa: "千客万来",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 13-13%" },
        { target: "enemy.foremost", text: "毒 ×2" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 13, 13)}`, "毒 ×2（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 13, 13)} ダメージ（INT 13〜13%・1v1=単体）`, "敵に毒 ×2 付与"]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 13, 13);
        api.addPoisonToEnemy(s, 2);
      },
    },
    ext3132: {
      libraryKey: "ext3132",
      extId: 3132,
      extNameJa: "エンシェントリミュラス",
      skillNameJa: "デボンの光",
      skillIcon: "guard.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "ガード +6" }
      ],
      effectSummaryLines() { return ["ガード\u3000+6"]; },
      peekHelpKeys() { return ["guard"]; },
      previewLines() { return ["ガードを 6 得る（StS 風代替効果）"]; },
      play(s) {
        s.playerGuard += 6; api.playBattleSe("buff"); api.portraitFx("player", "buff");
      },
    },
    ext3133: {
      libraryKey: "ext3133",
      extId: 3133,
      extNameJa: "漢方薬ヴェノムモス",
      skillNameJa: "良薬は口に苦し…",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT14-14%" },
        { target: "self", text: "INT +1" }
      ],
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 14, 14), "INT\u3000+1"]; },
      peekHelpKeys() { return ["hp", "int"]; },
      previewLines(s) { return [`HP を回復係数 14〜14% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 14, 14)}）`, "INT を +1"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 14, 14);
        s.playerInt += 1;
      },
    },
    ext3134: {
      libraryKey: "ext3134",
      extId: 3134,
      extNameJa: "ブレイブスコーピオン",
      skillNameJa: "アサシンニードル",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 48-48%" },
        { target: "enemy.foremost", text: "毒 ×2" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 48, 48)}`, "毒 ×2（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 48, 48)} ダメージ（PHY 48〜48%）`, "敵に毒 ×2 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 48, 48);
        api.addPoisonToEnemy(s, 2);
      },
    },
    ext3135: {
      libraryKey: "ext3135",
      extId: 3135,
      extNameJa: "不良象蟲（ふりょうぞうむし）ノーズ•ギャング",
      skillNameJa: "十五の夜",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 63-63%" },
        { target: "self", text: "AGI +1" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 63, 63)}`, "AGI\u3000+1"]; },
      peekHelpKeys() { return ["agi"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 63, 63)} ダメージ（PHY 63〜63%）`, "AGI を +1"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 63, 63);
        s.playerAgi += 1;
      },
    },
    ext3136: {
      libraryKey: "ext3136",
      extId: 3136,
      extNameJa: "プリンスアトラス",
      skillNameJa: "天空背負い投げ",
      skillIcon: "guard.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "ガード +6" }
      ],
      effectSummaryLines() { return ["ガード\u3000+6"]; },
      peekHelpKeys() { return ["guard"]; },
      previewLines() { return ["ガードを 6 得る（StS 風代替効果）"]; },
      play(s) {
        s.playerGuard += 6; api.playBattleSe("buff"); api.portraitFx("player", "buff");
      },
    },
    ext3137: {
      libraryKey: "ext3137",
      extId: 3137,
      extNameJa: "スズメバチ",
      skillNameJa: "アナフィラキシーショック",
      skillIcon: "BUF_agi.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "AGI +1" },
        { target: "self", text: "毒 ×2" }
      ],
      effectSummaryLines() { return ["AGI\u3000+1", "毒 ×2（敵）"]; },
      peekHelpKeys() { return ["agi"]; },
      previewLines() { return ["AGI を +1", "敵に毒 ×2 付与"]; },
      play(s) {
        s.playerAgi += 1;
        api.addPoisonToEnemy(s, 2);
      },
    },
    ext3138: {
      libraryKey: "ext3138",
      extId: 3138,
      extNameJa: "Soldier Ant",
      skillNameJa: "女王は長生きします！",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT95-95%" },
        { target: "self", text: "PHY +1" }
      ],
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 95, 95), "PHY\u3000+1"]; },
      peekHelpKeys() { return ["hp", "phy"]; },
      previewLines(s) { return [`HP を回復係数 95〜95% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 95, 95)}）`, "PHY を +1"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 95, 95);
        s.playerPhy += 1;
      },
    },
    ext3139: {
      libraryKey: "ext3139",
      extId: 3139,
      extNameJa: "結晶鱗翅",
      skillNameJa: "吸引力の変わらないただ一つのちゅるちゅる",
      skillIcon: "guard.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "ガード +6" }
      ],
      effectSummaryLines() { return ["ガード\u3000+6"]; },
      peekHelpKeys() { return ["guard"]; },
      previewLines() { return ["ガードを 6 得る（StS 風代替効果）"]; },
      play(s) {
        s.playerGuard += 6; api.playBattleSe("buff"); api.portraitFx("player", "buff");
      },
    },
    ext3140: {
      libraryKey: "ext3140",
      extId: 3140,
      extNameJa: "ノーブルオリフラム",
      skillNameJa: "ノーブルプレジャリージェンス",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT55-60%" },
        { target: "self", text: "INT +5" }
      ],
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 55, 60), "INT\u3000+5"]; },
      peekHelpKeys() { return ["hp", "int"]; },
      previewLines(s) { return [`HP を回復係数 55〜60% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 55, 60)}）`, "INT を +5"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 55, 60);
        s.playerInt += 5;
      },
    },
    ext3141: {
      libraryKey: "ext3141",
      extId: 3141,
      extNameJa: "壬生狼羽織",
      skillNameJa: "忠誠と覚悟",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 50-75%" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 50, 75)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 50, 75)} ダメージ（PHY 50〜75%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 50, 75);
      },
    },
    ext3142: {
      libraryKey: "ext3142",
      extId: 3142,
      extNameJa: "サンドイッチボックス",
      skillNameJa: "みんなでワイワイ",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 50-60%" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 50, 60)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 50, 60)} ダメージ（INT 50〜60%・代替効果）`]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 50, 60);
      },
    },
    ext3143: {
      libraryKey: "ext3143",
      extId: 3143,
      extNameJa: "魔力で動く天球儀",
      skillNameJa: "無意識の深淵",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 20-45%" },
        { target: "enemy.foremost", text: "毒 ×2" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 20, 45)}`, "毒 ×2（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 20, 45)} ダメージ（INT 20〜45%）`, "敵に毒 ×2 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 20, 45);
        api.addPoisonToEnemy(s, 2);
      },
    },
    ext3147: {
      libraryKey: "ext3147",
      extId: 3147,
      extNameJa: "ウィズダムシールドシステム",
      skillNameJa: "ウィズダムシールドジェネレーター",
      skillIcon: "guard.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "ガード +6" }
      ],
      effectSummaryLines() { return ["ガード\u3000+6"]; },
      peekHelpKeys() { return ["guard"]; },
      previewLines() { return ["ガードを 6 得る（StS 風代替効果）"]; },
      play(s) {
        s.playerGuard += 6; api.playBattleSe("buff"); api.portraitFx("player", "buff");
      },
    },
    ext3148: {
      libraryKey: "ext3148",
      extId: 3148,
      extNameJa: "RYUZAN.phy",
      skillNameJa: "ブレイブRYUクロー",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 30-30%" },
        { target: "enemy.foremost", text: "毒 ×2" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 30, 30)}`, "毒 ×2（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 30, 30)} ダメージ（PHY 30〜30%）`, "敵に毒 ×2 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 30, 30);
        api.addPoisonToEnemy(s, 2);
      },
    },
    ext3149: {
      libraryKey: "ext3149",
      extId: 3149,
      extNameJa: "RYUZAN.int",
      skillNameJa: "ウィズダムRYUブレス",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 30-30%" },
        { target: "enemy.foremost", text: "毒 ×2" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 30, 30)}`, "毒 ×2（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 30, 30)} ダメージ（INT 30〜30%・1v1=単体）`, "敵に毒 ×2 付与"]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 30, 30);
        api.addPoisonToEnemy(s, 2);
      },
    },
    ext3150: {
      libraryKey: "ext3150",
      extId: 3150,
      extNameJa: "鬼灯ランタン",
      skillNameJa: "活力の残炎",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 16-16%" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 16, 16)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 16, 16)} ダメージ（INT 16〜16%・1v1=単体）`]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 16, 16);
      },
    },
    ext3151: {
      libraryKey: "ext3151",
      extId: 3151,
      extNameJa: "ベーコンエッグバーガー",
      skillNameJa: "豪華朝食を一口で！",
      skillIcon: "DBF_phy.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "毒 ×2" }
      ],
      effectSummaryLines() { return ["毒 ×2（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines() { return ["敵に毒 ×2 付与"]; },
      play(s) {
        api.addPoisonToEnemy(s, 2);
      },
    },
    ext3152: {
      libraryKey: "ext3152",
      extId: 3152,
      extNameJa: "ブレイブメイス",
      skillNameJa: "ブレイブメイスブロー",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 55-65%" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 55, 65)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 55, 65)} ダメージ（PHY 55〜65%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 55, 65);
      },
    },
    ext3153: {
      libraryKey: "ext3153",
      extId: 3153,
      extNameJa: "白磁のパンジャンドラム",
      skillNameJa: "ブレイブローリングウェポン",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 55-65%" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 55, 65)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 55, 65)} ダメージ（INT 55〜65%・1v1=単体）`]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 55, 65);
      },
    },
    ext3154: {
      libraryKey: "ext3154",
      extId: 3154,
      extNameJa: "定番醤油ラーメン",
      skillNameJa: "行列のできる人気店",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT22-32%" },
        { target: "self", text: "AGI +4" }
      ],
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 22, 32), "AGI\u3000+4"]; },
      peekHelpKeys() { return ["hp", "agi"]; },
      previewLines(s) { return [`HP を回復係数 22〜32% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 22, 32)}）`, "AGI を +4"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 22, 32);
        s.playerAgi += 4;
      },
    },
    ext3155: {
      libraryKey: "ext3155",
      extId: 3155,
      extNameJa: "スワンジェントル",
      skillNameJa: "ブレイブペダルローイング",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 45-55%" },
        { target: "enemy.foremost", text: "敵PHY -4" },
        { target: "enemy.foremost", text: "出血 ×2" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 45, 55)}`, "PHY\u3000-4（敵）", "出血 ×2（敵）"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 45, 55)} ダメージ（PHY 45〜55%）`, "敵の PHY を -4", "敵に出血 ×2 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 45, 55);
        s.enemyPhy = Math.max(1, s.enemyPhy + (-4)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
        api.addBleedToEnemy(s, 2);
      },
    },
    ext3156: {
      libraryKey: "ext3156",
      extId: 3156,
      extNameJa: "アンティークコンパス",
      skillNameJa: "ウィズダムマグナビゲート",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 45-55%" },
        { target: "enemy.foremost", text: "敵INT -4" },
        { target: "enemy.foremost", text: "出血 ×2" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 45, 55)}`, "INT\u3000-4（敵）", "出血 ×2（敵）"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 45, 55)} ダメージ（INT 45〜55%）`, "敵の INT を -4", "敵に出血 ×2 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 45, 55);
        s.enemyInt = Math.max(1, s.enemyInt + (-4)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
        api.addBleedToEnemy(s, 2);
      },
    },
    ext3157: {
      libraryKey: "ext3157",
      extId: 3157,
      extNameJa: "特上寿司",
      skillNameJa: "職人のシャリ",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT125-130%" }
      ],
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 125, 130)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 125〜130% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 125, 130)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 125, 130);
      },
    },
    ext3158: {
      libraryKey: "ext3158",
      extId: 3158,
      extNameJa: "ウィズダムサイバースタッフ",
      skillNameJa: "ウィズダムエナジーコンバート",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 60-65%" },
        { target: "self", text: "INT +5" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 60, 65)}`, "INT\u3000+5"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 60, 65)} ダメージ（INT 60〜65%）`, "INT を +5"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 60, 65);
        s.playerInt += 5;
      },
    },
    ext3159: {
      libraryKey: "ext3159",
      extId: 3159,
      extNameJa: "寿りんご",
      skillNameJa: "ブレイブアート・ハート",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 50-55%" },
        { target: "self", text: "INT +5" },
        { target: "enemy.foremost", text: "毒 ×2" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 50, 55)}`, "INT\u3000+5", "毒 ×2（敵）"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 50, 55)} ダメージ（PHY 50〜55%）`, "INT を +5", "敵に毒 ×2 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 50, 55);
        s.playerInt += 5;
        api.addPoisonToEnemy(s, 2);
      },
    },
    ext3160: {
      libraryKey: "ext3160",
      extId: 3160,
      extNameJa: "中型アクアリウム",
      skillNameJa: "ウィズダム流体制御",
      skillIcon: "DBF_phy.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "毒 ×2" }
      ],
      effectSummaryLines() { return ["毒 ×2（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines() { return ["敵に毒 ×2 付与"]; },
      play(s) {
        api.addPoisonToEnemy(s, 2);
      },
    },
    ext3161: {
      libraryKey: "ext3161",
      extId: 3161,
      extNameJa: "ブレイブサイバーソード",
      skillNameJa: "ブレイブファイナルギャンビット",
      skillIcon: "BUF_phy.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "PHY +5" },
        { target: "self", text: "INT +5" }
      ],
      effectSummaryLines() { return ["PHY\u3000+5", "INT\u3000+5"]; },
      peekHelpKeys() { return ["phy", "int"]; },
      previewLines() { return ["PHY を +5", "INT を +5"]; },
      play(s) {
        s.playerPhy += 5;
        s.playerInt += 5;
      },
    },
    ext3162: {
      libraryKey: "ext3162",
      extId: 3162,
      extNameJa: "毒マンドラゴラ",
      skillNameJa: "毒霧の呪詛",
      skillIcon: "DBF_agi.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "敵AGI -4" },
        { target: "enemy.foremost", text: "毒 ×2" }
      ],
      effectSummaryLines() { return ["AGI\u3000-4（敵）", "毒 ×2（敵）"]; },
      peekHelpKeys() { return ["agi"]; },
      previewLines() { return ["敵の AGI を -4", "敵に毒 ×2 付与"]; },
      play(s) {
        s.enemyAgi = Math.max(1, s.enemyAgi + (-4)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
        api.addPoisonToEnemy(s, 2);
      },
    },
    ext3163: {
      libraryKey: "ext3163",
      extId: 3163,
      extNameJa: "藤盆栽",
      skillNameJa: "超有機的アート",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT10-15%" },
        { target: "self", text: "PHY +3" },
        { target: "self", text: "INT +3" }
      ],
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 10, 15), "PHY\u3000+3", "INT\u3000+3"]; },
      peekHelpKeys() { return ["hp", "phy", "int"]; },
      previewLines(s) { return [`HP を回復係数 10〜15% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 10, 15)}）`, "PHY を +3", "INT を +3"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 10, 15);
        s.playerPhy += 3;
        s.playerInt += 3;
      },
    },
    ext3164: {
      libraryKey: "ext3164",
      extId: 3164,
      extNameJa: "ブレイブメリケンサック",
      skillNameJa: "ブレイブリーチング・シャドウ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 60-70%" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 60, 70)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 60, 70)} ダメージ（PHY 60〜70%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 60, 70);
      },
    },
    ext3165: {
      libraryKey: "ext3165",
      extId: 3165,
      extNameJa: "バレエ・オルゴール",
      skillNameJa: "バレエメロディ・ラウンド",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 60-70%" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 60, 70)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 60, 70)} ダメージ（INT 60〜70%）`]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 60, 70);
      },
    },
    ext3169: {
      libraryKey: "ext3169",
      extId: 3169,
      extNameJa: "メデューサの目玉標本",
      skillNameJa: "石化の視線波動",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 25-30%" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 25, 30)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 25, 30)} ダメージ（INT 25〜30%・1v1=単体）`]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 25, 30);
      },
    },
    ext3170: {
      libraryKey: "ext3170",
      extId: 3170,
      extNameJa: "ロッキングチェア",
      skillNameJa: "ブレイブ着席",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT100-120%" },
        { target: "self", text: "PHY +2" },
        { target: "self", text: "出血 ×2" }
      ],
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 100, 120), "PHY\u3000+2", "出血 ×2（敵）"]; },
      peekHelpKeys() { return ["hp", "phy"]; },
      previewLines(s) { return [`HP を回復係数 100〜120% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 100, 120)}）`, "PHY を +2", "敵に出血 ×2 付与"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 100, 120);
        s.playerPhy += 2;
        api.addBleedToEnemy(s, 2);
      },
    },
    ext3171: {
      libraryKey: "ext3171",
      extId: 3171,
      extNameJa: "庭師の鋏",
      skillNameJa: "ブレイブテンポトリム",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 50-60%" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 50, 60)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 50, 60)} ダメージ（PHY 50〜60%・代替効果）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 50, 60);
      },
    },
    ext3172: {
      libraryKey: "ext3172",
      extId: 3172,
      extNameJa: "合皮財布",
      skillNameJa: "ウィズダム資産凍結",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "ドロー +1" }
      ],
      effectSummaryLines() { return ["ドロー　1"]; },
      peekHelpKeys() { return ["draw"]; },
      previewLines() { return ["カードを 1 枚引く（StS 風代替効果）"]; },
      play(s) {
        api.drawCards(s, 1);
      },
    },
    ext3173: {
      libraryKey: "ext3173",
      extId: 3173,
      extNameJa: "雪の結晶のタリスマン",
      skillNameJa: "ウィズダムファントムシュート",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 25-25%" },
        { target: "enemy.foremost", text: "出血 ×2" },
        { target: "enemy.foremost", text: "毒 ×2" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 25, 25)}`, "出血 ×2（敵）", "毒 ×2（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 25, 25)} ダメージ（INT 25〜25%）`, "敵に出血 ×2 付与", "敵に毒 ×2 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 25, 25);
        api.addBleedToEnemy(s, 2);
        api.addPoisonToEnemy(s, 2);
      },
    },
    ext3174: {
      libraryKey: "ext3174",
      extId: 3174,
      extNameJa: "ラブリーセット",
      skillNameJa: "ウィズダムマジカルヒーリング",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT15-20%" }
      ],
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 15, 20)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 15〜20% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 15, 20)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 15, 20);
      },
    },
    ext3175: {
      libraryKey: "ext3175",
      extId: 3175,
      extNameJa: "ユニコーンホーン",
      skillNameJa: "ウィズダムホーンオーラ",
      skillIcon: "guard.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "ガード +6" }
      ],
      effectSummaryLines() { return ["ガード\u3000+6"]; },
      peekHelpKeys() { return ["guard"]; },
      previewLines() { return ["ガードを 6 得る（StS 風代替効果）"]; },
      play(s) {
        s.playerGuard += 6; api.playBattleSe("buff"); api.portraitFx("player", "buff");
      },
    },
    ext3176: {
      libraryKey: "ext3176",
      extId: 3176,
      extNameJa: "ナポレオンパイ",
      skillNameJa: "ブレイブ甘酸っぱい",
      skillIcon: "DBF_phy.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "毒 ×2" }
      ],
      effectSummaryLines() { return ["毒 ×2（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines() { return ["敵に毒 ×2 付与"]; },
      play(s) {
        api.addPoisonToEnemy(s, 2);
      },
    },
    ext3177: {
      libraryKey: "ext3177",
      extId: 3177,
      extNameJa: "ゴーレムビショップ",
      skillNameJa: "ブレイブナチュレ・ストライド",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 35-40%" },
        { target: "self", text: "PHY +1" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 35, 40)}`, "PHY\u3000+1"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 35, 40)} ダメージ（PHY 35〜40%）`, "PHY を +1"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 35, 40);
        s.playerPhy += 1;
      },
    },
    ext3178: {
      libraryKey: "ext3178",
      extId: 3178,
      extNameJa: "ウィズダムマジックカード",
      skillNameJa: "ウィズダムマジックチャント",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 35-40%" },
        { target: "self", text: "INT +1" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 35, 40)}`, "INT\u3000+1"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 35, 40)} ダメージ（INT 35〜40%）`, "INT を +1"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 35, 40);
        s.playerInt += 1;
      },
    },
    ext3179: {
      libraryKey: "ext3179",
      extId: 3179,
      extNameJa: "トラばさみ",
      skillNameJa: "ブレイブノックアウト・トラップ",
      skillIcon: "DBF_int.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "敵INT -4" },
        { target: "enemy.foremost", text: "敵AGI -4" },
        { target: "enemy.foremost", text: "出血 ×2" }
      ],
      effectSummaryLines() { return ["INT\u3000-4（敵）", "AGI\u3000-4（敵）", "出血 ×2（敵）"]; },
      peekHelpKeys() { return ["int", "agi"]; },
      previewLines() { return ["敵の INT を -4", "敵の AGI を -4", "敵に出血 ×2 付与"]; },
      play(s) {
        s.enemyInt = Math.max(1, s.enemyInt + (-4)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
        s.enemyAgi = Math.max(1, s.enemyAgi + (-4)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
        api.addBleedToEnemy(s, 2);
      },
    },
    ext3180: {
      libraryKey: "ext3180",
      extId: 3180,
      extNameJa: "シャム猫&オリエンタルじゃらし",
      skillNameJa: "ウィズダムゴロゴロ惑乱",
      skillIcon: "DBF_agi.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "敵PHY -4" },
        { target: "enemy.foremost", text: "敵AGI -4" },
        { target: "enemy.foremost", text: "毒 ×2" }
      ],
      effectSummaryLines() { return ["PHY\u3000-4（敵）", "AGI\u3000-4（敵）", "毒 ×2（敵）"]; },
      peekHelpKeys() { return ["phy", "agi"]; },
      previewLines() { return ["敵の PHY を -4", "敵の AGI を -4", "敵に毒 ×2 付与"]; },
      play(s) {
        s.enemyPhy = Math.max(1, s.enemyPhy + (-4)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
        s.enemyAgi = Math.max(1, s.enemyAgi + (-4)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
        api.addPoisonToEnemy(s, 2);
      },
    },
    ext3181: {
      libraryKey: "ext3181",
      extId: 3181,
      extNameJa: "ウィジャボード",
      skillNameJa: "高位の霊圧",
      skillIcon: "guard.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "ガード +6" }
      ],
      effectSummaryLines() { return ["ガード\u3000+6"]; },
      peekHelpKeys() { return ["guard"]; },
      previewLines() { return ["ガードを 6 得る（StS 風代替効果）"]; },
      play(s) {
        s.playerGuard += 6; api.playBattleSe("buff"); api.portraitFx("player", "buff");
      },
    },
    ext3182: {
      libraryKey: "ext3182",
      extId: 3182,
      extNameJa: "持ち運びハウス",
      skillNameJa: "ウィズダム箱庭リノベーション",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 50-60%" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 50, 60)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 50, 60)} ダメージ（INT 50〜60%・代替効果）`]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 50, 60);
      },
    },
    ext3183: {
      libraryKey: "ext3183",
      extId: 3183,
      extNameJa: "ブレイブフレイル",
      skillNameJa: "ブレイブ鉄球一閃",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 50-60%" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 50, 60)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 50, 60)} ダメージ（PHY 50〜60%・代替効果）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 50, 60);
      },
    },
    ext3184: {
      libraryKey: "ext3184",
      extId: 3184,
      extNameJa: "花グモ",
      skillNameJa: "ブレイブバズ・ファズ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 50-60%" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 50, 60)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 50, 60)} ダメージ（PHY 50〜60%・代替効果）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 50, 60);
      },
    },
    ext3185: {
      libraryKey: "ext3185",
      extId: 3185,
      extNameJa: "アメジストドラゴン",
      skillNameJa: "ブレイブジェムコイル・エンブレイス",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 45-45%" },
        { target: "self", text: "PHY +3" },
        { target: "enemy.foremost", text: "敵AGI -4" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 45, 45)}`, "PHY\u3000+3", "AGI\u3000-4（敵）"]; },
      peekHelpKeys() { return ["phy", "agi"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 45, 45)} ダメージ（PHY 45〜45%）`, "PHY を +3", "敵の AGI を -4"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 45, 45);
        s.playerPhy += 3;
        s.enemyAgi = Math.max(1, s.enemyAgi + (-4)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext3186: {
      libraryKey: "ext3186",
      extId: 3186,
      extNameJa: "オウムざらし",
      skillNameJa: "ブレイブ獣翼アップリフト",
      skillIcon: "guard.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "ガード +6" }
      ],
      effectSummaryLines() { return ["ガード\u3000+6"]; },
      peekHelpKeys() { return ["guard"]; },
      previewLines() { return ["ガードを 6 得る（StS 風代替効果）"]; },
      play(s) {
        s.playerGuard += 6; api.playBattleSe("buff"); api.portraitFx("player", "buff");
      },
    },
    ext3187: {
      libraryKey: "ext3187",
      extId: 3187,
      extNameJa: "ブレイブジャベリン",
      skillNameJa: "ブレイブインペイルチャージ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 45-55%" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 45, 55)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 45, 55)} ダメージ（PHY 45〜55%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 45, 55);
      },
    },
    ext3188: {
      libraryKey: "ext3188",
      extId: 3188,
      extNameJa: "ウィズダムブーメラン",
      skillNameJa: "ウィズダムリターンシュート",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 45-55%" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 45, 55)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 45, 55)} ダメージ（INT 45〜55%）`]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 45, 55);
      },
    },
    ext3189: {
      libraryKey: "ext3189",
      extId: 3189,
      extNameJa: "バイカラーサファイアドラゴン",
      skillNameJa: "ブレイブイルミネーションバースト",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 25-30%" },
        { target: "enemy.foremost", text: "INTダメ 25-30%" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 25, 30)}`, `敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 25, 30)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 25, 30)} ダメージ（PHY 25〜30%）`, `敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 25, 30)} ダメージ（INT 25〜30%・1v1=単体）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 25, 30);
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 25, 30);
      },
    },
    ext3190: {
      libraryKey: "ext3190",
      extId: 3190,
      extNameJa: "番傘",
      skillNameJa: "ウィズダムレインヴェール",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT30-30%" }
      ],
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 30, 30)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 30〜30% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 30, 30)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 30, 30);
      },
    },
    ext3191: {
      libraryKey: "ext3191",
      extId: 3191,
      extNameJa: "あきづき梨",
      skillNameJa: "静穏の収穫・改",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 45-50%" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 45, 50)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 45, 50)} ダメージ（PHY 45〜50%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 45, 50);
      },
    },
    ext3192: {
      libraryKey: "ext3192",
      extId: 3192,
      extNameJa: "ウィズダムチャクラム",
      skillNameJa: "ウィズダムマインドオービット",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "INTダメ 40-50%" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 40, 50)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 40, 50)} ダメージ（INT 40〜50%・1v1=単体）`]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 40, 50);
      },
    },
    ext3193: {
      libraryKey: "ext3193",
      extId: 3193,
      extNameJa: "フローラのボンネット",
      skillNameJa: "ウィズダムミティゲーション",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT55-65%" }
      ],
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 55, 65)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 55〜65% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 55, 65)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 55, 65);
      },
    },
    ext3194: {
      libraryKey: "ext3194",
      extId: 3194,
      extNameJa: "ブレイブライオン",
      skillNameJa: "ブレイブレオハウリング",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 42-52%" },
        { target: "enemy.foremost", text: "毒 ×2" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 42, 52)}`, "毒 ×2（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 42, 52)} ダメージ（PHY 42〜52%）`, "敵に毒 ×2 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 42, 52);
        api.addPoisonToEnemy(s, 2);
      },
    },
    ext3600: {
      libraryKey: "ext3600",
      extId: 3600,
      extNameJa: "魔法剣ヒノカグヅチ　",
      skillNameJa: "金瞳の炎龍",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "PHYダメ 55-60%" },
        { target: "self", text: "PHY +5" },
        { target: "enemy.foremost", text: "毒 ×2" }
      ],
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 55, 60)}`, "PHY\u3000+5", "毒 ×2（敵）"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 55, 60)} ダメージ（PHY 55〜60%）`, "PHY を +5", "敵に毒 ×2 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 55, 60);
        s.playerPhy += 5;
        api.addPoisonToEnemy(s, 2);
      },
    },
    ext3640: {
      libraryKey: "ext3640",
      extId: 3640,
      extNameJa: "グラファイ・アドベンチャー・ワールド",
      skillNameJa: "グラファイトへようこそ",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT55-60%" },
        { target: "self", text: "INT +5" }
      ],
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 55, 60), "INT\u3000+5"]; },
      peekHelpKeys() { return ["hp", "int"]; },
      previewLines(s) { return [`HP を回復係数 55〜60% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 55, 60)}）`, "INT を +5"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 55, 60);
        s.playerInt += 5;
      },
    },
    ext3647: {
      libraryKey: "ext3647",
      extId: 3647,
      extNameJa: "竜騎猫",
      skillNameJa: "飛竜の護り",
      skillIcon: "guard.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "ガード +6" }
      ],
      effectSummaryLines() { return ["ガード\u3000+6"]; },
      peekHelpKeys() { return ["guard"]; },
      previewLines() { return ["ガードを 6 得る（StS 風代替効果）"]; },
      play(s) {
        s.playerGuard += 6; api.playBattleSe("buff"); api.portraitFx("player", "buff");
      },
    },
    ext3651: {
      libraryKey: "ext3651",
      extId: 3651,
      extNameJa: "神獣さすまり",
      skillNameJa: "ひゃくぱーせんとのしみゅれーしょん",
      skillIcon: "DBF_phy.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "enemy.foremost", text: "毒 ×2" }
      ],
      effectSummaryLines() { return ["毒 ×2（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines() { return ["敵に毒 ×2 付与"]; },
      play(s) {
        api.addPoisonToEnemy(s, 2);
      },
    },
    ext3674: {
      libraryKey: "ext3674",
      extId: 3674,
      extNameJa: "流星街の遺物",
      skillNameJa: "我々は何ものも拒まない だから我々から何も奪うな",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      caster: "foremost",
      // SPEC-006: auto-derived effects (review needed: no)
      effects: [
        { target: "self", text: "HP回復 INT15-20%" }
      ],
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 15, 20)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 15〜20% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 15, 20)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 15, 20);
      },
    },
// ─── auto-generated Epic extensions (190 cards) ───
    ext4001: {
      libraryKey: "ext4001",
      extId: 4001,
      extNameJa: "インペリアルブレード",
      skillNameJa: "インペリアルチャージ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 65, 75)}`, "PHY\u3000+1"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 65, 75)} ダメージ（PHY 65〜75%）`, "PHY を +1"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 65, 75);
        s.playerPhy += 1;
      },
    },
    ext4002: {
      libraryKey: "ext4002",
      extId: 4002,
      extNameJa: "三銃士のマスケット",
      skillNameJa: "三銃士の一斉射撃",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 40, 45)}`, "INT\u3000+1"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 40, 45)} ダメージ（INT 40〜45%・1v1=単体）`, "INT を +1"]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 40, 45);
        s.playerInt += 1;
      },
    },
    ext4003: {
      libraryKey: "ext4003",
      extId: 4003,
      extNameJa: "楽聖の羽ペン",
      skillNameJa: "ムジカノーヴァ",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 60, 70), "INT\u3000+1"]; },
      peekHelpKeys() { return ["hp", "int"]; },
      previewLines(s) { return [`HP を回復係数 60〜70% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 60, 70)}）`, "INT を +1"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 60, 70);
        s.playerInt += 1;
      },
    },
    ext4004: {
      libraryKey: "ext4004",
      extId: 4004,
      extNameJa: "フリューテッドアーマー",
      skillNameJa: "蒸着",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 5, 5), "PHY\u3000+2"]; },
      peekHelpKeys() { return ["hp", "phy"]; },
      previewLines(s) { return [`HP を回復係数 5〜5% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 5, 5)}）`, "PHY を +2"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 5, 5);
        s.playerPhy += 2;
      },
    },
    ext4005: {
      libraryKey: "ext4005",
      extId: 4005,
      extNameJa: "赤兎馬",
      skillNameJa: "一日千里",
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
    ext4006: {
      libraryKey: "ext4006",
      extId: 4006,
      extNameJa: "和泉守兼定",
      skillNameJa: "剣豪の一撃",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 60, 70)}`, "PHY\u3000-1（敵）"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 60, 70)} ダメージ（PHY 60〜70%）`, "敵の PHY を -1"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 60, 70);
        s.enemyPhy = Math.max(1, s.enemyPhy + (-1)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext4007: {
      libraryKey: "ext4007",
      extId: 4007,
      extNameJa: "キューティー・エイリアン",
      skillNameJa: "キューティー・エイリアン",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 60, 60)}`, "毒 ×3（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 60, 60)} ダメージ（PHY 60〜60%）`, "敵に毒 ×3 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 60, 60);
        api.addPoisonToEnemy(s, 3);
      },
    },
    ext4008: {
      libraryKey: "ext4008",
      extId: 4008,
      extNameJa: "罪と罰",
      skillNameJa: "現代の予言書",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 40, 45)}`, "INT\u3000-1（敵）"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 40, 45)} ダメージ（INT 40〜45%・1v1=単体）`, "敵の INT を -1"]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 40, 45);
        s.enemyInt = Math.max(1, s.enemyInt + (-1)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext4009: {
      libraryKey: "ext4009",
      extId: 4009,
      extNameJa: "奇石の輝き",
      skillNameJa: "不思議な光",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 60, 70)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 60〜70% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 60, 70)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 60, 70);
      },
    },
    ext4010: {
      libraryKey: "ext4010",
      extId: 4010,
      extNameJa: "プリトウェン",
      skillNameJa: "聖女の祈り",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 32, 37)}`, "AGI\u3000-1（敵）"]; },
      peekHelpKeys() { return ["agi"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 32, 37)} ダメージ（PHY 32〜37%）`, "敵の AGI を -1"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 32, 37);
        s.enemyAgi = Math.max(1, s.enemyAgi + (-1)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext4011: {
      libraryKey: "ext4011",
      extId: 4011,
      extNameJa: "テカムセのトマホーク",
      skillNameJa: "テカムセの呪い",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 60, 70)}`, "INT\u3000-1（敵）"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 60, 70)} ダメージ（PHY 60〜70%）`, "敵の INT を -1"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 60, 70);
        s.enemyInt = Math.max(1, s.enemyInt + (-1)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext4012: {
      libraryKey: "ext4012",
      extId: 4012,
      extNameJa: "ETHEREMON-SIBERIZEN",
      skillNameJa: "頼んだぞ!シベリゼン!",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 50, 55)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 50, 55)} ダメージ（INT 50〜55%）`]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 50, 55);
      },
    },
    ext4013: {
      libraryKey: "ext4013",
      extId: 4013,
      extNameJa: "雷上動",
      skillNameJa: "鵺殺し",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 50, 60)}`, "PHY\u3000+1"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 50, 60)} ダメージ（PHY 50〜60%）`, "PHY を +1"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 50, 60);
        s.playerPhy += 1;
      },
    },
    ext4014: {
      libraryKey: "ext4014",
      extId: 4014,
      extNameJa: "人間無骨",
      skillNameJa: "鬼武蔵",
      skillIcon: "phy.png",
      cost: 2,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines() { return [`敵にダメージ ×2`]; },
      peekHelpKeys() { return []; },
      previewLines() { return [`敵1体に PHY 30〜35% × 2 回ダメージ`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 30, 35);
        if (s.enemyHp > 0) api.dealPhySkillToEnemy(s, 30, 35);
      },
    },
    ext4015: {
      libraryKey: "ext4015",
      extId: 4015,
      extNameJa: "丈八蛇矛",
      skillNameJa: "旋風斬り",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 55, 65)}`, "毒 ×3（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 55, 65)} ダメージ（PHY 55〜65%）`, "敵に毒 ×3 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 55, 65);
        api.addPoisonToEnemy(s, 3);
      },
    },
    ext4016: {
      libraryKey: "ext4016",
      extId: 4016,
      extNameJa: "兵法書",
      skillNameJa: "五事七計",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 30, 35)}`, "毒 ×3（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 30, 35)} ダメージ（INT 30〜35%・1v1=単体）`, "敵に毒 ×3 付与"]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 30, 35);
        api.addPoisonToEnemy(s, 3);
      },
    },
    ext4017: {
      libraryKey: "ext4017",
      extId: 4017,
      extNameJa: "シベリア杉の首飾り",
      skillNameJa: "ドルイドの秘法",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 15, 25), "INT\u3000+1"]; },
      peekHelpKeys() { return ["hp", "int"]; },
      previewLines(s) { return [`HP を回復係数 15〜25% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 15, 25)}）`, "INT を +1"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 15, 25);
        s.playerInt += 1;
      },
    },
    ext4018: {
      libraryKey: "ext4018",
      extId: 4018,
      extNameJa: "諏訪法性兜",
      skillNameJa: "軍神の加護",
      skillIcon: "BUF_phy.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines() { return ["PHY\u3000+1", "INT\u3000+1", "INT\u3000-1（敵）"]; },
      peekHelpKeys() { return ["phy", "int"]; },
      previewLines() { return ["PHY を +1", "INT を +1", "敵の INT を -1"]; },
      play(s) {
        s.playerPhy += 1;
        s.playerInt += 1;
        s.enemyInt = Math.max(1, s.enemyInt + (-1)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext4019: {
      libraryKey: "ext4019",
      extId: 4019,
      extNameJa: "アーケロン",
      skillNameJa: "帝亀",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 25, 25), "PHY\u3000+1", "INT\u3000+1"]; },
      peekHelpKeys() { return ["hp", "phy", "int"]; },
      previewLines(s) { return [`HP を回復係数 25〜25% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 25, 25)}）`, "PHY を +1", "INT を +1"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 25, 25);
        s.playerPhy += 1;
        s.playerInt += 1;
      },
    },
    ext4020: {
      libraryKey: "ext4020",
      extId: 4020,
      extNameJa: "ホットスパー",
      skillNameJa: "ファイティングクック",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 35, 40)}`, "AGI\u3000+1"]; },
      peekHelpKeys() { return ["agi"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 35, 40)} ダメージ（PHY 35〜40%）`, "AGI を +1"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 35, 40);
        s.playerAgi += 1;
      },
    },
    ext4021: {
      libraryKey: "ext4021",
      extId: 4021,
      extNameJa: "アムールタイガー",
      skillNameJa: "タイガーシュート",
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
    ext4022: {
      libraryKey: "ext4022",
      extId: 4022,
      extNameJa: "ワイバーン",
      skillNameJa: "ドラゴンクエイク",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 25, 30)}`, "INT\u3000-1（敵）"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 25, 30)} ダメージ（INT 25〜30%・1v1=単体）`, "敵の INT を -1"]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 25, 30);
        s.enemyInt = Math.max(1, s.enemyInt + (-1)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext4023: {
      libraryKey: "ext4023",
      extId: 4023,
      extNameJa: "バイソン",
      skillNameJa: "レイドブル",
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
    ext4024: {
      libraryKey: "ext4024",
      extId: 4024,
      extNameJa: "マンモス",
      skillNameJa: "リューバ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 30, 35)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 30, 35)} ダメージ（PHY 30〜35%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 30, 35);
      },
    },
    ext4025: {
      libraryKey: "ext4025",
      extId: 4025,
      extNameJa: "シルバーバック",
      skillNameJa: "古老の知恵",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 25, 30)}`, "出血 ×3（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 25, 30)} ダメージ（INT 25〜30%）`, "敵に出血 ×3 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 25, 30);
        api.addBleedToEnemy(s, 3);
      },
    },
    ext4026: {
      libraryKey: "ext4026",
      extId: 4026,
      extNameJa: "キングコブラ",
      skillNameJa: "ムチャリンダ",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 18, 38)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 18〜38% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 18, 38)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 18, 38);
      },
    },
    ext4027: {
      libraryKey: "ext4027",
      extId: 4027,
      extNameJa: "モロッサス",
      skillNameJa: "ドッグファイト",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 45, 55)}`, "INT\u3000-1（敵）"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 45, 55)} ダメージ（INT 45〜55%）`, "敵の INT を -1"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 45, 55);
        s.enemyInt = Math.max(1, s.enemyInt + (-1)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext4028: {
      libraryKey: "ext4028",
      extId: 4028,
      extNameJa: "エスパダ・ロペラ",
      skillNameJa: "黄金世紀の一閃",
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
    ext4029: {
      libraryKey: "ext4029",
      extId: 4029,
      extNameJa: "ドラグーン",
      skillNameJa: "荒野の一撃",
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
    ext4030: {
      libraryKey: "ext4030",
      extId: 4030,
      extNameJa: "幸若舞の盃",
      skillNameJa: "敦盛",
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
    ext4031: {
      libraryKey: "ext4031",
      extId: 4031,
      extNameJa: "大西部のブーツ",
      skillNameJa: "開拓者の一歩",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 30, 35), "AGI\u3000+1"]; },
      peekHelpKeys() { return ["hp", "agi"]; },
      previewLines(s) { return [`HP を回復係数 30〜35% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 30, 35)}）`, "AGI を +1"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 30, 35);
        s.playerAgi += 1;
      },
    },
    ext4032: {
      libraryKey: "ext4032",
      extId: 4032,
      extNameJa: "舞扇",
      skillNameJa: "棟梁の舞",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 30, 35)}`, "HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 10, 10), "INT\u3000+1"]; },
      peekHelpKeys() { return ["hp", "int"]; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 30, 35)} ダメージ（INT 30〜35%・1v1=単体）`, `HP を回復係数 10〜10% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 10, 10)}）`, "INT を +1"]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 30, 35);
        api.healPlayerFromIntSkill(s, 10, 10);
        s.playerInt += 1;
      },
    },
    ext4033: {
      libraryKey: "ext4033",
      extId: 4033,
      extNameJa: "クレイジーMCHメダル",
      skillNameJa: "クレイジーMaster Nobの御加護",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 5, 5), "PHY\u3000+1", "INT\u3000+1", "AGI\u3000+1"]; },
      peekHelpKeys() { return ["hp", "phy", "int", "agi"]; },
      previewLines(s) { return [`HP を回復係数 5〜5% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 5, 5)}）`, "PHY を +1", "INT を +1", "AGI を +1"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 5, 5);
        s.playerPhy += 1;
        s.playerInt += 1;
        s.playerAgi += 1;
      },
    },
    ext4034: {
      libraryKey: "ext4034",
      extId: 4034,
      extNameJa: "石槌",
      skillNameJa: "名工の一振り",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 55, 65)}`, "HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 5, 5), "PHY\u3000+2"]; },
      peekHelpKeys() { return ["hp", "phy"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 55, 65)} ダメージ（PHY 55〜65%）`, `HP を回復係数 5〜5% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 5, 5)}）`, "PHY を +2"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 55, 65);
        api.healPlayerFromIntSkill(s, 5, 5);
        s.playerPhy += 2;
      },
    },
    ext4035: {
      libraryKey: "ext4035",
      extId: 4035,
      extNameJa: "クロスボウ",
      skillNameJa: "アップルシューター",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 50, 60)}`, "HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 5, 5), "INT\u3000+2"]; },
      peekHelpKeys() { return ["hp", "int"]; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 50, 60)} ダメージ（INT 50〜60%）`, `HP を回復係数 5〜5% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 5, 5)}）`, "INT を +2"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 50, 60);
        api.healPlayerFromIntSkill(s, 5, 5);
        s.playerInt += 2;
      },
    },
    ext4036: {
      libraryKey: "ext4036",
      extId: 4036,
      extNameJa: "宝冠",
      skillNameJa: "奉神礼",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 45, 55), "AGI\u3000+2"]; },
      peekHelpKeys() { return ["hp", "agi"]; },
      previewLines(s) { return [`HP を回復係数 45〜55% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 45, 55)}）`, "AGI を +2"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 45, 55);
        s.playerAgi += 2;
      },
    },
    ext4037: {
      libraryKey: "ext4037",
      extId: 4037,
      extNameJa: "立行司の軍配",
      skillNameJa: "上覧相撲の奉仕",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 32, 37)}`, "PHY\u3000+1"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 32, 37)} ダメージ（PHY 32〜37%）`, "PHY を +1"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 32, 37);
        s.playerPhy += 1;
      },
    },
    ext4038: {
      libraryKey: "ext4038",
      extId: 4038,
      extNameJa: "水底の舵輪",
      skillNameJa: "クラーケン",
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
    ext4039: {
      libraryKey: "ext4039",
      extId: 4039,
      extNameJa: "スウィートキング",
      skillNameJa: "極上の甘み",
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
    ext4040: {
      libraryKey: "ext4040",
      extId: 4040,
      extNameJa: "ブッシュカン",
      skillNameJa: "仏の掌",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 50, 50)}`, "PHY\u3000-1（敵）"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 50, 50)} ダメージ（PHY 50〜50%）`, "敵の PHY を -1"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 50, 50);
        s.enemyPhy = Math.max(1, s.enemyPhy + (-1)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext4041: {
      libraryKey: "ext4041",
      extId: 4041,
      extNameJa: "カフィアライム",
      skillNameJa: "スクイーザー",
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
    ext4042: {
      libraryKey: "ext4042",
      extId: 4042,
      extNameJa: "エアログラファイト",
      skillNameJa: "ソノラ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 30, 50)}`, "毒 ×3（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 30, 50)} ダメージ（PHY 30〜50%）`, "敵に毒 ×3 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 30, 50);
        api.addPoisonToEnemy(s, 3);
      },
    },
    ext4043: {
      libraryKey: "ext4043",
      extId: 4043,
      extNameJa: "怒りの葡萄",
      skillNameJa: "ナパ・バレー",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 40, 50)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 40, 50)} ダメージ（INT 40〜50%・1v1=単体）`]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 40, 50);
      },
    },
    ext4044: {
      libraryKey: "ext4044",
      extId: 4044,
      extNameJa: "ホワイトセージ",
      skillNameJa: "スマッジング",
      skillIcon: "DBF_phy.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      effectSummaryLines() { return ["出血 ×3（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines() { return ["敵に出血 ×3 付与"]; },
      play(s) {
        api.addBleedToEnemy(s, 3);
      },
    },
    ext4045: {
      libraryKey: "ext4045",
      extId: 4045,
      extNameJa: "ハイブッシュ",
      skillNameJa: "アルカロイド",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 50, 50)}`, "毒 ×3（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 50, 50)} ダメージ（INT 50〜50%）`, "敵に毒 ×3 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 50, 50);
        api.addPoisonToEnemy(s, 3);
      },
    },
    ext4046: {
      libraryKey: "ext4046",
      extId: 4046,
      extNameJa: "ピジョンブラッド",
      skillNameJa: "オリジンミャンマー",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 30, 35)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 30, 35)} ダメージ（PHY 30〜35%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 30, 35);
      },
    },
    ext4047: {
      libraryKey: "ext4047",
      extId: 4047,
      extNameJa: "咸臨丸",
      skillNameJa: "榎本艦隊",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 0, 70)}`, `敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 0, 70)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 0, 70)} ダメージ（PHY 0〜70%）`, `敵1体に ${estIntHit(s.playerInt, s.enemyInt, 0, 70)} ダメージ（INT 0〜70%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 0, 70);
        api.dealIntSkillToEnemy(s, 0, 70);
      },
    },
    ext4048: {
      libraryKey: "ext4048",
      extId: 4048,
      extNameJa: "グルカナイフ",
      skillNameJa: "ククリ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 55, 65)}`, "PHY\u3000-1（敵）", "毒 ×3（敵）"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 55, 65)} ダメージ（PHY 55〜65%）`, "敵の PHY を -1", "敵に毒 ×3 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 55, 65);
        s.enemyPhy = Math.max(1, s.enemyPhy + (-1)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
        api.addPoisonToEnemy(s, 3);
      },
    },
    ext4049: {
      libraryKey: "ext4049",
      extId: 4049,
      extNameJa: "八咫烏",
      skillNameJa: "雑賀衆",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 50, 60)}`, "INT\u3000-1（敵）", "毒 ×3（敵）"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 50, 60)} ダメージ（INT 50〜60%）`, "敵の INT を -1", "敵に毒 ×3 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 50, 60);
        s.enemyInt = Math.max(1, s.enemyInt + (-1)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
        api.addPoisonToEnemy(s, 3);
      },
    },
    ext4050: {
      libraryKey: "ext4050",
      extId: 4050,
      extNameJa: "ロゼッタ・ストーン",
      skillNameJa: "ヒエログリフ",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 25, 35), "INT\u3000+1"]; },
      peekHelpKeys() { return ["hp", "int"]; },
      previewLines(s) { return [`HP を回復係数 25〜35% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 25, 35)}）`, "INT を +1"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 25, 35);
        s.playerInt += 1;
      },
    },
    ext4051: {
      libraryKey: "ext4051",
      extId: 4051,
      extNameJa: "カラミティウィップ",
      skillNameJa: "ワイルドウェストラッシング",
      skillIcon: "phy.png",
      cost: 2,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines() { return [`敵にダメージ ×2`, "AGI\u3000-1（敵）"]; },
      peekHelpKeys() { return ["agi"]; },
      previewLines() { return [`敵1体に PHY 22〜37% × 2 回ダメージ`, "敵の AGI を -1"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 22, 37);
        if (s.enemyHp > 0) api.dealPhySkillToEnemy(s, 22, 37);
        s.enemyAgi = Math.max(1, s.enemyAgi + (-1)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext4055: {
      libraryKey: "ext4055",
      extId: 4055,
      extNameJa: "とっておきのレアチーズケーキ",
      skillNameJa: "レアチーズケーキの恨みを受けよ！",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 25, 35)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 25, 35)} ダメージ（INT 25〜35%）`]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 25, 35);
      },
    },
    ext4056: {
      libraryKey: "ext4056",
      extId: 4056,
      extNameJa: "デスサイズ",
      skillNameJa: "死のアルカナ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 60, 70)}`, "INT\u3000-1（敵）"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 60, 70)} ダメージ（PHY 60〜70%）`, "敵の INT を -1"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 60, 70);
        s.enemyInt = Math.max(1, s.enemyInt + (-1)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext4057: {
      libraryKey: "ext4057",
      extId: 4057,
      extNameJa: "ジェーズル",
      skillNameJa: "聖体礼儀",
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
    ext4058: {
      libraryKey: "ext4058",
      extId: 4058,
      extNameJa: "神便鬼毒酒",
      skillNameJa: "鬼殺し",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 45, 55), "PHY\u3000-3（敵）", "AGI\u3000-3（敵）"]; },
      peekHelpKeys() { return ["hp", "phy", "agi"]; },
      previewLines(s) { return [`HP を回復係数 45〜55% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 45, 55)}）`, "敵の PHY を -3", "敵の AGI を -3"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 45, 55);
        s.enemyPhy = Math.max(1, s.enemyPhy + (-3)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
        s.enemyAgi = Math.max(1, s.enemyAgi + (-3)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext4059: {
      libraryKey: "ext4059",
      extId: 4059,
      extNameJa: "綸巾",
      skillNameJa: "勝は知る可くして為す可からず",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 5, 5), "INT\u3000+2"]; },
      peekHelpKeys() { return ["hp", "int"]; },
      previewLines(s) { return [`HP を回復係数 5〜5% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 5, 5)}）`, "INT を +2"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 5, 5);
        s.playerInt += 2;
      },
    },
    ext4060: {
      libraryKey: "ext4060",
      extId: 4060,
      extNameJa: "レオ",
      skillNameJa: "ジャングル大帝",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 55, 55)}`, "出血 ×3（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 55, 55)} ダメージ（PHY 55〜55%）`, "敵に出血 ×3 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 55, 55);
        api.addBleedToEnemy(s, 3);
      },
    },
    ext4061: {
      libraryKey: "ext4061",
      extId: 4061,
      extNameJa: "狩人のマント",
      skillNameJa: "草原のそよ風",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 60, 70), "PHY\u3000+1"]; },
      peekHelpKeys() { return ["hp", "phy"]; },
      previewLines(s) { return [`HP を回復係数 60〜70% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 60, 70)}）`, "PHY を +1"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 60, 70);
        s.playerPhy += 1;
      },
    },
    ext4063: {
      libraryKey: "ext4063",
      extId: 4063,
      extNameJa: "アルルカン",
      skillNameJa: "ワイルドカード",
      skillIcon: "BUF_agi.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines() { return ["AGI\u3000+1", "出血 ×3（敵）"]; },
      peekHelpKeys() { return ["agi"]; },
      previewLines() { return ["AGI を +1", "敵に出血 ×3 付与"]; },
      play(s) {
        s.playerAgi += 1;
        api.addBleedToEnemy(s, 3);
      },
    },
    ext4064: {
      libraryKey: "ext4064",
      extId: 4064,
      extNameJa: "コマンチェスピリット",
      skillNameJa: "狩人の恋唄",
      skillIcon: "DBF_phy.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      effectSummaryLines() { return ["毒 ×3（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines() { return ["敵に毒 ×3 付与"]; },
      play(s) {
        api.addPoisonToEnemy(s, 3);
      },
    },
    ext4065: {
      libraryKey: "ext4065",
      extId: 4065,
      extNameJa: "ダビデのリラ",
      skillNameJa: "神変浄化の音色",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 50, 60)}`, "出血 ×3（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 50, 60)} ダメージ（INT 50〜60%）`, "敵に出血 ×3 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 50, 60);
        api.addBleedToEnemy(s, 3);
      },
    },
    ext4066: {
      libraryKey: "ext4066",
      extId: 4066,
      extNameJa: "死者のマラカス",
      skillNameJa: "死者の日",
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
    ext4067: {
      libraryKey: "ext4067",
      extId: 4067,
      extNameJa: "ショファール",
      skillNameJa: "ローシュ・ハッシャーナー",
      skillIcon: "DBF_agi.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      effectSummaryLines() { return ["AGI\u3000-3（敵）"]; },
      peekHelpKeys() { return ["agi"]; },
      previewLines() { return ["敵の AGI を -3"]; },
      play(s) {
        s.enemyAgi = Math.max(1, s.enemyAgi + (-3)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext4068: {
      libraryKey: "ext4068",
      extId: 4068,
      extNameJa: "ジラフピアノ",
      skillNameJa: "交響曲第3番変ホ長調 英雄",
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
    ext4069: {
      libraryKey: "ext4069",
      extId: 4069,
      extNameJa: "イル・カノーネ",
      skillNameJa: "戦場のソリスト",
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
    ext4070: {
      libraryKey: "ext4070",
      extId: 4070,
      extNameJa: "馬頭二胡",
      skillNameJa: "義に背き恩を忘るれば、天人ともに戮すべし",
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
    ext4071: {
      libraryKey: "ext4071",
      extId: 4071,
      extNameJa: "ドレークの遺産",
      skillNameJa: "世界を駆けたドラムライン",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 22, 22)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 22〜22% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 22, 22)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 22, 22);
      },
    },
    ext4072: {
      libraryKey: "ext4072",
      extId: 4072,
      extNameJa: "バラナシのシタール",
      skillNameJa: "ノルウェーの森",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 50, 50)}`, "毒 ×3（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 50, 50)} ダメージ（PHY 50〜50%）`, "敵に毒 ×3 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 50, 50);
        api.addPoisonToEnemy(s, 3);
      },
    },
    ext4073: {
      libraryKey: "ext4073",
      extId: 4073,
      extNameJa: "大黒の小槌",
      skillNameJa: "現世と 夢路の境 うちくづし",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 50, 65)}`, "出血 ×3（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 50, 65)} ダメージ（PHY 50〜65%）`, "敵に出血 ×3 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 50, 65);
        api.addBleedToEnemy(s, 3);
      },
    },
    ext4074: {
      libraryKey: "ext4074",
      extId: 4074,
      extNameJa: "国崩し",
      skillNameJa: "砲尾装填式砲",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 50, 60)}`, "出血 ×3（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 50, 60)} ダメージ（INT 50〜60%）`, "敵に出血 ×3 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 50, 60);
        api.addBleedToEnemy(s, 3);
      },
    },
    ext4075: {
      libraryKey: "ext4075",
      extId: 4075,
      extNameJa: "ローネット",
      skillNameJa: "ロイヤルリザーブ",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 45, 55), "INT\u3000-3（敵）"]; },
      peekHelpKeys() { return ["hp", "int"]; },
      previewLines(s) { return [`HP を回復係数 45〜55% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 45, 55)}）`, "敵の INT を -3"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 45, 55);
        s.enemyInt = Math.max(1, s.enemyInt + (-3)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext4079: {
      libraryKey: "ext4079",
      extId: 4079,
      extNameJa: "オーガスタッフ",
      skillNameJa: "獄卒",
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
    ext4080: {
      libraryKey: "ext4080",
      extId: 4080,
      extNameJa: "流星のホーキ",
      skillNameJa: "シューティング・スター",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 30, 40)}`, "AGI\u3000+1"]; },
      peekHelpKeys() { return ["agi"]; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 30, 40)} ダメージ（INT 30〜40%・1v1=単体）`, "AGI を +1"]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 30, 40);
        s.playerAgi += 1;
      },
    },
    ext4081: {
      libraryKey: "ext4081",
      extId: 4081,
      extNameJa: "銀糸威当世小札",
      skillNameJa: "戦国甲冑",
      skillIcon: "BUF_phy.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines() { return ["PHY\u3000+2", "INT\u3000+2"]; },
      peekHelpKeys() { return ["phy", "int"]; },
      previewLines() { return ["PHY を +2", "INT を +2"]; },
      play(s) {
        s.playerPhy += 2;
        s.playerInt += 2;
      },
    },
    ext4082: {
      libraryKey: "ext4082",
      extId: 4082,
      extNameJa: "詠春八斬刀",
      skillNameJa: "短橋狭馬",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 50, 55)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 50, 55)} ダメージ（PHY 50〜55%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 50, 55);
      },
    },
    ext4083: {
      libraryKey: "ext4083",
      extId: 4083,
      extNameJa: "クレイジーMCSメダル",
      skillNameJa: "クレイジー神の御加護",
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
    ext4085: {
      libraryKey: "ext4085",
      extId: 4085,
      extNameJa: "アルティメットバイナンスチャリティメダル",
      skillNameJa: "アルティメットバイナンスチャリティの御加護",
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
    ext4086: {
      libraryKey: "ext4086",
      extId: 4086,
      extNameJa: "ノストセラス",
      skillNameJa: "アンモーンの角",
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
    ext4087: {
      libraryKey: "ext4087",
      extId: 4087,
      extNameJa: "プテラマキナ",
      skillNameJa: "はかいこうせん",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 90, 95)}`, "出血 ×3（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 90, 95)} ダメージ（PHY 90〜95%）`, "敵に出血 ×3 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 90, 95);
        api.addBleedToEnemy(s, 3);
      },
    },
    ext4088: {
      libraryKey: "ext4088",
      extId: 4088,
      extNameJa: "インペブレックス",
      skillNameJa: "インペリアル・オーラ",
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
    ext4089: {
      libraryKey: "ext4089",
      extId: 4089,
      extNameJa: "首長竜チャンプ",
      skillNameJa: "龍海嘯",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 16, 16)}`, "INT\u3000-1（敵）", "毒 ×3（敵）"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 16, 16)} ダメージ（PHY 16〜16%）`, "敵の INT を -1", "敵に毒 ×3 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 16, 16);
        s.enemyInt = Math.max(1, s.enemyInt + (-1)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
        api.addPoisonToEnemy(s, 3);
      },
    },
    ext4090: {
      libraryKey: "ext4090",
      extId: 4090,
      extNameJa: "チャリオット",
      skillNameJa: "衝角",
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
    ext4091: {
      libraryKey: "ext4091",
      extId: 4091,
      extNameJa: "ミュルグレス・スクアマ",
      skillNameJa: "グレイプフル デッド",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 45, 60)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 45〜60% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 45, 60)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 45, 60);
      },
    },
    ext4092: {
      libraryKey: "ext4092",
      extId: 4092,
      extNameJa: "草樹の守護",
      skillNameJa: "樹の種火",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 50, 50)}`, "毒 ×3（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 50, 50)} ダメージ（INT 50〜50%）`, "敵に毒 ×3 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 50, 50);
        api.addPoisonToEnemy(s, 3);
      },
    },
    ext4093: {
      libraryKey: "ext4093",
      extId: 4093,
      extNameJa: "スカルドメガロ",
      skillNameJa: "バミューダギャングスター",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 45, 45)}`, "AGI\u3000+2"]; },
      peekHelpKeys() { return ["agi"]; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 45, 45)} ダメージ（INT 45〜45%）`, "AGI を +2"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 45, 45);
        s.playerAgi += 2;
      },
    },
    ext4094: {
      libraryKey: "ext4094",
      extId: 4094,
      extNameJa: "ウロボロス・スタールビー",
      skillNameJa: "ルージュインパクト",
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
    ext4095: {
      libraryKey: "ext4095",
      extId: 4095,
      extNameJa: "義士の采配",
      skillNameJa: "金瘡治療の計",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 40, 40), "出血 ×3（敵）"]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 40〜40% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 40, 40)}）`, "敵に出血 ×3 付与"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 40, 40);
        api.addBleedToEnemy(s, 3);
      },
    },
    ext4096: {
      libraryKey: "ext4096",
      extId: 4096,
      extNameJa: "チャンピオンベルト",
      skillNameJa: "頂点の覇気",
      skillIcon: "DBF_int.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      effectSummaryLines() { return ["PHY\u3000-3（敵）", "INT\u3000-3（敵）"]; },
      peekHelpKeys() { return ["phy", "int"]; },
      previewLines() { return ["敵の PHY を -3", "敵の INT を -3"]; },
      play(s) {
        s.enemyPhy = Math.max(1, s.enemyPhy + (-3)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
        s.enemyInt = Math.max(1, s.enemyInt + (-3)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext4097: {
      libraryKey: "ext4097",
      extId: 4097,
      extNameJa: "悪夢の爪",
      skillNameJa: "冥界の門",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 55, 65)}`, "HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 27, 37), "毒 ×3（敵）"]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 55, 65)} ダメージ（PHY 55〜65%）`, `HP を回復係数 27〜37% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 27, 37)}）`, "敵に毒 ×3 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 55, 65);
        api.healPlayerFromIntSkill(s, 27, 37);
        api.addPoisonToEnemy(s, 3);
      },
    },
    ext4098: {
      libraryKey: "ext4098",
      extId: 4098,
      extNameJa: "カルデアの玉",
      skillNameJa: "月神の目",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 50, 60)}`, "HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 27, 37), "毒 ×3（敵）"]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 50, 60)} ダメージ（INT 50〜60%）`, `HP を回復係数 27〜37% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 27, 37)}）`, "敵に毒 ×3 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 50, 60);
        api.healPlayerFromIntSkill(s, 27, 37);
        api.addPoisonToEnemy(s, 3);
      },
    },
    ext4099: {
      libraryKey: "ext4099",
      extId: 4099,
      extNameJa: "鯰籠手",
      skillNameJa: "義経伝承",
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
    ext4100: {
      libraryKey: "ext4100",
      extId: 4100,
      extNameJa: "魔法剣・双極",
      skillNameJa: "紫電一閃",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 60, 65)}`, "PHY\u3000+6", "毒 ×3（敵）"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 60, 65)} ダメージ（PHY 60〜65%）`, "PHY を +6", "敵に毒 ×3 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 60, 65);
        s.playerPhy += 6;
        api.addPoisonToEnemy(s, 3);
      },
    },
    ext4101: {
      libraryKey: "ext4101",
      extId: 4101,
      extNameJa: "マモリ",
      skillNameJa: "エロ防具じゃないマモ！",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 5, 5)}`, "PHY\u3000+1", "INT\u3000+1", "毒 ×3（敵）"]; },
      peekHelpKeys() { return ["phy", "int"]; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 5, 5)} ダメージ（INT 5〜5%）`, "PHY を +1", "INT を +1", "敵に毒 ×3 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 5, 5);
        s.playerPhy += 1;
        s.playerInt += 1;
        api.addPoisonToEnemy(s, 3);
      },
    },
    ext4102: {
      libraryKey: "ext4102",
      extId: 4102,
      extNameJa: "MCHスカウター",
      skillNameJa: "戦闘力…たったの５か…",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 99, 99)}`, "PHY\u3000+1"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 99, 99)} ダメージ（PHY 99〜99%）`, "PHY を +1"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 99, 99);
        s.playerPhy += 1;
      },
    },
    ext4103: {
      libraryKey: "ext4103",
      extId: 4103,
      extNameJa: "召符　鳳凰炎来",
      skillNameJa: "業焔乱舞",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 99, 99)}`, "INT\u3000+1"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 99, 99)} ダメージ（INT 99〜99%）`, "INT を +1"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 99, 99);
        s.playerInt += 1;
      },
    },
    ext4104: {
      libraryKey: "ext4104",
      extId: 4104,
      extNameJa: "闇の筆パレ",
      skillNameJa: "認められざる個性の闇",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 25, 25)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 25, 25)} ダメージ（PHY 25〜25%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 25, 25);
      },
    },
    ext4105: {
      libraryKey: "ext4105",
      extId: 4105,
      extNameJa: "照魔鏡",
      skillNameJa: "やみうつし",
      skillIcon: "DBF_phy.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      effectSummaryLines() { return ["毒 ×3（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines() { return ["敵に毒 ×3 付与"]; },
      play(s) {
        api.addPoisonToEnemy(s, 3);
      },
    },
    ext4106: {
      libraryKey: "ext4106",
      extId: 4106,
      extNameJa: "モアイ艦長",
      skillNameJa: "極上！レーザー砲",
      skillIcon: "DBF_phy.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      effectSummaryLines() { return ["毒 ×3（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines() { return ["敵に毒 ×3 付与"]; },
      play(s) {
        api.addPoisonToEnemy(s, 3);
      },
    },
    ext4107: {
      libraryKey: "ext4107",
      extId: 4107,
      extNameJa: "アタナソフの頭足髑髏",
      skillNameJa: "スパミング クイーンニーナ",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 62, 62)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 62, 62)} ダメージ（INT 62〜62%）`]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 62, 62);
      },
    },
    ext4108: {
      libraryKey: "ext4108",
      extId: 4108,
      extNameJa: "聖域の守護者",
      skillNameJa: "静寂の雷撃",
      skillIcon: "DBF_phy.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      effectSummaryLines() { return ["PHY\u3000-3（敵）"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines() { return ["敵の PHY を -3"]; },
      play(s) {
        s.enemyPhy = Math.max(1, s.enemyPhy + (-3)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext4109: {
      libraryKey: "ext4109",
      extId: 4109,
      extNameJa: "呪詛の髑髏",
      skillNameJa: "レブルグラッジ",
      skillIcon: "DBF_phy.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      effectSummaryLines() { return ["出血 ×3（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines() { return ["敵に出血 ×3 付与"]; },
      play(s) {
        api.addBleedToEnemy(s, 3);
      },
    },
    ext4110: {
      libraryKey: "ext4110",
      extId: 4110,
      extNameJa: "煉獄の聖城に棲む妖精のリボン",
      skillNameJa: "煉獄の妖精の聖紫のノイズ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 56, 56)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 56, 56)} ダメージ（PHY 56〜56%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 56, 56);
      },
    },
    ext4111: {
      libraryKey: "ext4111",
      extId: 4111,
      extNameJa: "白兎の魔法時計",
      skillNameJa: "不思議への誘い",
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
    ext4112: {
      libraryKey: "ext4112",
      extId: 4112,
      extNameJa: "蝶の魔王",
      skillNameJa: "闇の光",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 65, 70)}`, "INT\u3000+1"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 65, 70)} ダメージ（INT 65〜70%）`, "INT を +1"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 65, 70);
        s.playerInt += 1;
      },
    },
    ext4113: {
      libraryKey: "ext4113",
      extId: 4113,
      extNameJa: "アドミラルパロット",
      skillNameJa: "空と海に響く号令",
      skillIcon: "BUF_agi.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines() { return ["AGI\u3000+6", "毒 ×3（敵）"]; },
      peekHelpKeys() { return ["agi"]; },
      previewLines() { return ["AGI を +6", "敵に毒 ×3 付与"]; },
      play(s) {
        s.playerAgi += 6;
        api.addPoisonToEnemy(s, 3);
      },
    },
    ext4114: {
      libraryKey: "ext4114",
      extId: 4114,
      extNameJa: "南葛SCのエンブレム",
      skillNameJa: "南葛の守護神",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 60, 70)}`, "PHY\u3000+1"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 60, 70)} ダメージ（PHY 60〜70%）`, "PHY を +1"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 60, 70);
        s.playerPhy += 1;
      },
    },
    ext4115: {
      libraryKey: "ext4115",
      extId: 4115,
      extNameJa: "MZ-Phantom",
      skillNameJa: "#教えてBCG",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 65, 65)}`, "毒 ×3（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 65, 65)} ダメージ（INT 65〜65%）`, "敵に毒 ×3 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 65, 65);
        api.addPoisonToEnemy(s, 3);
      },
    },
    ext4116: {
      libraryKey: "ext4116",
      extId: 4116,
      extNameJa: "帝国式魔導機甲兵 近衛機インペリアルガード",
      skillNameJa: "零式殲滅弾 ［知られざる者］",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 32, 32)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 32, 32)} ダメージ（PHY 32〜32%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 32, 32);
      },
    },
    ext4117: {
      libraryKey: "ext4117",
      extId: 4117,
      extNameJa: "紅翼の騎龍",
      skillNameJa: "その角、その翼、怒りに染まりて",
      skillIcon: "phy.png",
      cost: 2,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 107, 107)}`, "INT\u3000-4（敵）"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 107, 107)} ダメージ（PHY 107〜107%）`, "敵の INT を -4"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 107, 107);
        s.enemyInt = Math.max(1, s.enemyInt + (-4)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext4118: {
      libraryKey: "ext4118",
      extId: 4118,
      extNameJa: "真夜中の観覧車",
      skillNameJa: "窓になにかが張り付いている",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 37, 37)}`, "INT\u3000-5（敵）"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 37, 37)} ダメージ（PHY 37〜37%）`, "敵の INT を -5"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 37, 37);
        s.enemyInt = Math.max(1, s.enemyInt + (-5)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext4119: {
      libraryKey: "ext4119",
      extId: 4119,
      extNameJa: "完全体超級大熊猫",
      skillNameJa: "笹食ってる場合じゃねぇ！！",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 17, 17)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 17〜17% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 17, 17)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 17, 17);
      },
    },
    ext4120: {
      libraryKey: "ext4120",
      extId: 4120,
      extNameJa: "紫雲の天馬",
      skillNameJa: "妖馬飛翔",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 57, 57)}`, "毒 ×3（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 57, 57)} ダメージ（INT 57〜57%・1v1=単体）`, "敵に毒 ×3 付与"]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 57, 57);
        api.addPoisonToEnemy(s, 3);
      },
    },
    ext4121: {
      libraryKey: "ext4121",
      extId: 4121,
      extNameJa: "草コイン回収船",
      skillNameJa: "0x0f77121166D977bf0ddd6445E8844d844087dc99",
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
    ext4122: {
      libraryKey: "ext4122",
      extId: 4122,
      extNameJa: "シャークサブマリン",
      skillNameJa: "アオリイカダ",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 55, 55), "出血 ×3（敵）"]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 55〜55% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 55, 55)}）`, "敵に出血 ×3 付与"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 55, 55);
        api.addBleedToEnemy(s, 3);
      },
    },
    ext4123: {
      libraryKey: "ext4123",
      extId: 4123,
      extNameJa: "世界の片翼と呼ばれた空の国の魔導兵器バ・ビ・ディ・オン・ファティオス",
      skillNameJa: "天空から零れ落ちる七色の魔導の雷",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 61, 61)}`, "出血 ×3（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 61, 61)} ダメージ（PHY 61〜61%）`, "敵に出血 ×3 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 61, 61);
        api.addBleedToEnemy(s, 3);
      },
    },
    ext4124: {
      libraryKey: "ext4124",
      extId: 4124,
      extNameJa: "火車剣",
      skillNameJa: "火遁・火車打剣",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 45, 55)}`, "AGI\u3000-4（敵）"]; },
      peekHelpKeys() { return ["agi"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 45, 55)} ダメージ（PHY 45〜55%）`, "敵の AGI を -4"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 45, 55);
        s.enemyAgi = Math.max(1, s.enemyAgi + (-4)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext4125: {
      libraryKey: "ext4125",
      extId: 4125,
      extNameJa: "銀艶女王マダム・ケロリーヌ",
      skillNameJa: "銀艶親衛隊",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 30, 35)}`, "PHY\u3000+2"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 30, 35)} ダメージ（PHY 30〜35%）`, "PHY を +2"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 30, 35);
        s.playerPhy += 2;
      },
    },
    ext4126: {
      libraryKey: "ext4126",
      extId: 4126,
      extNameJa: "慈愛の氷雪王妃クイーンスノー&ベビー",
      skillNameJa: "慈愛の雪崩",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 30, 35)}`, "INT\u3000+2"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 30, 35)} ダメージ（INT 30〜35%・1v1=単体）`, "INT を +2"]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 30, 35);
        s.playerInt += 2;
      },
    },
    ext4127: {
      libraryKey: "ext4127",
      extId: 4127,
      extNameJa: "花嫁人形",
      skillNameJa: "赤い鹿の子の千代紙衣装",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 55, 55)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 55〜55% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 55, 55)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 55, 55);
      },
    },
    ext4128: {
      libraryKey: "ext4128",
      extId: 4128,
      extNameJa: "SDNメダル[E]",
      skillNameJa: "Epic Stake POWER!",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 40, 40)}`, `敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 40, 40)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 40, 40)} ダメージ（PHY 40〜40%）`, `敵1体に ${estIntHit(s.playerInt, s.enemyInt, 40, 40)} ダメージ（INT 40〜40%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 40, 40);
        api.dealIntSkillToEnemy(s, 40, 40);
      },
    },
    ext4129: {
      libraryKey: "ext4129",
      extId: 4129,
      extNameJa: "ベリーベリーパンケーキ",
      skillNameJa: "酸味と甘味の絶妙なハーモニー",
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
    ext4130: {
      libraryKey: "ext4130",
      extId: 4130,
      extNameJa: "レーザーブラスター",
      skillNameJa: "連射レーザー",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 55, 55)}`, "PHY\u3000+6", "出血 ×3（敵）"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 55, 55)} ダメージ（INT 55〜55%）`, "PHY を +6", "敵に出血 ×3 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 55, 55);
        s.playerPhy += 6;
        api.addBleedToEnemy(s, 3);
      },
    },
    ext4131: {
      libraryKey: "ext4131",
      extId: 4131,
      extNameJa: "バッタ野武士",
      skillNameJa: "不撓不屈",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 16, 16)}`, "毒 ×3（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 16, 16)} ダメージ（INT 16〜16%・1v1=単体）`, "敵に毒 ×3 付与"]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 16, 16);
        api.addPoisonToEnemy(s, 3);
      },
    },
    ext4132: {
      libraryKey: "ext4132",
      extId: 4132,
      extNameJa: "ゴールデンリミュラス",
      skillNameJa: "シルルの光",
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
    ext4133: {
      libraryKey: "ext4133",
      extId: 4133,
      extNameJa: "魔薬キラーモス",
      skillNameJa: "ココロ、カラダ、みなぎる！！",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 17, 17), "INT\u3000+1"]; },
      peekHelpKeys() { return ["hp", "int"]; },
      previewLines(s) { return [`HP を回復係数 17〜17% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 17, 17)}）`, "INT を +1"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 17, 17);
        s.playerInt += 1;
      },
    },
    ext4134: {
      libraryKey: "ext4134",
      extId: 4134,
      extNameJa: "デスストーカー",
      skillNameJa: "死神の針",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 53, 53)}`, "毒 ×3（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 53, 53)} ダメージ（PHY 53〜53%）`, "敵に毒 ×3 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 53, 53);
        api.addPoisonToEnemy(s, 3);
      },
    },
    ext4135: {
      libraryKey: "ext4135",
      extId: 4135,
      extNameJa: "洗脳象蟲（せんのうぞうむし）ナルキッゾウス",
      skillNameJa: "囚われた心",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 68, 68)}`, "AGI\u3000+1"]; },
      peekHelpKeys() { return ["agi"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 68, 68)} ダメージ（PHY 68〜68%）`, "AGI を +1"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 68, 68);
        s.playerAgi += 1;
      },
    },
    ext4136: {
      libraryKey: "ext4136",
      extId: 4136,
      extNameJa: "クイーンアネイラ",
      skillNameJa: "ネッソスの血",
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
    ext4137: {
      libraryKey: "ext4137",
      extId: 4137,
      extNameJa: "キラービー",
      skillNameJa: "恐怖指数99",
      skillIcon: "BUF_agi.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines() { return ["AGI\u3000+1", "毒 ×3（敵）"]; },
      peekHelpKeys() { return ["agi"]; },
      previewLines() { return ["AGI を +1", "敵に毒 ×3 付与"]; },
      play(s) {
        s.playerAgi += 1;
        api.addPoisonToEnemy(s, 3);
      },
    },
    ext4138: {
      libraryKey: "ext4138",
      extId: 4138,
      extNameJa: "Duke",
      skillNameJa: "To serve and please",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 100, 100), "PHY\u3000+1"]; },
      peekHelpKeys() { return ["hp", "phy"]; },
      previewLines(s) { return [`HP を回復係数 100〜100% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 100, 100)}）`, "PHY を +1"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 100, 100);
        s.playerPhy += 1;
      },
    },
    ext4139: {
      libraryKey: "ext4139",
      extId: 4139,
      extNameJa: "深淵艶紫",
      skillNameJa: "天害蠱毒",
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
    ext4140: {
      libraryKey: "ext4140",
      extId: 4140,
      extNameJa: "太陽のオリフラム",
      skillNameJa: "黄金の炎",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 60, 65), "INT\u3000+6"]; },
      peekHelpKeys() { return ["hp", "int"]; },
      previewLines(s) { return [`HP を回復係数 60〜65% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 60, 65)}）`, "INT を +6"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 60, 65);
        s.playerInt += 6;
      },
    },
    ext4141: {
      libraryKey: "ext4141",
      extId: 4141,
      extNameJa: "武将陣羽織",
      skillNameJa: "戦の矜持",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 55, 80)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 55, 80)} ダメージ（PHY 55〜80%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 55, 80);
      },
    },
    ext4142: {
      libraryKey: "ext4142",
      extId: 4142,
      extNameJa: "華やか二段重箱",
      skillNameJa: "春ルンルン",
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
    ext4143: {
      libraryKey: "ext4143",
      extId: 4143,
      extNameJa: "古代機工三球儀",
      skillNameJa: "日月星辰",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 25, 50)}`, "毒 ×3（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 25, 50)} ダメージ（INT 25〜50%）`, "敵に毒 ×3 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 25, 50);
        api.addPoisonToEnemy(s, 3);
      },
    },
    ext4145: {
      libraryKey: "ext4145",
      extId: 4145,
      extNameJa: "余市町赤ワイン",
      skillNameJa: "ヴィニュロン",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 55, 55)}`, "毒 ×3（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 55, 55)} ダメージ（INT 55〜55%）`, "敵に毒 ×3 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 55, 55);
        api.addPoisonToEnemy(s, 3);
      },
    },
    ext4146: {
      libraryKey: "ext4146",
      extId: 4146,
      extNameJa: "余市町白ワイン",
      skillNameJa: "雪の布団",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 60, 60), "毒 ×3（敵）"]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 60〜60% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 60, 60)}）`, "敵に毒 ×3 付与"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 60, 60);
        api.addPoisonToEnemy(s, 3);
      },
    },
    ext4147: {
      libraryKey: "ext4147",
      extId: 4147,
      extNameJa: "天津神の石碑",
      skillNameJa: "高天原のとばり",
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
    ext4148: {
      libraryKey: "ext4148",
      extId: 4148,
      extNameJa: "RYUOU.phy",
      skillNameJa: "RYUアサルト",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 35, 35)}`, "毒 ×3（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 35, 35)} ダメージ（PHY 35〜35%）`, "敵に毒 ×3 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 35, 35);
        api.addPoisonToEnemy(s, 3);
      },
    },
    ext4149: {
      libraryKey: "ext4149",
      extId: 4149,
      extNameJa: "RYUOU.int",
      skillNameJa: "RYUプロミネンス",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 35, 35)}`, "毒 ×3（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 35, 35)} ダメージ（INT 35〜35%・1v1=単体）`, "敵に毒 ×3 付与"]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 35, 35);
        api.addPoisonToEnemy(s, 3);
      },
    },
    ext4150: {
      libraryKey: "ext4150",
      extId: 4150,
      extNameJa: "魔界の扉",
      skillNameJa: "深淵の燈",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 18, 18)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 18, 18)} ダメージ（INT 18〜18%・1v1=単体）`]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 18, 18);
      },
    },
    ext4151: {
      libraryKey: "ext4151",
      extId: 4151,
      extNameJa: "ダブルにゃんバーガー",
      skillNameJa: "二倍楽しむ、猫型バーガー！",
      skillIcon: "DBF_phy.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      effectSummaryLines() { return ["毒 ×3（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines() { return ["敵に毒 ×3 付与"]; },
      play(s) {
        api.addPoisonToEnemy(s, 3);
      },
    },
    ext4152: {
      libraryKey: "ext4152",
      extId: 4152,
      extNameJa: "帝国式機鋼戦棍",
      skillNameJa: "迫り立つ処断の唸り",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 60, 70)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 60, 70)} ダメージ（PHY 60〜70%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 60, 70);
      },
    },
    ext4153: {
      libraryKey: "ext4153",
      extId: 4153,
      extNameJa: "自律型パンジャンドラム",
      skillNameJa: "ノトーリアス・ウェポン",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 60, 70)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 60, 70)} ダメージ（INT 60〜70%・1v1=単体）`]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 60, 70);
      },
    },
    ext4154: {
      libraryKey: "ext4154",
      extId: 4154,
      extNameJa: "デカ盛りもやしラーメン",
      skillNameJa: "分け入っても分け入っても白い山",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 26, 36), "AGI\u3000+4"]; },
      peekHelpKeys() { return ["hp", "agi"]; },
      previewLines(s) { return [`HP を回復係数 26〜36% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 26, 36)}）`, "AGI を +4"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 26, 36);
        s.playerAgi += 4;
      },
    },
    ext4155: {
      libraryKey: "ext4155",
      extId: 4155,
      extNameJa: "スワンクイーン",
      skillNameJa: "水紋の女帝",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 50, 60)}`, "PHY\u3000-5（敵）", "出血 ×3（敵）"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 50, 60)} ダメージ（PHY 50〜60%）`, "敵の PHY を -5", "敵に出血 ×3 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 50, 60);
        s.enemyPhy = Math.max(1, s.enemyPhy + (-5)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
        api.addBleedToEnemy(s, 3);
      },
    },
    ext4156: {
      libraryKey: "ext4156",
      extId: 4156,
      extNameJa: "終末の羅針盤",
      skillNameJa: "終焉を告げる針",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 50, 60)}`, "INT\u3000-5（敵）", "出血 ×3（敵）"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 50, 60)} ダメージ（INT 50〜60%）`, "敵の INT を -5", "敵に出血 ×3 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 50, 60);
        s.enemyInt = Math.max(1, s.enemyInt + (-5)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
        api.addBleedToEnemy(s, 3);
      },
    },
    ext4157: {
      libraryKey: "ext4157",
      extId: 4157,
      extNameJa: "七つの海寿司",
      skillNameJa: "特盛・海の幸",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 130, 135)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 130〜135% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 130, 135)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 130, 135);
      },
    },
    ext4158: {
      libraryKey: "ext4158",
      extId: 4158,
      extNameJa: "コキュートススタッフ",
      skillNameJa: "マジックトランスフューザー",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 65, 70)}`, "INT\u3000+6"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 65, 70)} ダメージ（INT 65〜70%）`, "INT を +6"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 65, 70);
        s.playerInt += 6;
      },
    },
    ext4159: {
      libraryKey: "ext4159",
      extId: 4159,
      extNameJa: "帝国式林檎型電脳心臓 APC1984",
      skillNameJa: "ハード・ハート",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 55, 60)}`, "INT\u3000+6", "毒 ×3（敵）"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 55, 60)} ダメージ（PHY 55〜60%）`, "INT を +6", "敵に毒 ×3 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 55, 60);
        s.playerInt += 6;
        api.addPoisonToEnemy(s, 3);
      },
    },
    ext4160: {
      libraryKey: "ext4160",
      extId: 4160,
      extNameJa: "月明かりのハンギングアクアリウム",
      skillNameJa: "月影の波動",
      skillIcon: "DBF_phy.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      effectSummaryLines() { return ["毒 ×3（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines() { return ["敵に毒 ×3 付与"]; },
      play(s) {
        api.addPoisonToEnemy(s, 3);
      },
    },
    ext4161: {
      libraryKey: "ext4161",
      extId: 4161,
      extNameJa: "ステュクス",
      skillNameJa: "冥界の大河",
      skillIcon: "BUF_phy.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines() { return ["PHY\u3000+6", "INT\u3000+6"]; },
      peekHelpKeys() { return ["phy", "int"]; },
      previewLines() { return ["PHY を +6", "INT を +6"]; },
      play(s) {
        s.playerPhy += 6;
        s.playerInt += 6;
      },
    },
    ext4162: {
      libraryKey: "ext4162",
      extId: 4162,
      extNameJa: "マンドラゴラ賢者",
      skillNameJa: "呪術の叡智",
      skillIcon: "DBF_agi.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      effectSummaryLines() { return ["AGI\u3000-5（敵）", "毒 ×3（敵）"]; },
      peekHelpKeys() { return ["agi"]; },
      previewLines() { return ["敵の AGI を -5", "敵に毒 ×3 付与"]; },
      play(s) {
        s.enemyAgi = Math.max(1, s.enemyAgi + (-5)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
        api.addPoisonToEnemy(s, 3);
      },
    },
    ext4163: {
      libraryKey: "ext4163",
      extId: 4163,
      extNameJa: "エント盆栽",
      skillNameJa: "エントの庭園",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 13, 17), "PHY\u3000+3", "INT\u3000+3"]; },
      peekHelpKeys() { return ["hp", "phy", "int"]; },
      previewLines(s) { return [`HP を回復係数 13〜17% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 13, 17)}）`, "PHY を +3", "INT を +3"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 13, 17);
        s.playerPhy += 3;
        s.playerInt += 3;
      },
    },
    ext4164: {
      libraryKey: "ext4164",
      extId: 4164,
      extNameJa: "宝石獣のメリケンサック",
      skillNameJa: "虹彩獣影",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 65, 75)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 65, 75)} ダメージ（PHY 65〜75%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 65, 75);
      },
    },
    ext4165: {
      libraryKey: "ext4165",
      extId: 4165,
      extNameJa: "ハープを弾く貴婦人",
      skillNameJa: "リーガルハープ・ラプソディ",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 65, 75)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 65, 75)} ダメージ（INT 65〜75%）`]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 65, 75);
      },
    },
    ext4166: {
      libraryKey: "ext4166",
      extId: 4166,
      extNameJa: "レーヴァテイン[PK Alterna]",
      skillNameJa: "大切な仲間だし！",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 40, 45)}`, "PHY\u3000+3"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 40, 45)} ダメージ（PHY 40〜45%）`, "PHY を +3"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 40, 45);
        s.playerPhy += 3;
      },
    },
    ext4167: {
      libraryKey: "ext4167",
      extId: 4167,
      extNameJa: "アルマス[PK Alterna]",
      skillNameJa: "絶対解放戦線",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 25, 35)}`, `敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 25, 35)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 25, 35)} ダメージ（PHY 25〜35%）`, `敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 25, 35)} ダメージ（INT 25〜35%・1v1=単体）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 25, 35);
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 25, 35);
      },
    },
    ext4168: {
      libraryKey: "ext4168",
      extId: 4168,
      extNameJa: "フェイルノート[PK Alterna]",
      skillNameJa: "誓約されし明星の魔弓",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 25, 40)}`, "INT\u3000+2"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 25, 40)} ダメージ（INT 25〜40%・1v1=単体）`, "INT を +2"]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 25, 40);
        s.playerInt += 2;
      },
    },
    ext4169: {
      libraryKey: "ext4169",
      extId: 4169,
      extNameJa: "シーサーペントの尾ビレ標本",
      skillNameJa: "深海の渦潮思念",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 30, 35)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 30, 35)} ダメージ（INT 30〜35%・1v1=単体）`]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 30, 35);
      },
    },
    ext4170: {
      libraryKey: "ext4170",
      extId: 4170,
      extNameJa: "マッサージチェア",
      skillNameJa: "心もくつろげる",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 105, 125), "PHY\u3000+2", "出血 ×3（敵）"]; },
      peekHelpKeys() { return ["hp", "phy"]; },
      previewLines(s) { return [`HP を回復係数 105〜125% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 105, 125)}）`, "PHY を +2", "敵に出血 ×3 付与"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 105, 125);
        s.playerPhy += 2;
        api.addBleedToEnemy(s, 3);
      },
    },
    ext4171: {
      libraryKey: "ext4171",
      extId: 4171,
      extNameJa: "ワイヤーカッター",
      skillNameJa: "シンクロニティ・スニップ",
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
    ext4172: {
      libraryKey: "ext4172",
      extId: 4172,
      extNameJa: "ワニ革財布",
      skillNameJa: "みかじめ料",
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
    ext4173: {
      libraryKey: "ext4173",
      extId: 4173,
      extNameJa: "黒蜘蛛のタリスマン",
      skillNameJa: "幻影蜘蛛",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 30, 30)}`, "出血 ×3（敵）", "毒 ×3（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 30, 30)} ダメージ（INT 30〜30%）`, "敵に出血 ×3 付与", "敵に毒 ×3 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 30, 30);
        api.addBleedToEnemy(s, 3);
        api.addPoisonToEnemy(s, 3);
      },
    },
    ext4174: {
      libraryKey: "ext4174",
      extId: 4174,
      extNameJa: "ムーンライトセット",
      skillNameJa: "ルナー・レストレーション",
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
    ext4175: {
      libraryKey: "ext4175",
      extId: 4175,
      extNameJa: "魔獣の大角",
      skillNameJa: "魔獣の妖気",
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
    ext4176: {
      libraryKey: "ext4176",
      extId: 4176,
      extNameJa: "王族のいちごタルト",
      skillNameJa: "高貴なる甘味",
      skillIcon: "DBF_phy.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      effectSummaryLines() { return ["毒 ×3（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines() { return ["敵に毒 ×3 付与"]; },
      play(s) {
        api.addPoisonToEnemy(s, 3);
      },
    },
    ext4177: {
      libraryKey: "ext4177",
      extId: 4177,
      extNameJa: "ゴーレムナイト",
      skillNameJa: "グラナイト・チャージ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 40, 45)}`, "PHY\u3000+1"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 40, 45)} ダメージ（PHY 40〜45%）`, "PHY を +1"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 40, 45);
        s.playerPhy += 1;
      },
    },
    ext4178: {
      libraryKey: "ext4178",
      extId: 4178,
      extNameJa: "マジックカード：闇",
      skillNameJa: "呪詠・漆黒",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 40, 45)}`, "INT\u3000+1"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 40, 45)} ダメージ（INT 40〜45%）`, "INT を +1"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 40, 45);
        s.playerInt += 1;
      },
    },
    ext4179: {
      libraryKey: "ext4179",
      extId: 4179,
      extNameJa: "地雷",
      skillNameJa: "伏爆の罠",
      skillIcon: "DBF_int.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      effectSummaryLines() { return ["INT\u3000-4（敵）", "AGI\u3000-4（敵）", "出血 ×3（敵）"]; },
      peekHelpKeys() { return ["int", "agi"]; },
      previewLines() { return ["敵の INT を -4", "敵の AGI を -4", "敵に出血 ×3 付与"]; },
      play(s) {
        s.enemyInt = Math.max(1, s.enemyInt + (-4)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
        s.enemyAgi = Math.max(1, s.enemyAgi + (-4)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
        api.addBleedToEnemy(s, 3);
      },
    },
    ext4180: {
      libraryKey: "ext4180",
      extId: 4180,
      extNameJa: "長毛猫&釣り竿じゃらし",
      skillNameJa: "ふゎしねぃしょん",
      skillIcon: "DBF_agi.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      effectSummaryLines() { return ["PHY\u3000-4（敵）", "AGI\u3000-4（敵）", "毒 ×3（敵）"]; },
      peekHelpKeys() { return ["phy", "agi"]; },
      previewLines() { return ["敵の PHY を -4", "敵の AGI を -4", "敵に毒 ×3 付与"]; },
      play(s) {
        s.enemyPhy = Math.max(1, s.enemyPhy + (-4)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
        s.enemyAgi = Math.max(1, s.enemyAgi + (-4)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
        api.addPoisonToEnemy(s, 3);
      },
    },
    ext4181: {
      libraryKey: "ext4181",
      extId: 4181,
      extNameJa: "デモンズボード",
      skillNameJa: "アビサル・アトラクション",
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
    ext4182: {
      libraryKey: "ext4182",
      extId: 4182,
      extNameJa: "お屋敷",
      skillNameJa: "可憐で雄大な邸園",
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
    ext4183: {
      libraryKey: "ext4183",
      extId: 4183,
      extNameJa: "血濡れの鎖鎌",
      skillNameJa: "ブラッディスナッチ",
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
    ext4184: {
      libraryKey: "ext4184",
      extId: 4184,
      extNameJa: "光合成オオスカシバ",
      skillNameJa: "光葉幻翅",
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
    ext4185: {
      libraryKey: "ext4185",
      extId: 4185,
      extNameJa: "ブラックオパールワームドラゴン",
      skillNameJa: "ムシュマフフ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 50, 50)}`, "PHY\u3000+3", "AGI\u3000-5（敵）"]; },
      peekHelpKeys() { return ["phy", "agi"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 50, 50)} ダメージ（PHY 50〜50%）`, "PHY を +3", "敵の AGI を -5"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 50, 50);
        s.playerPhy += 3;
        s.enemyAgi = Math.max(1, s.enemyAgi + (-5)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext4186: {
      libraryKey: "ext4186",
      extId: 4186,
      extNameJa: "オウルモンキー",
      skillNameJa: "ニュクストリクス・シミウス",
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
    ext4187: {
      libraryKey: "ext4187",
      extId: 4187,
      extNameJa: "帝国式機工投擲槍ゲイボルグ",
      skillNameJa: "インペリアル・インペイル",
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
    ext4188: {
      libraryKey: "ext4188",
      extId: 4188,
      extNameJa: "帝国式機工回旋鏢",
      skillNameJa: "機工旋刃",
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
    ext4189: {
      libraryKey: "ext4189",
      extId: 4189,
      extNameJa: "ルビードラゴン",
      skillNameJa: "スカーレットバースト",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 30, 30)}`, `敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 30, 30)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 30, 30)} ダメージ（PHY 30〜30%）`, `敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 30, 30)} ダメージ（INT 30〜30%・1v1=単体）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 30, 30);
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 30, 30);
      },
    },
    ext4190: {
      libraryKey: "ext4190",
      extId: 4190,
      extNameJa: "貴族の日傘",
      skillNameJa: "ロイヤルレインヴェール",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 35, 35)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 35〜35% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 35, 35)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 35, 35);
      },
    },
    ext4191: {
      libraryKey: "ext4191",
      extId: 4191,
      extNameJa: "聖域の霊果",
      skillNameJa: "白露",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 50, 55)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 50, 55)} ダメージ（PHY 50〜55%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 50, 55);
      },
    },
    ext4192: {
      libraryKey: "ext4192",
      extId: 4192,
      extNameJa: "帝国式機光戦輪ウロボロス",
      skillNameJa: "無限の循環",
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
    ext4193: {
      libraryKey: "ext4193",
      extId: 4193,
      extNameJa: "ニュクスのボンネット",
      skillNameJa: "ダスクミティゲーション",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 60, 70), "INT\u3000+1"]; },
      peekHelpKeys() { return ["hp", "int"]; },
      previewLines(s) { return [`HP を回復係数 60〜70% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 60, 70)}）`, "INT を +1"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 60, 70);
        s.playerInt += 1;
      },
    },
    ext4194: {
      libraryKey: "ext4194",
      extId: 4194,
      extNameJa: "デスペラードレオ",
      skillNameJa: "デスペラードハウル",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 45, 55)}`, "毒 ×3（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 45, 55)} ダメージ（PHY 45〜55%）`, "敵に毒 ×3 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 45, 55);
        api.addPoisonToEnemy(s, 3);
      },
    },
    ext4600: {
      libraryKey: "ext4600",
      extId: 4600,
      extNameJa: "ぴっぴ教 一攫千金壺",
      skillNameJa: "すくわ〜る",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 60, 65)}`, "PHY\u3000+6", "毒 ×3（敵）"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 60, 65)} ダメージ（PHY 60〜65%）`, "PHY を +6", "敵に毒 ×3 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 60, 65);
        s.playerPhy += 6;
        api.addPoisonToEnemy(s, 3);
      },
    },
    ext4640: {
      libraryKey: "ext4640",
      extId: 4640,
      extNameJa: "霊剣トンナルシャーペ",
      skillNameJa: "タンマ！タンマ！",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 60, 65), "INT\u3000+6"]; },
      peekHelpKeys() { return ["hp", "int"]; },
      previewLines(s) { return [`HP を回復係数 60〜65% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 60, 65)}）`, "INT を +6"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 60, 65);
        s.playerInt += 6;
      },
    },
    ext4647: {
      libraryKey: "ext4647",
      extId: 4647,
      extNameJa: "AC-130 ガンシップ",
      skillNameJa: "エンジェルフレア",
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
    ext4651: {
      libraryKey: "ext4651",
      extId: 4651,
      extNameJa: "女王蟹",
      skillNameJa: "女王の威厳",
      skillIcon: "DBF_phy.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      effectSummaryLines() { return ["毒 ×3（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines() { return ["敵に毒 ×3 付与"]; },
      play(s) {
        api.addPoisonToEnemy(s, 3);
      },
    },
    ext4674: {
      libraryKey: "ext4674",
      extId: 4674,
      extNameJa: "ぴっぴ教 開運招福尊師像",
      skillNameJa: "１億円ぽぴぃ（毎月）",
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
// ─── auto-generated Legendary extensions (178 cards、ext>=5501 LL ext は除外) ───
    ext5001: {
      libraryKey: "ext5001",
      extId: 5001,
      extNameJa: "MCHブレード",
      skillNameJa: "英雄の一撃",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 70, 80)}`, "PHY\u3000+1"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 70, 80)} ダメージ（PHY 70〜80%）`, "PHY を +1"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 70, 80);
        s.playerPhy += 1;
      },
    },
    ext5002: {
      libraryKey: "ext5002",
      extId: 5002,
      extNameJa: "グランダルメ",
      skillNameJa: "グランダルメ一斉射撃",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 45, 50)}`, "INT\u3000+1"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 45, 50)} ダメージ（INT 45〜50%・1v1=単体）`, "INT を +1"]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 45, 50);
        s.playerInt += 1;
      },
    },
    ext5003: {
      libraryKey: "ext5003",
      extId: 5003,
      extNameJa: "劇作家の羽ペン",
      skillNameJa: "カーテンコール",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 70, 80), "INT\u3000+1"]; },
      peekHelpKeys() { return ["hp", "int"]; },
      previewLines(s) { return [`HP を回復係数 70〜80% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 70, 80)}）`, "INT を +1"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 70, 80);
        s.playerInt += 1;
      },
    },
    ext5004: {
      libraryKey: "ext5004",
      extId: 5004,
      extNameJa: "MCHアーマー",
      skillNameJa: "超合金",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 10, 10), "PHY\u3000+3"]; },
      peekHelpKeys() { return ["hp", "phy"]; },
      previewLines(s) { return [`HP を回復係数 10〜10% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 10, 10)}）`, "PHY を +3"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 10, 10);
        s.playerPhy += 3;
      },
    },
    ext5005: {
      libraryKey: "ext5005",
      extId: 5005,
      extNameJa: "ブケファロス",
      skillNameJa: "神託の軍馬",
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
    ext5006: {
      libraryKey: "ext5006",
      extId: 5006,
      extNameJa: "へし切長谷部",
      skillNameJa: "天下統一の一斬",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 65, 75)}`, "PHY\u3000-1（敵）"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 65, 75)} ダメージ（PHY 65〜75%）`, "敵の PHY を -1"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 65, 75);
        s.enemyPhy = Math.max(1, s.enemyPhy + (-1)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext5008: {
      libraryKey: "ext5008",
      extId: 5008,
      extNameJa: "アトランティコ手稿",
      skillNameJa: "万能人の遺稿",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 45, 50)}`, "INT\u3000-1（敵）"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 45, 50)} ダメージ（INT 45〜50%・1v1=単体）`, "敵の INT を -1"]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 45, 50);
        s.enemyInt = Math.max(1, s.enemyInt + (-1)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext5009: {
      libraryKey: "ext5009",
      extId: 5009,
      extNameJa: "王妃の指輪",
      skillNameJa: "女王の威光",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 70, 80)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 70〜80% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 70, 80)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 70, 80);
      },
    },
    ext5010: {
      libraryKey: "ext5010",
      extId: 5010,
      extNameJa: "アイギス",
      skillNameJa: "石化の呪い",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 35, 40)}`, "AGI\u3000-1（敵）"]; },
      peekHelpKeys() { return ["agi"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 35, 40)} ダメージ（PHY 35〜40%）`, "敵の AGI を -1"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 35, 40);
        s.enemyAgi = Math.max(1, s.enemyAgi + (-1)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext5011: {
      libraryKey: "ext5011",
      extId: 5011,
      extNameJa: "バイキングアックス",
      skillNameJa: "ヴァルハラ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 65, 75)}`, "INT\u3000-1（敵）"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 65, 75)} ダメージ（PHY 65〜75%）`, "敵の INT を -1"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 65, 75);
        s.enemyInt = Math.max(1, s.enemyInt + (-1)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext5012: {
      libraryKey: "ext5012",
      extId: 5012,
      extNameJa: "ETHEREMON-ZEDAKAZM",
      skillNameJa: "トドメだ!ゼダカン!",
      skillIcon: "DBF_phy.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      effectSummaryLines() { return ["出血 ×4（敵）", "毒 ×8（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines() { return ["敵に出血 ×4 付与", "敵に毒 ×8 付与"]; },
      play(s) {
        api.addBleedToEnemy(s, 4);
        api.addPoisonToEnemy(s, 8);
      },
    },
    ext5013: {
      libraryKey: "ext5013",
      extId: 5013,
      extNameJa: "与一の弓",
      skillNameJa: "扇落とし",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 55, 75)}`, "PHY\u3000+1"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 55, 75)} ダメージ（PHY 55〜75%）`, "PHY を +1"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 55, 75);
        s.playerPhy += 1;
      },
    },
    ext5014: {
      libraryKey: "ext5014",
      extId: 5014,
      extNameJa: "蜻蛉切",
      skillNameJa: "古今独歩の一突き",
      skillIcon: "phy.png",
      cost: 2,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines() { return [`敵にダメージ ×2`]; },
      peekHelpKeys() { return []; },
      previewLines() { return [`敵1体に PHY 30〜40% × 2 回ダメージ`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 30, 40);
        if (s.enemyHp > 0) api.dealPhySkillToEnemy(s, 30, 40);
      },
    },
    ext5015: {
      libraryKey: "ext5015",
      extId: 5015,
      extNameJa: "方天画戟",
      skillNameJa: "裏切りの一撃",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 60, 70)}`, "毒 ×4（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 60, 70)} ダメージ（PHY 60〜70%）`, "敵に毒 ×4 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 60, 70);
        api.addPoisonToEnemy(s, 4);
      },
    },
    ext5016: {
      libraryKey: "ext5016",
      extId: 5016,
      extNameJa: "大唐西域記",
      skillNameJa: "求法の旅",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 35, 40)}`, "毒 ×4（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 35, 40)} ダメージ（INT 35〜40%・1v1=単体）`, "敵に毒 ×4 付与"]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 35, 40);
        api.addPoisonToEnemy(s, 4);
      },
    },
    ext5017: {
      libraryKey: "ext5017",
      extId: 5017,
      extNameJa: "太陽神の首飾り",
      skillNameJa: "太陽神の涙",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 20, 30), "INT\u3000+1"]; },
      peekHelpKeys() { return ["hp", "int"]; },
      previewLines(s) { return [`HP を回復係数 20〜30% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 20, 30)}）`, "INT を +1"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 20, 30);
        s.playerInt += 1;
      },
    },
    ext5018: {
      libraryKey: "ext5018",
      extId: 5018,
      extNameJa: "弦月形鍬形兜",
      skillNameJa: "星界の加護",
      skillIcon: "BUF_phy.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines() { return ["PHY\u3000+1", "INT\u3000+1", "INT\u3000-1（敵）"]; },
      peekHelpKeys() { return ["phy", "int"]; },
      previewLines() { return ["PHY を +1", "INT を +1", "敵の INT を -1"]; },
      play(s) {
        s.playerPhy += 1;
        s.playerInt += 1;
        s.enemyInt = Math.max(1, s.enemyInt + (-1)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext5019: {
      libraryKey: "ext5019",
      extId: 5019,
      extNameJa: "アクーパーラ",
      skillNameJa: "乳海攪拌",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 30, 30), "PHY\u3000+1", "INT\u3000+1"]; },
      peekHelpKeys() { return ["hp", "phy", "int"]; },
      previewLines(s) { return [`HP を回復係数 30〜30% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 30, 30)}）`, "PHY を +1", "INT を +1"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 30, 30);
        s.playerPhy += 1;
        s.playerInt += 1;
      },
    },
    ext5020: {
      libraryKey: "ext5020",
      extId: 5020,
      extNameJa: "金鶏",
      skillNameJa: "暁に鳴く",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 35, 40)}`, "AGI\u3000+1"]; },
      peekHelpKeys() { return ["agi"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 35, 40)} ダメージ（PHY 35〜40%）`, "AGI を +1"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 35, 40);
        s.playerAgi += 1;
      },
    },
    ext5021: {
      libraryKey: "ext5021",
      extId: 5021,
      extNameJa: "サーベルタイガー",
      skillNameJa: "剣歯虎の一撃",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 45, 50)}`, "PHY\u3000+2"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 45, 50)} ダメージ（PHY 45〜50%）`, "PHY を +2"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 45, 50);
        s.playerPhy += 2;
      },
    },
    ext5022: {
      libraryKey: "ext5022",
      extId: 5022,
      extNameJa: "金龍",
      skillNameJa: "龍王の息吹",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 25, 30)}`, "INT\u3000-1（敵）"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 25, 30)} ダメージ（INT 25〜30%・1v1=単体）`, "敵の INT を -1"]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 25, 30);
        s.enemyInt = Math.max(1, s.enemyInt + (-1)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext5023: {
      libraryKey: "ext5023",
      extId: 5023,
      extNameJa: "金牛",
      skillNameJa: "グレイトホーン",
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
    ext5024: {
      libraryKey: "ext5024",
      extId: 5024,
      extNameJa: "ハンニバルの軍象",
      skillNameJa: "戦象部隊の突撃",
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
    ext5025: {
      libraryKey: "ext5025",
      extId: 5025,
      extNameJa: "狒々",
      skillNameJa: "白羽の矢",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 30, 35)}`, "出血 ×4（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 30, 35)} ダメージ（INT 30〜35%）`, "敵に出血 ×4 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 30, 35);
        api.addBleedToEnemy(s, 4);
      },
    },
    ext5026: {
      libraryKey: "ext5026",
      extId: 5026,
      extNameJa: "ケツァルコアトル",
      skillNameJa: "太陽神の加護",
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
    ext5027: {
      libraryKey: "ext5027",
      extId: 5027,
      extNameJa: "しっぺい太郎",
      skillNameJa: "猿神退治",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 50, 60)}`, "INT\u3000-1（敵）"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 50, 60)} ダメージ（INT 50〜60%）`, "敵の INT を -1"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 50, 60);
        s.enemyInt = Math.max(1, s.enemyInt + (-1)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext5028: {
      libraryKey: "ext5028",
      extId: 5028,
      extNameJa: "フランベルジェ",
      skillNameJa: "揺らめく炎の刺突",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 60, 70)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 60, 70)} ダメージ（PHY 60〜70%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 60, 70);
      },
    },
    ext5029: {
      libraryKey: "ext5029",
      extId: 5029,
      extNameJa: "モデル１",
      skillNameJa: "幕末志士の一射",
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
    ext5030: {
      libraryKey: "ext5030",
      extId: 5030,
      extNameJa: "聖杯",
      skillNameJa: "復活の奇跡",
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
    ext5031: {
      libraryKey: "ext5031",
      extId: 5031,
      extNameJa: "コボルドのブーツ",
      skillNameJa: "ルンペルシュティルツヒェン",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 35, 40), "AGI\u3000+1"]; },
      peekHelpKeys() { return ["hp", "agi"]; },
      previewLines(s) { return [`HP を回復係数 35〜40% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 35, 40)}）`, "AGI を +1"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 35, 40);
        s.playerAgi += 1;
      },
    },
    ext5032: {
      libraryKey: "ext5032",
      extId: 5032,
      extNameJa: "白羽根太極",
      skillNameJa: "策士の舞",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 35, 40)}`, "HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 10, 10), "INT\u3000+1"]; },
      peekHelpKeys() { return ["hp", "int"]; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 35, 40)} ダメージ（INT 35〜40%・1v1=単体）`, `HP を回復係数 10〜10% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 10, 10)}）`, "INT を +1"]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 35, 40);
        api.healPlayerFromIntSkill(s, 10, 10);
        s.playerInt += 1;
      },
    },
    ext5033: {
      libraryKey: "ext5033",
      extId: 5033,
      extNameJa: "ビヨンドMCHメダル",
      skillNameJa: "ビヨンドMaster Nobの御加護",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 10, 10), "PHY\u3000+1", "INT\u3000+1", "AGI\u3000+1"]; },
      peekHelpKeys() { return ["hp", "phy", "int", "agi"]; },
      previewLines(s) { return [`HP を回復係数 10〜10% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 10, 10)}）`, "PHY を +1", "INT を +1", "AGI を +1"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 10, 10);
        s.playerPhy += 1;
        s.playerInt += 1;
        s.playerAgi += 1;
      },
    },
    ext5034: {
      libraryKey: "ext5034",
      extId: 5034,
      extNameJa: "審判の槌",
      skillNameJa: "正義の鉄槌",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 60, 70)}`, "HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 10, 10), "PHY\u3000+2"]; },
      peekHelpKeys() { return ["hp", "phy"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 60, 70)} ダメージ（PHY 60〜70%）`, `HP を回復係数 10〜10% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 10, 10)}）`, "PHY を +2"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 60, 70);
        api.healPlayerFromIntSkill(s, 10, 10);
        s.playerPhy += 2;
      },
    },
    ext5035: {
      libraryKey: "ext5035",
      extId: 5035,
      extNameJa: "バリスタ",
      skillNameJa: "崩城の一撃",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 55, 65)}`, "HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 10, 10), "INT\u3000+2"]; },
      peekHelpKeys() { return ["hp", "int"]; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 55, 65)} ダメージ（INT 55〜65%）`, `HP を回復係数 10〜10% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 10, 10)}）`, "INT を +2"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 55, 65);
        api.healPlayerFromIntSkill(s, 10, 10);
        s.playerInt += 2;
      },
    },
    ext5036: {
      libraryKey: "ext5036",
      extId: 5036,
      extNameJa: "冕冠",
      skillNameJa: "皇帝の威光",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 50, 60), "AGI\u3000+2"]; },
      peekHelpKeys() { return ["hp", "agi"]; },
      previewLines(s) { return [`HP を回復係数 50〜60% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 50, 60)}）`, "AGI を +2"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 50, 60);
        s.playerAgi += 2;
      },
    },
    ext5037: {
      libraryKey: "ext5037",
      extId: 5037,
      extNameJa: "梵字軍配",
      skillNameJa: "攻めること火の如し",
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
    ext5038: {
      libraryKey: "ext5038",
      extId: 5038,
      extNameJa: "大航海の舵輪",
      skillNameJa: "リヴァイアサン",
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
    ext5039: {
      libraryKey: "ext5039",
      extId: 5039,
      extNameJa: "女神フリッグの果実",
      skillNameJa: "フリッグの祈り",
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
    ext5040: {
      libraryKey: "ext5040",
      extId: 5040,
      extNameJa: "左慈の柑子",
      skillNameJa: "温州路",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 60, 60)}`, "PHY\u3000-1（敵）"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 60, 60)} ダメージ（PHY 60〜60%）`, "敵の PHY を -1"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 60, 60);
        s.enemyPhy = Math.max(1, s.enemyPhy + (-1)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext5041: {
      libraryKey: "ext5041",
      extId: 5041,
      extNameJa: "英国海軍のライム",
      skillNameJa: "ライミーズアタック",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 60, 70)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 60, 70)} ダメージ（PHY 60〜70%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 60, 70);
      },
    },
    ext5042: {
      libraryKey: "ext5042",
      extId: 5042,
      extNameJa: "球状黒鉛",
      skillNameJa: "サバラガムワ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 40, 60)}`, "毒 ×4（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 40, 60)} ダメージ（PHY 40〜60%）`, "敵に毒 ×4 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 40, 60);
        api.addPoisonToEnemy(s, 4);
      },
    },
    ext5043: {
      libraryKey: "ext5043",
      extId: 5043,
      extNameJa: "バッカスグレープ",
      skillNameJa: "テュルソスの杖",
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
    ext5044: {
      libraryKey: "ext5044",
      extId: 5044,
      extNameJa: "大帝のセージ",
      skillNameJa: "シャルルマーニュハーブ",
      skillIcon: "DBF_phy.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      effectSummaryLines() { return ["出血 ×4（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines() { return ["敵に出血 ×4 付与"]; },
      play(s) {
        api.addBleedToEnemy(s, 4);
      },
    },
    ext5045: {
      libraryKey: "ext5045",
      extId: 5045,
      extNameJa: "先住民の叡智",
      skillNameJa: "太古のドライベリー",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 60, 60)}`, "毒 ×4（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 60, 60)} ダメージ（INT 60〜60%）`, "敵に毒 ×4 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 60, 60);
        api.addPoisonToEnemy(s, 4);
      },
    },
    ext5046: {
      libraryKey: "ext5046",
      extId: 5046,
      extNameJa: "真夜中のスタールビー",
      skillNameJa: "116.75カラット",
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
    ext5047: {
      libraryKey: "ext5047",
      extId: 5047,
      extNameJa: "ビクトリア号",
      skillNameJa: "マゼラン海峡",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 0, 80)}`, `敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 0, 80)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 0, 80)} ダメージ（PHY 0〜80%）`, `敵1体に ${estIntHit(s.playerInt, s.enemyInt, 0, 80)} ダメージ（INT 0〜80%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 0, 80);
        api.dealIntSkillToEnemy(s, 0, 80);
      },
    },
    ext5048: {
      libraryKey: "ext5048",
      extId: 5048,
      extNameJa: "アゾット",
      skillNameJa: "パラケルススの一閃",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 60, 70)}`, "PHY\u3000-1（敵）", "毒 ×4（敵）"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 60, 70)} ダメージ（PHY 60〜70%）`, "敵の PHY を -1", "敵に毒 ×4 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 60, 70);
        s.enemyPhy = Math.max(1, s.enemyPhy + (-1)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
        api.addPoisonToEnemy(s, 4);
      },
    },
    ext5049: {
      libraryKey: "ext5049",
      extId: 5049,
      extNameJa: "雨夜手拍子",
      skillNameJa: "毛利秀包の号令",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 55, 65)}`, "INT\u3000-1（敵）", "毒 ×4（敵）"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 55, 65)} ダメージ（INT 55〜65%）`, "敵の INT を -1", "敵に毒 ×4 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 55, 65);
        s.enemyInt = Math.max(1, s.enemyInt + (-1)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
        api.addPoisonToEnemy(s, 4);
      },
    },
    ext5050: {
      libraryKey: "ext5050",
      extId: 5050,
      extNameJa: "十戒の石版",
      skillNameJa: "モーセの声",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 30, 40), "INT\u3000+1"]; },
      peekHelpKeys() { return ["hp", "int"]; },
      previewLines(s) { return [`HP を回復係数 30〜40% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 30, 40)}）`, "INT を +1"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 30, 40);
        s.playerInt += 1;
      },
    },
    ext5051: {
      libraryKey: "ext5051",
      extId: 5051,
      extNameJa: "大王の鞭",
      skillNameJa: "アッティラの怒り",
      skillIcon: "phy.png",
      cost: 2,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines() { return [`敵にダメージ ×2`, "AGI\u3000-1（敵）"]; },
      peekHelpKeys() { return ["agi"]; },
      previewLines() { return [`敵1体に PHY 25〜40% × 2 回ダメージ`, "敵の AGI を -1"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 25, 40);
        if (s.enemyHp > 0) api.dealPhySkillToEnemy(s, 25, 40);
        s.enemyAgi = Math.max(1, s.enemyAgi + (-1)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext5055: {
      libraryKey: "ext5055",
      extId: 5055,
      extNameJa: "とっておきのフルーツパフェ",
      skillNameJa: "フルーツパフェの恨みを受けよ！",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 30, 40)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 30, 40)} ダメージ（INT 30〜40%）`]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 30, 40);
      },
    },
    ext5056: {
      libraryKey: "ext5056",
      extId: 5056,
      extNameJa: "アダマスの鎌",
      skillNameJa: "金剛",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 65, 75)}`, "INT\u3000-1（敵）"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 65, 75)} ダメージ（PHY 65〜75%）`, "敵の INT を -1"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 65, 75);
        s.enemyInt = Math.max(1, s.enemyInt + (-1)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext5057: {
      libraryKey: "ext5057",
      extId: 5057,
      extNameJa: "ケーリュケイオン",
      skillNameJa: "友好の証",
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
    ext5058: {
      libraryKey: "ext5058",
      extId: 5058,
      extNameJa: "ネクタール",
      skillNameJa: "呪われた神酒",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 50, 60), "PHY\u3000-4（敵）", "AGI\u3000-4（敵）"]; },
      peekHelpKeys() { return ["hp", "phy", "agi"]; },
      previewLines(s) { return [`HP を回復係数 50〜60% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 50, 60)}）`, "敵の PHY を -4", "敵の AGI を -4"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 50, 60);
        s.enemyPhy = Math.max(1, s.enemyPhy + (-4)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
        s.enemyAgi = Math.max(1, s.enemyAgi + (-4)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext5059: {
      libraryKey: "ext5059",
      extId: 5059,
      extNameJa: "提督のトリコーン",
      skillNameJa: "マン・オブ・ウォー",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 10, 10), "INT\u3000+3"]; },
      peekHelpKeys() { return ["hp", "int"]; },
      previewLines(s) { return [`HP を回復係数 10〜10% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 10, 10)}）`, "INT を +3"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 10, 10);
        s.playerInt += 3;
      },
    },
    ext5060: {
      libraryKey: "ext5060",
      extId: 5060,
      extNameJa: "火の鳥",
      skillNameJa: "永遠の生命",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 65, 65)}`, "出血 ×4（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 65, 65)} ダメージ（PHY 65〜65%）`, "敵に出血 ×4 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 65, 65);
        api.addBleedToEnemy(s, 4);
      },
    },
    ext5061: {
      libraryKey: "ext5061",
      extId: 5061,
      extNameJa: "皇帝のマント",
      skillNameJa: "ディヴィシオ・レグノールム",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 70, 80), "PHY\u3000+1"]; },
      peekHelpKeys() { return ["hp", "phy"]; },
      previewLines(s) { return [`HP を回復係数 70〜80% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 70, 80)}）`, "PHY を +1"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 70, 80);
        s.playerPhy += 1;
      },
    },
    ext5063: {
      libraryKey: "ext5063",
      extId: 5063,
      extNameJa: "ジョーカー",
      skillNameJa: "死神は最後に笑う",
      skillIcon: "BUF_agi.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines() { return ["AGI\u3000+1", "出血 ×4（敵）"]; },
      peekHelpKeys() { return ["agi"]; },
      previewLines() { return ["AGI を +1", "敵に出血 ×4 付与"]; },
      play(s) {
        s.playerAgi += 1;
        api.addBleedToEnemy(s, 4);
      },
    },
    ext5064: {
      libraryKey: "ext5064",
      extId: 5064,
      extNameJa: "クリシュナのバーンスリー",
      skillNameJa: "バガヴァッド・ギーター",
      skillIcon: "DBF_phy.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      effectSummaryLines() { return ["毒 ×4（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines() { return ["敵に毒 ×4 付与"]; },
      play(s) {
        api.addPoisonToEnemy(s, 4);
      },
    },
    ext5065: {
      libraryKey: "ext5065",
      extId: 5065,
      extNameJa: "ヴェガ",
      skillNameJa: "織女星の蒼き煌めき",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 55, 65)}`, "出血 ×4（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 55, 65)} ダメージ（INT 55〜65%）`, "敵に出血 ×4 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 55, 65);
        api.addBleedToEnemy(s, 4);
      },
    },
    ext5066: {
      libraryKey: "ext5066",
      extId: 5066,
      extNameJa: "シストルム",
      skillNameJa: "ブバスティスの女主",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 60, 70)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 60, 70)} ダメージ（PHY 60〜70%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 60, 70);
      },
    },
    ext5067: {
      libraryKey: "ext5067",
      extId: 5067,
      extNameJa: "ギャラルホルン",
      skillNameJa: "世界の終焉を告げる魔笛",
      skillIcon: "DBF_agi.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      effectSummaryLines() { return ["AGI\u3000-4（敵）"]; },
      peekHelpKeys() { return ["agi"]; },
      previewLines() { return ["敵の AGI を -4"]; },
      play(s) {
        s.enemyAgi = Math.max(1, s.enemyAgi + (-4)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext5068: {
      libraryKey: "ext5068",
      extId: 5068,
      extNameJa: "バロックオルガン",
      skillNameJa: "幻想曲とフーガ ト短調",
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
    ext5069: {
      libraryKey: "ext5069",
      extId: 5069,
      extNameJa: "メサイア",
      skillNameJa: "サラブーエ伯爵のコレクション",
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
    ext5070: {
      libraryKey: "ext5070",
      extId: 5070,
      extNameJa: "龍頭二胡",
      skillNameJa: "ラストエンペラー",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 60, 70)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 60, 70)} ダメージ（INT 60〜70%）`]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 60, 70);
      },
    },
    ext5071: {
      libraryKey: "ext5071",
      extId: 5071,
      extNameJa: "雷鼓",
      skillNameJa: "雷獣の嘶き",
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
    ext5072: {
      libraryKey: "ext5072",
      extId: 5072,
      extNameJa: "サラスワティ・ヴィーナ",
      skillNameJa: "マハー・デーヴィ・リグ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 50, 50)}`, "毒 ×4（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 50, 50)} ダメージ（PHY 50〜50%）`, "敵に毒 ×4 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 50, 50);
        api.addPoisonToEnemy(s, 4);
      },
    },
    ext5073: {
      libraryKey: "ext5073",
      extId: 5073,
      extNameJa: "ミョルニル",
      skillNameJa: "青天の霹靂",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 55, 70)}`, "出血 ×4（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 55, 70)} ダメージ（PHY 55〜70%）`, "敵に出血 ×4 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 55, 70);
        api.addBleedToEnemy(s, 4);
      },
    },
    ext5074: {
      libraryKey: "ext5074",
      extId: 5074,
      extNameJa: "宝貝火尖鎗",
      skillNameJa: "哪吒太子の焔撃",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 55, 65)}`, "出血 ×4（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 55, 65)} ダメージ（INT 55〜65%）`, "敵に出血 ×4 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 55, 65);
        api.addBleedToEnemy(s, 4);
      },
    },
    ext5075: {
      libraryKey: "ext5075",
      extId: 5075,
      extNameJa: "フォトングラス",
      skillNameJa: "スペクトラムブラスト",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 50, 60), "INT\u3000-4（敵）"]; },
      peekHelpKeys() { return ["hp", "int"]; },
      previewLines(s) { return [`HP を回復係数 50〜60% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 50, 60)}）`, "敵の INT を -4"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 50, 60);
        s.enemyInt = Math.max(1, s.enemyInt + (-4)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext5078: {
      libraryKey: "ext5078",
      extId: 5078,
      extNameJa: "ディバインドラゴン",
      skillNameJa: "ディバイン・ブレイズ・ブレス",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 30, 35)}`, `敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 30, 35)}`, "PHY\u3000-1（敵）", "INT\u3000-1（敵）"]; },
      peekHelpKeys() { return ["phy", "int"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 30, 35)} ダメージ（PHY 30〜35%）`, `敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 30, 35)} ダメージ（INT 30〜35%・1v1=単体）`, "敵の PHY を -1", "敵の INT を -1"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 30, 35);
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 30, 35);
        s.enemyPhy = Math.max(1, s.enemyPhy + (-1)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
        s.enemyInt = Math.max(1, s.enemyInt + (-1)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext5079: {
      libraryKey: "ext5079",
      extId: 5079,
      extNameJa: "如意金箍棒",
      skillNameJa: "忉利天",
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
    ext5080: {
      libraryKey: "ext5080",
      extId: 5080,
      extNameJa: "自由のホーキ",
      skillNameJa: "アンリーシュ",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 35, 45)}`, "AGI\u3000+1"]; },
      peekHelpKeys() { return ["agi"]; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 35, 45)} ダメージ（INT 35〜45%・1v1=単体）`, "AGI を +1"]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 35, 45);
        s.playerAgi += 1;
      },
    },
    ext5081: {
      libraryKey: "ext5081",
      extId: 5081,
      extNameJa: "赤糸威大鎧",
      skillNameJa: "雀躍虎哮",
      skillIcon: "BUF_phy.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines() { return ["PHY\u3000+2", "INT\u3000+2"]; },
      peekHelpKeys() { return ["phy", "int"]; },
      previewLines() { return ["PHY を +2", "INT を +2"]; },
      play(s) {
        s.playerPhy += 2;
        s.playerInt += 2;
      },
    },
    ext5082: {
      libraryKey: "ext5082",
      extId: 5082,
      extNameJa: "無銘金重・了戒",
      skillNameJa: "万理一空",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 50, 55)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 50, 55)} ダメージ（PHY 50〜55%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 50, 55);
      },
    },
    ext5086: {
      libraryKey: "ext5086",
      extId: 5086,
      extNameJa: "カリュブディス",
      skillNameJa: "海の神秘",
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
    ext5087: {
      libraryKey: "ext5087",
      extId: 5087,
      extNameJa: "アスタロス",
      skillNameJa: "光を打ち砕く者",
      skillIcon: "phy.png",
      cost: 2,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 100, 100)}`, "出血 ×4（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 100, 100)} ダメージ（PHY 100〜100%）`, "敵に出血 ×4 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 100, 100);
        api.addBleedToEnemy(s, 4);
      },
    },
    ext5088: {
      libraryKey: "ext5088",
      extId: 5088,
      extNameJa: "MCHブレックス",
      skillNameJa: "英雄の剣気",
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
    ext5089: {
      libraryKey: "ext5089",
      extId: 5089,
      extNameJa: "ネッシー",
      skillNameJa: "翠龍海嘯",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 20, 20)}`, "INT\u3000-1（敵）", "毒 ×4（敵）"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 20, 20)} ダメージ（PHY 20〜20%）`, "敵の INT を -1", "敵に毒 ×4 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 20, 20);
        s.enemyInt = Math.max(1, s.enemyInt + (-1)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
        api.addPoisonToEnemy(s, 4);
      },
    },
    ext5090: {
      libraryKey: "ext5090",
      extId: 5090,
      extNameJa: "ダイヤモンドヘッド",
      skillNameJa: "透輝石の角",
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
    ext5091: {
      libraryKey: "ext5091",
      extId: 5091,
      extNameJa: "デュランダル・ドラゴン",
      skillNameJa: "スピリット オブ グレープ",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 50, 65)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 50〜65% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 50, 65)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 50, 65);
      },
    },
    ext5092: {
      libraryKey: "ext5092",
      extId: 5092,
      extNameJa: "太古の再臨",
      skillNameJa: "セージファイヤー",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 50, 50)}`, "毒 ×4（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 50, 50)} ダメージ（INT 50〜50%）`, "敵に毒 ×4 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 50, 50);
        api.addPoisonToEnemy(s, 4);
      },
    },
    ext5093: {
      libraryKey: "ext5093",
      extId: 5093,
      extNameJa: "海賊要塞メガロディアス",
      skillNameJa: "トレジャーオブユニバース",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 50, 50)}`, "AGI\u3000+2"]; },
      peekHelpKeys() { return ["agi"]; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 50, 50)} ダメージ（INT 50〜50%）`, "AGI を +2"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 50, 50);
        s.playerAgi += 2;
      },
    },
    ext5094: {
      libraryKey: "ext5094",
      extId: 5094,
      extNameJa: "フラマ・ファクス",
      skillNameJa: "全ての炎を司りし者",
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
    ext5095: {
      libraryKey: "ext5095",
      extId: 5095,
      extNameJa: "大軍師の采配",
      skillNameJa: "死灰復然",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 50, 50), "出血 ×4（敵）"]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 50〜50% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 50, 50)}）`, "敵に出血 ×4 付与"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 50, 50);
        api.addBleedToEnemy(s, 4);
      },
    },
    ext5096: {
      libraryKey: "ext5096",
      extId: 5096,
      extNameJa: "メギンギョルズ",
      skillNameJa: "プリペアー・ラグナロク",
      skillIcon: "DBF_int.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      effectSummaryLines() { return ["PHY\u3000-4（敵）", "INT\u3000-4（敵）"]; },
      peekHelpKeys() { return ["phy", "int"]; },
      previewLines() { return ["敵の PHY を -4", "敵の INT を -4"]; },
      play(s) {
        s.enemyPhy = Math.max(1, s.enemyPhy + (-4)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
        s.enemyInt = Math.max(1, s.enemyInt + (-4)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext5097: {
      libraryKey: "ext5097",
      extId: 5097,
      extNameJa: "バグナウ",
      skillNameJa: "忍び寄る死の影 ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 60, 70)}`, "HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 30, 40), "毒 ×4（敵）"]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 60, 70)} ダメージ（PHY 60〜70%）`, `HP を回復係数 30〜40% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 30, 40)}）`, "敵に毒 ×4 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 60, 70);
        api.healPlayerFromIntSkill(s, 30, 40);
        api.addPoisonToEnemy(s, 4);
      },
    },
    ext5098: {
      libraryKey: "ext5098",
      extId: 5098,
      extNameJa: "龍玉",
      skillNameJa: "チンターマニ",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 55, 65)}`, "HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 30, 40), "毒 ×4（敵）"]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 55, 65)} ダメージ（INT 55〜65%）`, `HP を回復係数 30〜40% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 30, 40)}）`, "敵に毒 ×4 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 55, 65);
        api.healPlayerFromIntSkill(s, 30, 40);
        api.addPoisonToEnemy(s, 4);
      },
    },
    ext5099: {
      libraryKey: "ext5099",
      extId: 5099,
      extNameJa: "ヤールングレイプル",
      skillNameJa: "霜の巨人殺し",
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
    ext5100: {
      libraryKey: "ext5100",
      extId: 5100,
      extNameJa: "魔法剣・天照",
      skillNameJa: "幻日",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 65, 70)}`, "PHY\u3000+7", "毒 ×4（敵）"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 65, 70)} ダメージ（PHY 65〜70%）`, "PHY を +7", "敵に毒 ×4 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 65, 70);
        s.playerPhy += 7;
        api.addPoisonToEnemy(s, 4);
      },
    },
    ext5102: {
      libraryKey: "ext5102",
      extId: 5102,
      extNameJa: "アイリスギア",
      skillNameJa: "レインボー・バルス",
      skillIcon: "phy.png",
      cost: 2,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 104, 104)}`, "PHY\u3000+1"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 104, 104)} ダメージ（PHY 104〜104%）`, "PHY を +1"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 104, 104);
        s.playerPhy += 1;
      },
    },
    ext5103: {
      libraryKey: "ext5103",
      extId: 5103,
      extNameJa: "降神召符　青龍雷臨",
      skillNameJa: "天地召雷",
      skillIcon: "int.png",
      cost: 2,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 104, 104)}`, "INT\u3000+1"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 104, 104)} ダメージ（INT 104〜104%）`, "INT を +1"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 104, 104);
        s.playerInt += 1;
      },
    },
    ext5104: {
      libraryKey: "ext5104",
      extId: 5104,
      extNameJa: "虹の筆パレ",
      skillNameJa: "愛と自由で、今日も描く！",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 28, 28)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 28, 28)} ダメージ（PHY 28〜28%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 28, 28);
      },
    },
    ext5105: {
      libraryKey: "ext5105",
      extId: 5105,
      extNameJa: "浄玻璃鏡",
      skillNameJa: "ビハーヴァ・カルマ",
      skillIcon: "DBF_phy.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      effectSummaryLines() { return ["毒 ×4（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines() { return ["敵に毒 ×4 付与"]; },
      play(s) {
        api.addPoisonToEnemy(s, 4);
      },
    },
    ext5106: {
      libraryKey: "ext5106",
      extId: 5106,
      extNameJa: "財宝ゴールデンモアイ",
      skillNameJa: "金箱レースの極意",
      skillIcon: "DBF_phy.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      effectSummaryLines() { return ["毒 ×4（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines() { return ["敵に毒 ×4 付与"]; },
      play(s) {
        api.addPoisonToEnemy(s, 4);
      },
    },
    ext5107: {
      libraryKey: "ext5107",
      extId: 5107,
      extNameJa: "ホレリスの黄金像",
      skillNameJa: "リファクタリング バイオレットキング",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 65, 65)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 65, 65)} ダメージ（INT 65〜65%）`]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 65, 65);
      },
    },
    ext5108: {
      libraryKey: "ext5108",
      extId: 5108,
      extNameJa: "女神像レム",
      skillNameJa: "一滴の涙",
      skillIcon: "DBF_phy.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      effectSummaryLines() { return ["PHY\u3000-4（敵）"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines() { return ["敵の PHY を -4"]; },
      play(s) {
        s.enemyPhy = Math.max(1, s.enemyPhy + (-4)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext5109: {
      libraryKey: "ext5109",
      extId: 5109,
      extNameJa: "大海賊の秘宝",
      skillNameJa: "We are the chicken pirates!",
      skillIcon: "DBF_phy.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      effectSummaryLines() { return ["出血 ×4（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines() { return ["敵に出血 ×4 付与"]; },
      play(s) {
        api.addBleedToEnemy(s, 4);
      },
    },
    ext5110: {
      libraryKey: "ext5110",
      extId: 5110,
      extNameJa: "魔界の魔王の目玉を施した破壊禁忌リボン",
      skillNameJa: "破壊の魂に導かれて",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 61, 61)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 61, 61)} ダメージ（PHY 61〜61%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 61, 61);
      },
    },
    ext5111: {
      libraryKey: "ext5111",
      extId: 5111,
      extNameJa: "王妃の黄金時計",
      skillNameJa: "命の刻限",
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
    ext5112: {
      libraryKey: "ext5112",
      extId: 5112,
      extNameJa: "ティターニア",
      skillNameJa: "誇り高き輝き",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 30, 30)}`, "INT\u3000+1"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 30, 30)} ダメージ（INT 30〜30%）`, "INT を +1"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 30, 30);
        s.playerInt += 1;
      },
    },
    ext5113: {
      libraryKey: "ext5113",
      extId: 5113,
      extNameJa: "ジュエルパロット",
      skillNameJa: "宝石の囀り",
      skillIcon: "BUF_agi.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines() { return ["AGI\u3000+7", "毒 ×4（敵）"]; },
      peekHelpKeys() { return ["agi"]; },
      previewLines() { return ["AGI を +7", "敵に毒 ×4 付与"]; },
      play(s) {
        s.playerAgi += 7;
        api.addPoisonToEnemy(s, 4);
      },
    },
    ext5114: {
      libraryKey: "ext5114",
      extId: 5114,
      extNameJa: "南葛SCのインシグニア",
      skillNameJa: "南葛魂",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 65, 75)}`, "PHY\u3000+2"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 65, 75)} ダメージ（PHY 65〜75%）`, "PHY を +2"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 65, 75);
        s.playerPhy += 2;
      },
    },
    ext5115: {
      libraryKey: "ext5115",
      extId: 5115,
      extNameJa: "Nob-Phoenix",
      skillNameJa: "Master of Ocean",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 70, 70)}`, "毒 ×4（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 70, 70)} ダメージ（INT 70〜70%）`, "敵に毒 ×4 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 70, 70);
        api.addPoisonToEnemy(s, 4);
      },
    },
    ext5116: {
      libraryKey: "ext5116",
      extId: 5116,
      extNameJa: "帝国式魔導機甲兵 皇帝機ルシファー",
      skillNameJa: "壱伍式究極殲滅弾 ［明けの明星］",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 35, 35)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 35, 35)} ダメージ（PHY 35〜35%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 35, 35);
      },
    },
    ext5117: {
      libraryKey: "ext5117",
      extId: 5117,
      extNameJa: "幻翼の騎龍",
      skillNameJa: "月光を受け、太陽に吼える",
      skillIcon: "phy.png",
      cost: 2,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 112, 112)}`, "INT\u3000-4（敵）"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 112, 112)} ダメージ（PHY 112〜112%）`, "敵の INT を -4"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 112, 112);
        s.enemyInt = Math.max(1, s.enemyInt + (-4)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext5118: {
      libraryKey: "ext5118",
      extId: 5118,
      extNameJa: "キャンディクロック21",
      skillNameJa: "幸せを呼ぶ虹色の観覧車",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 42, 42)}`, "INT\u3000-6（敵）"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 42, 42)} ダメージ（PHY 42〜42%）`, "敵の INT を -6"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 42, 42);
        s.enemyInt = Math.max(1, s.enemyInt + (-6)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext5119: {
      libraryKey: "ext5119",
      extId: 5119,
      extNameJa: "パンダ・エクス・マキナ",
      skillNameJa: "パンダやってる場合じゃねぇ！！",
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
    ext5120: {
      libraryKey: "ext5120",
      extId: 5120,
      extNameJa: "天翔神馬",
      skillNameJa: "神雷纏いし輝翼",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 62, 62)}`, "毒 ×4（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 62, 62)} ダメージ（INT 62〜62%・1v1=単体）`, "敵に毒 ×4 付与"]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 62, 62);
        api.addPoisonToEnemy(s, 4);
      },
    },
    ext5121: {
      libraryKey: "ext5121",
      extId: 5121,
      extNameJa: "宇宙船セージ号",
      skillNameJa: "To the moon",
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
    ext5122: {
      libraryKey: "ext5122",
      extId: 5122,
      extNameJa: "フライング・チキンマン号",
      skillNameJa: "大王イカダ",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 60, 60), "出血 ×4（敵）"]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 60〜60% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 60, 60)}）`, "敵に出血 ×4 付与"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 60, 60);
        api.addBleedToEnemy(s, 4);
      },
    },
    ext5123: {
      libraryKey: "ext5123",
      extId: 5123,
      extNameJa: "破壊神を封じ込めた心臓で動く古代魔導ロボット・ディア・ガ・レティウス",
      skillNameJa: "破壊の神の魔導一閃",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 66, 66)}`, "出血 ×4（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 66, 66)} ダメージ（PHY 66〜66%）`, "敵に出血 ×4 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 66, 66);
        api.addBleedToEnemy(s, 4);
      },
    },
    ext5124: {
      libraryKey: "ext5124",
      extId: 5124,
      extNameJa: "赤目四十八滝",
      skillNameJa: "ワレヲシルヘシ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 50, 60)}`, "AGI\u3000-5（敵）"]; },
      peekHelpKeys() { return ["agi"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 50, 60)} ダメージ（PHY 50〜60%）`, "敵の AGI を -5"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 50, 60);
        s.enemyAgi = Math.max(1, s.enemyAgi + (-5)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext5125: {
      libraryKey: "ext5125",
      extId: 5125,
      extNameJa: "黄金大王ゲコ・ゲッコー",
      skillNameJa: "大王直属黄金騎士団",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 35, 40)}`, "PHY\u3000+3"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 35, 40)} ダメージ（PHY 35〜40%）`, "PHY を +3"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 35, 40);
        s.playerPhy += 3;
      },
    },
    ext5126: {
      libraryKey: "ext5126",
      extId: 5126,
      extNameJa: "絶対零度ゴールデンスノーマン",
      skillNameJa: "黄金氷河期",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 35, 40)}`, "INT\u3000+3"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 35, 40)} ダメージ（INT 35〜40%・1v1=単体）`, "INT を +3"]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 35, 40);
        s.playerInt += 3;
      },
    },
    ext5127: {
      libraryKey: "ext5127",
      extId: 5127,
      extNameJa: "雛人形",
      skillNameJa: "春の弥生のこの佳き日",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 60, 60)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 60〜60% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 60, 60)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 60, 60);
      },
    },
    ext5128: {
      libraryKey: "ext5128",
      extId: 5128,
      extNameJa: "SDNメダル[L]",
      skillNameJa: "Legendary Stake POWER!",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 40, 45)}`, `敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 40, 45)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 40, 45)} ダメージ（PHY 40〜45%）`, `敵1体に ${estIntHit(s.playerInt, s.enemyInt, 40, 45)} ダメージ（INT 40〜45%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 40, 45);
        api.dealIntSkillToEnemy(s, 40, 45);
      },
    },
    ext5129: {
      libraryKey: "ext5129",
      extId: 5129,
      extNameJa: "アルコンスィエルパンケーキ",
      skillNameJa: "天にも昇るよう",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 30, 50)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 30〜50% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 30, 50)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 30, 50);
      },
    },
    ext5130: {
      libraryKey: "ext5130",
      extId: 5130,
      extNameJa: "メギド",
      skillNameJa: "神火",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 60, 60)}`, "PHY\u3000+7", "出血 ×4（敵）"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 60, 60)} ダメージ（INT 60〜60%）`, "PHY を +7", "敵に出血 ×4 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 60, 60);
        s.playerPhy += 7;
        api.addBleedToEnemy(s, 4);
      },
    },
    ext5131: {
      libraryKey: "ext5131",
      extId: 5131,
      extNameJa: "バッタ聖人",
      skillNameJa: "古今無双",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 20, 20)}`, "毒 ×4（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 20, 20)} ダメージ（INT 20〜20%・1v1=単体）`, "敵に毒 ×4 付与"]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 20, 20);
        api.addPoisonToEnemy(s, 4);
      },
    },
    ext5132: {
      libraryKey: "ext5132",
      extId: 5132,
      extNameJa: "フルアーマーリミュラス",
      skillNameJa: "カンブリアの光",
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
    ext5133: {
      libraryKey: "ext5133",
      extId: 5133,
      extNameJa: "放射線変異キングモス",
      skillNameJa: "地獄からの使者、モスマン！",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 20, 20), "INT\u3000+1"]; },
      peekHelpKeys() { return ["hp", "int"]; },
      previewLines(s) { return [`HP を回復係数 20〜20% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 20, 20)}）`, "INT を +1"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 20, 20);
        s.playerInt += 1;
      },
    },
    ext5134: {
      libraryKey: "ext5134",
      extId: 5134,
      extNameJa: "アンタレス",
      skillNameJa: "英雄殺し",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 58, 58)}`, "毒 ×4（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 58, 58)} ダメージ（PHY 58〜58%）`, "敵に毒 ×4 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 58, 58);
        api.addPoisonToEnemy(s, 4);
      },
    },
    ext5135: {
      libraryKey: "ext5135",
      extId: 5135,
      extNameJa: "改造象蟲  イビルズ＝ノーズ",
      skillNameJa: "悪の心",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 73, 73)}`, "AGI\u3000+1"]; },
      peekHelpKeys() { return ["agi"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 73, 73)} ダメージ（PHY 73〜73%）`, "AGI を +1"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 73, 73);
        s.playerAgi += 1;
      },
    },
    ext5136: {
      libraryKey: "ext5136",
      extId: 5136,
      extNameJa: "キングヘラクレス",
      skillNameJa: "十二の功業",
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
    ext5137: {
      libraryKey: "ext5137",
      extId: 5137,
      extNameJa: "女王バチ",
      skillNameJa: "女王様とお呼び！！",
      skillIcon: "BUF_agi.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines() { return ["AGI\u3000+1", "毒 ×4（敵）"]; },
      peekHelpKeys() { return ["agi"]; },
      previewLines() { return ["AGI を +1", "敵に毒 ×4 付与"]; },
      play(s) {
        s.playerAgi += 1;
        api.addPoisonToEnemy(s, 4);
      },
    },
    ext5138: {
      libraryKey: "ext5138",
      extId: 5138,
      extNameJa: "Queen",
      skillNameJa: "Girl rules",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 105, 105), "PHY\u3000+1"]; },
      peekHelpKeys() { return ["hp", "phy"]; },
      previewLines(s) { return [`HP を回復係数 105〜105% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 105, 105)}）`, "PHY を +1"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 105, 105);
        s.playerPhy += 1;
      },
    },
    ext5139: {
      libraryKey: "ext5139",
      extId: 5139,
      extNameJa: "終焉鳳炎",
      skillNameJa: "終末の幻炎",
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
    ext5140: {
      libraryKey: "ext5140",
      extId: 5140,
      extNameJa: "フルール・ド・リス",
      skillNameJa: "Advance bravely",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 65, 70), "INT\u3000+7"]; },
      peekHelpKeys() { return ["hp", "int"]; },
      previewLines(s) { return [`HP を回復係数 65〜70% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 65, 70)}）`, "INT を +7"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 65, 70);
        s.playerInt += 7;
      },
    },
    ext5141: {
      libraryKey: "ext5141",
      extId: 5141,
      extNameJa: "信長の天鵞絨",
      skillNameJa: "天下の煌めき",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 60, 85)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 60, 85)} ダメージ（PHY 60〜85%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 60, 85);
      },
    },
    ext5142: {
      libraryKey: "ext5142",
      extId: 5142,
      extNameJa: "豪華絢爛五段重箱",
      skillNameJa: "満開キラキラ",
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
    ext5143: {
      libraryKey: "ext5143",
      extId: 5143,
      extNameJa: "宇宙観測スフィア",
      skillNameJa: "無窮の最果て",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 30, 55)}`, "毒 ×4（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 30, 55)} ダメージ（INT 30〜55%・1v1=単体）`, "敵に毒 ×4 付与"]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 30, 55);
        api.addPoisonToEnemy(s, 4);
      },
    },
    ext5144: {
      libraryKey: "ext5144",
      extId: 5144,
      extNameJa: "余市の宝〜北海道余市町名産ワイン〜",
      skillNameJa: "テロワール～1227～",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 50, 60)}`, "HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 40, 50), "毒 ×4（敵）"]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 50, 60)} ダメージ（INT 50〜60%）`, `HP を回復係数 40〜50% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 40, 50)}）`, "敵に毒 ×4 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 50, 60);
        api.healPlayerFromIntSkill(s, 40, 50);
        api.addPoisonToEnemy(s, 4);
      },
    },
    ext5147: {
      libraryKey: "ext5147",
      extId: 5147,
      extNameJa: "アメノミナカヌシ",
      skillNameJa: "天地開闢の守護",
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
    ext5148: {
      libraryKey: "ext5148",
      extId: 5148,
      extNameJa: "RYUJIN.phy",
      skillNameJa: "RYUテールスイング",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 40, 40)}`, "毒 ×4（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 40, 40)} ダメージ（PHY 40〜40%）`, "敵に毒 ×4 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 40, 40);
        api.addPoisonToEnemy(s, 4);
      },
    },
    ext5149: {
      libraryKey: "ext5149",
      extId: 5149,
      extNameJa: "RYUJIN.int",
      skillNameJa: "RYUフレイムブラスト",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 40, 40)}`, "毒 ×4（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 40, 40)} ダメージ（INT 40〜40%・1v1=単体）`, "敵に毒 ×4 付与"]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 40, 40);
        api.addPoisonToEnemy(s, 4);
      },
    },
    ext5150: {
      libraryKey: "ext5150",
      extId: 5150,
      extNameJa: "天界の煌石",
      skillNameJa: "ステラー・ステア",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 20, 20)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 20, 20)} ダメージ（INT 20〜20%・1v1=単体）`]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 20, 20);
      },
    },
    ext5151: {
      libraryKey: "ext5151",
      extId: 5151,
      extNameJa: "スプリームにゃんバーガーセット",
      skillNameJa: "究極の猫好きグルメ体験！",
      skillIcon: "DBF_phy.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      effectSummaryLines() { return ["毒 ×4（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines() { return ["敵に毒 ×4 付与"]; },
      play(s) {
        api.addPoisonToEnemy(s, 4);
      },
    },
    ext5152: {
      libraryKey: "ext5152",
      extId: 5152,
      extNameJa: "神砕き",
      skillNameJa: "魔を砕き天を砕き次に望むは",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 65, 75)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 65, 75)} ダメージ（PHY 65〜75%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 65, 75);
      },
    },
    ext5153: {
      libraryKey: "ext5153",
      extId: 5153,
      extNameJa: "クリプトパンジャンドラム",
      skillNameJa: "ホイール・オブ・フォーチュン",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 65, 75)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 65, 75)} ダメージ（INT 65〜75%・1v1=単体）`]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 65, 75);
      },
    },
    ext5154: {
      libraryKey: "ext5154",
      extId: 5154,
      extNameJa: "絶品龍骨ラーメン",
      skillNameJa: "千載一遇の至杯",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 30, 40), "AGI\u3000+4"]; },
      peekHelpKeys() { return ["hp", "agi"]; },
      previewLines(s) { return [`HP を回復係数 30〜40% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 30, 40)}）`, "AGI を +4"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 30, 40);
        s.playerAgi += 4;
      },
    },
    ext5155: {
      libraryKey: "ext5155",
      extId: 5155,
      extNameJa: "スワンメカキング",
      skillNameJa: "アンデュレーション・ソブリン",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 55, 65)}`, "PHY\u3000-6（敵）", "出血 ×4（敵）"]; },
      peekHelpKeys() { return ["phy"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 55, 65)} ダメージ（PHY 55〜65%）`, "敵の PHY を -6", "敵に出血 ×4 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 55, 65);
        s.enemyPhy = Math.max(1, s.enemyPhy + (-6)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
        api.addBleedToEnemy(s, 4);
      },
    },
    ext5156: {
      libraryKey: "ext5156",
      extId: 5156,
      extNameJa: "フォーチュンロケーター",
      skillNameJa: "明導",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 55, 65)}`, "INT\u3000-6（敵）", "出血 ×4（敵）"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 55, 65)} ダメージ（INT 55〜65%）`, "敵の INT を -6", "敵に出血 ×4 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 55, 65);
        s.enemyInt = Math.max(1, s.enemyInt + (-6)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
        api.addBleedToEnemy(s, 4);
      },
    },
    ext5157: {
      libraryKey: "ext5157",
      extId: 5157,
      extNameJa: "バミューダトライアングル寿司",
      skillNameJa: "海神の食卓",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 135, 140)]; },
      peekHelpKeys() { return ["hp"]; },
      previewLines(s) { return [`HP を回復係数 135〜140% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 135, 140)}）`]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 135, 140);
      },
    },
    ext5158: {
      libraryKey: "ext5158",
      extId: 5158,
      extNameJa: "ニルヴァーナ",
      skillNameJa: "アークリンクマトリックス",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 70, 75)}`, "INT\u3000+7"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 70, 75)} ダメージ（INT 70〜75%）`, "INT を +7"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 70, 75);
        s.playerInt += 7;
      },
    },
    ext5159: {
      libraryKey: "ext5159",
      extId: 5159,
      extNameJa: "不和の女神授けし黄金の果実",
      skillNameJa: "エニューオー",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 60, 65)}`, "INT\u3000+7", "毒 ×4（敵）"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 60, 65)} ダメージ（PHY 60〜65%）`, "INT を +7", "敵に毒 ×4 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 60, 65);
        s.playerInt += 7;
        api.addPoisonToEnemy(s, 4);
      },
    },
    ext5160: {
      libraryKey: "ext5160",
      extId: 5160,
      extNameJa: "マジカルラウンドアクアリウム",
      skillNameJa: "魔法の水流",
      skillIcon: "DBF_phy.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      effectSummaryLines() { return ["毒 ×4（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines() { return ["敵に毒 ×4 付与"]; },
      play(s) {
        api.addPoisonToEnemy(s, 4);
      },
    },
    ext5161: {
      libraryKey: "ext5161",
      extId: 5161,
      extNameJa: "アーカーシャ",
      skillNameJa: "虚空閃",
      skillIcon: "BUF_phy.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines() { return ["PHY\u3000+7", "INT\u3000+7"]; },
      peekHelpKeys() { return ["phy", "int"]; },
      previewLines() { return ["PHY を +7", "INT を +7"]; },
      play(s) {
        s.playerPhy += 7;
        s.playerInt += 7;
      },
    },
    ext5162: {
      libraryKey: "ext5162",
      extId: 5162,
      extNameJa: "マンドラゴラキング",
      skillNameJa: "呪王の咆哮",
      skillIcon: "DBF_agi.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      effectSummaryLines() { return ["AGI\u3000-6（敵）", "毒 ×4（敵）"]; },
      peekHelpKeys() { return ["agi"]; },
      previewLines() { return ["敵の AGI を -6", "敵に毒 ×4 付与"]; },
      play(s) {
        s.enemyAgi = Math.max(1, s.enemyAgi + (-6)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
        api.addPoisonToEnemy(s, 4);
      },
    },
    ext5163: {
      libraryKey: "ext5163",
      extId: 5163,
      extNameJa: "ユグドラシル盆栽",
      skillNameJa: "生命の樹の恩寵",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 15, 20), "PHY\u3000+3", "INT\u3000+3"]; },
      peekHelpKeys() { return ["hp", "phy", "int"]; },
      previewLines(s) { return [`HP を回復係数 15〜20% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 15, 20)}）`, "PHY を +3", "INT を +3"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 15, 20);
        s.playerPhy += 3;
        s.playerInt += 3;
      },
    },
    ext5164: {
      libraryKey: "ext5164",
      extId: 5164,
      extNameJa: "若き魔王のメリケンサック",
      skillNameJa: "アビサルデーモンシャドウ",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 70, 80)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 70, 80)} ダメージ（PHY 70〜80%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 70, 80);
      },
    },
    ext5165: {
      libraryKey: "ext5165",
      extId: 5165,
      extNameJa: "メリーオルゴーラウンド",
      skillNameJa: "メロディゴーランド",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 70, 80)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 70, 80)} ダメージ（INT 70〜80%）`]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 70, 80);
      },
    },
    ext5169: {
      libraryKey: "ext5169",
      extId: 5169,
      extNameJa: "レッドドラゴンの右腕標本",
      skillNameJa: "竜炎知識の解放",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 35, 40)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 35, 40)} ダメージ（INT 35〜40%・1v1=単体）`]; },
      play(s) {
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 35, 40);
      },
    },
    ext5170: {
      libraryKey: "ext5170",
      extId: 5170,
      extNameJa: "パドマ・アーサナ",
      skillNameJa: "ディヤーナ",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 110, 130), "PHY\u3000+3", "出血 ×4（敵）"]; },
      peekHelpKeys() { return ["hp", "phy"]; },
      previewLines(s) { return [`HP を回復係数 110〜130% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 110, 130)}）`, "PHY を +3", "敵に出血 ×4 付与"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 110, 130);
        s.playerPhy += 3;
        api.addBleedToEnemy(s, 4);
      },
    },
    ext5171: {
      libraryKey: "ext5171",
      extId: 5171,
      extNameJa: "アトロポスの鋏",
      skillNameJa: "因果断絶",
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
    ext5172: {
      libraryKey: "ext5172",
      extId: 5172,
      extNameJa: "ハードウェアウォレット",
      skillNameJa: "ソウルバウンドトーメント",
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
    ext5173: {
      libraryKey: "ext5173",
      extId: 5173,
      extNameJa: "古代竜のタリスマン",
      skillNameJa: "幻龍の咆哮",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 30, 30)}`, "出血 ×4（敵）", "毒 ×4（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 30, 30)} ダメージ（INT 30〜30%）`, "敵に出血 ×4 付与", "敵に毒 ×4 付与"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 30, 30);
        api.addBleedToEnemy(s, 4);
        api.addPoisonToEnemy(s, 4);
      },
    },
    ext5174: {
      libraryKey: "ext5174",
      extId: 5174,
      extNameJa: "エンジェルセット",
      skillNameJa: "ヘブンリー・グレイス",
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
    ext5175: {
      libraryKey: "ext5175",
      extId: 5175,
      extNameJa: "精霊王の巻き角",
      skillNameJa: "精霊王の神気",
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
    ext5176: {
      libraryKey: "ext5176",
      extId: 5176,
      extNameJa: "妖精の森の山盛りベリータルト",
      skillNameJa: "ベリーの饗宴",
      skillIcon: "DBF_phy.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      effectSummaryLines() { return ["毒 ×4（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines() { return ["敵に毒 ×4 付与"]; },
      play(s) {
        api.addPoisonToEnemy(s, 4);
      },
    },
    ext5177: {
      libraryKey: "ext5177",
      extId: 5177,
      extNameJa: "ゴーレムクイーン",
      skillNameJa: "大地の女帝",
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
    ext5178: {
      libraryKey: "ext5178",
      extId: 5178,
      extNameJa: "マジックカード：光輝",
      skillNameJa: "コスモ・ノヴァ",
      skillIcon: "int.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 45, 50)}`, "INT\u3000+1"]; },
      peekHelpKeys() { return ["int"]; },
      previewLines(s) { return [`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 45, 50)} ダメージ（INT 45〜50%）`, "INT を +1"]; },
      play(s) {
        api.dealIntSkillToEnemy(s, 45, 50);
        s.playerInt += 1;
      },
    },
    ext5179: {
      libraryKey: "ext5179",
      extId: 5179,
      extNameJa: "トロイの木馬",
      skillNameJa: "ホロウ・ギフト",
      skillIcon: "DBF_int.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      effectSummaryLines() { return ["INT\u3000-4（敵）", "AGI\u3000-4（敵）", "出血 ×4（敵）"]; },
      peekHelpKeys() { return ["int", "agi"]; },
      previewLines() { return ["敵の INT を -4", "敵の AGI を -4", "敵に出血 ×4 付与"]; },
      play(s) {
        s.enemyInt = Math.max(1, s.enemyInt + (-4)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
        s.enemyAgi = Math.max(1, s.enemyAgi + (-4)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
        api.addBleedToEnemy(s, 4);
      },
    },
    ext5180: {
      libraryKey: "ext5180",
      extId: 5180,
      extNameJa: "大型猫&虹蛇じゃらし",
      skillNameJa: "虹色の幻惑",
      skillIcon: "DBF_agi.png",
      cost: 1,
      type: "skl",
      target: "enemy.foremost",
      effectSummaryLines() { return ["PHY\u3000-4（敵）", "AGI\u3000-4（敵）", "毒 ×4（敵）"]; },
      peekHelpKeys() { return ["phy", "agi"]; },
      previewLines() { return ["敵の PHY を -4", "敵の AGI を -4", "敵に毒 ×4 付与"]; },
      play(s) {
        s.enemyPhy = Math.max(1, s.enemyPhy + (-4)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
        s.enemyAgi = Math.max(1, s.enemyAgi + (-4)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
        api.addPoisonToEnemy(s, 4);
      },
    },
    ext5181: {
      libraryKey: "ext5181",
      extId: 5181,
      extNameJa: "セラフィックボード",
      skillNameJa: "天降の威圧",
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
    ext5182: {
      libraryKey: "ext5182",
      extId: 5182,
      extNameJa: "お城",
      skillNameJa: "エクスクイジット・ミニ・ランパート",
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
    ext5183: {
      libraryKey: "ext5183",
      extId: 5183,
      extNameJa: "ルシファーフレイル",
      skillNameJa: "失墜せし裁き",
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
    ext5184: {
      libraryKey: "ext5184",
      extId: 5184,
      extNameJa: "ガイアマイマイ",
      skillNameJa: "螺旋花泉",
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
    ext5185: {
      libraryKey: "ext5185",
      extId: 5185,
      extNameJa: "ダイヤモンドドラゴン",
      skillNameJa: "宝輝創世",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 55, 55)}`, "PHY\u3000+3", "AGI\u3000-6（敵）"]; },
      peekHelpKeys() { return ["phy", "agi"]; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 55, 55)} ダメージ（PHY 55〜55%）`, "PHY を +3", "敵の AGI を -6"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 55, 55);
        s.playerPhy += 3;
        s.enemyAgi = Math.max(1, s.enemyAgi + (-6)); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");
      },
    },
    ext5186: {
      libraryKey: "ext5186",
      extId: 5186,
      extNameJa: "スケールホーク",
      skillNameJa: "アイギスケイル・アクシグリフ",
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
    ext5187: {
      libraryKey: "ext5187",
      extId: 5187,
      extNameJa: "グングニル",
      skillNameJa: "因果収束",
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
    ext5188: {
      libraryKey: "ext5188",
      extId: 5188,
      extNameJa: "クレセントムーン",
      skillNameJa: "エターナル・リカーブ",
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
    ext5189: {
      libraryKey: "ext5189",
      extId: 5189,
      extNameJa: "アレキサンドライトドラゴン",
      skillNameJa: "イルミネーションレザルトバースト",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 30, 35)}`, `敵にダメージ\u3000${estIntHit(s.playerInt, s.enemyInt, 30, 35)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 30, 35)} ダメージ（PHY 30〜35%）`, `敵全体相当に ${estIntHit(s.playerInt, s.enemyInt, 30, 35)} ダメージ（INT 30〜35%・1v1=単体）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 30, 35);
        api.playBattleSe("area"); api.dealIntSkillToEnemy(s, 30, 35);
      },
    },
    ext5190: {
      libraryKey: "ext5190",
      extId: 5190,
      extNameJa: "天候操作装置ゼウス",
      skillNameJa: "嵐のアイギス",
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
    ext5191: {
      libraryKey: "ext5191",
      extId: 5191,
      extNameJa: "九頭龍大神の大好物",
      skillNameJa: "水神の恩寵",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 55, 60)}`]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 55, 60)} ダメージ（PHY 55〜60%）`]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 55, 60);
      },
    },
    ext5192: {
      libraryKey: "ext5192",
      extId: 5192,
      extNameJa: "スダルシャナ",
      skillNameJa: "刻の輪",
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
    ext5193: {
      libraryKey: "ext5193",
      extId: 5193,
      extNameJa: "アルテミスのボンネット",
      skillNameJa: "月光の慰撫",
      skillIcon: "hp.png",
      cost: 1,
      type: "skl",
      target: "self",
      effectSummaryLines(s) { return ["HP\u3000+" + estHealInt(s.playerInt, s.playerPhy, 65, 75), "INT\u3000+1"]; },
      peekHelpKeys() { return ["hp", "int"]; },
      previewLines(s) { return [`HP を回復係数 65〜75% 分回復（推定 +${estHealInt(s.playerInt, s.playerPhy, 65, 75)}）`, "INT を +1"]; },
      play(s) {
        api.healPlayerFromIntSkill(s, 65, 75);
        s.playerInt += 1;
      },
    },
    ext5194: {
      libraryKey: "ext5194",
      extId: 5194,
      extNameJa: "ゴールデンブレイバー",
      skillNameJa: "獅子咆哮",
      skillIcon: "phy.png",
      cost: 1,
      type: "atk",
      target: "enemy.foremost",
      effectSummaryLines(s) { return [`敵にダメージ\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 50, 60)}`, "毒 ×4（敵）"]; },
      peekHelpKeys() { return []; },
      previewLines(s) { return [`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 50, 60)} ダメージ（PHY 50〜60%）`, "敵に毒 ×4 付与"]; },
      play(s) {
        api.dealPhySkillToEnemy(s, 50, 60);
        api.addPoisonToEnemy(s, 4);
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
// ─── auto-generated CARD_RARITIES entries ───
  ext3001: 'rare',
  ext3002: 'rare',
  ext3003: 'rare',
  ext3004: 'rare',
  ext3005: 'rare',
  ext3006: 'rare',
  ext3007: 'rare',
  ext3008: 'rare',
  ext3009: 'rare',
  ext3010: 'rare',
  ext3011: 'rare',
  ext3012: 'rare',
  ext3013: 'rare',
  ext3014: 'rare',
  ext3015: 'rare',
  ext3016: 'rare',
  ext3017: 'rare',
  ext3018: 'rare',
  ext3019: 'rare',
  ext3020: 'rare',
  ext3021: 'rare',
  ext3022: 'rare',
  ext3023: 'rare',
  ext3024: 'rare',
  ext3025: 'rare',
  ext3026: 'rare',
  ext3027: 'rare',
  ext3028: 'rare',
  ext3029: 'rare',
  ext3030: 'rare',
  ext3031: 'rare',
  ext3032: 'rare',
  ext3033: 'rare',
  ext3034: 'rare',
  ext3035: 'rare',
  ext3036: 'rare',
  ext3037: 'rare',
  ext3038: 'rare',
  ext3039: 'rare',
  ext3040: 'rare',
  ext3041: 'rare',
  ext3042: 'rare',
  ext3043: 'rare',
  ext3044: 'rare',
  ext3045: 'rare',
  ext3046: 'rare',
  ext3047: 'rare',
  ext3048: 'rare',
  ext3049: 'rare',
  ext3050: 'rare',
  ext3051: 'rare',
  ext3055: 'rare',
  ext3056: 'rare',
  ext3057: 'rare',
  ext3058: 'rare',
  ext3059: 'rare',
  ext3060: 'rare',
  ext3061: 'rare',
  ext3062: 'rare',
  ext3063: 'rare',
  ext3064: 'rare',
  ext3065: 'rare',
  ext3066: 'rare',
  ext3067: 'rare',
  ext3068: 'rare',
  ext3069: 'rare',
  ext3070: 'rare',
  ext3071: 'rare',
  ext3072: 'rare',
  ext3073: 'rare',
  ext3074: 'rare',
  ext3075: 'rare',
  ext3079: 'rare',
  ext3080: 'rare',
  ext3081: 'rare',
  ext3082: 'rare',
  ext3083: 'rare',
  ext3085: 'rare',
  ext3086: 'rare',
  ext3087: 'rare',
  ext3088: 'rare',
  ext3089: 'rare',
  ext3090: 'rare',
  ext3091: 'rare',
  ext3092: 'rare',
  ext3093: 'rare',
  ext3094: 'rare',
  ext3095: 'rare',
  ext3096: 'rare',
  ext3097: 'rare',
  ext3098: 'rare',
  ext3099: 'rare',
  ext3100: 'rare',
  ext3101: 'rare',
  ext3102: 'rare',
  ext3103: 'rare',
  ext3104: 'rare',
  ext3105: 'rare',
  ext3106: 'rare',
  ext3107: 'rare',
  ext3108: 'rare',
  ext3109: 'rare',
  ext3110: 'rare',
  ext3111: 'rare',
  ext3112: 'rare',
  ext3113: 'rare',
  ext3115: 'rare',
  ext3116: 'rare',
  ext3117: 'rare',
  ext3118: 'rare',
  ext3119: 'rare',
  ext3120: 'rare',
  ext3121: 'rare',
  ext3122: 'rare',
  ext3123: 'rare',
  ext3124: 'rare',
  ext3125: 'rare',
  ext3126: 'rare',
  ext3127: 'rare',
  ext3128: 'rare',
  ext3129: 'rare',
  ext3130: 'rare',
  ext3131: 'rare',
  ext3132: 'rare',
  ext3133: 'rare',
  ext3134: 'rare',
  ext3135: 'rare',
  ext3136: 'rare',
  ext3137: 'rare',
  ext3138: 'rare',
  ext3139: 'rare',
  ext3140: 'rare',
  ext3141: 'rare',
  ext3142: 'rare',
  ext3143: 'rare',
  ext3147: 'rare',
  ext3148: 'rare',
  ext3149: 'rare',
  ext3150: 'rare',
  ext3151: 'rare',
  ext3152: 'rare',
  ext3153: 'rare',
  ext3154: 'rare',
  ext3155: 'rare',
  ext3156: 'rare',
  ext3157: 'rare',
  ext3158: 'rare',
  ext3159: 'rare',
  ext3160: 'rare',
  ext3161: 'rare',
  ext3162: 'rare',
  ext3163: 'rare',
  ext3164: 'rare',
  ext3165: 'rare',
  ext3169: 'rare',
  ext3170: 'rare',
  ext3171: 'rare',
  ext3172: 'rare',
  ext3173: 'rare',
  ext3174: 'rare',
  ext3175: 'rare',
  ext3176: 'rare',
  ext3177: 'rare',
  ext3178: 'rare',
  ext3179: 'rare',
  ext3180: 'rare',
  ext3181: 'rare',
  ext3182: 'rare',
  ext3183: 'rare',
  ext3184: 'rare',
  ext3185: 'rare',
  ext3186: 'rare',
  ext3187: 'rare',
  ext3188: 'rare',
  ext3189: 'rare',
  ext3190: 'rare',
  ext3191: 'rare',
  ext3192: 'rare',
  ext3193: 'rare',
  ext3194: 'rare',
  ext3600: 'rare',
  ext3640: 'rare',
  ext3647: 'rare',
  ext3651: 'rare',
  ext3674: 'rare',
// ─── auto-generated CARD_RARITIES entries ───
  ext4001: 'epic',
  ext4002: 'epic',
  ext4003: 'epic',
  ext4004: 'epic',
  ext4005: 'epic',
  ext4006: 'epic',
  ext4007: 'epic',
  ext4008: 'epic',
  ext4009: 'epic',
  ext4010: 'epic',
  ext4011: 'epic',
  ext4012: 'epic',
  ext4013: 'epic',
  ext4014: 'epic',
  ext4015: 'epic',
  ext4016: 'epic',
  ext4017: 'epic',
  ext4018: 'epic',
  ext4019: 'epic',
  ext4020: 'epic',
  ext4021: 'epic',
  ext4022: 'epic',
  ext4023: 'epic',
  ext4024: 'epic',
  ext4025: 'epic',
  ext4026: 'epic',
  ext4027: 'epic',
  ext4028: 'epic',
  ext4029: 'epic',
  ext4030: 'epic',
  ext4031: 'epic',
  ext4032: 'epic',
  ext4033: 'epic',
  ext4034: 'epic',
  ext4035: 'epic',
  ext4036: 'epic',
  ext4037: 'epic',
  ext4038: 'epic',
  ext4039: 'epic',
  ext4040: 'epic',
  ext4041: 'epic',
  ext4042: 'epic',
  ext4043: 'epic',
  ext4044: 'epic',
  ext4045: 'epic',
  ext4046: 'epic',
  ext4047: 'epic',
  ext4048: 'epic',
  ext4049: 'epic',
  ext4050: 'epic',
  ext4051: 'epic',
  ext4055: 'epic',
  ext4056: 'epic',
  ext4057: 'epic',
  ext4058: 'epic',
  ext4059: 'epic',
  ext4060: 'epic',
  ext4061: 'epic',
  ext4063: 'epic',
  ext4064: 'epic',
  ext4065: 'epic',
  ext4066: 'epic',
  ext4067: 'epic',
  ext4068: 'epic',
  ext4069: 'epic',
  ext4070: 'epic',
  ext4071: 'epic',
  ext4072: 'epic',
  ext4073: 'epic',
  ext4074: 'epic',
  ext4075: 'epic',
  ext4079: 'epic',
  ext4080: 'epic',
  ext4081: 'epic',
  ext4082: 'epic',
  ext4083: 'epic',
  ext4085: 'epic',
  ext4086: 'epic',
  ext4087: 'epic',
  ext4088: 'epic',
  ext4089: 'epic',
  ext4090: 'epic',
  ext4091: 'epic',
  ext4092: 'epic',
  ext4093: 'epic',
  ext4094: 'epic',
  ext4095: 'epic',
  ext4096: 'epic',
  ext4097: 'epic',
  ext4098: 'epic',
  ext4099: 'epic',
  ext4100: 'epic',
  ext4101: 'epic',
  ext4102: 'epic',
  ext4103: 'epic',
  ext4104: 'epic',
  ext4105: 'epic',
  ext4106: 'epic',
  ext4107: 'epic',
  ext4108: 'epic',
  ext4109: 'epic',
  ext4110: 'epic',
  ext4111: 'epic',
  ext4112: 'epic',
  ext4113: 'epic',
  ext4114: 'epic',
  ext4115: 'epic',
  ext4116: 'epic',
  ext4117: 'epic',
  ext4118: 'epic',
  ext4119: 'epic',
  ext4120: 'epic',
  ext4121: 'epic',
  ext4122: 'epic',
  ext4123: 'epic',
  ext4124: 'epic',
  ext4125: 'epic',
  ext4126: 'epic',
  ext4127: 'epic',
  ext4128: 'epic',
  ext4129: 'epic',
  ext4130: 'epic',
  ext4131: 'epic',
  ext4132: 'epic',
  ext4133: 'epic',
  ext4134: 'epic',
  ext4135: 'epic',
  ext4136: 'epic',
  ext4137: 'epic',
  ext4138: 'epic',
  ext4139: 'epic',
  ext4140: 'epic',
  ext4141: 'epic',
  ext4142: 'epic',
  ext4143: 'epic',
  ext4145: 'epic',
  ext4146: 'epic',
  ext4147: 'epic',
  ext4148: 'epic',
  ext4149: 'epic',
  ext4150: 'epic',
  ext4151: 'epic',
  ext4152: 'epic',
  ext4153: 'epic',
  ext4154: 'epic',
  ext4155: 'epic',
  ext4156: 'epic',
  ext4157: 'epic',
  ext4158: 'epic',
  ext4159: 'epic',
  ext4160: 'epic',
  ext4161: 'epic',
  ext4162: 'epic',
  ext4163: 'epic',
  ext4164: 'epic',
  ext4165: 'epic',
  ext4166: 'epic',
  ext4167: 'epic',
  ext4168: 'epic',
  ext4169: 'epic',
  ext4170: 'epic',
  ext4171: 'epic',
  ext4172: 'epic',
  ext4173: 'epic',
  ext4174: 'epic',
  ext4175: 'epic',
  ext4176: 'epic',
  ext4177: 'epic',
  ext4178: 'epic',
  ext4179: 'epic',
  ext4180: 'epic',
  ext4181: 'epic',
  ext4182: 'epic',
  ext4183: 'epic',
  ext4184: 'epic',
  ext4185: 'epic',
  ext4186: 'epic',
  ext4187: 'epic',
  ext4188: 'epic',
  ext4189: 'epic',
  ext4190: 'epic',
  ext4191: 'epic',
  ext4192: 'epic',
  ext4193: 'epic',
  ext4194: 'epic',
  ext4600: 'epic',
  ext4640: 'epic',
  ext4647: 'epic',
  ext4651: 'epic',
  ext4674: 'epic',
// ─── auto-generated CARD_RARITIES entries ───
  ext5001: 'legendary',
  ext5002: 'legendary',
  ext5003: 'legendary',
  ext5004: 'legendary',
  ext5005: 'legendary',
  ext5006: 'legendary',
  ext5008: 'legendary',
  ext5009: 'legendary',
  ext5010: 'legendary',
  ext5011: 'legendary',
  ext5012: 'legendary',
  ext5013: 'legendary',
  ext5014: 'legendary',
  ext5015: 'legendary',
  ext5016: 'legendary',
  ext5017: 'legendary',
  ext5018: 'legendary',
  ext5019: 'legendary',
  ext5020: 'legendary',
  ext5021: 'legendary',
  ext5022: 'legendary',
  ext5023: 'legendary',
  ext5024: 'legendary',
  ext5025: 'legendary',
  ext5026: 'legendary',
  ext5027: 'legendary',
  ext5028: 'legendary',
  ext5029: 'legendary',
  ext5030: 'legendary',
  ext5031: 'legendary',
  ext5032: 'legendary',
  ext5033: 'legendary',
  ext5034: 'legendary',
  ext5035: 'legendary',
  ext5036: 'legendary',
  ext5037: 'legendary',
  ext5038: 'legendary',
  ext5039: 'legendary',
  ext5040: 'legendary',
  ext5041: 'legendary',
  ext5042: 'legendary',
  ext5043: 'legendary',
  ext5044: 'legendary',
  ext5045: 'legendary',
  ext5046: 'legendary',
  ext5047: 'legendary',
  ext5048: 'legendary',
  ext5049: 'legendary',
  ext5050: 'legendary',
  ext5051: 'legendary',
  ext5055: 'legendary',
  ext5056: 'legendary',
  ext5057: 'legendary',
  ext5058: 'legendary',
  ext5059: 'legendary',
  ext5060: 'legendary',
  ext5061: 'legendary',
  ext5063: 'legendary',
  ext5064: 'legendary',
  ext5065: 'legendary',
  ext5066: 'legendary',
  ext5067: 'legendary',
  ext5068: 'legendary',
  ext5069: 'legendary',
  ext5070: 'legendary',
  ext5071: 'legendary',
  ext5072: 'legendary',
  ext5073: 'legendary',
  ext5074: 'legendary',
  ext5075: 'legendary',
  ext5078: 'legendary',
  ext5079: 'legendary',
  ext5080: 'legendary',
  ext5081: 'legendary',
  ext5082: 'legendary',
  ext5086: 'legendary',
  ext5087: 'legendary',
  ext5088: 'legendary',
  ext5089: 'legendary',
  ext5090: 'legendary',
  ext5091: 'legendary',
  ext5092: 'legendary',
  ext5093: 'legendary',
  ext5094: 'legendary',
  ext5095: 'legendary',
  ext5096: 'legendary',
  ext5097: 'legendary',
  ext5098: 'legendary',
  ext5099: 'legendary',
  ext5100: 'legendary',
  ext5102: 'legendary',
  ext5103: 'legendary',
  ext5104: 'legendary',
  ext5105: 'legendary',
  ext5106: 'legendary',
  ext5107: 'legendary',
  ext5108: 'legendary',
  ext5109: 'legendary',
  ext5110: 'legendary',
  ext5111: 'legendary',
  ext5112: 'legendary',
  ext5113: 'legendary',
  ext5114: 'legendary',
  ext5115: 'legendary',
  ext5116: 'legendary',
  ext5117: 'legendary',
  ext5118: 'legendary',
  ext5119: 'legendary',
  ext5120: 'legendary',
  ext5121: 'legendary',
  ext5122: 'legendary',
  ext5123: 'legendary',
  ext5124: 'legendary',
  ext5125: 'legendary',
  ext5126: 'legendary',
  ext5127: 'legendary',
  ext5128: 'legendary',
  ext5129: 'legendary',
  ext5130: 'legendary',
  ext5131: 'legendary',
  ext5132: 'legendary',
  ext5133: 'legendary',
  ext5134: 'legendary',
  ext5135: 'legendary',
  ext5136: 'legendary',
  ext5137: 'legendary',
  ext5138: 'legendary',
  ext5139: 'legendary',
  ext5140: 'legendary',
  ext5141: 'legendary',
  ext5142: 'legendary',
  ext5143: 'legendary',
  ext5144: 'legendary',
  ext5147: 'legendary',
  ext5148: 'legendary',
  ext5149: 'legendary',
  ext5150: 'legendary',
  ext5151: 'legendary',
  ext5152: 'legendary',
  ext5153: 'legendary',
  ext5154: 'legendary',
  ext5155: 'legendary',
  ext5156: 'legendary',
  ext5157: 'legendary',
  ext5158: 'legendary',
  ext5159: 'legendary',
  ext5160: 'legendary',
  ext5161: 'legendary',
  ext5162: 'legendary',
  ext5163: 'legendary',
  ext5164: 'legendary',
  ext5165: 'legendary',
  ext5169: 'legendary',
  ext5170: 'legendary',
  ext5171: 'legendary',
  ext5172: 'legendary',
  ext5173: 'legendary',
  ext5174: 'legendary',
  ext5175: 'legendary',
  ext5176: 'legendary',
  ext5177: 'legendary',
  ext5178: 'legendary',
  ext5179: 'legendary',
  ext5180: 'legendary',
  ext5181: 'legendary',
  ext5182: 'legendary',
  ext5183: 'legendary',
  ext5184: 'legendary',
  ext5185: 'legendary',
  ext5186: 'legendary',
  ext5187: 'legendary',
  ext5188: 'legendary',
  ext5189: 'legendary',
  ext5190: 'legendary',
  ext5191: 'legendary',
  ext5192: 'legendary',
  ext5193: 'legendary',
  ext5194: 'legendary',
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
