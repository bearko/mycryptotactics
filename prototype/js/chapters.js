/**
 * 章定義（SPEC-004 §6〜§8）
 * cardPool: cards.js の CARD_LIBRARY のキー。報酬とショップで使用。
 * 章 N の報酬プールは章 1〜N の cardPool を累積する（main.js 側で処理）。
 *
 * extSeries: 表示専用フレーバー。元タイトル「ノードVer.x」更新の歴史を踏襲し、
 *   各章で「あの頃のドロップ」を体感する仕掛け（main.js 側でマップヘッダーに表示）。
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
    cardPool: ['cd101', 'cd102', 'cd103', 'cd104', 'cd105', 'cd106', 'cd107', 'cd108', 'ext2004',
      // 三国志陣のパーツ（C-1 JIN）
      'cardZhang', 'cardLubu', 'cardZhaoyun'],
    bossId: 'boss-ch1',
    bossRewardGold: 50,
    extSeries: {
      nodeVer: 'Ver 1.1',
      era: 'Eco 1.0 (Lab/GUM)',
      items: ['カタナ', 'ブック', 'リング', 'シールド'],
    },
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
    cardPool: ['cdH01', 'cdH02', 'cdH03', 'cdH04', 'cdH05', 'cdH06',
      // 西洋革命陣のパーツ（C-1 JIN）
      'cardNapoleon', 'cardLincoln', 'cardRobinhood'],
    bossId: 'boss-hl',
    bossRewardGold: 70,
    extSeries: {
      nodeVer: 'Ver 1.2',
      era: 'ランド時代',
      items: ['ハルバード', 'スクロール', 'ネックレス', 'カブト'],
    },
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
    extSeries: {
      nodeVer: 'Ver 1.5',
      era: 'JIN試験時代',
      items: ['ナイフ', 'リソグラフィ', 'アルケブス', 'ウィップ'],
    },
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
    extSeries: {
      nodeVer: 'Ver 1.6',
      era: 'Eco 3.0 / MCHC時代',
      items: ['シックル', 'ワンド', 'サケ', 'ハット'],
    },
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
    cardPool: [
      'cd301', 'cd302', 'cd303', 'cd304', 'cd305',
      'cd201', 'cd202', 'cd203', 'cd204', 'cd205', 'cd206',
      'cdH01', 'cdH02', 'cdH03', 'cdH04',
    ],
    bossId: 'boss-troy',
    bossRewardGold: 180,
    extSeries: {
      nodeVer: 'Ver 1.8',
      era: 'MCH Verse時代',
      items: ['スタッフ', 'ホーキ', 'ヨロイ'],
    },
  },
];
