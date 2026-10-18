// SPEC-008・019 の「章 → アチーブメント ID」の対応と、SDK がないときに何もしないことのテスト。
// 実行: node --test tests/platform.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { trophyIdsForChapterClear, reportChapterClear, initPlatform, canPickAvatar, openAvatarPicker } from '../prototype/js/platform.js';
import { CHAPTERS } from '../prototype/js/chapters.js';

test('章クリアで送るアチーブメント（5 章構成）', () => {
  const n = CHAPTERS.length;
  assert.equal(n, 5);
  assert.deepEqual(trophyIdsForChapterClear(0, n), ['tactics.ch1']);
  assert.deepEqual(trophyIdsForChapterClear(1, n), ['tactics.ch2']);
  assert.deepEqual(trophyIdsForChapterClear(2, n), ['tactics.ch3']);
  assert.deepEqual(trophyIdsForChapterClear(3, n), ['tactics.ch4']);
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

// SPEC-019: アチーブメント（名鑑 11 枚・エクステンション 3 個）
import { trophyIdsForCombatWin, reportCombatWin, unlockAchievements, resetAchievementsForTest } from '../prototype/js/platform.js';

test('SPEC-019 章クリア：3 人パーティ・レギュレーション・RTA の完走', () => {
  const n = CHAPTERS.length;
  assert.deepEqual(trophyIdsForChapterClear(0, n, { partySize: 3, regulation: 'common' }), ['tactics.ch1', 'tactics.party3']);
  assert.deepEqual(trophyIdsForChapterClear(0, n, { partySize: 2 }), ['tactics.ch1'], '2 人では party3 にならない');
  assert.deepEqual(trophyIdsForChapterClear(1, n, { partySize: 3 }), ['tactics.ch2'], 'party3 は第 1 章だけ');
  assert.deepEqual(trophyIdsForChapterClear(4, n, { regulation: 'egg' }), ['tactics.clear', 'tactics.egg']);
  assert.deepEqual(trophyIdsForChapterClear(4, n, { regulation: 'red' }), ['tactics.clear', 'tactics.red']);
  assert.deepEqual(trophyIdsForChapterClear(4, n, { regulation: 'blue' }), ['tactics.clear']);
  assert.deepEqual(trophyIdsForChapterClear(3, n, { regulation: 'red' }), ['tactics.ch4'], '最終章でなければ red にならない');
  assert.deepEqual(trophyIdsForChapterClear(0, n, { partySize: 1, rtaMode: 'tactics-ch1' }), ['tactics.ch1', 'tactics.rta1']);
  assert.deepEqual(trophyIdsForChapterClear(0, n, { rtaMode: 'tactics-all5' }), ['tactics.ch1'], '全 5 章の RTA は第 1 章では完走でない');
  assert.deepEqual(trophyIdsForChapterClear(4, n, { regulation: 'common', rtaMode: 'tactics-all5' }), ['tactics.clear', 'tactics.rta5']);
  assert.deepEqual(trophyIdsForChapterClear(4, n, { rtaMode: 'tactics-ch1' }), ['tactics.clear']);
});

test('SPEC-019 戦闘勝利：エリート・ボスに全員生存・LL エクステ', () => {
  const alive = { hp: 10, alive: true };
  const dead = { hp: 0, alive: false };
  assert.deepEqual(trophyIdsForCombatWin({ isElite: true, heroes: [alive] }), ['tactics.elite']);
  assert.deepEqual(trophyIdsForCombatWin({ heroes: [alive] }), [], 'ふつうの戦闘');
  assert.deepEqual(trophyIdsForCombatWin({ isBoss: true, heroes: [alive, { hp: 1 }, alive] }), ['tactics.allalive']);
  assert.deepEqual(trophyIdsForCombatWin({ isBoss: true, heroes: [alive, dead] }), [], '倒れた味方がいる');
  assert.deepEqual(trophyIdsForCombatWin({ isBoss: true, heroes: [alive, { hp: 0 }] }), [], 'HP 0 は倒れている');
  assert.deepEqual(trophyIdsForCombatWin({ isBoss: true, heroes: [] }), []);
  assert.deepEqual(trophyIdsForCombatWin({ isElite: true, heroes: [alive], gotLlExt: true, llExtSlots: [{ id: 1 }, null] }), ['tactics.elite', 'tactics.llext']);
  assert.deepEqual(trophyIdsForCombatWin({ gotLlExt: true, llExtSlots: [{ id: 1 }, { id: 2 }] }), ['tactics.llext', 'tactics.llfull']);
  assert.deepEqual(trophyIdsForCombatWin({ gotLlExt: false, llExtSlots: [{ id: 1 }, { id: 2 }] }), [], 'この勝利で手に入れていなければ送らない');
  assert.deepEqual(trophyIdsForCombatWin(), []);
});

test('SPEC-019 送り方：同じ起動で重ねず、1 つずつ前の返事を待って送る', async () => {
  resetAchievementsForTest();
  const started = [];
  const resolvers = [];
  globalThis.window = {
    BearkoGames: {
      unlockTrophy: (id) => { started.push(id); return new Promise((res) => resolvers.push(res)); },
    },
  };
  const warn = console.warn;
  console.warn = () => {};
  const tick = () => new Promise((r) => setTimeout(r, 0));
  try {
    reportChapterClear(4, 5, { regulation: 'red' });
    reportCombatWin({ isBoss: true, heroes: [{ hp: 5 }] });
    reportChapterClear(4, 5, { regulation: 'red' }); // 同じ起動の 2 度目は送らない
    await tick();
    assert.deepEqual(started, ['tactics.clear'], '最初の返事が来るまで次を送らない');
    resolvers[0]({ ok: true });
    await tick();
    assert.deepEqual(started, ['tactics.clear', 'tactics.red']);
    resolvers[1]({ ok: false, error: 'unknown_trophy' }); // 失敗しても次へ進む
    await tick();
    assert.deepEqual(started, ['tactics.clear', 'tactics.red', 'tactics.allalive']);
    resolvers[2]({ ok: true });
    await tick();
    unlockAchievements(['tactics.red', 'tactics.elite']);
    await tick();
    assert.deepEqual(started, ['tactics.clear', 'tactics.red', 'tactics.allalive', 'tactics.elite']);
  } finally {
    console.warn = warn;
    delete globalThis.window;
    resetAchievementsForTest();
  }
});

test('SPEC-019 送り方：SDK がないあいだは覚えず、あとで SDK が読めたら送る', async () => {
  resetAchievementsForTest();
  assert.doesNotThrow(() => reportCombatWin({ isElite: true, heroes: [] }));
  const sent = [];
  globalThis.window = { BearkoGames: { unlockTrophy: async (id) => { sent.push(id); return { ok: true }; } } };
  try {
    reportCombatWin({ isElite: true, heroes: [] });
    await new Promise((r) => setTimeout(r, 0));
    assert.deepEqual(sent, ['tactics.elite']);
  } finally {
    delete globalThis.window;
    resetAchievementsForTest();
  }
});
