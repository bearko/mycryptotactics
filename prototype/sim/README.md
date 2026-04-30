# Headless Combat Simulator

ヘッドレスNode.js戦闘シミュレータ。`prototype/data/*.json` のパラメータを直接読み、
全カード効果・パッシブ・敵AI・LLエクステを忠実に再現してランを自動プレイする。

## 目的

ゲームバランス調整ループの「攻略班」側を担う。大量のラン（数千〜数万）を高速実行
して以下を計測：

- 章ごとのクリア率
- 死亡頻度の高いノード（ボス／エリート／通常戦闘）
- ヒーロー別の到達深度
- 報酬カードの相対的な強さ（ピック頻度）

## 使い方

### 基本（PowerShell ラッパー経由・推奨）

日本語パス上で Node.js v22 がクラッシュする問題を回避するため、`sim.ps1` を経由する。

```powershell
# 全3ヒーロー × 300ラン（デフォルト）
powershell -ExecutionPolicy Bypass -File prototype/sim/sim.ps1

# ラン数指定
powershell -ExecutionPolicy Bypass -File prototype/sim/sim.ps1 --runs=1000

# ヒーロー絞り込み
powershell -ExecutionPolicy Bypass -File prototype/sim/sim.ps1 --hero=kaihime --runs=500

# 詳細レポート（ラン毎の結果を JSON 出力）
powershell -ExecutionPolicy Bypass -File prototype/sim/sim.ps1 --runs=300 --report=prototype/sim/reports/baseline.json

# 決定的トレース（同一シードで再現）
powershell -ExecutionPolicy Bypass -File prototype/sim/sim.ps1 --seed=12345 --runs=1
```

### 直接呼び出し（ASCII パスでのみ動作）

```bash
node prototype/sim/simulate.js --runs=300 --report=reports/baseline.json
```

## 出力形式（標準出力）

```
=== 甲斐姫 (kaihime) ===
  win-rate:    27.0%  (81/300)
  avg nodes:   13.5
  finalHp%:    42.3% (winners avg)
  deaths/ch:   {"1":12,"2":80,"3":127,...}
  clear-rate per ch: 1=96%  2=66%  3=20%  ...
  top death spots:
    ch3/elite/ベーグル フラペチーノ: 42
    ch3/boss/ゴースト・リンカーン: 28
    ...
=== AGGREGATE ===
  per-chapter clear rate (when reached):
    ch1 アバカス: 95.5%
    ch2 ホレリス: 65.2%
    ch3 アンティキティラ: 18.7%
    ch4 アタナソフ: 8.0%
    ch5 トロイ: 2.1%
```

## 設計方針

### 戦闘忠実性（フェーズA案A準拠）
- カード効果・敵インテント・パッシブはすべて完全再現
- ランダム要素はすべて mulberry32 シード PRNG（決定論的再現可）
- 主要ロジックは `prototype/js/main.js`, `cards.js`, `battle-mch.js` の対応箇所と
  ファイル上部のコメントで紐付けてある

### メタゲーム簡略化
- マップ：分岐なしの線形チェーン（`NODES_PER_CHAPTER + 1ボス`）。
  ノードタイプは `chapter.mapRules.nodeRatios` の重みでサンプリング
- ショップ：50G 以上で買い、`cardPowerScore` 上位を選択（同種3枚以上は減点）
- クラフト：30G で starter card を Elite にアップグレード
- レスト：HP 30% 回復
- イベント：スキップ
- 報酬：3枚提示中 `cardPowerScore` 最高を選択
- LLエクステ：低HP（<40%）or 致死被弾予定で防御系を発動／ボス前半で攻撃系を発動

### 自動プレイヤ（heuristic）
- カード毎にスコア関数（`player.js: scoreCard`）。被ダメ予測との比較で
  防御系の優先度をブースト
- 致死圏内（カード単発でボスHP超過）には +200 スコア
- 過剰コストのカードは1.5×コストで減点

これは強化学習ではないが、人手で書いたヒューリスティックとしては十分強く、
**「最適解パターンが組まれたときの上限」を測る目的にかなう** レベル。

## ファイル構成

| ファイル | 役割 |
|---------|------|
| `engine.js`   | 戦闘エンジン（RNG・ダメージ計算・状態遷移・パッシブ・LL ext） |
| `cards.js`    | 全カード play() 関数の port |
| `data.js`     | enemies/bosses 読み込み・章/ヒーロー/LL ext 定義 |
| `player.js`   | ヒューリスティック自動プレイヤ |
| `run.js`      | メタゲーム（章を順次走破するラン） |
| `simulate.js` | CLI バッチランナー |
| `sim.ps1`     | 日本語パス回避ラッパー |
| `COMBAT_SPEC.md` | エンジン実装の根拠ドキュメント（参照元） |
| `reports/`    | 出力されたランレポート（gitignored 推奨） |

## バランス調整ループでの使い方

```
              ┌─────────────────────────┐
              │ 1. node sim/simulate.js │  ←  攻略班（このディレクトリ）
              │    → reports/iter-N.json │
              └────────────┬────────────┘
                           │
              ┌────────────▼────────────┐
              │ 2. レポート分析エージェント │
              │   → "ch3 elite が壁"等 │
              └────────────┬────────────┘
                           │
              ┌────────────▼─────────────┐
              │ 3. data/enemies.json 等を│  ←  バランス班
              │   調整 → sync.ps1 実行   │
              └────────────┬─────────────┘
                           │
                           ↺  ループ
```

## 既知の制限・注意

- **AGI debuff（ext1012など）の crit 率効果は反映するが、敵側の crit は AGI に紐づく
  ため変動する**：仕様通り
- **敵の `attackPoison`/`attackBleed` 命中時の状態異常付与は実装**
- **ボスの phase 切替（HP 50% / 45% など）は実装**
- **「クラフト」は starter→elite だけで、他系列のアップグレード（cd系→elite）は未実装** —
  本家ロジックを確認した上でTODO
- **ショップの「カード処分」「LLエクステ売買」はメタAIに非搭載** — TODO
- **ランレポートの `runs[]` フィールドは大きくなる可能性あり**：1000ラン超は注意

## 検証

```bash
# 既存パラメータで 300runs/hero を実行 → ベースラインとして保存
powershell -ExecutionPolicy Bypass -File prototype/sim/sim.ps1 --runs=300 --report=prototype/sim/reports/baseline.json
```

このベースラインは「Phase A 完成時点」のスナップショット。バランス調整後の
比較対象として保存しておくこと。
