# Day 1 Issues — 本日（D+0）の作業チケット

このファイルの各 Issue は、GitHub Issues に **そのままコピー・ペースト** して投稿できる形式になっています。優先度順に並べてあるので上から消化してください。

## 投稿方法（一括登録の場合）

GitHub CLI を使えば一括登録できます。各 Issue の `## Title` 〜 次の `## Title` の手前までを切り出して、`gh issue create -t "タイトル" -F body.md` で送ります。

または、Web UI で 1 件ずつ作成する場合は「タイトル」「本文」「ラベル」をそれぞれフィールドに貼り付けてください。

---

## Issue #1: 憲章・CLAUDE.md・SPEC-003/004 の追加 PR

**Title**: `chore: 憲章・CLAUDE.md・SPEC-003/004 を追加してリリース体制を整える`

**Labels**: `documentation`, `priority:high`, `spec`

**Body**:

```
## 背景

3 日後の一般公開に向けて、リリース運用に必要な憲章と SPEC を追加する。これは作業着手のための前提整備であり、本 Issue がマージされない限り Day 1 以降のコンテンツ作業に取りかかれない。

## やること

- [ ] `CLAUDE.md` を新規作成（ルートに配置）
- [ ] `docs/charters/DESIGN_CHARTER.md` を新規作成
- [ ] `docs/charters/DEVELOPMENT_CHARTER.md` を 0.1-draft → 1.0 に強化
- [ ] `docs/charters/PROJECT_CHARTER.md` を 1.0 → 2.0 に改訂（リリースを成功定義に組み込む）
- [ ] `docs/specs/SPEC-002.5-prototype-snapshot.md` を Draft で追加
- [ ] `docs/specs/SPEC-003-public-release.md` を Draft で追加
- [ ] `docs/specs/SPEC-004-stage-content.md` を Draft で追加
- [ ] `docs/specs/SPEC-INDEX.md` に SPEC-002.5 / SPEC-003 / SPEC-004 を「Draft」で登録
- [ ] `docs/roadmap/RELEASE_ROADMAP.md` を追加
- [ ] `README.md` の「開発の進め方」セクションに DESIGN_CHARTER と CLAUDE.md へのリンクを追加

## 受け入れ基準

- [ ] 上記すべてのファイルが `main` にマージされている
- [ ] SPEC-INDEX に新規 SPEC が登録されている
- [ ] CLAUDE.md が 200 行未満
- [ ] PROJECT_CHARTER に「リリースが成功定義に含まれる」旨が明記されている

## 参照

- 既存の SPEC-002 §10 を DESIGN_CHARTER に昇格
- aidev_template の構成に倣う

## 担当・期日

- 担当: 自分
- 期日: Day 1 の 10:00 まで
```

---

## Issue #2: chapters.js の新設と章 1 のデータ投入

**Title**: `feat(SPEC-004): chapters.js を新設し、章 1（戦国回廊）のマップ・敵・カードを実装`

**Labels**: `feature`, `priority:high`, `SPEC-004`

**Body**:

```
## 背景

SPEC-004 に従い、章 1〜3 のステージ定義をデータ駆動で持つ。本 Issue では章 1 を完成させる。

## やること

- [ ] `prototype/js/chapters.js` を新規作成し、章 1 の定義を SPEC-004 §6 に従って書く
- [ ] `prototype/js/enemies.js` に章 1 の敵 3 種（sn-001 足軽、sn-002 弓兵、sn-003 甲冑武者）を追加
- [ ] `prototype/js/cards.js` に章 1 のカード 8 枚（cd-101 〜 cd-108）を追加
- [ ] `prototype/js/bosses.js` を新規作成し、章 1 ボス「戦国の覇者」を定義
- [ ] `prototype/js/maps.js` を改修して、章定義を受けてグラフを生成する純関数 `generateChapterMap(chapter)` に整える
- [ ] `prototype/js/main.js` から章定義を参照する形に書き換える（既存ハードコードを置換）

## 受け入れ基準

- [ ] 章 1 の最初のノードから最後（ボス）まで通せる
- [ ] 章 1 のマップが 4 層 × 3〜4 ノードで生成される
- [ ] 敵 3 種、カード 8 種すべてが章 1 で出現する
- [ ] ボス意図ローテが SPEC-004 §6.5 のとおりに動作する
- [ ] PR 本文に通しプレイの動画 or スクリーンショットを添付（任意だが望ましい）

## やらないこと

- 章 2、章 3 のデータ追加（別 Issue）
- 新しい状態異常の実装（章 2 の Issue で）

## 参照

- SPEC-004 §6
- SPEC-002.5 §5（NEXT ACTION の表示位置）

## 担当・期日

- 担当: 自分
- 期日: Day 1 の 17:00 まで
```

