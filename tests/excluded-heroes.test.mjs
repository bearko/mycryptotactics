// SPEC-018: 表示しないヒーロー（第三者の版権キャラクター）。
// 実行: node --test tests/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EXCLUDED_HERO_IDS } from '../prototype/js/heroes.js';
import { PASSIVES } from '../prototype/js/passives-generated.js';

const json = (p) => JSON.parse(readFileSync(new URL(`../prototype/${p}`, import.meta.url), 'utf8'));

test('猿田彦（2035）とレプリカ（12035）を表示しない', () => {
  assert.deepEqual([...EXCLUDED_HERO_IDS].sort(), [12035, 2035]);
});

test('data/heroes.json と英名の表に入っていない（GAS の同期で戻ったら落ちる）', () => {
  const heroes = json('data/heroes.json');
  assert.deepEqual(heroes.filter((h) => EXCLUDED_HERO_IDS.includes(h.heroId)), []);
  const en = json('data/i18n/heroes-en.json');
  assert.deepEqual(EXCLUDED_HERO_IDS.filter((id) => String(id) in en), []);
  const enemies = json('data/i18n/enemies-en.json');
  assert.deepEqual(['715', '745'].filter((id) => id in enemies), []);
});

test('パッシブの表にも残っていない', () => {
  assert.equal('sarutahiko' in PASSIVES, false);
});
