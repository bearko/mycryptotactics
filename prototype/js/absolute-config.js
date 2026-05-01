/**
 * Absolute レギュレーション設定 (SPEC-007)
 *
 * ユーザーが任意設定する 4 種の倍率を localStorage に保存する。
 * - enemyHpMult:    敵 HP 倍率
 * - enemyDmgMult:   敵ダメージ倍率
 * - playerHpMult:   自 HP 倍率
 * - playerDmgMult:  自ダメージ倍率
 *
 * 各倍率の有効範囲は MIN_MULT〜MAX_MULT (0.1〜5.0)、step 0.1。
 */

const LS_KEY = "mct.absoluteConfig";

export const MIN_MULT = 0.1;
export const MAX_MULT = 5.0;
export const STEP_MULT = 0.1;

const DEFAULT_CONFIG = {
  enemyHpMult: 1.0,
  enemyDmgMult: 1.0,
  playerHpMult: 1.0,
  playerDmgMult: 1.0,
};

function clamp(v) {
  if (typeof v !== "number" || Number.isNaN(v)) return 1.0;
  return Math.max(MIN_MULT, Math.min(MAX_MULT, Math.round(v * 10) / 10));
}

function sanitize(cfg) {
  return {
    enemyHpMult:   clamp(cfg?.enemyHpMult),
    enemyDmgMult:  clamp(cfg?.enemyDmgMult),
    playerHpMult:  clamp(cfg?.playerHpMult),
    playerDmgMult: clamp(cfg?.playerDmgMult),
  };
}

/** Absolute 設定を取得（無ければデフォルト 1.0x ×4）*/
export function loadAbsoluteConfig() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return sanitize(parsed);
    }
  } catch (e) { /* ignore */ }
  return { ...DEFAULT_CONFIG };
}

/** Absolute 設定を保存（範囲外は clamp）*/
export function saveAbsoluteConfig(cfg) {
  const safe = sanitize(cfg);
  try { localStorage.setItem(LS_KEY, JSON.stringify(safe)); }
  catch (e) { /* ignore */ }
  return safe;
}

/**
 * Absolute 倍率からスコア乗数を算出。
 * 高難易度ほど大きい値を返す:
 *   (敵 HP × 敵ダメ) / (自 HP × 自ダメ)
 *
 * 例: 敵 HP 2.0x, 敵ダメ 1.5x, 自 HP 0.5x, 自ダメ 1.0x
 *     => (2.0 × 1.5) / (0.5 × 1.0) = 6.0
 */
export function getAbsoluteScoreMult(cfg) {
  const c = sanitize(cfg);
  const denominator = c.playerHpMult * c.playerDmgMult;
  if (denominator <= 0) return 1.0;
  return (c.enemyHpMult * c.enemyDmgMult) / denominator;
}

/** 既定値リセット用 */
export function resetAbsoluteConfig() {
  try { localStorage.removeItem(LS_KEY); }
  catch (e) { /* ignore */ }
  return { ...DEFAULT_CONFIG };
}
