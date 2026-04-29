# プロトタイプ（クロノ・デッキ）

単一ページのプレイ可能プロトタイプ。ゲームロジックは ES モジュールに分割しています。

| ファイル | 役割 |
|----------|------|
| `index.html` | マークアップとスタイル（手札 **3列**、ログはアリーナと手札の間、NEXT ACTION は敵下、エナジーは手札上） |
| `js/main.js` | ラン・戦闘・UI・BGM/SE・数値フロート |
| `js/cards.js` | エクステンション由来のカード定義・`battleIconUrl` |
| `js/map.js` | マップ層ノード定義 |
| `js/constants.js` | アセット URL、リーダー基礎ステ、音声パス |

ルートの [index.html](../index.html) は `/prototype/index.html` にリダイレクトします。

**仕様（体験・UI 方針含む）**: [docs/specs/SPEC-002-prototype.md](../docs/specs/SPEC-002-prototype.md) §5–§10