---

## Issue #3: 章 1 のバランス調整（係数のみ）

**Title**: `chore(SPEC-004): 章 1 戦闘バランスを実機プレイで調整`

**Labels**: `tweak`, `priority:medium`, `SPEC-004`

**Body**:

```
## 背景

章 1 の敵 HP・カードのダメージ係数を、ジュニアレベルのプレイヤーが「程よく勝てる／程よく死ぬ」バランスに合わせる。新機能の追加はしない。**係数の変更のみ**。

## やること

- [ ] PC で章 1 を 5 戦プレイ（ボス除く）
- [ ] 5 戦中 3〜4 戦が HP 残量 30〜70% でクリアできる係数を探す
- [ ] ボス戦を 3 回プレイし、初回または 2 回目で勝てる調整にする
- [ ] 結果を SPEC-004 の改訂履歴に追記（数値変更の根拠を残す）

## 受け入れ基準

- [ ] 5 戦の結果（戦闘番号・残 HP・かかったターン数）を PR 本文に記録
- [ ] ボス戦の結果（勝敗・残 HP・かかったターン数）を PR 本文に記録
- [ ] SPEC-004 の改訂履歴が更新されている

## やらないこと

- 新カード・新敵の追加
- 戦闘式の変更（battle-mch.js は触らない）

## 担当・期日

- 担当: 自分
- 期日: Day 1 の 18:00 まで
```

---

## Issue #4: README.md の整備（リリース向け）

**Title**: `docs: README.md をリリース向けに整備（プレイ URL・操作・ライセンス・クレジット・フィードバック窓口）`

**Labels**: `documentation`, `priority:medium`

**Body**:

```
## 背景

SPEC-003 §5「ドキュメント」の受け入れ基準を満たすため、README.md を整備する。来訪者が README だけを読んで「何のゲームか／どこで遊べるか／誰が作ったか／何を期待できるか」が分かる状態にする。

## やること

- [ ] プレイ URL を冒頭に明示（`mycryptotactics.vercel.app`）
- [ ] 1 段落のゲーム紹介（誰向け・何が面白い・1 ラン何分）
- [ ] スクリーンショット 2〜3 枚（マップ／戦闘／報酬）
- [ ] 操作（クリック／タップで完結する旨と、ヘルプの開き方）
- [ ] 既知の制約セクション（セーブなし、日本語のみ、無料、非営利）
- [ ] ライセンス・クレジット（mycryptoheroes 素材を MCH Co.Ltd. ガイドラインに準拠して使用、二次創作）
- [ ] フィードバック窓口（GitHub Issues へのリンク）
- [ ] 開発者向けセクションは下部に押し下げる（既存の SPEC リンク群）

## 受け入れ基準

- [ ] プロジェクトを知らない人が README を読んで遊び始められる
- [ ] 既知の制約が正直に書かれている
- [ ] mycryptoheroes 素材の利用方針が明記されている

## 参照

- SPEC-003 §6.4 法務
- mycryptoheroes README の画像利用ガイドライン要約

## 担当・期日

- 担当: 自分
- 期日: Day 3
```

---

## Issue #5: SPEC-INDEX.md の更新

**Title**: `chore: SPEC-INDEX.md に新規 SPEC（002.5 / 003 / 004）を登録`

**Labels**: `documentation`, `spec`, `priority:high`

**Body**:

```
## 背景

新規追加した SPEC を SPEC-INDEX に登録する。Issue #1 と同時にやってもよい。

## やること

- [ ] `docs/specs/SPEC-INDEX.md` に以下を追加（状態列を「Draft」で）
  - SPEC-002.5（プロトタイプ現況スナップショット）
  - SPEC-003（一般公開リリース要件）
  - SPEC-004（ステージコンテンツ）

## 受け入れ基準

- [ ] SPEC-INDEX を見れば、現在生きている SPEC とその状態がすべて分かる

## 担当・期日

- 担当: 自分
- 期日: Day 1 の 10:00（Issue #1 と同時）
```

