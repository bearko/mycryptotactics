/**
 * 章マップ生成（SPEC-004 §9）
 * generateChapterMap(chapter, enemyDefs) → { nodes, edges }
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

/** nodeRatios から型をランダムに返す関数を作る（event は rest に変換） */
function makeTypePicker(nodeRatios) {
  const pool = [];
  for (const [type, weight] of Object.entries(nodeRatios)) {
    const resolved = type === 'event' ? 'rest' : type;
    const count = Math.max(1, Math.round(weight * 20));
    for (let i = 0; i < count; i++) pool.push(resolved);
  }
  return () => pool[Math.floor(Math.random() * pool.length)];
}

/** ノード種別の表示ラベル */
function labelForType(type) {
  return { fight: 'エネミー', rest: '休憩', shop: 'ショップ', elite: 'レアエネミー', boss: 'ボス' }[type] ?? '?';
}

/**
 * fromIds → toIds のエッジ集合を生成。
 * 全 to ノードに入辺、全 from ノードから出辺を保証する。
 */
function connectLayers(fromIds, toIds) {
  const edges = [];
  const edgeSet = new Set();

  const fs = localShuffle(fromIds.slice());
  const ts = localShuffle(toIds.slice());
  const maxLen = Math.max(fs.length, ts.length);

  // 巡回マッチ: 全 to に入辺を保証
  for (let i = 0; i < maxLen; i++) {
    const f = fs[i % fs.length];
    const t = ts[i % ts.length];
    const key = `${f}→${t}`;
    if (!edgeSet.has(key)) { edges.push([f, t]); edgeSet.add(key); }
  }

  // 出辺のない from ノードを救済
  const fromHasOut = new Set(edges.map(([f]) => f));
  for (const f of fromIds) {
    if (fromHasOut.has(f)) continue;
    const t = ts[Math.floor(Math.random() * ts.length)];
    const key = `${f}→${t}`;
    if (!edgeSet.has(key)) { edges.push([f, t]); edgeSet.add(key); }
  }

  // 追加エッジ（最大 2 本）でルート選択肢を豊かに
  const extras = Math.min(2, fs.length);
  for (let e = 0; e < extras; e++) {
    const f = fs[e % fs.length];
    const t = ts[(e + 1) % ts.length];
    const key = `${f}→${t}`;
    if (!edgeSet.has(key)) { edges.push([f, t]); edgeSet.add(key); }
  }

  return edges;
}

/**
 * @param {object} chapter  CHAPTERS の要素
 * @param {object} [enemyDefs]  ENEMY_DEFS（敵の imgId 取得用）
 * @returns {{ nodes: object[], edges: [string,string][] }}
 */
export function generateChapterMap(chapter, enemyDefs = {}) {
  const { layers, nodesPerLayerMin, nodesPerLayerMax, nodeRatios } = chapter.mapRules;
  const pickType = makeTypePicker(nodeRatios);

  const nodes = [];
  const edges = [];
  const layerIds = [];

  // Y 座標: 層 0 が画面下（y 大）、ボスが上（y 小）
  const yTop    = 18;  // ボスの y
  const yBottom = 82;  // 層 0 の y
  const normalLayers = layers - 1;  // ボスを除いた通常層数
  const yStep = (yBottom - yTop) / layers;

  for (let l = 0; l < normalLayers; l++) {
    const count = nodesPerLayerMin +
      Math.floor(Math.random() * (nodesPerLayerMax - nodesPerLayerMin + 1));
    const y = Math.round(yBottom - yStep * (l + 1));
    const xs = evenlySpaced(count, 20, 80);
    const ids = [];

    for (let i = 0; i < count; i++) {
      // 第 0 層は常に fight（入門のため）
      const rawType = l === 0 ? 'fight' : pickType();
      const isElite = rawType === 'elite';
      const resolvedType = isElite ? 'fight' : rawType;

      // 敵 ID を割り当て（fight / elite のみ）
      let enemyDefId = null;
      let enemyImgId = isElite ? 418 : 314;
      if (resolvedType === 'fight') {
        const pool = isElite ? chapter.elitePool : chapter.enemyPool;
        if (pool?.length) {
          enemyDefId = pool[Math.floor(Math.random() * pool.length)];
          enemyImgId = enemyDefs[enemyDefId]?.imgId ?? enemyImgId;
        }
      }

      const nodeId = `L${l}${String.fromCharCode(65 + i)}`;
      nodes.push({
        id: nodeId,
        layer: l,
        type: resolvedType,
        label: labelForType(isElite ? 'elite' : resolvedType),
        x: xs[i],
        y,
        elite: isElite,
        enemyDefId,
        enemyImgId,
      });
      ids.push(nodeId);
    }
    layerIds.push(ids);
  }

  // ボスノード（最終層）
  nodes.push({
    id: 'BOSS',
    layer: normalLayers,
    type: 'boss',
    label: 'ボス',
    x: 50,
    y: yTop,
    enemyImgId: 505,
  });
  layerIds.push(['BOSS']);

  // エッジ: START → 第 0 層（全ノード直接接続）
  for (const id of layerIds[0]) edges.push(['START', id]);

  // エッジ: 各層 → 次層
  for (let l = 0; l < layerIds.length - 1; l++) {
    edges.push(...connectLayers(layerIds[l], layerIds[l + 1]));
  }

  return { nodes, edges };
}
