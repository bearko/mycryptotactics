// settings-ui.js — 設定のダイアログ (SPEC-011)
//
// 入口: マップ・戦闘のヘッダーの ⚙。BGM・SE の音量、演出を減らす、言語。
// 演出を減らすが有効なあいだ <html> に .reduce-fx を付ける（CSS で reduced-motion と同じく動きを止める）。

import { getSettings, updateSettings, onSettingsChange, osPrefersReducedMotion, prefersReducedMotion } from './settings.js';
import { t, getLang, setLang, onLangChange } from './i18n.js';

const $ = (id) => document.getElementById(id);
let wired = false;
let previewSe = () => {};

function pctLabel(v) {
  const pct = Math.round(v * 100);
  return pct === 0 ? t('settings.off', 'OFF') : `${pct}%`;
}

function applyReduceFxClass() {
  document.documentElement.classList.toggle('reduce-fx', prefersReducedMotion());
}

function render() {
  const s = getSettings();
  const bgm = $('setBgm');
  const se = $('setSe');
  if (bgm) bgm.value = String(Math.round(s.bgm * 100));
  if (se) se.value = String(Math.round(s.se * 100));
  const bv = $('setBgmValue'); if (bv) bv.textContent = pctLabel(s.bgm);
  const sv = $('setSeValue');  if (sv) sv.textContent = pctLabel(s.se);
  const os = osPrefersReducedMotion();
  const fx = $('setReduceFx');
  if (fx) { fx.checked = os || s.reduceFx; fx.disabled = os; }
  const note = $('setReduceFxNote');
  if (note) note.textContent = os ? t('settings.reduceFxOs', '端末の設定で動きを減らしています') : t('settings.reduceFxNote', '揺れ・粒・画面の光を止める');
  document.querySelectorAll('#settingsOverlay [data-lang]').forEach((b) => {
    b.classList.toggle('lang-btn--active', b.getAttribute('data-lang') === getLang());
  });
}

export function installSettingsUI(opt = {}) {
  if (wired) return;
  wired = true;
  if (typeof opt.previewSe === 'function') previewSe = opt.previewSe;
  const overlay = $('settingsOverlay');
  $('setClose')?.addEventListener('click', closeSettings);
  $('setCloseX')?.addEventListener('click', closeSettings);
  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) { closeSettings(); return; }
    const b = e.target.closest?.('[data-lang]');
    if (b) setLang(b.getAttribute('data-lang'));
  });
  const bgm = $('setBgm');
  bgm?.addEventListener('input', () => { updateSettings({ bgm: Number(bgm.value) / 100 }); render(); });
  const se = $('setSe');
  se?.addEventListener('input', () => { updateSettings({ se: Number(se.value) / 100 }); render(); });
  se?.addEventListener('change', () => previewSe());   // 離したときに 1 回鳴らして確かめる
  $('setReduceFx')?.addEventListener('change', (e) => { updateSettings({ reduceFx: !!e.target.checked }); render(); });
  onSettingsChange(applyReduceFxClass);
  onLangChange(render);
  applyReduceFxClass();
}

export function openSettings() {
  const overlay = $('settingsOverlay');
  if (!overlay) return;
  render();
  overlay.classList.remove('hidden');
  overlay.setAttribute('aria-hidden', 'false');
}

export function closeSettings() {
  const overlay = $('settingsOverlay');
  if (!overlay) return;
  overlay.classList.add('hidden');
  overlay.setAttribute('aria-hidden', 'true');
}
