# GAS Sheet ↔ JSON 同期 (P1: heroes / ll-extensions)

`prototype/data/heroes.json` と `prototype/data/ll-extensions.json` を Google Spreadsheet と同期する Container-bound GAS スクリプト一式。テスターは Spreadsheet でパラメータを編集 → ボタンで GitHub PR 作成、というフローで素早くバランス調整ができる。

## 機能

- **Pull (誰でも実行可)**: GitHub main の最新 JSON を取得し、Spreadsheet に流し込む
- **Push (`bearko.miyamoto@gmail.com` のみ実行可)**: Spreadsheet の内容を JSON に再構築し、新ブランチを切って PR を作成
  - **シートごとに個別 Push 可**: 「heroes だけ Push」「ll-extensions だけ Push」「全シート Push (1 PR)」をメニューから選択
- `rarity` 列はプルダウン (common / uncommon / rare / epic / legendary)
- `_meta` 隠しシートに pull/push の SHA・実行ユーザを記録 → スプレッドシートが古いまま push しないよう警告

> **メモ (この PR から):** ゲーム runtime が `data/*.json` を直接 fetch するようになったので、push 後の `tools/sync.ps1` 実行は**不要**。Push → PR マージ → Vercel 反映だけで完結。

## 対象 JSON

| sheet 名 | path | Pull | Push | 件数 | ヘッダ色 |
|---|---|---|---|---|---|
| `heroes` | `prototype/data/heroes.json` | ✓ | ✓ (全フィールド) | 202 | 青 |
| `ll-extensions` | `prototype/data/ll-extensions.json` | ✓ | ✓ (全フィールド) | 6 | 青 |
| `extensions` | `prototype/js/cards.js` (parse) | ✓ | ✓ (**安全フィールドのみ**) | 907 | 黄 |

`enemies.json` / `bosses.json` は P2 / P3 で対応 (intentRota / phases のネストがあるため別シート分離設計が必要)。

### extensions シート (黄色ヘッダ) の Push 仕様

`extensions` は cards.js (JS コード) の parse 結果なので、JS 関数本体は触らず **データフィールドだけを安全に書き戻し**する設計。

#### Push 対象 (書き戻されるフィールド)

| 列 | 編集可 |
|---|---|
| `extNameJa` / `skillNameJa` / `skillIcon` | ✓ |
| `cost` / `type` / `target` / `caster` | ✓ |
| `rarity` (`CARD_RARITIES` dict) | ✓ |
| `effect_1_text` / `effect_2_text` / `effect_3_text` | ✓ (空欄は変更なし) |

#### Push 対象外 (シートで編集しても無視される)

| 列 | 理由 |
|---|---|
| `libraryKey` / `extId` | 識別子 (変更不可) |
| `effect_1_target` / `effect_2_target` / `effect_3_target` | `play()` 関数と連動。不一致になると挙動が崩れるため触らない |

#### 完全に Push 不可な要素 (cards.js を直接編集する必要あり)

- **ダメージ係数** (例: `api.dealPhySkillToEnemy(s, 50, 60)` の 50, 60)
- **新カードの追加 / 既存カードの削除**
- **`play()` 関数のロジック変更** (連続攻撃化、状態異常付与、条件分岐など)

これらは cards.js の JS 関数本体に hardcoded のため、Push 経路で触ると壊れます。バランス調整で頻繁に必要になったら、別 SPEC として cards.js の declarative 化を検討してください。

---

## セットアップ手順 (初回 1 回のみ)

### 1. Spreadsheet 作成

1. https://sheets.new で新規スプレッドシートを作成
2. 名前を `MCT バランス調整シート` 等に変更

### 2. Apps Script を開く

1. メニュー [拡張機能] → [Apps Script]
2. プロジェクト名を `MCT-sheet-sync` 等に変更

### 3. ソース貼り付け

このディレクトリの `.gs` ファイルを Apps Script エディタにそれぞれ作成・貼り付ける:

| ファイル名 | 種類 | 内容 |
|---|---|---|
| `menu.gs` | スクリプトファイル | onOpen + メニュー登録 |
| `pull.gs` | スクリプトファイル | Pull 処理 |
| `push.gs` | スクリプトファイル | Push 処理 |
| `github.gs` | スクリプトファイル | GitHub API ヘルパ |
| `schema.gs` | スクリプトファイル | 列定義 + dropdown |
| `appsscript.json` | (隠しマニフェスト) | OAuth scope 設定 |

`appsscript.json` を編集するには Apps Script の [プロジェクトの設定] で「`appsscript.json` マニフェスト ファイルをエディタで表示する」にチェック。

