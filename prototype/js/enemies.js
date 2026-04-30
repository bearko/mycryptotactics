/**
 * 敵マスタ（SPEC-004 §6.3, §7.3, §8.3）
 * 名称・imgId は MyCryptoHeroes 原作準拠
 *   フラペチーノ系（白色外見）= レアエネミー
 *   ゴースト系 = ボス
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
 *
 * imgId 早見表（Image/Enemies/{id}.png）:
 *   クリーパー        101(ショート) 102(トール) 103(グランデ) 104(ヴェンティ) 105(マキアート) 106(フラペチーノ★)
 *   エルククローナ    111-116 (★=116)
 *   ハートブリード    121-126 (★=126)
 *   メリッサ          131-136 (★=136)
 *   バイトバンディット 161-166 (★=166)
 *   ベーグル          181-186 (★=186)
 *   カスケード        375-380 (★=380)
 *   ラビット          386-391 (★=391)  Doppio: 392-396
 *   ラブレター        397-402 (★=402)
 *   カメレオン        408-413 (★=413)  フラペチーノ ドッピオ=418
 */
export const ENEMY_DEFS = {

  /* ═══════════════════════════════════════
     章 1 ── node : アバカス
  ═══════════════════════════════════════ */
  'sn-001': {
    id: 'sn-001', name: 'クリーパー ヴェンティ',
    hp: 18, phy: 10, int: 4, agi: 6, imgId: 104,
    intentRota: [
      { kind: 'attack', phyPct: 90 },
      { kind: 'attack', phyPct: 100 },
      { kind: 'guard',  value: 6 },
    ],
  },
  'sn-002': {
    id: 'sn-002', name: 'エルククローナ ヴェンティ',
    hp: 14, phy: 8, int: 6, agi: 12, imgId: 114,
    intentRota: [
      { kind: 'attack', phyPct: 80 },
      { kind: 'attack', phyPct: 110 },
    ],
  },
  'sn-003': {
    id: 'sn-003', name: 'メリッサ ヴェンティ',
    hp: 26, phy: 14, int: 4, agi: 4, imgId: 134,
    intentRota: [
      { kind: 'guard',  value: 8 },
      { kind: 'attack', phyPct: 130 },
    ],
  },
  // ★ レアエネミー（フラペチーノ = 白色外見）
  'sn-e01': {
    id: 'sn-e01', name: 'クリーパー フラペチーノ',
    hp: 32, phy: 16, int: 6, agi: 8, imgId: 106,
    intentRota: [
      { kind: 'guard',  value: 10 },
      { kind: 'attack', phyPct: 130 },
      { kind: 'attack', phyPct: 110 },
    ],
  },

  /* ═══════════════════════════════════════
     章 2 ── node : アタナソフ
  ═══════════════════════════════════════ */
  'vp-001': {
    id: 'vp-001', name: 'カスケード ヴェンティ',
    hp: 22, phy: 12, int: 6, agi: 8, imgId: 378,
    intentRota: [
      { kind: 'attack', phyPct: 100 },
      { kind: 'attack', phyPct: 90 },
      { kind: 'guard',  value: 6 },
    ],
  },
  'vp-002': {
    id: 'vp-002', name: 'ラビット ヴェンティ',
    hp: 18, phy: 10, int: 8, agi: 10, imgId: 389,
    intentRota: [
      { kind: 'attackPoison', phyPct: 70, poisonStacks: 2 },
      { kind: 'attack',       phyPct: 90 },
    ],
  },
  'vp-003': {
    id: 'vp-003', name: 'バイトバンディット グランデ',
    hp: 24, phy: 14, int: 4, agi: 8, imgId: 163,
    intentRota: [
      { kind: 'attackBleed', phyPct: 80, bleedStacks: 2 },
      { kind: 'guard',       value: 6 },
    ],
  },
  // ★ レアエネミー
  'vp-e01': {
    id: 'vp-e01', name: 'カスケード フラペチーノ',
    hp: 42, phy: 18, int: 8, agi: 10, imgId: 380,
    intentRota: [
      { kind: 'attack',       phyPct: 110 },
      { kind: 'guard',        value: 10 },
      { kind: 'attackDouble', phyPct: 80 },
    ],
  },

  /* ═══════════════════════════════════════
     章 3 ── node : アンティキティラ
  ═══════════════════════════════════════ */
  'en-301': {
    id: 'en-301', name: 'ベーグル ヴェンティ',
    hp: 30, phy: 16, int: 8, agi: 10, imgId: 184,
    intentRota: [
      { kind: 'attack',       phyPct: 110 },
      { kind: 'attackDouble', phyPct: 80 },
      { kind: 'guard',        value: 10 },
    ],
  },
  'en-302': {
    id: 'en-302', name: 'ラブレター マキアート',
    hp: 24, phy: 6, int: 18, agi: 8, imgId: 401,
    intentRota: [
      { kind: 'attackInt', intPct: 110 },
      { kind: 'healSelf',  pct: 20 },
      { kind: 'attackInt', intPct: 90 },
    ],
  },
  'en-303': {
    id: 'en-303', name: 'ラビット マキアート ドッピオ',
    hp: 28, phy: 14, int: 12, agi: 14, imgId: 395,
    intentRota: [
      { kind: 'attack',   phyPct: 80 },
      { kind: 'buffSelf', phyAdd: 5 },
      { kind: 'attack',   phyPct: 110 },
    ],
  },
  // ★ レアエネミー
  'en-e01': {
    id: 'en-e01', name: 'ベーグル フラペチーノ',
    hp: 55, phy: 22, int: 10, agi: 12, imgId: 186,
    intentRota: [
      { kind: 'attackDouble', phyPct: 100 },
      { kind: 'guard',        value: 14 },
      { kind: 'special',      pct: 15 },
    ],
  },
};
