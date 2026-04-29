# プロトタイプ（クロノ・デッキ）

単一ページのプレイ可能プロトタイプ。ゲームロジックは ES モジュールに分割しています。

| ファイル | 役割 |
|----------|------|
| `index.html` | マークアップとスタイル（手札は **3列グリッド**） |
| `js/main.js` | ラン・戦闘・UI のオーケストレーション |
| `js/cards.js` | エクステンション由来のカード定義・`battleIconUrl` |
| `js/map.js` | マップ層ノード定義 |
| `js/constants.js` | アセットベース URL とリーダー定数 |

ルートの [index.html](../index.html) は `/prototype/index.html` にリダイレクトします。

仕様: [docs/specs/SPEC-002-prototype.md](../docs/specs/SPEC-002-prototype.md)