### 4. Script Properties を設定

Apps Script エディタ左メニュー [プロジェクトの設定] → 一番下の [スクリプト プロパティ] → [スクリプト プロパティを追加] で以下 5 件を追加:

| プロパティ | 値 |
|---|---|
| `GITHUB_PAT` | (下記で発行する PAT) |
| `GITHUB_OWNER` | `bearko` |
| `GITHUB_REPO` | `mycryptotactics` |
| `GITHUB_BASE_BRANCH` | `main` |
| `PUSH_ALLOWED_EMAIL` | `bearko.miyamoto@gmail.com` |

### 5. GitHub PAT を発行

1. https://github.com/settings/personal-access-tokens/new (fine-grained PAT)
2. **Token name**: `mct-sheet-sync` 等
3. **Resource owner**: bearko
4. **Repository access**: `Only select repositories` → `bearko/mycryptotactics` のみ
5. **Permissions** → `Repository permissions`:
   - **Contents**: Read and write
   - **Pull requests**: Read and write
   - (Metadata: Read — 自動で付く)
6. **Generate token** → 生成された `github_pat_xxxx` をコピー → 上記 `GITHUB_PAT` プロパティに貼り付け

### 6. 動作確認

1. Spreadsheet をリロード (タブを閉じて開き直す)
2. メニュー [データ同期] が表示されることを確認 (`onOpen` 動作)
3. [データ同期] → [Script Properties をチェック] で 5 件すべて設定済みか確認
4. [データ同期] → [GitHub から最新を取得 (Pull)] を実行
   - 初回は GAS の権限要求ダイアログが出る → 許可
   - 完了後、`heroes` / `ll-extensions` / `_meta` シートが作られていれば成功

### 7. テスター招待

- スプレッドシートを共有 (テスターのメールに [編集者] 権限)
- テスターは Pull / Push どちらのメニューも見えるが、Push は `PUSH_ALLOWED_EMAIL` チェックで弾かれる
- Push したい時は `bearko.miyamoto@gmail.com` でログインして実行

---

## 使い方 (運用フロー)

### A. テスターがバランスを試したい時

1. [データ同期] → [GitHub から最新を取得 (Pull)] でリポの最新を取り込む
2. シート上で値を編集 (rarity はプルダウン、それ以外は自由入力)
3. テスターは bearko に「これで PR お願い」と通知
4. bearko が同じシートを開いて [データ同期] → [Spreadsheet を GitHub に PR (Push)] を実行
5. 確認ダイアログで変更内容を確認 → Yes
6. PR URL がアラートで出る → ブラウザで確認 → 通常通りマージ

### B. main で別途編集が入った時

- pull した SHA と現在 main HEAD のズレを Push 時に検出して警告
- ズレている場合は一度 Pull し直して、シート編集を再実行

### C. シート編集中にエラーが出た時

- 行/列を間違って削除しても Pull で復元可能
- ただし他人が編集中に Pull すると上書きされるので注意 (Push 同様、運用ルールでカバー)

---

## トラブルシューティング

| 症状 | 原因 / 対処 |
|---|---|
| 「Script Properties が未設定です」 | 上記手順 4 で 5 件全部設定したか確認 |
| 「Push 権限がありません」 | 実行ユーザが `PUSH_ALLOWED_EMAIL` と一致しているか / 大文字小文字含めて |
| 「GitHub API 401」 | PAT の有効期限切れ / 権限不足 / repo が変わっていないか |
| 「GitHub API 422 (branch already exists)」 | 同一秒で 2 回 push した。少し待ってもう一度 |
| Pull したが日本語が文字化け | スプレッドシートのロケールを「日本」に設定 |
| dropdown が出ない | Pull すると自動で再設定される |

---

## 既知の制約 (P1)

- **配列形式の JSON のみ対応** — heroes/ll-extensions はトップレベル `[...]`。enemies/bosses (object形式 + 入れ子) は P2/P3 で対応
- **passiveDesc 等のテキスト列は自由入力** — runtime の `multiplyPassiveDescription` regex に hit する形式 (例: 「戦闘開始時に発動・敵にPHYのN%ダメージ」) を保つ必要あり
- **effectKey は文字列キー** — ll-extensions は `effectKey` がハードコード dispatch なので、新しいキーを書いても JS 実装側に対応がないと動かない (P4 で declarative 化予定)
- **同時編集の競合は手動運用** — 複数人が同時に Push するとブランチ名衝突 (タイムスタンプベースなので秒未満では衝突しうる)
