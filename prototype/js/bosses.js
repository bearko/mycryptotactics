/**
 * ボスマスタ（SPEC-004 §6.5, §7.5, §8.5）
 * 名称・imgId は MyCryptoHeroes 原作準拠（ゴースト系英雄）
 * phases: 配列なら HP% 閾値でフェーズ移行。
 */
export const BOSS_DEFS = {

  'boss-ch1': {
    id: 'boss-ch1',
    name: 'ゴースト・上杉謙信',
    hp: 60, phy: 16, int: 6, agi: 6, imgId: 425,
    initialShield: 0,
    intentRota: [
      { kind: 'guard',   value: 10 },
      { kind: 'attack',  phyPct: 110 },
      { kind: 'attack',  phyPct: 110 },
      { kind: 'special', pct: 15 },
    ],
  },

  'boss-hl': {
    id: 'boss-hl',
    name: 'ゴースト・ビスマルク',
    hp: 80, phy: 17, int: 9, agi: 7, imgId: 435,
    initialShield: 0,
    intentRota: [
      { kind: 'attack',      phyPct: 100 },
      { kind: 'guard',       value: 12 },
      { kind: 'attackBleed', phyPct: 90, bleedStacks: 1 },
      { kind: 'special',     pct: 12 },
      { kind: 'buffSelf',    phyAdd: 3, intAdd: 2 },
    ],
  },

  'boss-ch2': {
    id: 'boss-ch2',
    name: 'ゴースト・ナポレオン',
    hp: 100, phy: 18, int: 12, agi: 8, imgId: 445,
    initialShield: 0,
    intentRota: [
      { kind: 'attackPoison',    phyPct: 100, poisonStacks: 2 },
      { kind: 'guard',           value: 12 },
      { kind: 'attackIntDouble', intPct: 100 },
      { kind: 'special',         pct: 20 },
    ],
  },

  'boss-ch3': {
    id: 'boss-ch3',
    name: 'ゴースト・リンカーン',
    hp: 180, phy: 22, int: 18, agi: 10, imgId: 505,
    initialShield: 30,
    phases: [
      {
        // フェーズ 1: HP > 50%
        hpThresholdPct: 50,
        intentRota: [
          { kind: 'attack',    phyPct: 100 },
          { kind: 'attackInt', intPct: 100 },
          { kind: 'guard',     value: 14 },
          { kind: 'special',   pct: 18 },
          { kind: 'buffSelf',  phyAdd: 5, intAdd: 5 },
        ],
      },
      {
        // フェーズ 2: HP ≤ 50%
        hpThresholdPct: 0,
        intentRota: [
          { kind: 'attack',    phyPct: 130 },
          { kind: 'special',   pct: 25 },
          { kind: 'attackInt', intPct: 130 },
          { kind: 'special',   pct: 25 },
        ],
      },
    ],
  },
};
