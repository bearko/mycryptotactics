/**
 * passives-sample.js — SPEC-006 §18: 動作確認用の手動変換サンプル
 *
 * Phase 4j 完了時には content 担当の codemod 出力 (passives-generated.js) で
 * 全 210 体を一括変換する。本 SAMPLE_PASSIVES は手検証済みの 5 体で、
 * `init()` で PASSIVES の後に register することで上書きする (後勝ち)。
 *
 * PassiveDef shape は passive-runtime.js のコメント参照。
 * notes? フィールドは QA/監査用のメモで runtime は読まない (PR #76 codemod が
 * fallback 適用箇所に自動で書き込むほか、手動修正時もここに根拠を残せる)。
 *
 * 既存 hardcoded apply*Passive 関数からの変換例:
 * - kaihime, zhang, doyle: 既存 3 体 (legacy → DSL)
 * - seton (1004 Common): combat.started + damage + status
 * - schubert (2004 Uncommon): self.died + revive (case A: hasResurrection 廃止)
 */

export const SAMPLE_PASSIVES = {
  // ─── Common (legacy 3 体: kaihime / zhang / doyle) ────────────
  // 甲斐姫 (1002): 自身がカード使用後、50% で先頭敵に PHY×0.5 追加ダメ
  kaihime: {
    passiveKey: "kaihime",
    trigger: "self.cardPlayed",
    triggerRate: 0.50,
    oncePerCombat: false, // カード使用ごとに判定 (繰り返し発動)
    effects: [
      { target: "enemy.foremost", action: "damage", coef: { phy: 0.5 } },
    ],
    cutinSkillName: "浪切",
  },

  // 張遼 (1003): 被ダメ後 50% で反撃 (PHY×0.2)
  zhang: {
    passiveKey: "zhang",
    trigger: "self.tookDamage",
    triggerRate: 0.50,
    oncePerCombat: false,
    effects: [
      { target: "enemy.foremost", action: "damage", coef: { phy: 0.2 } },
    ],
    cutinSkillName: "遼来遼来",
  },

  // コナン・ドイル (1001): HP < 70% で 1 回だけ INT +3
  doyle: {
    passiveKey: "doyle",
    trigger: "self.hpBelow",
    threshold: 0.70,
    oncePerCombat: true,
    effects: [
      { target: "self", action: "buffStat", stat: "int", value: 3 },
    ],
    cutinSkillName: "シャーロック・ホームズ",
  },

  // ─── Common (PR #50 サンプル) ──────────────────────────────────
  // シートン (1004): 戦闘開始時、敵に INT 40% ダメージ + 出血 1
  seton: {
    passiveKey: "seton",
    trigger: "combat.started",
    oncePerCombat: true,
    effects: [
      { target: "enemy.foremost", action: "damage", coef: { int: 0.4 } },
      { target: "enemy.foremost", action: "applyStatus", status: "bleed", stacks: 1 },
    ],
    cutinSkillName: "狼王ロボ",
  },

  // ─── Uncommon (PR #52 復活系サンプル) ──────────────────────────
  // シューベルト (2004): 死亡時に HP 20% で復活 (hasResurrection フラグ廃止)
  schubert: {
    passiveKey: "schubert",
    trigger: "self.died",
    oncePerCombat: true,
    effects: [
      { target: "self", action: "revive", coef: { hpRatio: 0.20 } },
    ],
    cutinSkillName: "魔王",
    notes: "PR #52 で hasResurrection フラグから revive action 直接実行に切替 (§18.6.3 case A)。同期実行制約 §18.6.1 で applyHpDeltaToHero 内同期発動",
  },
};
