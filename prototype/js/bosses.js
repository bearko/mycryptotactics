/**
 * bosses.js — ボスマスタ (data/bosses.json から runtime fetch)
 *
 * 旧 sync_csv_json.js による静的生成は廃止。data/bosses.json が唯一の正本。
 * main.js init() で `await loadBosses()` してから BOSS_DEFS を利用する。
 */

/** ID 検索用ルックアップ {id: bossDef}。loadBosses() 後に populated。 */
export const BOSS_DEFS = {};

let _loadingPromise = null;

/** data/bosses.json を fetch して BOSS_DEFS に展開。idempotent。 */
export function loadBosses() {
  if (_loadingPromise) return _loadingPromise;
  _loadingPromise = fetch("./data/bosses.json")
    .then(r => {
      if (!r.ok) throw new Error(`bosses.json fetch failed: ${r.status}`);
      return r.json();
    })
    .then(obj => {
      for (const k of Object.keys(BOSS_DEFS)) delete BOSS_DEFS[k];
      for (const [id, def] of Object.entries(obj)) {
        BOSS_DEFS[id] = def;
      }
      return BOSS_DEFS;
    });
  return _loadingPromise;
}
