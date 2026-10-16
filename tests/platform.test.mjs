// SPEC-008 の「章 → トロフィー ID」の対応と、SDK がないときに何もしないことのテスト。
// 実行: node --test tests/platform.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { trophyIdsForChapterClear, reportChapterClear, initPlatform } from '../prototype/js/platform.js';
import { CHAPTERS } from '../prototype/js/chapters.js';

test('章クリアで送るトロフィー（5 章構成）', () => {
  const n = CHAPTERS.length;
  assert.equal(n, 5);
  assert.deepEqual(trophyIdsForChapterClear(0, n), ['tactics.ch1']);
  assert.deepEqual(trophyIdsForChapterClear(1, n), ['tactics.ch2']);
  assert.deepEqual(trophyIdsForChapterClear(2, n), []);
  assert.deepEqual(trophyIdsForChapterClear(3, n), []);
  assert.deepEqual(trophyIdsForChapterClear(4, n), ['tactics.clear']);
});

test('SDK がなくても例外を出さない', () => {
  assert.doesNotThrow(() => initPlatform('1.2.0'));
  assert.doesNotThrow(() => reportChapterClear(0, 5));
});

test('SDK があれば unlockTrophy を呼び、失敗してもゲームを止めない', async () => {
  const sent = [];
  globalThis.window = {
    BearkoGames: {
      init: async () => ({ ok: true }),
      unlockTrophy: async (id) => { sent.push(id); return id === 'tactics.clear' ? { ok: false, error: 'network' } : { ok: true }; },
    },
  };
  const warn = console.warn;
  console.warn = () => {};
  try {
    initPlatform('1.2.0');
    reportChapterClear(0, 5);
    reportChapterClear(4, 5);
    await new Promise((r) => setTimeout(r, 0));
    assert.deepEqual(sent, ['tactics.ch1', 'tactics.clear']);
    globalThis.window.BearkoGames.unlockTrophy = () => { throw new Error('boom'); };
    assert.doesNotThrow(() => reportChapterClear(1, 5));
  } finally {
    console.warn = warn;
    delete globalThis.window;
  }
});
