/**
 * 敵マスタ（SPEC-004 §6.3, §7.3, §8.3）
 * intentRota: ターンごとに順番に実行。末尾まで来たら先頭へループ。
 *
 * kind の一覧:
 *   attack          : PHY 物理ダメージ { phyPct }
 *   attackPoison    : PHY ダメージ + プレイヤーに毒付与 { phyPct, poisonStacks }
 *   attackBleed     : PHY ダメージ + プレイヤーに出血付与 { phyPct, bleedStacks }
 *   attackDouble    : PHY ダメージ 2 回 { phyPct }
 *   attackInt       : INT ダメージ { intPct }
 *   healSelf        : 自身の最大 HP pct% を回復 { pct }
 *   buffSelf        : 自身の PHY/INT を永続アップ { phyAdd?, intAdd? }
 *   guard           : ガード付与 { value }
 *   special         : 最大 HP pct% 特殊ダメージ（シールドのみ有効） { pct }
 */
export const ENEMY_DEFS = {

  /* ═══════════════════════════════════════
     章 1 ── 戦国回廊
  ═══════════════════════════════════════ */
  'sn-001': {
    id: 'sn-001', name: '足軽',
    hp: 18, phy: 10, int: 4, agi: 6, imgId: 314,
    intentRota: [
      { kind: 'attack', phyPct: 90 },
      { kind: 'attack', phyPct: 100 },
      { kind: 'guard',  value: 6 },
    ],
  },
  'sn-002': {
    id: 'sn-002', name: '弓兵',
    hp: 14, phy: 8, int: 6, agi: 12, imgId: 311,
    intentRota: [
      { kind: 'attack', phyPct: 80 },
      { kind: 'attack', phyPct: 110 },
    ],
  },
  'sn-003': {
    id: 'sn-003', name: '甲冑武者',
    hp: 26, phy: 14, int: 4, agi: 4, imgId: 312,
    intentRota: [
      { kind: 'guard',  value: 8 },
      { kind: 'attack', phyPct: 130 },
    ],
  },

  /* ═══════════════════════════════════════
     章 2 ── 大航海の港
  ═══════════════════════════════════════ */
  'vp-001': {
    id: 'vp-001', name: '海賊水兵',
    hp: 22, phy: 12, int: 6, agi: 8, imgId: 314,
    intentRota: [
      { kind: 'attack', phyPct: 100 },
      { kind: 'attack', phyPct: 90 },
      { kind: 'guard',  value: 6 },
    ],
  },
  'vp-002': {
    id: 'vp-002', name: '毒矢射手',
    hp: 18, phy: 10, int: 8, agi: 10, imgId: 311,
    intentRota: [
      { kind: 'attackPoison', phyPct: 70, poisonStacks: 2 },
      { kind: 'attack',       phyPct: 90 },
    ],
  },
  'vp-003': {
    id: 'vp-003', name: '出血斬り',
    hp: 24, phy: 14, int: 4, agi: 8, imgId: 312,
    intentRota: [
      { kind: 'attackBleed', phyPct: 80, bleedStacks: 2 },
      { kind: 'guard',       value: 6 },
    ],
  },
  'vp-004': {
    id: 'vp-004', name: '海賊頭目',
    hp: 38, phy: 18, int: 8, agi: 10, imgId: 418,
    intentRota: [
      { kind: 'attack',       phyPct: 110 },
      { kind: 'guard',        value: 10 },
      { kind: 'attackDouble', phyPct: 80 },
    ],
  },

  /* ═══════════════════════════════════════
     章 3 ── 決定の街
  ═══════════════════════════════════════ */
  'en-301': {
    id: 'en-301', name: '衛兵長',
    hp: 30, phy: 16, int: 8, agi: 10, imgId: 314,
    intentRota: [
      { kind: 'attack',       phyPct: 110 },
      { kind: 'attackDouble', phyPct: 80 },
      { kind: 'guard',        value: 10 },
    ],
  },
  'en-302': {
    id: 'en-302', name: '司教',
    hp: 24, phy: 6, int: 18, agi: 8, imgId: 311,
    intentRota: [
      { kind: 'attackInt', intPct: 110 },
      { kind: 'healSelf',  pct: 20 },
      { kind: 'attackInt', intPct: 90 },
    ],
  },
  'en-303': {
    id: 'en-303', name: '革命家',
    hp: 28, phy: 14, int: 12, agi: 14, imgId: 312,
    intentRota: [
      { kind: 'attack',   phyPct: 80 },
      { kind: 'buffSelf', phyAdd: 5 },
      { kind: 'attack',   phyPct: 110 },
    ],
  },
  'en-304': {
    id: 'en-304', name: '親衛隊',
    hp: 50, phy: 22, int: 10, agi: 12, imgId: 418,
    intentRota: [
      { kind: 'attackDouble', phyPct: 100 },
      { kind: 'guard',        value: 14 },
      { kind: 'special',      pct: 15 },
    ],
  },
};
