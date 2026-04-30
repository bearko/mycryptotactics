/**
 * 章定義（SPEC-004 §6〜§8）
 * cardPool: cards.js の CARD_LIBRARY のキー。報酬とショップで使用。
 * 章 N の報酬プールは章 1〜N の cardPool を累積する（main.js 側で処理）。
 */
export const CHAPTERS = [
  // ─── 章 0 ─────────────────────────────────────────────────────────
  {
    id: 1,
    name: 'node : アバカス',
    bgId: '1023',
    mapRules: {
      layers: 10,
      nodesPerLayerMin: 3,
      nodesPerLayerMax: 4,
      nodeRatios: { fight: 0.50, rest: 0.15, shop: 0.10, elite: 0.10, craft: 0.08, event: 0.07 },
    },
    enemyPool: ['sn-001', 'sn-002', 'sn-003'],
    elitePool: ['sn-e01'],
    cardPool: ['cd101', 'cd102', 'cd103', 'cd104', 'cd105', 'cd106', 'cd107', 'cd108', 'ext2004'],
    bossId: 'boss-ch1',
    bossRewardGold: 50,
  },
  // ─── 章 1 ─────────────────────────────────────────────────────────
  {
    id: 2,
    name: 'node : ホレリス',
    bgId: '1038',
    mapRules: {
      layers: 5,
      nodesPerLayerMin: 3,
      nodesPerLayerMax: 5,
      nodeRatios: { fight: 0.47, rest: 0.13, shop: 0.10, elite: 0.12, craft: 0.10, event: 0.08 },
    },
    enemyPool: ['hl-001', 'hl-002', 'hl-003'],
    elitePool: ['hl-e01'],
    cardPool: ['cdH01', 'cdH02', 'cdH03', 'cdH04', 'cdH05', 'cdH06'],
    bossId: 'boss-hl',
    bossRewardGold: 70,
  },
  // ─── 章 2 ─────────────────────────────────────────────────────────
  {
    id: 3,
    name: 'node : アンティキティラ',
    bgId: '1037',
    mapRules: {
      layers: 5,
      nodesPerLayerMin: 3,
      nodesPerLayerMax: 5,
      nodeRatios: { fight: 0.37, rest: 0.10, shop: 0.13, elite: 0.15, craft: 0.10, event: 0.15 },
    },
    enemyPool: ['en-301', 'en-302', 'en-303'],
    elitePool: ['en-e01'],
    cardPool: ['cd301', 'cd302', 'cd303', 'cd304', 'cd305'],
    bossId: 'boss-ch3',
    bossRewardGold: 100,
  },
  // ─── 章 3 ─────────────────────────────────────────────────────────
  {
    id: 4,
    name: 'node : アタナソフ',
    bgId: '1053',
    mapRules: {
      layers: 5,
      nodesPerLayerMin: 3,
      nodesPerLayerMax: 5,
      nodeRatios: { fight: 0.42, rest: 0.13, shop: 0.13, elite: 0.10, craft: 0.10, event: 0.12 },
    },
    enemyPool: ['vp-001', 'vp-002', 'vp-003'],
    elitePool: ['vp-e01'],
    cardPool: ['cd201', 'cd202', 'cd203', 'cd204', 'cd205', 'cd206'],
    bossId: 'boss-ch2',
    bossRewardGold: 120,
  },
];
