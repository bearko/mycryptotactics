/**
 * schema.gs — heroes / ll-extensions の列定義 + dropdown 候補
 *
 * 列順序がそのまま JSON フィールド順序になる。新しいフィールドは末尾追加で
 * 既存シートを破壊せずに拡張可能 (列削除は注意 — push 時に値消失)。
 */

const SHEET_HEROES   = "heroes";
const SHEET_LL_EXT   = "ll-extensions";
const SHEET_EXT      = "extensions";
const SHEET_META     = "_meta";   // sync 状態 (lastSyncedSha, lastPullAt 等) を置く隠しシート

const PATH_HEROES   = "prototype/data/heroes.json";
const PATH_LL_EXT   = "prototype/data/ll-extensions.json";
const PATH_CARDS_JS = "prototype/js/cards.js";  // extensions の正本 (Pull-only)

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

// ─── 共通 enum 定義 (extensions / heroes / 他で使い回す) ──────────

/** skillIcon enum (cards.js で使用中の 10 種) */
const ENUM_SKILL_ICON = [
  "phy.png", "int.png", "hp.png", "guard.png",
  "BUF_phy.png", "BUF_int.png", "BUF_agi.png",
  "DBF_phy.png", "DBF_int.png", "DBF_agi.png",
];

/** caster enum (caster.js で定義の CasterRole 全 8 種) */
const ENUM_CASTER_ROLE = [
  "front", "mid", "back",
  "foremost", "rearmost",
  "highest_phy", "highest_int", "highest_hp",
];

/** TargetSpec enum (target-labels.js で定義の全 29 種) */
const ENUM_TARGET_SPEC = [
  "self",
  // 味方 (固定位置)
  "ally.front", "ally.mid", "ally.back",
  // 味方 (動的)
  "ally.foremost", "ally.rearmost",
  "ally.all", "ally.random",
  "ally.highest_phy", "ally.lowest_phy",
  "ally.highest_int", "ally.lowest_int",
  "ally.highest_hp",  "ally.lowest_hp",
  // 敵 (固定位置)
  "enemy.front", "enemy.mid", "enemy.back",
  // 敵 (動的)
  "enemy.foremost", "enemy.rearmost",
  "enemy.all", "enemy.random",
  "enemy.highest_phy", "enemy.lowest_phy",
  "enemy.highest_int", "enemy.lowest_int",
  "enemy.highest_hp",  "enemy.lowest_hp",
  // 全体 (クロス陣営)
  "all", "all.random",
];

/** extensions (cards.js から parse / 安全フィールドのみ書き戻し)
 *
 *  Pull: 全フィールドを表示
 *  Push: 安全な top-level literal フィールド (extNameJa / skillNameJa /
 *        skillIcon / cost / type / target / caster) + rarity (CARD_RARITIES dict)
 *        + effect_*_text (display 文言) のみ書き戻し
 *  Push しないフィールド:
 *        - libraryKey / extId (識別子、変更不可)
 *        - effect_*_target (play() 関数と連動、不一致になると挙動が崩れる)
 *
 *  ダメージ係数は play() 関数本体に hardcoded のため Push 不可。
 *  数値バランス調整は引き続き cards.js を直接編集。
 *
 *  視認性のため skillIcon / caster / effect_*_target はプルダウン化。 */
const EXTENSIONS_SCHEMA = {
  sheetName: SHEET_EXT,
  jsonPath: PATH_CARDS_JS,         // 表示用、実際の fetch は ghFetchRawText 経由
  customPushHandler: "extensions",  // push.gs が分岐するためのキー
  columns: [
    { name: "libraryKey",      type: "string" },
    { name: "extId",           type: "int" },
    { name: "extNameJa",       type: "string" },
    { name: "skillNameJa",     type: "string" },
    { name: "skillIcon",       type: "enum", options: ENUM_SKILL_ICON },
    { name: "cost",            type: "int" },
    { name: "type",            type: "enum", options: ["atk", "skl", "power"] },
    { name: "target",          type: "enum", options: ENUM_TARGET_SPEC },
    { name: "caster",          type: "enum", options: ENUM_CASTER_ROLE },
    { name: "rarity",          type: "enum", options: ["common", "uncommon", "rare", "epic", "legendary"] },
    { name: "series",          type: "string" },  // 178 種あり dropdown 不可、ランクアップチェーン計算に使用
    { name: "effect_1_target", type: "enum", options: ENUM_TARGET_SPEC },
    { name: "effect_1_text",   type: "string" },
    { name: "effect_2_target", type: "enum", options: ENUM_TARGET_SPEC },
    { name: "effect_2_text",   type: "string" },
    { name: "effect_3_target", type: "enum", options: ENUM_TARGET_SPEC },
    { name: "effect_3_text",   type: "string" },
  ],
};

/** 標準 JSON push 対応 schemas (push.gs が使う、JSON.stringify でファイル全体上書き) */
const ALL_SCHEMAS = [HEROES_SCHEMA, LL_EXT_SCHEMA];

/** customPushHandler を持つ schema の Push は schema 個別ロジックで処理
 *  (現状 extensions のみ、cards.js text の安全フィールドだけ regex 置換) */

/** 全 Pull schemas (pull.gs が使う) */
const ALL_PULL_SCHEMAS = [HEROES_SCHEMA, LL_EXT_SCHEMA, EXTENSIONS_SCHEMA];

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
