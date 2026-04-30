/**
 * 章定義（SPEC-004 §6〜§8）
 * cardPool: cards.js の CARD_LIBRARY のキー。報酬とショップで使用。
 * 章 N の報酬プールは章 1〜N の cardPool を累積する（main.js 側で処理）。
 */
export const CHAPTERS = [
  {
    id: 1,
    name: '戦国回廊',
    mapRules: {
      layers: 4,
      nodesPerLayerMin: 3,
      nodesPerLayerMax: 4,
      nodeRatios: { fight: 0.60, rest: 0.15, shop: 0.10, elite: 0.10, event: 0.05 },
    },
    enemyPool: ['sn-001', 'sn-002', 'sn-003'],
    elitePool: ['sn-003'],
    cardPool: ['cd101', 'cd102', 'cd103', 'cd104', 'cd105', 'cd106', 'cd107', 'cd108'],
    bossId: 'boss-ch1',
    bossRewardGold: 50,
  },
  {
    id: 2,
    name: '大航海の港',
    mapRules: {
      layers: 5,
      nodesPerLayerMin: 3,
      nodesPerLayerMax: 5,
      nodeRatios: { fight: 0.50, rest: 0.15, shop: 0.15, elite: 0.10, event: 0.10 },
    },
    enemyPool: ['vp-001', 'vp-002', 'vp-003'],
    elitePool: ['vp-004'],
    cardPool: ['cd201', 'cd202', 'cd203', 'cd204', 'cd205', 'cd206'],
    bossId: 'boss-ch2',
    bossRewardGold: 80,
  },
  {
    id: 3,
    name: '決定の街',
    mapRules: {
      layers: 5,
      nodesPerLayerMin: 3,
      nodesPerLayerMax: 5,
      nodeRatios: { fight: 0.45, rest: 0.10, shop: 0.15, elite: 0.15, event: 0.15 },
    },
    enemyPool: ['en-301', 'en-302', 'en-303'],
    elitePool: ['en-304'],
    cardPool: ['cd301', 'cd302', 'cd303', 'cd304', 'cd305'],
    bossId: 'boss-ch3',
    bossRewardGold: 120,
  },
];
