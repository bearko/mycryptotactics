# CLAUDE.md — Claude Code 運用規則

本ファイルは Claude Code が **仕様駆動開発から逸脱しないため** の操作規則です。Claude Code は本ファイルを自動でセッション先頭に読み込みます（[公式仕様](https://code.claude.com/docs/en/best-practices)）。

ベストプラクティスに沿い、**200 行未満** に抑えています。冗長になったらルールを削るか、別ファイル（`docs/process/*.md`）に逃して `@import` してください。

## このプロジェクトの性質（最初に把握すべきこと）

- **仕様駆動開発**：実装より先に SPEC を更新する。SPEC にない要件を勝手に追加しない
- **静的サイト**：ビルドツール・パッケージマネージャは **追加しない**。素の HTML / ES Modules / CSS で動かす
- **外部素材**：[bearko/mycryptoheroes](https://github.com/bearko/mycryptoheroes) の raw URL を参照する。再ホスト・コミットしない
- **無料運用**：Vercel フリープラン範囲。バックエンド・課金・ログイン要素を入れない
- **1 名運用**：ジュニア相当の作者を支援する立場。難しい一発技ではなく、検証しやすい小さな変更を選ぶ

## 必読ドキュメント（順序を守る）

新しいタスクに着手する前に、以下を **この順** で確認すること：

1. [PROJECT_CHARTER](docs/charters/PROJECT_CHARTER.md) — 何を作るか、何を作らないか
2. [DEVELOPMENT_CHARTER](docs/charters/DEVELOPMENT_CHARTER.md) — 品質・安全・AI 利用の境界
3. [DESIGN_CHARTER](docs/charters/DESIGN_CHARTER.md) — UI/UX で譲れない原則
4. [SPEC-INDEX](docs/specs/SPEC-INDEX.md) — 作業対象の SPEC を特定する
5. 該当 SPEC の本文

## 作業時のルール

### 1. SPEC を変えるなら、コードより先に SPEC の PR

仕様変更を伴う実装に着手する前に：

1. 対応 SPEC を `docs/specs/` で開く
2. 改訂が必要なら **SPEC を更新する PR を先に作る**
3. SPEC の PR がマージされてから実装の PR を出す

これを守らないと、3 ヶ月後の自分が「なぜこうなっているか」を追えなくなる。

### 2. 1 PR は 1 意図

1 つの PR は 1 つの SPEC、1 つの意図に絞る。リファクタとバグ修正と機能追加を同じ PR に混ぜない。レビューが追えなくなる。

### 3. 計画を先に書く

複雑なタスク（複数ファイルにまたがる、新しい関数を作る）では、**先にプランを文章化** してから着手する。プランは PR 本文または `docs/specs/` 内の SPEC に書く。Claude Code の Plan Mode を活用してよい。

### 4. テストの書き方

- ロジック純関数（`prototype/js/battle-mch.js`）は Node 標準 `assert` で書く。jest/vitest を導入しない
- UI 挙動は手動 QA。PR 本文に [TESTING_STRATEGY](docs/testing/TESTING_STRATEGY.md) の様式でチェックリストを貼る
- 「テストが通った」と言うときは、**実際に実行した結果** を貼る。推測で言わない

### 5. やってはいけないこと

- `docs/charters/*.md` の **直接編集**（人間の確認なしには変えない）
- mycryptoheroes 素材を **このリポジトリにコミット** する
- localStorage / IndexedDB / Cookie の利用（v1.0 では非目標）
- 外部 npm パッケージの追加（依存ゼロを維持）
- `node_modules/` のコミット
- 秘密情報のコミット（そもそも秘密情報を持たない構成）

### 6. やる前に止まること

以下のときは、自律的に進めず **人に確認を求める**（[HUMAN_IN_THE_LOOP](docs/process/HUMAN_IN_THE_LOOP.md)）：

- 憲章や SPEC と矛盾しそうな要求を受けたとき
- ライセンスや法務に触れそうなとき（mycryptoheroes ガイドラインの解釈含む）
- 破壊的な変更（既存ファイルの削除、URL の変更）を行うとき
- 本番デプロイ（Vercel への Promote）

## ファイル配置の原則

```
prototype/                    ← 実行されるコード（リリース対象）
├── index.html                ← ビューと CSS、エントリー
└── js/
    ├── main.js               ← 全体制御（薄く保つ）
    ├── battle-mch.js         ← MCH 式戦闘の純関数
    ├── chapters.js           ← 章定義（SPEC-004）
    ├── maps.js               ← マップ生成
    ├── enemies.js            ← 敵マスタ
    ├── cards.js              ← カードマスタ
    ├── bosses.js             ← ボスマスタ
    └── ui-fx.js              ← フロート・FX

docs/                         ← 真実の源泉（仕様駆動）
├── charters/                 ← プロジェクト・開発・デザイン憲章
├── specs/                    ← SPEC-NNN（番号順に追加）
├── process/                  ← 開発プロセス文書
├── testing/                  ← テスト戦略
├── operations/               ← デプロイ手順・運用
└── roadmap/                  ← 直近のロードマップ

mock/                         ← 旧モック（プロトタイプへリダイレクト）
index.html                    ← ルート（プロトタイプへリダイレクト）
README.md                     ← プレイ URL、操作、ライセンス
LICENSE                       ← 二次創作の方針記載
CLAUDE.md                     ← この文書
AGENTS.md                     ← AI エージェント向けの先頭ガイド
```

## コーディング規約（最小）

- インデント：スペース 2（既存コードに合わせる）
- セミコロン：書く
- クォート：シングル `'...'`、HTML 属性内では二重 `"..."`
- 関数：`function fn()` または `const fn = () => ...`、純関数を優先
- 命名：camelCase（変数・関数）、SCREAMING_SNAKE（定数）、PascalCase（型／クラスなし）
- コメント：日本語可。**「なぜ」を書く**。「何を」はコードで読む

## SPEC の参照ルール

PR / コミットメッセージで SPEC を参照するとき：

- 良：`SPEC-004 §6.5 ボス戦の意図ローテを実装`
- 悪：`ボス強化`（どの SPEC か追えない）

## 望ましい振る舞い

Claude Code が新しいセッションで開いたときに、まず行うべきこと：

1. `docs/specs/SPEC-INDEX.md` を読む（生きている SPEC を把握）
2. ユーザの依頼が既存 SPEC のどれに当たるか / SPEC が必要かを判断する
3. SPEC が必要なら SPEC の更新を **先に** 提案する
4. 計画を立て、ユーザの承認を得る
5. 実装する
6. テスト・確認の証跡を PR 本文に書く

## 失敗パターン（避けるべき）

- **Over-specified CLAUDE.md**：本ファイルが長くなりすぎると、肝心のルールが埋もれる。200 行を超えないように剪定する
- **Trust-and-verify-later gap**：「動いたっぽい」で済ませない。検証手段（テスト・スクリーンショット・通しプレイ）を必ず示す
- **Infinite exploration**：「調査して」と言われたら、スコープを確認する。100 ファイル読み始めない
- **Context pollution**：失敗した試行で context を埋めない。失敗が 2 回続いたら `/clear` してプロンプトを書き直す
- **Kitchen sink session**：1 セッションに無関係なタスクを積まない。タスクごとに `/clear`

## このファイルの改訂

本ファイル自体の改訂は人間が行う。Claude Code が「もっと詳しいルールを書きました」と提案するのは歓迎するが、**直接書き換えはしない**。提案は PR で。

---

*バージョン: 1.0 | 最終更新: 2026-04-30*
