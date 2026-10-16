// #9 / SPEC-003 §9.2: 戦闘数式の純関数 (prototype/js/battle-mch.js) を Node 標準だけで守る。
// 実行: node --test tests/*.test.mjs  （または node tests/battle-mch.test.mjs）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cutRateFromPhy, cutRateFromInt, randomSkillRatePct,
  phyIntDamageAfterCut, criticalBonusDamage,
  healingCoefficientIntCaster, healingCoefficientPhyCaster,
  critRateFromAgi, rollCrit, applyDamageThroughShield,
} from '../prototype/js/battle-mch.js';

/** Math.random を固定して fn を呼ぶ */
function withRandom(value, fn) {
  const orig = Math.random;
  Math.random = () => value;
  try { return fn(); } finally { Math.random = orig; }
}

test('カット率 = min(40, floor(値 / 2))', () => {
  assert.equal(cutRateFromPhy(0), 0);
  assert.equal(cutRateFromPhy(15), 7);
  assert.equal(cutRateFromPhy(80), 40);
  assert.equal(cutRateFromPhy(200), 40);   // 上限 40%
  assert.equal(cutRateFromInt(9), 4);
  assert.equal(cutRateFromInt(81), 40);
});

test('PHY 依存ダメージ（カット率込み、切り捨て）', () => {
  // PHY 20 × 150% = 30、 カット 10% → 27
  assert.equal(phyIntDamageAfterCut(20, 150, cutRateFromPhy(20)), 27);
  // カット 0% はそのまま
  assert.equal(phyIntDamageAfterCut(20, 100, 0), 20);
  // 小数は切り捨て: 7 × 110% = 7.7、 カット 4% → 7.392 → 7
  assert.equal(phyIntDamageAfterCut(7, 110, 4), 7);
  // 負にならない
  assert.equal(phyIntDamageAfterCut(10, 100, 150), 0);
});

test('INT 依存ダメージ（カット率込み）', () => {
  // INT 23 × 120% = 27.6、 敵 INT 8 → カット 4% → 26.496 → 26
  assert.equal(phyIntDamageAfterCut(23, 120, cutRateFromInt(8)), 26);
});

test('クリティカル加算は基礎値で再計算する', () => {
  // phy: 基礎 PHY 30 × 100%、 防御側の基礎 PHY 20 → カット 10% → 27
  assert.equal(criticalBonusDamage(30, 100, 20, 'phy'), 27);
  // int: 防御側の基礎 INT 100 → カット上限 40% → 30 × 100% × 0.6 = 18
  assert.equal(criticalBonusDamage(30, 100, 100, 'int'), 18);
});

test('回復係数', () => {
  assert.equal(healingCoefficientIntCaster(20, 10), 15);   // (術者 INT + 対象 PHY) / 2
  assert.equal(healingCoefficientPhyCaster(9, 4), 6.5);    // (術者 PHY + 対象 INT) / 2
});

test('AGI → クリティカル率（0〜45%）', () => {
  assert.equal(critRateFromAgi(0), 0);
  assert.equal(critRateFromAgi(12), 6);
  assert.equal(critRateFromAgi(91), 45);   // 上限
  assert.equal(critRateFromAgi(-10), 0);   // 下限
});

test('rollCrit・randomSkillRatePct は Math.random に従う', () => {
  assert.equal(withRandom(0.0999, () => rollCrit(10)), true);
  assert.equal(withRandom(0.1, () => rollCrit(10)), false);
  assert.equal(withRandom(0, () => randomSkillRatePct(80, 120)), 80);
  assert.equal(withRandom(0.9999, () => randomSkillRatePct(120, 80)), 120);   // min/max が逆でも範囲内
});

test('シールド（legacy: player / enemy の文字列）', () => {
  const st = { playerShield: 10, enemyShield: 0 };
  assert.equal(applyDamageThroughShield(st, 'player', 4), 0);    // シールドで全部吸収
  assert.equal(st.playerShield, 6);
  assert.equal(applyDamageThroughShield(st, 'player', 9), 3);    // 6 を削って 3 があふれる
  assert.equal(st.playerShield, 0);
  assert.equal(applyDamageThroughShield(st, 'enemy', 5), 5);     // シールドなし
  assert.equal(applyDamageThroughShield(st, 'player', 0), 0);    // 0 ダメージ
});

test('シールド（ユニット: heroes[0] / enemies[0] は legacy の値にも映す）', () => {
  const hero = { shield: 8 };
  const enemy = { shield: 5 };
  const other = { shield: 3 };
  const st = { heroes: [hero], enemies: [enemy, other], playerShield: 8, enemyShield: 5 };
  assert.equal(applyDamageThroughShield(st, hero, 3), 0);
  assert.equal(hero.shield, 5);
  assert.equal(st.playerShield, 5);
  assert.equal(applyDamageThroughShield(st, enemy, 7), 2);
  assert.equal(enemy.shield, 0);
  assert.equal(st.enemyShield, 0);
  // 先頭以外は legacy に映さない
  assert.equal(applyDamageThroughShield(st, other, 1), 0);
  assert.equal(other.shield, 2);
  assert.equal(st.enemyShield, 0);
  // シールド 0 のユニットはそのまま通す
  assert.equal(applyDamageThroughShield(st, { shield: 0 }, 4), 4);
});
