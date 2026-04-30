# Iteration 1 — Balance Patch

## 変更点（4 件）

### 1. ドイル スターターデッキを INT 寄せ (severity: critical)
- `prototype/sim/data.js` HEROES[1].starterDeck:
  `{ext1001:5, ext1004:4, ext1008:1}` → `{ext1003:3, ext1008:4, ext1004:3}`
- 理由: basePhy 7 で PHY カードが機能せず ch1 到達率 1%。
  INT 14 を活かすデッキ構成に。
- TODO: `prototype/js/constants.js` のドイル基礎ステは未変更。
  実機にも反映するため次イテレーションで `setLeader` 経由のシミュ-実機同期化要検討。

### 2. ch3 elite ベーグル フラペチーノ (en-e01) 弱体化 (severity: critical)
- `prototype/data/enemies.json`:
  - `phy: 25 → 22`
  - `intentRota[0].phyPct: 105 → 90`
- 理由: ch3 死亡の 55% が集中。boss-ch3 より致命的になっていた。

### 3. ch1 elite クリーパー フラペチーノ (sn-e01) 弱体化 (severity: high)
- `prototype/data/enemies.json`:
  - `hp: 34 → 28`
  - `intentRota[1].phyPct: 130 → 115`
  - `intentRota[2].phyPct: 120 → 110`
- 理由: ch1 アバカス目標 85% に対し実測 64.7%。入門としては難しすぎ。

### 4. ch1 boss ゴースト・上杉謙信 弱体化 (severity: high)
- `prototype/data/bosses.json`:
  - `hp: 65 → 55`
- 理由: 同上。boss と elite の両方で削られて累積死亡。

## 同期実行
- `tools/sync.ps1 json-to-csv` を実行 → enemies.csv / bosses.csv / enemies.js / bosses.js も更新済み

## 検証結果（再シミュ 1500 ラン）

| 章 | iter-001 前 | iter-001 後 | 目標 | 評価 |
|----|-------------|-------------|------|------|
| 1  | 64.7% | 71.3% | 85% | 改善 +6.6pp（まだ -14pp）|
| 2  | 73.6% | 76.8% | 60% | 悪化 +3.2pp（ぬるすぎ深刻化）|
| 3  | 2.1%  | 1.6%  | 10% | ほぼ変わらず |
| 4  | 13.3% | 30.8% | 5%  | 悪化（簡単すぎ強化）|
| 5  | 0%    | 0%    | 0.5%| 変わらず |

## 次イテレーションの優先課題

1. **ch2 ホレリスを難しく**：boss-hl またはエリートを強化
2. **ch4 アタナソフの簡単すぎ**：到達ラン少ないので統計弱い、要再計測
3. **ch3 アンティキティラ依然 1.6%**：boss-ch3 リンカーンの方を緩和すべき
4. ドイル ch1 データを再確認（doyle 単体クリア率を計測する仕組み欲しい）

## 残課題

- 実機側 (`prototype/js/constants.js`) のドイル設定はまだ未同期。
  シミュ収束後に手動で反映する手順を考える。
- `prototype/sim/sim.ps1` の `--report` パスがレポートに mojibake で表示される
  問題は機能的に無害（ファイルは正しく書ける）。低優先。
