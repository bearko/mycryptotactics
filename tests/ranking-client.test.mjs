// SPEC-017：ランキングの行は数を数に直してから画面に出す
import { test } from 'node:test';
import assert from 'node:assert/strict';
const { normalizeEntry } = await import('../prototype/js/ranking-client.js');

test('数の欄に文字（HTML）が来ても数に直す', () => {
  const e = normalizeEntry({ rank: '<img src=x onerror=alert(1)>', score: '12', turns: null, deckSize: 20, llExt: '3', playerName: 7, absolute: { enemyHpMult: '<b>' } });
  assert.equal(e.rank, 0);
  assert.equal(e.score, 12);
  assert.equal(e.turns, 0);
  assert.equal(e.llExt, 3);
  assert.equal(e.playerName, '7');
  assert.deepEqual(e.absolute, { enemyHpMult: 0, enemyDmgMult: 0, playerHpMult: 0, playerDmgMult: 0 });
  assert.equal(normalizeEntry(null).score, 0);
});
