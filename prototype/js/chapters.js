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
    // SPEC-006 cleanup: MCH 公式エクステに統一 (旧 cd101-cd108 削除)
    cardPool: [
      // ノービス系 (ext10xx common): ブレード/マスケット/ペン/カタナ/ブック/アックス/シールド/ホース
      'ext1001', 'ext1002', 'ext1003', 'ext1006', 'ext1008', 'ext1011', 'ext1010', 'ext1005',
      'ext2004', // エリートアーマー (uncommon、デッキバリエーション用)
    ],
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
    // SPEC-006 cleanup: MCH 公式エクステに統一 (旧 cdH01-cdH06 削除)
    cardPool: [
      // エリート系 (ext20xx uncommon): ブレード/マスケット/ペン/カタナ/ホース/ブック
      'ext2001', 'ext2002', 'ext2003', 'ext2006', 'ext2005', 'ext2008',
    ],
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
    // SPEC-006 cleanup: MCH 公式エクステに統一 (旧 cd301-cd305 削除)
    cardPool: [
      // ブレイブ系 (ext30xx rare): ブレード/マスケット/ペン/アーマー/カタナ
      'ext3001', 'ext3002', 'ext3003', 'ext3004', 'ext3006',
    ],
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
    // SPEC-006 cleanup: MCH 公式エクステに統一 (旧 cd201-cd206 削除)
    cardPool: [
      // エリート系 (ext20xx uncommon): アックス/ユミ/シールド/リング/カタナ/ブック
      'ext2011', 'ext2013', 'ext2010', 'ext2009', 'ext2006', 'ext2008',
    ],
    bossId: 'boss-ch2',
    bossRewardGold: 120,
  },
  // ─── 章 4 ─────────────────────────────────────────────────────────
  {
    id: 5,
    name: 'node : トロイ',
    bgId: '1037',
    mapRules: {
      layers: 6,
      nodesPerLayerMin: 3,
      nodesPerLayerMax: 5,
      // エリート出現率を高め・休憩を少なくして難易度を底上げ
      nodeRatios: { fight: 0.38, rest: 0.07, shop: 0.13, elite: 0.20, craft: 0.10, event: 0.12 },
    },
    enemyPool: ['tr-001', 'tr-002', 'tr-003'],
    elitePool: ['tr-e01'],
    // SPEC-006 cleanup: MCH 公式エクステに統一 (旧 cd201-305 / cdH01-04 削除)
    cardPool: [
      // ブレイブ系 (rare): ブレード/マスケット/カタナ/ペン/アーマー
      'ext3001', 'ext3002', 'ext3006', 'ext3003', 'ext3004',
      // ブレイブ系追加: ホース/アックス/シールド
      'ext3005', 'ext3011', 'ext3010',
      // エリート系 (uncommon、章 4 でも継続出現): ブレード/マスケット/ペン
      'ext2001', 'ext2002', 'ext2003',
    ],
    bossId: 'boss-troy',
    bossRewardGold: 180,
  },
];
