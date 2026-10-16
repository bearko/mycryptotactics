// settings.js — 設定（音量・演出を減らす）の保存と通知 (SPEC-011)
//
// localStorage['mct.settings'] = { v: 1, bgm: 0〜1, se: 0〜1, reduceFx: bool }
// 音量は「呼び出し側の音量 × 設定」。1.0 で今までと同じ大きさ。
// 保存するのは設定だけ（PROJECT_CHARTER 3.1）。

const LS_KEY = 'mct.settings';

export const DEFAULT_SETTINGS = Object.freeze({ v: 1, bgm: 1, se: 1, reduceFx: false });

function clamp01(x, fallback) {
  const n = Number(x);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(1, n));
}

/** 壊れた値・範囲外を既定値と 0〜1 に直す（純関数） */
export function normalizeSettings(raw) {
  const r = (raw && typeof raw === 'object') ? raw : {};
  return {
    v: 1,
    bgm: clamp01(r.bgm, DEFAULT_SETTINGS.bgm),
    se: clamp01(r.se, DEFAULT_SETTINGS.se),
    reduceFx: r.reduceFx === true,
  };
}

/** 呼び出し側の音量 × 設定（純関数） */
export function mixVolume(base, level) {
  return clamp01(clamp01(base, 0) * clamp01(level, 0), 0);
}

let current = null;
const listeners = new Set();

export function getSettings() {
  if (!current) {
    try {
      const raw = globalThis.localStorage?.getItem(LS_KEY);
      current = normalizeSettings(raw ? JSON.parse(raw) : null);
    } catch (_) {
      current = normalizeSettings(null);
    }
  }
  return current;
}

export function updateSettings(patch) {
  current = normalizeSettings({ ...getSettings(), ...patch });
  try { globalThis.localStorage?.setItem(LS_KEY, JSON.stringify(current)); } catch (_) { /* ignore */ }
  for (const fn of listeners) {
    try { fn(current); } catch (e) { console.error('[settings] listener', e); }
  }
  return current;
}

export function onSettingsChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function osPrefersReducedMotion() {
  try { return !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches; } catch (_) { return false; }
}

/** OS の reduced-motion か、設定の「演出を減らす」 */
export function prefersReducedMotion() {
  return osPrefersReducedMotion() || getSettings().reduceFx;
}
