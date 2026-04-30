# mycryptotactics

歴史偉人 × **ローグライク × カードバトル**（Slay the Spire 系）の企画とブラウザプロトタイプ。

## 開発の進め方（仕様駆動）

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

**流れの要約**: 憲章を読む → 対象の SPEC を [SPEC-INDEX.md](docs/specs/SPEC-INDEX.md) から特定する → 実装 → PR に受け入れ基準と確認証跡を書く。

### 体験・UI の追加方針（要約）

戦闘まわりのレイアウト・フィードバック・音声・ピクセル補間など **プレイヤーが何をどこで理解するか** は [SPEC-002 §10](docs/specs/SPEC-002-prototype.md#10-体験ui-設計方針機能追加時の参照) に集約する。新機能で画面を変えるときは **先に SPEC を更新** し、近接配置・モバイルでの視認性・数値の検証しやすさを崩さないこと。

## プロダクト文書とプロトタイプ

- 企画メモ: [docs/CHRONO_TACTICS_DESIGN.md](docs/CHRONO_TACTICS_DESIGN.md)（§7 に体験設計の柱）
- **プレイ用**: [prototype/index.html](prototype/index.html)（ES モジュール。ルート [index.html](index.html) から誘導）。アセット・BGM/SE は [bearko/mycryptoheroes](https://github.com/bearko/mycryptoheroes) の raw URL
- 旧 URL `mock/index.html` → プロトタイプへリダイレクト
- 仕様: [SPEC-001](docs/specs/SPEC-001-roguelike-deck-mock.md)（体験要件） / [SPEC-002](docs/specs/SPEC-002-prototype.md)（プロト構成・戦闘UX・**MCH 式戦闘 §11**）
