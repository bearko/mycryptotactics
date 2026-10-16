// SPEC-013: はじめての案内の段の進み方（純関数）。
// 実行: node --test tests/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextGuideStep, GUIDE_DONE, GUIDE_STEPS } from '../prototype/js/guide.js';

test('段は 4 つ（手札・エナジー・敵の予告・ターン終了）', () => {
  assert.equal(GUIDE_STEPS.length, 4);
  assert.deepEqual(GUIDE_STEPS.map((s) => s.target), ['#hand', '.energy-pill', '#enemyIntentWrap', '#btnEndTurn']);
});

test('ふつうの進み方：カード → カード → 時間 → ターン終了', () => {
  let s = 0;
  s = nextGuideStep(s, 'card');    assert.equal(s, 1);
  s = nextGuideStep(s, 'card');    assert.equal(s, 2);
  s = nextGuideStep(s, 'timeout'); assert.equal(s, 3);
  s = nextGuideStep(s, 'endTurn'); assert.equal(s, GUIDE_DONE);
});

test('段 1 は時間でも進む。段 0 は時間では進まない（カードを使うまで待つ）', () => {
  assert.equal(nextGuideStep(1, 'timeout'), 2);
  assert.equal(nextGuideStep(0, 'timeout'), 0);
});

test('途中でターン終了したら：カードを使う前ならエナジーの段へ、そのあとなら終わり', () => {
  assert.equal(nextGuideStep(0, 'endTurn'), 1);
  assert.equal(nextGuideStep(1, 'endTurn'), GUIDE_DONE);
  assert.equal(nextGuideStep(2, 'endTurn'), GUIDE_DONE);
});

test('× でいつでも終わる。終わったら何をしても終わりのまま', () => {
  for (const s of [0, 1, 2, 3]) assert.equal(nextGuideStep(s, 'close'), GUIDE_DONE);
  assert.equal(nextGuideStep(GUIDE_DONE, 'card'), GUIDE_DONE);
});
