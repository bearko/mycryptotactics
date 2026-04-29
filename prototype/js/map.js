/**
 * ラン用マップ「始まりの塔」— 下→上に進むノード＋接続（合流・分岐）
 * 座標は SVG viewBox 0..100（x=横位置、y=小さいほど上）
 */

/** @typedef {'fight'|'rest'|'shop'|'boss'} NodeType */

/**
 * fight: label は短名、戦闘種別は描画側で「戦闘」+ enemyImgId
 * @type {{ id: string, layer: number, type: NodeType, label: string, x: number, y: number, elite?: boolean, enemyImgId?: number }[]}
 */
export const MAP_NODES = [
  { id: "L0A", layer: 0, type: "fight", label: "遭遇", x: 38, y: 82, enemyImgId: 314 },
  { id: "L0B", layer: 0, type: "fight", label: "遭遇", x: 62, y: 82, enemyImgId: 314 },
  { id: "L1A", layer: 1, type: "fight", label: "遭遇", x: 32, y: 64, enemyImgId: 314 },
  { id: "L1B", layer: 1, type: "rest", label: "篝火", x: 50, y: 64 },
  { id: "L1C", layer: 1, type: "fight", label: "遭遇", x: 68, y: 64, enemyImgId: 314 },
  { id: "L2A", layer: 2, type: "shop", label: "店", x: 40, y: 44 },
  { id: "L2B", layer: 2, type: "fight", label: "遭遇", x: 60, y: 44, elite: true, enemyImgId: 418 },
  { id: "BOSS", layer: 3, type: "boss", label: "ボス", x: 50, y: 22, enemyImgId: 505 },
];

/** [from, to] 有向辺（下 START から上へ） */
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
 * @param {string | null} lastNodeId
 */
export function reachableNextNodeIds(lastNodeId) {
  if (!lastNodeId) {
    return EDGE_FROM.get("START") || [];
  }
  return EDGE_FROM.get(lastNodeId) || [];
}
