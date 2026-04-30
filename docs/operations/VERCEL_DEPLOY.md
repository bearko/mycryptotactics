# Vercel デプロイ手順

SPEC-003 §10 対応。このドキュメントを見ながら手順通りに実行することで、デプロイ・ロールバックが完結します。

---

## 前提

- Vercel フリープラン（`mycryptotactics.vercel.app`）
- GitHub リポジトリ `bearko/mycryptotactics` と Vercel プロジェクトが連携済み
- ビルド不要（静的ファイル配信）
- ルート `/` → `/prototype/index.html` へリダイレクト（`vercel.json` or `index.html` で設定済み）

---

## 通常デプロイ手順

所要時間の目安：**5〜10 分**

### 1. PR を作成してプレビューを確認（2〜3 分）

1. 作業ブランチで変更をコミット・プッシュ
2. GitHub で PR を作成
3. Vercel がプレビュー URL（`mycryptotactics-git-<branch>.vercel.app`）を自動生成
4. プレビュー URL でスモークテスト（下記参照）を実施

### 2. main へマージ（1 分）

5. PR レビューが問題なければ `Squash and merge` または `Merge commit` でマージ

### 3. Vercel で本番に Promote（2〜3 分）

6. Vercel ダッシュボード `https://vercel.com/dashboard` を開く
7. プロジェクト `mycryptotactics` を選択
8. **Deployments** タブを開き、最新のデプロイ（main マージ後に自動生成）を確認
9. **Promote to Production** ボタンをクリック（または main へのマージで自動 Promote される場合はスキップ）
10. 本番 URL `https://mycryptotactics.vercel.app` でスモークテストを実施

---

## スモークテスト（1 分チェック）

本番 / プレビュー URL で以下を確認：

- [ ] タイトル画面が表示される（MCT ロゴ・"Press to Start" 点滅）
- [ ] タップ / クリックでマップ画面に遷移する
- [ ] BGM が開始される（タイトル画面のクリック後）
- [ ] マップのノードが表示され、エネミーアイコンが描画されている
- [ ] 第 1 章最初のエネミーノードに入れる
- [ ] バトル画面でカードが表示される
- [ ] エナジーを消費してカードを使用できる
- [ ] ターン終了ボタンが動作する
- [ ] コンソールに赤いエラーが出ていない（F12 → Console）

---

## ロールバック手順

所要時間の目安：**2〜5 分**

### パターン A: Vercel ダッシュボードから即時ロールバック（推奨）

1. Vercel ダッシュボード → プロジェクト `mycryptotactics` → **Deployments** タブ
2. 正常だった直前のデプロイを探す（タイムスタンプとコミットハッシュで特定）
3. そのデプロイの「…」メニュー → **Promote to Production** をクリック
4. 約 30 秒で切り替わる。本番 URL でスモークテストを実施

### パターン B: git revert でコードを戻す

問題のあるコミットを特定して `git revert <commit>` し、main にプッシュ。Vercel が自動でリデプロイします（パターン A より時間がかかる）。

```bash
git log --oneline -5   # 問題のコミットのハッシュを確認
git revert <hash>      # revert コミットを作成
git push origin main   # プッシュ → Vercel が自動デプロイ
```

---

## 致命バグ発覚時の判断基準

以下のいずれかに該当する場合は **即時ロールバック（パターン A）**：

| 症状 | 基準 |
|------|------|
| 画面が真っ白・固まる | 全ユーザーに影響 → 即ロールバック |
| バトルに入れない / 進行不能 | ゲームとして機能しない → 即ロールバック |
| JS 例外でカードが使えない | コアゲームループが壊れている → 即ロールバック |
| 画像・音声が読み込めない | raw.githubusercontent.com の障害の場合は外部原因、様子見 |
| UI がずれている / 文字化け | 軽微 → 次リリースで修正 |
| BGM / SE が鳴らない | 軽微（ブラウザ制限の場合あり）→ 次リリースで修正 |

**「次リリース」の判断を下したら、即座に GitHub Issue を立てて対応を予約すること。**

---

## よくある問題

### アセット（画像・音声）が 404 になる

- `bearko/mycryptoheroes` の raw.githubusercontent.com URL は、同リポジトリの該当ファイルが存在する限り有効
- リポジトリ側でファイルパスが変わった場合は `constants.js` の `ASSET_BASE` を更新して再デプロイ

### BGM が自動再生されない

- iOS Safari / Chrome ではユーザー操作前の自動再生はブロックされる仕様。タイトル画面のクリック後に再生が始まるのは正常動作

### Vercel の自動デプロイが走らない

- Vercel ダッシュボードの **Settings → Git** で main ブランチが Production Branch に設定されているか確認
