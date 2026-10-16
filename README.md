# MyCryptoTactics

歴史偉人 × **ローグライク × カードバトル** ブラウザゲーム（Slay the Spire 系）

## 🎮 今すぐ遊ぶ

**▶ https://tactics.bearko.games**

スマホ・PC どちらでも動きます。インストール不要、無料。ホーム画面に追加するとアプリのように開けます。

いまの版：**Ver.1.3.0**（2026-10-16）

---

## どんなゲーム？

[My Crypto Heroes](https://www.mycryptoheroes.net/) のキャラクター・エクステンションをモチーフにした、ブラウザで動くターン制ローグライクです。マップ上でノードを選びながら進み、敵とカードバトルで戦います。1 ラン 15〜30 分が目安。

- **5 章構成**（アバカス → ホレリス → アンティキティラ → アタナソフ → トロイ）
- 最大 3 人のパーティ（前衛・中衛・後衛）で戦う
- 各章にノーマルエネミー・レアエネミー（フラペチーノ）・ボス（ゴースト英雄）
- ショップでエクステンション由来のカードを購入してデッキを強化
- レギュレーション（Common〜Red Dragon、Absolute）とランキング。bearko.games のトロフィー・総合スコアにも参加

---

## 操作方法

| 操作 | PC | スマホ |
|------|-----|-------|
| マップのノードを選ぶ | クリック | タップ |
| カードをフォーカス | クリック | タップ |
| フォーカス中のカードを使う | もう一度クリック | もう一度タップ |
| ターン終了 | 右下「ターン終了」ボタン | 同左 |
| ヘルプを開く | 画面右上「?」ボタン | 同左 |
| 設定（音量・演出を減らす・言語） | 画面右上「⚙」ボタン | 同左 |
| ダイアログを閉じる | Esc | ✕ / 背景 |

カードは **1 回目の操作でフォーカス（詳細表示）**、**2 回目で使用** します。スクロール中の誤タップを防ぐ仕様です。初めての戦闘では、手札・エナジー・敵の予告・ターン終了を順に指し示す案内が出ます（ヘルプから「もう一度見る」）。

---

## 既知の制約

- **ランのセーブなし** — ページをリロードするとランがリセットされます（設定・レギュレーションの解放・ランキングの名前は端末に保存されます）
- **日本語・英語** — ヘッダーの JP/EN か設定で切り替え
- **無料・非営利** — 商用利用はありません
- BGM / SE はブラウザの自動再生制限により、初回タップ後から再生されます

---

## 更新履歴

| 版 | 日付 | 内容 |
|---|---|---|
| 1.3.0 | 2026-10-16 | UI の土台（見出し・数字のフォント、ボタン、ダイアログを Esc で閉じる、画面端の safe-area、動きを減らす設定への対応）、設定（BGM・SE の音量、演出を減らす、言語）、演出（撃破の粒・被弾の縁・ゴールドのカウントアップ・画面の切り替え）、はじめての案内、ホーム画面に追加（manifest・アイコン）。SPEC-010〜014 |
| 1.2.0 | 2026-05-03 | 3v3 パーティ、カードキャスター、ランキングと Absolute、英語。bearko.games のトロフィー・総合スコア（2026-10） |

---

## フィードバック・バグ報告

[GitHub Issues](https://github.com/bearko/mycryptotactics/issues) へどうぞ。

---

## クレジット・ライセンス

### アセット（画像・BGM・SE）

キャラクター画像・エクステンション画像・BGM / SE は [bearko/mycryptoheroes](https://github.com/bearko/mycryptoheroes) の素材を使用しています。これらのアセットは **My Crypto Heroes (MCH Co., Ltd.)** に帰属し、ファンが作成した二次創作コンテンツとして利用しています。商用利用は行っていません。

アセットの利用条件・ガイドラインは MCH 公式の方針に準じます。詳細はこちらを参照してください:

**▶ [bearko/mycryptoheroes — README（アセット利用ガイドライン）](https://github.com/bearko/mycryptoheroes/blob/main/README.md)**

二次創作 / アセット利用に関する問い合わせは MCH 公式または上記リポジトリへお願いします。

### ソースコード

ゲームのソースコード (`prototype/js/`, `prototype/index.html`, `prototype/sim/` 等) と文書は [MIT ライセンス](LICENSE) です。フォーク・改変・再配布は自由です。

ただしアセット（画像・音声）は上記の通り **MCH のガイドライン準拠** であり、ソースコードのライセンスとは別管轄である点に注意してください。このリポジトリに置いてある画像のうち MCH の素材を含むもの（ナビゲーターのマイ・ロゴ・OGP 画像など）も MIT の対象外です（[LICENSE](LICENSE) の「Scope / 対象」）。

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

**テスト**（依存ゼロ・Node 22 以上）: `node --test tests/*.test.mjs`。戦闘数式（`prototype/js/battle-mch.js`）と共通基盤の連携（`prototype/js/platform.js`）を確かめる。PR ごとに GitHub Actions（`.github/workflows/test.yml`）でも走る。

### 体験・UI の追加方針

戦闘まわりのレイアウト・フィードバック・音声・ピクセル補間など **プレイヤーが何をどこで理解するか** は [SPEC-002 §10](docs/specs/SPEC-002-prototype.md#10-体験ui-設計方針機能追加時の参照) に集約する。新機能で画面を変えるときは **先に SPEC を更新** し、近接配置・モバイルでの視認性・数値の検証しやすさを崩さないこと。

### プロダクト文書とプロトタイプ

- 企画メモ: [docs/CHRONO_TACTICS_DESIGN.md](docs/CHRONO_TACTICS_DESIGN.md)（§7 に体験設計の柱）
- **プレイ用**: [prototype/index.html](prototype/index.html)（ES モジュール。ルート [index.html](index.html) から誘導）。アセット・BGM/SE は [bearko/mycryptoheroes](https://github.com/bearko/mycryptoheroes) の raw URL
- 仕様: [SPEC-001](docs/specs/SPEC-001-roguelike-deck-mock.md)（体験要件） / [SPEC-002](docs/specs/SPEC-002-prototype.md)（プロト構成・戦闘UX・**MCH 式戦闘 §11**）

</details>
