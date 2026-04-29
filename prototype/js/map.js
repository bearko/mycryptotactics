/**
 * ラン用マップ（全フロアをノード＋接続で表現。1:1 / 1:n / n:n の合流・分岐を含む）
 * 座標は SVG viewBox 0..100 内のパーセント。
 */

/** @typedef {'fight'|'rest'|'shop'|'boss'} NodeType */

/** @type {{ id: string, layer: number, type: NodeType, label: string, x: number, y: number, elite?: boolean }[]} */
export const MAP_NODES = [
  { id: "L0A", layer: 0, type: "fight", label: "遭遇・東回廊", x: 22, y: 28 },
  { id: "L0B", layer: 0, type: "fight", label: "遭遇・西回廊", x: 22, y: 72 },
  { id: "L1A", layer: 1, type: "fight", label: "遭遇戦", x: 42, y: 22 },
  { id: "L1B", layer: 1, type: "rest", label: "篝火", x: 42, y: 50 },
  { id: "L1C", layer: 1, type: "fight", label: "遭遇戦", x: 42, y: 78 },
  { id: "L2A", layer: 2, type: "shop", label: "店", x: 62, y: 32 },
  { id: "L2B", layer: 2, type: "fight", label: "強敵", x: 62, y: 68, elite: true },
  { id: "BOSS", layer: 3, type: "boss", label: "ボス戦", x: 84, y: 50 },
];

/** [from, to] 有向辺。START から第0層へ。 */
export const MAP_EDGES = [
  ["START", "L0A"],
  ["START", "L0B"],
  ["L0A", "L1A"],
  ["L0A", "L1B"],
  ["L0B", "L1B"],
  ["L0B", "L1C"],
  ["L1A", "L2A"],
  ["L1A", "L2B"],
  ["L1B", "L2A"],
  ["L1B", "L2B"],
  ["L1C", "L2B"],
  ["L2A", "BOSS"],
  ["L2B", "BOSS"],
];

const EDGE_FROM = new Map();
for (const [a, b] of MAP_EDGES) {
  if (!EDGE_FROM.has(a)) EDGE_FROM.set(a, []);
  EDGE_FROM.get(a).push(b);
}

/** @param {string} id */
export function mapNodeById(id) {
  return MAP_NODES.find((n) => n.id === id) || null;
}

/**
 * 直前に選んだノードから到達可能な次ノード id（同一層は不可）
 * @param {string | null} lastNodeId
 */
export function reachableNextNodeIds(lastNodeId) {
  if (!lastNodeId) {
    return EDGE_FROM.get("START") || [];
  }
  return EDGE_FROM.get(lastNodeId) || [];
}
