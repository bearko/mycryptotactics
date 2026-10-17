// SPEC-008 の「章 → トロフィー ID」の対応と、SDK がないときに何もしないことのテスト。
// 実行: node --test tests/platform.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { trophyIdsForChapterClear, reportChapterClear, initPlatform, canPickAvatar, openAvatarPicker } from '../prototype/js/platform.js';
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

// SPEC-009: 総合スコアに送る成績
import { scoreMetrics, reportRunScore } from '../prototype/js/platform.js';

test('総合スコア：送る成績の形', () => {
  assert.deepEqual(scoreMetrics({ chaptersCleared: 5, chapterCount: 5, cleared: true, finalScore: 20500.4, regulation: 'common' }),
    { chaptersCleared: 5, cleared: true, finalScore: 20500, baseScore: 0, regulation: 'common' });
  assert.deepEqual(scoreMetrics({ chaptersCleared: 2, chapterCount: 5, cleared: false, finalScore: 999 }),
    { chaptersCleared: 2, cleared: false, finalScore: 0, baseScore: 0, regulation: null }, '敗北なら最終スコアは入れない');
  assert.equal(scoreMetrics({ chaptersCleared: 9, chapterCount: 5, cleared: false }).chaptersCleared, 5);
});

test('総合スコア：章をクリアしていなければ送らず、SDK がなくても例外を出さない', async () => {
  assert.doesNotThrow(() => reportRunScore(scoreMetrics({ chaptersCleared: 1, chapterCount: 5, cleared: false })));
  const sent = [];
  globalThis.window = { BearkoGames: { submitScore: async (m) => { sent.push(m.chaptersCleared); return { ok: true }; } } };
  try {
    reportRunScore(scoreMetrics({ chaptersCleared: 0, chapterCount: 5, cleared: false }));
    reportRunScore(scoreMetrics({ chaptersCleared: 3, chapterCount: 5, cleared: false }));
    await new Promise((r) => setTimeout(r, 0));
    assert.deepEqual(sent, [3]);
  } finally {
    delete globalThis.window;
  }
});

// SPEC-009 1.1: 倍率の前の点と ABSOLUTE の倍率
test('総合スコア：倍率の前の点と ABSOLUTE の倍率を送る（1.1）', () => {
  assert.deepEqual(scoreMetrics({ chaptersCleared: 5, chapterCount: 5, cleared: true, finalScore: 61500, baseScore: 20500, regulation: 'red' }),
    { chaptersCleared: 5, cleared: true, finalScore: 61500, baseScore: 20500, regulation: 'red' }, 'ABSOLUTE でなければ倍率は送らない');
  assert.deepEqual(scoreMetrics({ chaptersCleared: 5, chapterCount: 5, cleared: true, finalScore: 41000, baseScore: 20500, absoluteMult: 2, regulation: 'absolute' }),
    { chaptersCleared: 5, cleared: true, finalScore: 41000, baseScore: 20500, regulation: 'absolute', absoluteMult: 2 });
  assert.equal(scoreMetrics({ chaptersCleared: 3, chapterCount: 5, cleared: false, baseScore: 20500 }).baseScore, 0, '敗北なら 0');
});

// SPEC-015: RTA
import { rtaCheckpointForChapterClear, rtaAvailable, rtaStart, rtaChapterClear, rtaAbort } from '../prototype/js/platform.js';

test('RTA：章クリア → 区切り ID', () => {
  const n = CHAPTERS.length;
  assert.deepEqual([0, 1, 2, 3, 4].map((i) => rtaCheckpointForChapterClear('tactics-ch1', i, n)), ['ch1', null, null, null, null]);
  assert.deepEqual([0, 1, 2, 3, 4].map((i) => rtaCheckpointForChapterClear('tactics-all5', i, n)), ['ch1', 'ch2', 'ch3', 'ch4', 'clear']);
  assert.equal(rtaCheckpointForChapterClear(null, 0, n), null);
});

test('RTA：SDK がなくても例外を出さない', () => {
  assert.equal(rtaAvailable(), false);
  assert.doesNotThrow(() => { rtaStart('tactics-ch1', 40); rtaChapterClear('tactics-ch1', 0, 5, 12); rtaAbort(); });
});

test('RTA：計測中だけ区切り・中断を送り、IGT はターン数', async () => {
  const calls = [];
  let running = null;
  globalThis.window = {
    BearkoGames: {
      rta: {
        start: async (o) => { calls.push(['start', o.regulation, o.timerOffset]); running = { runId: 1 }; return { ok: true }; },
        checkpoint: async (id, o) => { calls.push(['cp', id, o.igtMs]); return { ok: false, error: 'network' }; },
        abort: async () => { calls.push(['abort']); running = null; return { ok: true }; },
        current: () => running,
      },
    },
  };
  const warn = console.warn;
  console.warn = () => {};
  try {
    assert.equal(rtaAvailable(), true);
    rtaChapterClear('tactics-all5', 0, 5, 9); // 計測前なので送らない
    rtaAbort();
    rtaStart('nope', 0); // 知らないレギュレーションは始めない
    rtaStart('tactics-all5', 44);
    await new Promise((r) => setTimeout(r, 0));
    rtaChapterClear('tactics-all5', 0, 5, 9);
    rtaChapterClear('tactics-all5', 4, 5, 63.7);
    rtaAbort();
    await new Promise((r) => setTimeout(r, 0));
    assert.deepEqual(calls, [['start', 'tactics-all5', 44], ['cp', 'ch1', 9], ['cp', 'clear', 63], ['abort']]);
    globalThis.window.BearkoGames.rta.start = () => { throw new Error('boom'); };
    assert.doesNotThrow(() => rtaStart('tactics-ch1', 0));
  } finally {
    console.warn = warn;
    delete globalThis.window;
  }
});

test('SPEC-016 共通のアイコン：SDK がない・古いときは出さず例外も出さない。あれば窓を開く', () => {
  assert.equal(canPickAvatar(), false);
  assert.equal(openAvatarPicker(), false);
  let opened = 0;
  globalThis.window = { BearkoGames: { init: async () => ({ ok: true }) } };
  try {
    assert.equal(canPickAvatar(), false);
    globalThis.window.BearkoGames.openAvatarPicker = () => { opened++; };
    assert.equal(canPickAvatar(), true);
    assert.equal(openAvatarPicker(), true);
    assert.equal(opened, 1);
  } finally {
    delete globalThis.window;
  }
});
