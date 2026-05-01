/**
 * target-labels.js — SPEC-006 Phase 4e: TargetSpec → 日本語ラベル + 色変数 のローダー
 *
 * `prototype/data/target-labels.json` を fetch して内部キャッシュ、UI から
 * `getTargetLabel(spec)` で `{label, color}` を引く。
 */

const PATH = "./data/target-labels.json";

let _cache = null;
let _loadingPromise = null;

/** 非同期ロード。最初の 1 回だけ fetch、以降はキャッシュ返却。 */
export async function loadTargetLabels() {
  if (_cache) return _cache;
  if (_loadingPromise) return _loadingPromise;
  _loadingPromise = fetch(PATH)
    .then(r => {
      if (!r.ok) throw new Error(`target-labels.json fetch failed: ${r.status}`);
      return r.json();
    })
    .then(json => {
      _cache = json;
      _loadingPromise = null;
      return json;
    });
  return _loadingPromise;
}

/** 同期ルックアップ。ロード前なら null。事前に loadTargetLabels() を await すること。 */
export function getTargetLabel(spec) {
  if (!_cache) return null;
  return _cache[spec] || null;
}

/** ラベル文字列のみ。未ロード/未定義時は spec 文字列をそのまま返却 (フォールバック)。 */
export function targetLabelText(spec) {
  const e = getTargetLabel(spec);
  return e ? e.label : (spec || "");
}

/** CSS 変数名 (`--target-ally` 等) を返す。未ロード/未定義時は `--text`。 */
export function targetColorVar(spec) {
  const e = getTargetLabel(spec);
  return e ? e.color : "--text";
}

/** _meta.css_variables を CSS :root に注入する (アプリ初期化時に 1 回呼ぶ)。 */
export function applyCssVariables() {
  if (!_cache || !_cache._meta?.css_variables) return;
  const root = document.documentElement;
  for (const [name, value] of Object.entries(_cache._meta.css_variables)) {
    root.style.setProperty(name, value);
  }
}
