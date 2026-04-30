# バランス調整ループ仕様

Phase B のオーケストレーション。親エージェント（Claude Code セッション）が
2 つのサブエージェントを直列で呼び出して 1 イテレーションを進める。

## 構造

```
イテレーション N:
  1. game-strategist  →  iter-N.json (sim 結果) + iter-N-issues.json (ボトルネック)
  2. game-balancer    →  data/*.json 編集 + sync 実行 + iter-N-balance.md
  3. 親が再 sim       →  iter-N-verify.json で改善方向を確認
  4. 収束判定         →  続行 / 停止
```

## 収束目標（ユーザー指定）

| 章 | 目標クリア率 |
|----|------|
| 1 アバカス | 85% (±5pp) |
| 2 ホレリス | 60% (±5pp) |
| 3 アンティキティラ | 10% (±3pp) |
| 4 アタナソフ | 5% (±2pp) |
| 5 トロイ | 0.5% (±0.5pp) |

加えて：
- ヒーロー間クリア率格差: 1.5 倍以内
- 各章の死亡は **トップ 1 ノードに 40% 以上** 集中

## 収束判定（親が毎ループ後に実施）

3 イテレーション連続で以下を満たしたら **収束**、ループ終了：
- 全章が目標 ±許容範囲内
- ヒーロー格差 1.5 倍以内
- 各章の死亡集中度 40% 以上

## ループ駆動（自走モード）

ユーザーが `/loop` を発動すると、親エージェントは以下を繰り返す：

1. `Agent({ subagent_type: "game-strategist", ... })` を呼び出す
2. 完了後 `Agent({ subagent_type: "game-balancer", ... })` を呼び出す
3. `powershell -File sim/sim.ps1 --runs=500` で再シミュ → 改善方向を確認
4. 収束判定。収束なら `/loop` を抜ける。未収束なら `ScheduleWakeup` で次回を予約

予算: 4-5 時間。1 イテレーション 約 5-10 分（agent overhead 中心）。
30〜50 イテレーション程度を想定。

## ロールバック

3 連続イテレーションで全章クリア率が悪化した場合、
最後の 3 イテレーションの編集を `git restore prototype/data prototype/js/{enemies,bosses}.js prototype/sim/data.js` で戻し、
別の調整方向を試す（balancer に「以下は試したがダメだった」と伝える）。

## 最終コミット（案 B 採用）

ループ終了時に **1 コミット** にまとめる：

```bash
git add prototype/data/ prototype/js/ prototype/sim/
git commit -m "balance: bring all chapters to convergence (N iterations)"
```

イテレーション中は `.gitignore` 化された `prototype/sim/reports/iter-*.json` のみが
増えるが、これらは無視される。

## 起動コマンド（ユーザー操作）

```
/loop バランス調整ループを開始してください。収束するか、次回の起床から
8 時間が経過するまで継続してください。
```

または明示的に：

```
バランス調整ループを 1 イテレーションだけ実行してください。
```

（後者の場合は `/loop` ではなく通常の Agent 呼び出しで 1 回回す）
