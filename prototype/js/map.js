/** マップ層定義（企画書 §4.2 に沿った簡易版） */
export const MAP_LAYERS = [
  { label: "第1層", nodes: [{ type: "fight", label: "遭遇戦" }, { type: "fight", label: "遭遇戦" }] },
  { label: "第2層", nodes: [{ type: "fight", label: "遭遇戦" }, { type: "rest", label: "篝火" }] },
  { label: "第3層", nodes: [{ type: "shop", label: "店" }, { type: "fight", label: "強敵", elite: true }] },
  { label: "ボス", nodes: [{ type: "boss", label: "ボス戦" }] },
];
