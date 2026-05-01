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
];

/** id → regulation の検索辞書 */
export const REGULATION_BY_ID = Object.fromEntries(REGULATIONS.map((r) => [r.id, r]));

/** localStorage キー */
const LS_UNLOCKED = "mct.unlockedRegulations";
const LS_CURRENT = "mct.currentRegulation";

/** アンロック済みレギュレーション ID 配列をローカルストレージから取得（無ければ ['common']） */
export function loadUnlockedRegulations() {
  try {
    const raw = localStorage.getItem(LS_UNLOCKED);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length > 0) return arr;
    }
  } catch (e) { /* ignore */ }
  return ["common"];
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
 * @returns {string|null} 新たにアンロックされた ID（なければ null）
 */
export function unlockNextAfterClear(clearedId) {
  const idx = REGULATIONS.findIndex((r) => r.id === clearedId);
  if (idx < 0 || idx >= REGULATIONS.length - 1) return null;
  const nextId = REGULATIONS[idx + 1].id;
  const cur = loadUnlockedRegulations();
  if (cur.includes(nextId)) return null;
  unlockRegulation(nextId);
  return nextId;
}
