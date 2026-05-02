/**
 * schema.gs — heroes / ll-extensions の列定義 + dropdown 候補
 *
 * 列順序がそのまま JSON フィールド順序になる。新しいフィールドは末尾追加で
 * 既存シートを破壊せずに拡張可能 (列削除は注意 — push 時に値消失)。
 */

const SHEET_HEROES   = "heroes";
const SHEET_LL_EXT   = "ll-extensions";
const SHEET_META     = "_meta";   // sync 状態 (lastSyncedSha, lastPullAt 等) を置く隠しシート

const PATH_HEROES = "prototype/data/heroes.json";
const PATH_LL_EXT = "prototype/data/ll-extensions.json";

/** heroes.json の列スキーマ */
const HEROES_SCHEMA = {
  sheetName: SHEET_HEROES,
  jsonPath: PATH_HEROES,
  // 列定義 — name は JSON フィールド名、type は "int" / "string" / "enum"
  columns: [
    { name: "heroId",      type: "int" },
    { name: "nameJa",      type: "string" },
    { name: "rarity",      type: "enum", options: ["common", "uncommon", "rare", "epic", "legendary"] },
    { name: "hpMax",       type: "int" },
    { name: "basePhy",     type: "int" },
    { name: "baseInt",     type: "int" },
    { name: "baseAgi",     type: "int" },
    { name: "passiveKey",  type: "string" },
    { name: "passiveName", type: "string" },
    { name: "passiveDesc", type: "string" },
  ],
};

/** ll-extensions.json の列スキーマ */
const LL_EXT_SCHEMA = {
  sheetName: SHEET_LL_EXT,
  jsonPath: PATH_LL_EXT,
  columns: [
    { name: "extId",     type: "int" },
    { name: "name",      type: "string" },
    { name: "skillName", type: "string" },
    { name: "rarity",    type: "enum", options: ["ll"] },
    { name: "effectKey", type: "string" },  // 注: ハードコード参照のため自由入力時は実装側を必ず確認
    { name: "desc",      type: "string" },
  ],
};

const ALL_SCHEMAS = [HEROES_SCHEMA, LL_EXT_SCHEMA];

/** value を type に応じて型変換 (sheet → JSON 用) */
function coerceValue_(value, type) {
  if (value === "" || value === null || value === undefined) return null;
  if (type === "int") {
    const n = Number(value);
    if (!Number.isFinite(n)) throw new Error("整数として読めません: " + value);
    return Math.trunc(n);
  }
  if (type === "string" || type === "enum") {
    return String(value);
  }
  return value;
}

/** value を sheet 表示用に変換 (JSON → sheet 用) */
function displayValue_(value) {
  if (value === null || value === undefined) return "";
  return value;
}
