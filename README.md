# mycryptotactics

歴史偉人 × **ローグライク × カードバトル**（Slay the Spire 系）の企画と UI モック。

## 開発の進め方（仕様駆動）

本リポジトリは [bearko/aidev_template](https://github.com/bearko/aidev_template) をベースにした **仕様駆動開発** のルールを採用しています。

| 内容 | パス |
|------|------|
| AI / エージェント向け入口 | [AGENTS.md](AGENTS.md) |
| プロジェクト憲章 | [docs/charters/PROJECT_CHARTER.md](docs/charters/PROJECT_CHARTER.md) |
| 開発憲章 | [docs/charters/DEVELOPMENT_CHARTER.md](docs/charters/DEVELOPMENT_CHARTER.md) |
| 仕様駆動プロセス | [docs/process/SPEC_DRIVEN_DEVELOPMENT.md](docs/process/SPEC_DRIVEN_DEVELOPMENT.md) |
| Git / PR | [docs/process/GIT_WORKFLOW.md](docs/process/GIT_WORKFLOW.md) |
| 人の判断が必要な局面 | [docs/process/HUMAN_IN_THE_LOOP.md](docs/process/HUMAN_IN_THE_LOOP.md) |
| エージェント運用 | [docs/process/AGENT_OPERATING_GUIDE.md](docs/process/AGENT_OPERATING_GUIDE.md) |
| テスト証跡 | [docs/testing/TESTING_STRATEGY.md](docs/testing/TESTING_STRATEGY.md) |
| 仕様一覧 | [docs/specs/SPEC-INDEX.md](docs/specs/SPEC-INDEX.md) |
| PR テンプレート | [.github/PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md) |

**流れの要約**: 憲章を読む → 対象の SPEC を [SPEC-INDEX.md](docs/specs/SPEC-INDEX.md) から特定する → 実装 → PR に受け入れ基準と確認証跡を書く。

## プロダクト文書とモック

- 企画メモ: [docs/CHRONO_TACTICS_DESIGN.md](docs/CHRONO_TACTICS_DESIGN.md)（高レベル。実装の契約は SPEC に落とす）
- モック: `mock/index.html`（ルートの [index.html](index.html) から誘導）。アセットは [bearko/mycryptoheroes](https://github.com/bearko/mycryptoheroes) の raw URL を参照
- 現行モックの仕様: [docs/specs/SPEC-001-roguelike-deck-mock.md](docs/specs/SPEC-001-roguelike-deck-mock.md)
