# プロジェクト憲章（PROJECT CHARTER）

**MyCryptoTactics**（旧称：mycryptotactics、企画名：クロノ・デッキ）— 歴史偉人を題材にした **ローグライク × デッキ構築** のブラウザ向け作品。仕様駆動で作り、ブラウザだけで遊べることを守る。ランキング・トロフィーなどは bearko.games の共通基盤につなぐ（ログインしなくても遊べる）。

## 1. 目的（Why）

- **ミッション**：「歴史偉人がデッキで戦う」という [企画書](../CHRONO_TACTICS_DESIGN.md) の核を、Slay the Spire 系の手触りで実装する
- **作者の動機**：[bearko/mycryptoheroes](https://github.com/bearko/mycryptoheroes) の素材データベースを使った、二次創作的な遊びの場を作る
- **成功の定義**（v1.0）：**本番 URL（`tactics.bearko.games`）で誰でも遊べる完成品が公開されている**こと
- **成功の定義**（プロジェクト全体）：合意された SPEC の受け入れ基準を満たす成果物が `main` にマージされ、本番デプロイで確認できる状態であること

## 2. スコープ

### 含む（In scope）

- 静的 HTML / ES Modules で動くブラウザゲーム（`prototype/`）
- 章 1〜3 の通しプレイ可能なコンテンツ（[SPEC-004](../specs/SPEC-004-stage-content.md)）
- [bearko/mycryptoheroes](https://github.com/bearko/mycryptoheroes) のアセット参照（raw URL 経由）
- 仕様駆動開発のドキュメント群（`docs/`）
- Cloudflare Workers 無料プランでのホスティング（静的ファイル配信。2026-10 に Vercel から移行）
- bearko.games 共通基盤との連携（共通 Google ログイン・スコア送信・RTA 計測・トロフィー）。詳細は SPEC で決める
- 一般公開（v1.0）以降のフィードバック対応

### 含まない（Out of scope）

- **本作独自の**バックエンド・データベース・認証（サーバー側の処理は bearko.games 共通基盤に任せ、本リポジトリには置かない）
- ログインの強制（ログインなしで最後まで遊べること。ログインを求めるのはランキング登録・トロフィー獲得のときだけ）
- 課金・広告・ブロックチェーン連携（SPEC で明示的に取り込むまで）
- ラン（挑戦）の途中経過のセーブ。端末に保存してよいのは **設定・解放状況・表示名だけ**（`localStorage` の `mct.*`。例：言語、音量、レギュレーションの解放、Absolute の設定、ランキングの名前）。共通基盤のログイン状態（bearko.games の Cookie）は共通基盤が管理し、これには当たらない
- 日本語・英語以外の言語
- mycryptoheroes データのライセンスに反する利用（必ず人の判断で確認 → [HUMAN_IN_THE_LOOP.md](../process/HUMAN_IN_THE_LOOP.md)）
- mycryptoheroes 素材のリホスト（参照に留める）。ただし、素材リポジトリの素材を組み合わせて **本作のために作った画像**（例：レギュレーションのバナー）は、`prototype/` に置いてよい。置くときは、元にした素材（素材リポジトリのパス）と作り方（スクリプト）を SPEC に書く

## 3. ステークホルダー

| 役割 | 担い手 | 責任 |
|---|---|---|
| プロダクトオーナー | 作者本人 | スコープと優先順位、SPEC 承認、リリース Go/No-Go |
| 開発 | 作者本人（+ Claude Code 等のエージェント） | 設計・実装・テスト証跡・PR |
| 外部素材 | mycryptoheroes リポジトリ＋ MCH Co.Ltd. | ライセンス・ガイドラインの最終源泉 |
| プレイヤー | リリース後の一般来訪者 | フィードバック・バグ報告（GitHub Issues） |

## 4. 制約と前提

### 4.1 文書の正

チームやエージェントは **リモートに push されたコミット** を正とする（[AGENTS.md](../../AGENTS.md)）。ローカルにしかないコミットは他環境から参照できないため、根拠に使わない。

### 4.2 技術スタック

- ビルドレスの静的サイト（HTML / ES Modules / CSS）
- 外部素材は raw URL で参照（バンドルしない）。例外は 2 章の「本作のために作った画像」だけ
- ホスティングは Cloudflare Workers 無料プラン（静的ファイル配信のみ）
- 共通基盤とは、bearko.games が配信するクライアントスクリプト経由でつなぐ（npm 依存は増やさない）
- スタック変更は SPEC で合意する（例：TypeScript 化、ビルドツール導入は **要 SPEC**）

### 4.3 法令・契約

- 二次創作。MCH Co.Ltd. の [デザインガイドライン](https://medium.com/mycryptoheroes/mch-design-guideline-ja-99ff0970ccdc) に準拠
- 非営利・無料公開
- ログイン時に扱うのは Google のアカウント識別子（sub）と表示名だけ。メールアドレス・本名は保存しない（共通基盤の SPEC で定める）
- 実在人物の表現は SPEC / 企画メモで都度確認（特に章 2 / 章 3 のキャラ名）

### 4.4 体制

- 作者 1 名（ジュニア相当・ゲームリリース未経験）
- AI エージェント（Claude Code 等）を補助に使用、ただし [CLAUDE.md](../../CLAUDE.md) の範囲内
- 第三者コントリビューターの PR は受け付けるが、本憲章と SPEC への適合を必須とする

## 5. 成功指標

### 5.1 v1.0 リリース時点（D+3）

- [ ] 本番 URL（`tactics.bearko.games`）で誰でも遊べる
- [ ] 章 1〜3 通しでクリア可能
- [ ] iOS / Android / PC の主要ブラウザで動作
- [ ] README にプレイ URL・操作・ライセンス・クレジットが記載されている
- [ ] [SPEC-003](../specs/SPEC-003-public-release.md) の受け入れ基準を全て満たしている

### 5.2 リリース後（v1.0 〜 v1.x）

- 致命バグの patch リリースが必要なときに即対応できる
- フィードバックを GitHub Issues で受けて、SPEC-005 以降のロードマップに反映する

## 6. 用語と優先順位

### 6.1 憲章と仕様の関係

本憲章 → [DEVELOPMENT_CHARTER.md](DEVELOPMENT_CHARTER.md) → [DESIGN_CHARTER.md](DESIGN_CHARTER.md) はプロジェクト全体の枠です。個別機能の詳細は [SPEC-INDEX.md](../specs/SPEC-INDEX.md) の各 SPEC が優先しますが、**憲章と矛盾する SPEC は無効** とみなし、憲章または SPEC を改定して整合を取ります。

優先順位（上が強い）：

1. PROJECT_CHARTER（本書）
2. DEVELOPMENT_CHARTER / DESIGN_CHARTER
3. SPEC-NNN
4. コードのコメント・実装

### 6.2 企画メモ

[CHRONO_TACTICS_DESIGN.md](../CHRONO_TACTICS_DESIGN.md) は高レベルな製品メモ。実装の契約は SPEC に落とします。企画メモが SPEC と矛盾したら、SPEC が正です。

## 7. 改定

### 7.1 改定の手続き

改定提案は Pull Request で行う。改定 PR では：

- 何を変えるか
- なぜ変えるか
- 影響を受ける SPEC・コードの一覧

を本文に書く。

### 7.2 改定履歴

| 日付 | 版 | 変更内容 |
|---|---|---|
| 2026-05-01 | 1.0 | mycryptotactics 向けに初版（aidev_template から派生） |
| 2026-04-30 | 2.0 | リリースを成功定義に組み込み、AI エージェント運用・体制・法務を明文化 |
| 2026-10-15 | 3.0 | ホスティングを Cloudflare に変更。bearko.games 共通基盤（共通ログイン・スコア・RTA・トロフィー）との連携をスコープに追加し、「バックエンド・認証なし」を「本作独自のものは持たない」に改める |
| 2026-10-16 | 3.1 | 実装と作者の決定（#127）に合わせる：端末への保存は「設定・解放状況・表示名だけ（`mct.*`）」なら可、ラン途中のセーブはしない。言語は日本語・英語（v1.2 で英語に対応済み） |
| 2026-10-23 | 3.2 | 作者の決定：素材リポジトリの素材を組み合わせて本作のために作った画像（レギュレーションのバナー）は `prototype/` に置いてよい。MCH 公式サイトのサービス終了で、カップ画像を直接参照できなくなったため |

> 注：日付の前後に違和感があるかもしれないが、これは「初版が 2026-05-01 付けで作られていた既存版に対し、本日 2026-04-30 にリリース運用版へ昇格させた」ためで、本来は版番号で管理する想定。次回マージ時に日付を統一する。

## 8. 参照

- [DEVELOPMENT_CHARTER.md](DEVELOPMENT_CHARTER.md)
- [DESIGN_CHARTER.md](DESIGN_CHARTER.md)
- [CLAUDE.md](../../CLAUDE.md)
- [AGENTS.md](../../AGENTS.md)
- [SPEC-INDEX.md](../specs/SPEC-INDEX.md)
- [HUMAN_IN_THE_LOOP.md](../process/HUMAN_IN_THE_LOOP.md)

---

*バージョン: 3.2 | 最終更新: 2026-10-23*
