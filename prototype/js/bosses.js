/**
 * ボスマスタ（SPEC-004 §6.5, §7.5, §8.5）
 * phases: 配列なら HP% 閾値でフェーズ移行。
 * intentRota を直接持つ場合はシングルフェーズ。
 */
export const BOSS_DEFS = {

  'boss-ch1': {
    id: 'boss-ch1',
    name: '戦国の覇者',
    hp: 60, phy: 16, int: 6, agi: 6, imgId: 505,
    initialShield: 0,
    intentRota: [
      { kind: 'guard',   value: 10 },
      { kind: 'attack',  phyPct: 110 },
      { kind: 'attack',  phyPct: 110 },
      { kind: 'special', pct: 15 },
    ],
  },

  'boss-ch2': {
    id: 'boss-ch2',
    name: '港の総督',
    hp: 100, phy: 18, int: 12, agi: 8, imgId: 505,
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
    name: '決定者',
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
