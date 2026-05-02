/**
 * enemies.js — 敵マスタ (data/enemies.json から runtime fetch)
 *
 * 旧 sync_csv_json.js による静的生成は廃止。data/enemies.json が唯一の正本。
 * main.js init() で `await loadEnemies()` してから ENEMY_DEFS を利用する。
 */

/** ID 検索用ルックアップ {id: enemyDef}。loadEnemies() 後に populated。 */
export const ENEMY_DEFS = {};

let _loadingPromise = null;

/** data/enemies.json を fetch して ENEMY_DEFS に展開。idempotent。 */
export function loadEnemies() {
  if (_loadingPromise) return _loadingPromise;
  _loadingPromise = fetch("./data/enemies.json")
    .then(r => {
      if (!r.ok) throw new Error(`enemies.json fetch failed: ${r.status}`);
      return r.json();
    })
    .then(obj => {
      // {id: enemyDef} 形式の object をそのまま展開
      for (const k of Object.keys(ENEMY_DEFS)) delete ENEMY_DEFS[k];
      for (const [id, def] of Object.entries(obj)) {
        ENEMY_DEFS[id] = def;
      }
      return ENEMY_DEFS;
    });
  return _loadingPromise;
}