---

## Issue #6: battle-mch.js の最小ユニットテスト追加

**Title**: `test: battle-mch.js の純関数に Node 標準 assert でユニットテスト追加`

**Labels**: `test`, `priority:low`, `SPEC-003`

**Body**:

```
## 背景

SPEC-003 §9.2 で言及した「自動テスト（限定）」を実装する。本リリース版での E2E は対象外だが、戦闘数式の純関数だけは Node 標準 `assert` で守る。これにより、章コンテンツ追加で式を壊した場合に気づける。

## やること

- [ ] `tests/battle-mch.test.mjs` を新規作成
- [ ] テスト対象：
  - PHY 依存ダメージ計算（カット率込み）
  - INT 依存ダメージ計算
  - クリティカル加算（基礎値での再計算）
  - SPECIAL ダメージとシールド吸収
  - 回復係数（INT 回復、PHY 回復）
- [ ] `node tests/battle-mch.test.mjs` で 0 終了するまで通す
- [ ] `package.json` を作らない（依存ゼロを維持）。実行コマンドは README に書く

## 受け入れ基準

- [ ] テストファイルが 1 ファイルで完結
- [ ] 外部依存（npm パッケージ）ゼロ
- [ ] すべてのテストケースが通る
- [ ] PR 本文に実行ログを貼る

## やらないこと

- jest / vitest / その他テストフレームワークの導入（SPEC-002 のビルドツール非目標と矛盾）
- UI のテスト

## 担当・期日

- 担当: 自分
- 期日: Day 2
```

---

## Issue #7（番外）: VERCEL_DEPLOY.md の作成

**Title**: `docs(SPEC-003): VERCEL_DEPLOY.md にデプロイ手順とロールバック手順を書面化`

**Labels**: `documentation`, `operations`, `SPEC-003`, `priority:medium`

**Body**:

```
## 背景

SPEC-003 §10 のデプロイ・ロールバック手順を書面化する。リリース当日に「この手順を見ながらやる」状態にする。

## やること

- [ ] `docs/operations/VERCEL_DEPLOY.md` を新規作成
- [ ] 含めるセクション：
  - 前提（Vercel フリープラン、既存プロジェクト）
  - 通常デプロイ手順（PR → プレビュー → main マージ → Promote）
  - smoke test の項目（章 1 の最初の戦闘までを 1 分で確認）
  - ロールバック手順（Vercel ダッシュボードからの即時 rollback、git revert）
  - 致命バグ発覚時の判断基準（即ロールバック / 次リリース）

## 受け入れ基準

- [ ] 手順を読みながら他人がデプロイ／ロールバックできるレベル
- [ ] 各ステップに所要時間の目安が書かれている

## 担当・期日

- 担当: 自分
- 期日: Day 3
```

---

## ラベル設計（GitHub Repo にあらかじめ作っておく）

| ラベル | 色 | 用途 |
|---|---|---|
| `priority:high` | red | リリースに必須 |
| `priority:medium` | yellow | リリースまでにやりたい |
| `priority:low` | green | 余裕があれば |
| `feature` | blue | 機能追加 |
| `tweak` | light-blue | 数値・係数のみの調整 |
| `documentation` | gray | ドキュメント |
| `test` | purple | テスト |
| `operations` | orange | デプロイ・運用 |
| `spec` | dark-blue | SPEC 関連 |
| `SPEC-003` / `SPEC-004` 等 | 任意 | SPEC ID への紐付け |

## チケット投入後のチェック

- [ ] Issues タブに 7 件以上の Issue が表示される
- [ ] それぞれに Labels が付いている
- [ ] Issue #1 が他の Issue より上にある（GitHub のソート順を確認）
- [ ] 期日（Milestone）が設定されている（任意：Vercel 公開日を設定）

---

## 補足：Day 2 / Day 3 の Issue は Day 1 終了時に作成する

Day 1 の進捗を見ながら、Day 2 の Issue を当日夕方に作成します。先回りで作りすぎると、状況に応じた優先順位の調整ができなくなります。
