/**
 * ll-extensions.js — LL エクステ定義 (data/ll-extensions.json から runtime fetch)
 *
 * 旧 sync_csv_json.js による静的生成は廃止。data/ll-extensions.json が唯一の正本。
 * main.js init() で `await loadLlExtensions()` してから LL_EXT_POOL を利用する。
 *
 * effectKey の挙動は main.js 側の applyLlExtEffect() で分岐処理する (P4 以降で
 * declarative effects 配列に置き換え予定)。
 */

/** LL エクステ配列 (JSON 順序を保つ。loadLlExtensions() 後に populated) */
export const LL_EXT_POOL = [];

let _loadingPromise = null;

/** data/ll-extensions.json を fetch して LL_EXT_POOL に展開。idempotent。 */
export function loadLlExtensions() {
  if (_loadingPromise) return _loadingPromise;
  _loadingPromise = fetch("./data/ll-extensions.json")
    .then(r => {
      if (!r.ok) throw new Error(`ll-extensions.json fetch failed: ${r.status}`);
      return r.json();
    })
    .then(arr => {
      LL_EXT_POOL.length = 0;
      for (const item of arr) LL_EXT_POOL.push(item);
      return LL_EXT_POOL;
    });
  return _loadingPromise;
}
