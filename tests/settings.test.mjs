// SPEC-011: 設定の正規化と音量の掛け算（純関数）。
// 実行: node --test tests/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSettings, mixVolume, DEFAULT_SETTINGS } from '../prototype/js/settings.js';

test('何もなければ既定値（今までと同じ音量）', () => {
  assert.deepEqual(normalizeSettings(null), { ...DEFAULT_SETTINGS });
  assert.deepEqual(normalizeSettings('broken'), { ...DEFAULT_SETTINGS });
});

test('範囲外は 0〜1 に、数でないものは既定値に、0（オフ）は残す', () => {
  const s = normalizeSettings({ bgm: 3, se: -1, reduceFx: 'yes' });
  assert.equal(s.bgm, 1);
  assert.equal(s.se, 0);
  assert.equal(s.reduceFx, false);
  assert.equal(normalizeSettings({ bgm: 'x' }).bgm, 1);
  assert.equal(normalizeSettings({ bgm: 0 }).bgm, 0);
});

test('音量は 呼び出し側 × 設定', () => {
  assert.equal(mixVolume(0.32, 1), 0.32);
  assert.equal(mixVolume(0.5, 0.5), 0.25);
  assert.equal(mixVolume(0.5, 0), 0);
  assert.equal(mixVolume(NaN, 1), 0);
});
