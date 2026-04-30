# MyCryptoTactics

歴史偉人 × **ローグライク × カードバトル** ブラウザゲーム（Slay the Spire 系）

## 🎮 今すぐ遊ぶ

**▶ https://mycryptotactics.vercel.app**

スマホ・PC どちらでも動きます。インストール不要、無料。

---

## どんなゲーム？

[My Crypto Heroes](https://www.mycryptoheroes.net/) のキャラクター・エクステンションをモチーフにした、ブラウザで動くターン制ローグライクです。マップ上でノードを選びながら進み、敵とカードバトルで戦います。1 ラン 15〜30 分が目安。

- **3 章構成**（アバカス → アタナソフ → アンティキティラ）
- 各章にノーマルエネミー・レアエネミー（フラペチーノ）・ボス（ゴースト英雄）
- ショップでエクステンション由来のカードを購入してデッキを強化

---

## 操作方法

| 操作 | PC | スマホ |
|------|-----|-------|
| マップのノードを選ぶ | クリック | タップ |
| カードをフォーカス | クリック | タップ |
| フォーカス中のカードを使う | もう一度クリック | もう一度タップ |
| ターン終了 | 右下「ターン終了」ボタン | 同左 |
| ヘルプを開く | 画面右上「?」ボタン | 同左 |

カードは **1 回目の操作でフォーカス（詳細表示）**、**2 回目で使用** します。スクロール中の誤タップを防ぐ仕様です。

---

## 既知の制約

- **セーブなし** — ページをリロードするとランがリセットされます
- **日本語のみ** — 多言語対応は予定していません
- **無料・非営利** — 商用利用はありません
- BGM / SE はブラウザの自動再生制限により、初回タップ後から再生されます

---

## フィードバック・バグ報告

[GitHub Issues](https://github.com/bearko/mycryptotactics/issues) へどうぞ。

---

## クレジット・ライセンス

キャラクター画像・エクステンション画像・BGM / SE は [bearko/mycryptoheroes](https://github.com/bearko/mycryptoheroes) の素材を使用しています。これらのアセットは **My Crypto Heroes (MCH Co., Ltd.)** に帰属し、ファンが作成した二次創作コンテンツとして利用しています。商用利用は行っていません。

ゲームのソースコード (`.js`, `.html`, `.css`) は MIT ライセンスです。アセット（画像・音声）のライセンスは MCH の利用ガイドラインに従ってください。

---

## 開発者向け情報

<details>
<summary>仕様・ドキュメント一覧（クリックで展開）</summary>

本リポジトリは [bearko/aidev_template](https://github.com/bearko/aidev_template) をベースにした **仕様駆動開発** のルールを採用しています。

| 内容 | パス |
|------|------|
| Claude Code 運用規則 | [CLAUDE.md](CLAUDE.md) |
| AI / エージェント向け入口 | [AGENTS.md](AGENTS.md) |
| プロジェクト憲章 | [docs/charters/PROJECT_CHARTER.md](docs/charters/PROJECT_CHARTER.md) |
| 開発憲章 | [docs/charters/DEVELOPMENT_CHARTER.md](docs/charters/DEVELOPMENT_CHARTER.md) |
| デザイン憲章 | [docs/charters/DESIGN_CHARTER.md](docs/charters/DESIGN_CHARTER.md) |
| 仕様駆動プロセス | [docs/process/SPEC_DRIVEN_DEVELOPMENT.md](docs/process/SPEC_DRIVEN_DEVELOPMENT.md) |
| Git / PR | [docs/process/GIT_WORKFLOW.md](docs/process/GIT_WORKFLOW.md) |
| 人の判断が必要な局面 | [docs/process/HUMAN_IN_THE_LOOP.md](docs/process/HUMAN_IN_THE_LOOP.md) |
| エージェント運用 | [docs/process/AGENT_OPERATING_GUIDE.md](docs/process/AGENT_OPERATING_GUIDE.md) |
| テスト証跡 | [docs/testing/TESTING_STRATEGY.md](docs/testing/TESTING_STRATEGY.md) |
| 仕様一覧 | [docs/specs/SPEC-INDEX.md](docs/specs/SPEC-INDEX.md) |
| PR テンプレート | [.github/PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md) |
| デプロイ手順 | [docs/operations/VERCEL_DEPLOY.md](docs/operations/VERCEL_DEPLOY.md) |

**流れの要約**: 憲章を読む → 対象の SPEC を [SPEC-INDEX.md](docs/specs/SPEC-INDEX.md) から特定する → 実装 → PR に受け入れ基準と確認証跡を書く。

### 体験・UI の追加方針

戦闘まわりのレイアウト・フィードバック・音声・ピクセル補間など **プレイヤーが何をどこで理解するか** は [SPEC-002 §10](docs/specs/SPEC-002-prototype.md#10-体験ui-設計方針機能追加時の参照) に集約する。新機能で画面を変えるときは **先に SPEC を更新** し、近接配置・モバイルでの視認性・数値の検証しやすさを崩さないこと。

### プロダクト文書とプロトタイプ

- 企画メモ: [docs/CHRONO_TACTICS_DESIGN.md](docs/CHRONO_TACTICS_DESIGN.md)（§7 に体験設計の柱）
- **プレイ用**: [prototype/index.html](prototype/index.html)（ES モジュール。ルート [index.html](index.html) から誘導）。アセット・BGM/SE は [bearko/mycryptoheroes](https://github.com/bearko/mycryptoheroes) の raw URL
- 仕様: [SPEC-001](docs/specs/SPEC-001-roguelike-deck-mock.md)（体験要件） / [SPEC-002](docs/specs/SPEC-002-prototype.md)（プロト構成・戦闘UX・**MCH 式戦闘 §11**）

</details>
