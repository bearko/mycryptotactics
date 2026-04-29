# AI エージェント向けガイド

このリポジトリは **仕様駆動** の補助文書セットです。実装や変更を行う前に、次の順で読むことを推奨します。

**文書の正**: テンプレ本文の参照元は **リモートにプッシュされた版**（例: `main` または作業ブランチの先端）とすること。他マシン・別セッションにのみ存在するローカルコミットは、ハッシュが異なっていても内容の根拠にしない（未 push のコミットは他環境から参照できない）。

## 読む順序

1. [docs/charters/PROJECT_CHARTER.md](docs/charters/PROJECT_CHARTER.md) — 何のためのプロジェクトか、何をしてはいけないか。
2. [docs/charters/DEVELOPMENT_CHARTER.md](docs/charters/DEVELOPMENT_CHARTER.md) — 品質・安全・コラボレーションの原則。
3. [docs/process/SPEC_DRIVEN_DEVELOPMENT.md](docs/process/SPEC_DRIVEN_DEVELOPMENT.md) — 仕様と実装の対応付け。
4. [docs/process/AGENT_OPERATING_GUIDE.md](docs/process/AGENT_OPERATING_GUIDE.md) — 自律的に進めてよい範囲と、人の確認が必要な範囲。
5. [docs/specs/SPEC-INDEX.md](docs/specs/SPEC-INDEX.md) — 有効な仕様一覧。作業対象の SPEC を開く。
6. [docs/process/GIT_WORKFLOW.md](docs/process/GIT_WORKFLOW.md) — ブランチ名、コミット、PR の慣習。

## 作業時のルール（要約）

- **仕様が単一の真実の源泉**: 曖昧なら SPEC を更新するか、Human-in-the-loop で質問する。勝手に仕様を広げない。
- **小さな変更単位**: 1 PR（または論理的なまとまり）で一つの意図に寄せる。
- **証跡**: テスト・手動確認・レビュー結果は [docs/testing/TESTING_STRATEGY.md](docs/testing/TESTING_STRATEGY.md) に沿って PR や SPEC に残す。

## 人間へのエスカレーション

次は [docs/process/HUMAN_IN_THE_LOOP.md](docs/process/HUMAN_IN_THE_LOOP.md) に従い、判断を止めてよい。

- 憲章や SPEC と矛盾する要求を受けたとき。
- セキュリティ・法令・倫理に触れそうなとき。
- 破壊的変更やロールバック方針が不明なとき。
