/**
 * レギュレーション（難易度）定義 (#37)
 *
 * 各レベルは前段階の効果を引き継ぐ（cumulative）。
 * - hpFactor / atkFactor は乗算で累積
 * - guardPerTurn / bleedOnAttack はフラグ
 *
 * イベント / カップ画像は MCH 公式から借用。
 */

const CUP_BASE = "https://www.mycryptoheroes.net/images/cups/";

export const REGULATIONS = [
  {
    id: "common",
    nameJa: "Common",
    iconUrl: CUP_BASE + "1304.png",
    color: "#9aa6b8",
    descShort: "ベースライン（変更なし）",
    // cumulative-applied 効果係数とフラグ
    effects: {
      hpFactor: 1.0,
      atkFactor: 1.0,
      guardPerTurn: 0,
      bleedOnAttack: 0,
    },
  },
  {
    id: "egg",
    nameJa: "Dragon Egg",
    iconUrl: CUP_BASE + "1303.png",
    color: "#e3c074",
    descShort: "敵 HP × 1.1",
    effects: {
      hpFactor: 1.1,
      atkFactor: 1.0,
      guardPerTurn: 0,
      bleedOnAttack: 0,
    },
  },
  {
    id: "baby",
    nameJa: "Baby Dragon",
    iconUrl: CUP_BASE + "1302.png",
    color: "#74cfa3",
    descShort: "敵 HP × 1.1 / 初期 PHY・INT × 1.2",
    effects: {
      hpFactor: 1.1,
      atkFactor: 1.2,
      guardPerTurn: 0,
      bleedOnAttack: 0,
    },
  },
  {
    id: "blue",
    nameJa: "Blue Dragon",
    iconUrl: CUP_BASE + "1301.png",
    color: "#5aa9ff",
    descShort: "敵 HP × 1.65 / PHY・INT × 1.2 / 毎ターン初期ガード +3",
    effects: {
      hpFactor: 1.1 * 1.5, // 1.65
      atkFactor: 1.2,
      guardPerTurn: 3,
      bleedOnAttack: 0,
    },
  },
  {
    id: "red",
    nameJa: "Red Dragon",
    iconUrl: CUP_BASE + "1300.png",
    color: "#ff5252",
    descShort: "敵 HP × 1.65 / PHY・INT × 1.56 / 毎ターン初期ガード +3 / 攻撃に出血付与",
    effects: {
      hpFactor: 1.1 * 1.5, // 1.65
      atkFactor: 1.2 * 1.3, // 1.56
      guardPerTurn: 3,
      bleedOnAttack: 1, // 1 スタック
    },
  },
  {
    id: "absolute",
    nameJa: "Absolute",
    iconUrl: CUP_BASE + "1300.png", // 仮: Red と同じ画像 (cups/1305 が無いため流用)
    color: "#a855f7",
    descShort: "ユーザー設定 (敵 HP / 敵ダメ / 自 HP / 自ダメ 倍率を任意調整)",
    // hpFactor / atkFactor は absolute-config.js から runtime に読み込む。
    // ここの値は他レギュレーションとシグネチャを揃えるためのフォールバック。
    effects: {
      hpFactor: 1.0,
      atkFactor: 1.0,
      guardPerTurn: 0,
      bleedOnAttack: 0,
      isAbsolute: true,
    },
  },
];

/** id → regulation の検索辞書 */
export const REGULATION_BY_ID = Object.fromEntries(REGULATIONS.map((r) => [r.id, r]));

/** localStorage キー */
const LS_UNLOCKED = "mct.unlockedRegulations";
const LS_CURRENT = "mct.currentRegulation";

/** アンロック済みレギュレーション ID 配列をローカルストレージから取得（無ければ ['common', 'absolute']） */
export function loadUnlockedRegulations() {
  let arr = ["common", "absolute"]; // Absolute はユーザー設定型のため最初から開放
  try {
    const raw = localStorage.getItem(LS_UNLOCKED);
    if (raw) {
      const stored = JSON.parse(raw);
      if (Array.isArray(stored) && stored.length > 0) arr = stored;
    }
  } catch (e) { /* ignore */ }
  // 既存セーブで absolute が無い場合に補填
  if (!arr.includes("absolute")) arr = [...arr, "absolute"];
  return arr;
}

/** アンロック状態を保存 */
export function saveUnlockedRegulations(ids) {
  try { localStorage.setItem(LS_UNLOCKED, JSON.stringify(ids)); }
  catch (e) { /* ignore */ }
}

/** 指定レギュレーションをアンロック（既にアンロック済みなら何もしない） */
export function unlockRegulation(id) {
  const cur = loadUnlockedRegulations();
  if (cur.includes(id)) return cur;
  const next = [...cur, id];
  saveUnlockedRegulations(next);
  return next;
}

/** 現在選択中のレギュレーション ID を取得（無ければ 'common'） */
export function loadCurrentRegulationId() {
  try {
    const raw = localStorage.getItem(LS_CURRENT);
    if (raw && REGULATION_BY_ID[raw]) return raw;
  } catch (e) { /* ignore */ }
  return "common";
}

export function saveCurrentRegulationId(id) {
  if (!REGULATION_BY_ID[id]) return;
  try { localStorage.setItem(LS_CURRENT, id); }
  catch (e) { /* ignore */ }
}

/**
 * クリア時のアンロック処理。clearedId をクリアした → 次のレギュレーションをアンロック。
 * Absolute はクリア報酬の対象外（最初から開放）なので、Red の次として絶対扱いしない。
 * @returns {string|null} 新たにアンロックされた ID（なければ null）
 */
export function unlockNextAfterClear(clearedId) {
  const idx = REGULATIONS.findIndex((r) => r.id === clearedId);
  if (idx < 0 || idx >= REGULATIONS.length - 1) return null;
  const next = REGULATIONS[idx + 1];
  if (!next || next.id === "absolute") return null; // Absolute はアンロック対象外
  const cur = loadUnlockedRegulations();
  if (cur.includes(next.id)) return null;
  unlockRegulation(next.id);
  return next.id;
}
