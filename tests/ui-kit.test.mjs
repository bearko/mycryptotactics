// SPEC-010: Esc で押すボタンの選び方（escTarget は純関数）。
// 実行: node --test tests/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escTarget } from '../prototype/js/ui-kit.js';

const d = (escClose, open) => ({ escClose, open });

test('開いているダイアログがなければ何もしない', () => {
  assert.equal(escTarget([]), null);
  assert.equal(escTarget([d('#a', false), d('#b', false)]), null);
});

test('一番上に開いているダイアログのボタンを押す', () => {
  assert.equal(escTarget([d('#deck', true), d('#help', false)]), '#deck');
  assert.equal(escTarget([d('#deck', true), d('[data-rs-cancel]', true)]), '[data-rs-cancel]');
});

test('一番上が Esc を受けない（レジェンダリーのエクステなど）なら、下も閉じない', () => {
  assert.equal(escTarget([d('#deck', true), d(null, true)]), null);
});
