/**
 * 章マップ生成（SPEC-004 §9）
 * generateChapterMap(chapter, enemyDefs) → { nodes, edges, viewH, startY }
 *
 * レイアウトポリシー:
 *   - 層間スペース LAYER_SPACING (14 SVG units) で縦長に展開 → スクロール対応
 *   - 接続は「直上・右斜め上・左斜め上」のみ（2層以上横断禁止）
 */

function localShuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** n 個の値を min〜max に等間隔で配置した配列を返す */
function evenlySpaced(n, min, max) {
  if (n === 1) return [Math.round((min + max) / 2)];
  const step = (max - min) / (n - 1);
  return Array.from({ length: n }, (_, i) => Math.round(min + i * step));
}

/** nodeRatios から型をランダムに返す関数を作る */
function makeTypePicker(nodeRatios) {
  const pool = [];
  for (const [type, weight] of Object.entries(nodeRatios)) {
    const resolved = type === 'event' ? 'rest' : type === 'craft' ? 'craft' : type;
    const count = Math.max(1, Math.round(weight * 20));
    for (let i = 0; i < count; i++) pool.push(resolved);
  }
  return () => pool[Math.floor(Math.random() * pool.length)];
}

/** ノード種別の表示ラベル */
function labelForType(type) {
  return { fight: 'エネミー', rest: '休憩', shop: 'ショップ', elite: 'レアエネミー', boss: 'ボス', craft: 'クラフト' }[type] ?? '?';
}

/**
 * 隣接層のみに接続（直上・左斜め上・右斜め上のみ。2層以上横断禁止）
 * @param {{id:string, x:number}[]} fromNodes
 * @param {{id:string, x:number}[]} toNodes
 */
function connectLayersAdjacent(fromNodes, toNodes) {
  const from = [...fromNodes].sort((a, b) => a.x - b.x);
  const to   = [...toNodes].sort((a, b) => a.x - b.x);
  const n = from.length, m = to.length;

  const edges = [];
  const edgeSet = new Set();
  const addEdge = (fId, tId) => {
    const key = `${fId}→${tId}`;
    if (!edgeSet.has(key)) { edges.push([fId, tId]); edgeSet.add(key); }
  };

  /** x 座標が最も近い to-node のインデックスを返す */
  const closestToIdx = (x) => {
    let best = 0, bestDist = Infinity;
    for (let ti = 0; ti < m; ti++) {
      const d = Math.abs(to[ti].x - x);
      if (d < bestDist) { bestDist = d; best = ti; }
    }
    return best;
  };

  // 各 from-node を最近接 to-node に接続
  for (let fi = 0; fi < n; fi++) {
    const ti = closestToIdx(from[fi].x);
    addEdge(from[fi].id, to[ti].id);

    // 斜め追加（45%確率）: ±1 の隣ノードへのみ接続可
    if (m > 1 && Math.random() < 0.45) {
      const hasPrev = ti > 0, hasNext = ti < m - 1;
      let diag = -1;
      if (hasPrev && hasNext) diag = fi % 2 === 0 ? ti + 1 : ti - 1;
      else if (hasPrev)       diag = ti - 1;
      else if (hasNext)       diag = ti + 1;
      if (diag >= 0) addEdge(from[fi].id, to[diag].id);
    }
  }

  // 全 to-node に入辺を保証（孤立ノード救済）
  const toWithIn = new Set(edges.map(([, t]) => t));
  for (let ti = 0; ti < m; ti++) {
    if (toWithIn.has(to[ti].id)) continue;
    let bestFi = 0, bestDist = Infinity;
    for (let fi = 0; fi < n; fi++) {
      const d = Math.abs(from[fi].x - to[ti].x);
      if (d < bestDist) { bestDist = d; bestFi = fi; }
    }
    addEdge(from[bestFi].id, to[ti].id);
  }

  return edges;
}

// 層間の SVG ユニット数（縦長スクロール対応レイアウト）
const LAYER_SPACING = 14;
const BOSS_Y = 10;  // ボスノードの y 座標

/**
 * @param {object} chapter  CHAPTERS の要素
 * @param {object} [enemyDefs]  ENEMY_DEFS（敵の imgId 取得用）
 * @returns {{ nodes: object[], edges: [string,string][], viewH: number, startY: number }}
 */
export function generateChapterMap(chapter, enemyDefs = {}) {
  const { layers, nodesPerLayerMin, nodesPerLayerMax, nodeRatios } = chapter.mapRules;
  const pickType = makeTypePicker(nodeRatios);

  const nodes = [];
  const edges = [];
  const layerNodes = [];  // 各層のノードオブジェクト配列 {id, x}

  const normalLayers = layers - 1;  // ボスを除いた通常層数

  // Y 座標体系（下から上へ進む）:
  //   ボス  : BOSS_Y (=10)
  //   layer l : BOSS_Y + (normalLayers - l) * LAYER_SPACING
  //   layer 0 : BOSS_Y + normalLayers * LAYER_SPACING  （最下層）
  //   START  : BOSS_Y + (normalLayers + 1) * LAYER_SPACING + 4
  const yForLayer = (l) => BOSS_Y + (normalLayers - l) * LAYER_SPACING;
  const startY    = BOSS_Y + (normalLayers + 1) * LAYER_SPACING + 4;
  const viewH     = Math.ceil(startY + 10);

  for (let l = 0; l < normalLayers; l++) {
    const count = nodesPerLayerMin +
      Math.floor(Math.random() * (nodesPerLayerMax - nodesPerLayerMin + 1));
    const y  = yForLayer(l);
    const xs = evenlySpaced(count, 15, 85);
    const layerNodeObjs = [];

    for (let i = 0; i < count; i++) {
      // 第 0 層は常に fight（入門のため）
      const rawType     = l === 0 ? 'fight' : pickType();
      const isElite     = rawType === 'elite';
      const resolvedType = isElite ? 'fight' : rawType;

      let enemyDefId = null;
      let enemyImgId = isElite ? 106 : 104;
      if (resolvedType === 'fight') {
        const pool = isElite ? chapter.elitePool : chapter.enemyPool;
        if (pool?.length) {
          enemyDefId = pool[Math.floor(Math.random() * pool.length)];
          enemyImgId = enemyDefs[enemyDefId]?.imgId ?? enemyImgId;
        }
      }

      const nodeId = `L${l}${String.fromCharCode(65 + i)}`;
      nodes.push({
        id: nodeId, layer: l,
        type: resolvedType,
        label: labelForType(isElite ? 'elite' : resolvedType),
        x: xs[i], y,
        elite: isElite, enemyDefId, enemyImgId,
      });
      layerNodeObjs.push({ id: nodeId, x: xs[i] });
    }
    layerNodes.push(layerNodeObjs);
  }

  // ボスノード（最終層）
  nodes.push({
    id: 'BOSS', layer: normalLayers,
    type: 'boss', label: 'ボス',
    x: 50, y: BOSS_Y, enemyImgId: 505,
  });
  layerNodes.push([{ id: 'BOSS', x: 50 }]);

  // エッジ: START → 第 0 層（全ノードに直接接続）
  for (const nd of layerNodes[0]) edges.push(['START', nd.id]);

  // エッジ: 各層 → 次層（隣接のみ）
  for (let l = 0; l < layerNodes.length - 1; l++) {
    edges.push(...connectLayersAdjacent(layerNodes[l], layerNodes[l + 1]));
  }

  return { nodes, edges, viewH, startY };
}
