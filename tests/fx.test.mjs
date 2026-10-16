// SPEC-012: 数字のカウントアップ（純関数）。
// 実行: node --test tests/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { easeOutCubic, countValueAt } from '../prototype/js/fx.js';

test('easeOutCubic は 0→0、1→1、範囲外は丸める', () => {
  assert.equal(easeOutCubic(0), 0);
  assert.equal(easeOutCubic(1), 1);
  assert.equal(easeOutCubic(-1), 0);
  assert.equal(easeOutCubic(3), 1);
  assert.ok(easeOutCubic(0.5) > 0.5);
});

test('countValueAt：始まり・途中・終わり', () => {
  assert.equal(countValueAt(75, 125, 0, 500), 75);
  assert.equal(countValueAt(75, 125, 500, 500), 125);
  const mid = countValueAt(75, 125, 250, 500);
  assert.ok(mid > 100 && mid < 125, String(mid));
});

test('countValueAt：減るとき・時間 0', () => {
  assert.equal(countValueAt(100, 40, 9999, 500), 40);
  const mid = countValueAt(100, 40, 250, 500);
  assert.ok(mid < 70 && mid > 40, String(mid));
  assert.equal(countValueAt(10, 20, 5, 0), 20);
});
