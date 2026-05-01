# ランキング機能 Google Apps Script セットアップ手順

SPEC-007 のランキング機能を有効化するための手順。所要時間 10 分程度。

## 概要

ランキング機能は **Google Spreadsheet + Google Apps Script (GAS) ウェブアプリ** で実装されています。

| 役割 | 担当 |
|---|---|
| スコア保存先 | Google Spreadsheet |
| スコア送信 / 取得 API | GAS ウェブアプリ |
| ゲーム側 | `prototype/js/ranking-client.js` (POST/GET) |

## ステップ 1: Spreadsheet を作成

1. [Google Drive](https://drive.google.com/) で「新規」→「Google スプレッドシート」を選択
2. シート名を `MCT Ranking` 等わかりやすい名前に
3. シート 1 の名前を `ranking` に変更（左下のタブをダブルクリック）
4. 1 行目にヘッダーを入力:

| A: timestamp | B: playerName | C: score | D: regulation | E: turns | F: deckSize | G: llExt | H: heroIds | I: absoluteHpE | J: absoluteDmgE | K: absoluteHpP | L: absoluteDmgP | M: version |
|---|---|---|---|---|---|---|---|---|---|---|---|---|

## ステップ 2: GAS スクリプトを設定

1. Spreadsheet メニューから「拡張機能」→「Apps Script」を開く
2. デフォルトの `Code.gs` の内容を全削除し、以下に置き換える:

```javascript
const SHEET_NAME = "ranking";

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    sheet.appendRow([
      new Date(),
      String(data.playerName || "anonymous").substring(0, 30),
      Number(data.score) || 0,
      String(data.regulation || ""),
      Number(data.turns) || 0,
      Number(data.deckSize) || 0,
      Number(data.llExt) || 0,
      Array.isArray(data.heroIds) ? data.heroIds.join(",") : "",
      data.absoluteConfig?.enemyHpMult ?? "",
      data.absoluteConfig?.enemyDmgMult ?? "",
      data.absoluteConfig?.playerHpMult ?? "",
      data.absoluteConfig?.playerDmgMult ?? "",
      String(data.version || ""),
    ]);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    const rows = sheet.getDataRange().getValues().slice(1); // skip header
    let filtered = rows;
    const regulationFilter = e.parameter.regulation;
    if (regulationFilter) {
      filtered = filtered.filter(r => String(r[3]) === regulationFilter);
    }
    filtered.sort((a, b) => Number(b[2]) - Number(a[2])); // by score desc
    const limit = Math.min(Number(e.parameter.limit) || 50, 200);
    const top = filtered.slice(0, limit).map((r, idx) => ({
      rank: idx + 1,
      timestamp: r[0],
      playerName: String(r[1]),
      score: Number(r[2]),
      regulation: String(r[3]),
      turns: Number(r[4]),
      deckSize: Number(r[5]),
      llExt: Number(r[6]),
      heroIds: String(r[7]),
      absolute: r[8] !== "" ? {
        enemyHpMult: Number(r[8]),
        enemyDmgMult: Number(r[9]),
        playerHpMult: Number(r[10]),
        playerDmgMult: Number(r[11]),
      } : null,
      version: String(r[12]),
    }));
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, ranking: top }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

3. 「保存」（Ctrl+S）

## ステップ 3: ウェブアプリとしてデプロイ

1. 右上の「デプロイ」→「新しいデプロイ」を選択
2. 種類: 「ウェブアプリ」（歯車から選択）
3. 設定:
   - **説明**: MCT Ranking API
   - **次のユーザーとして実行**: 自分（あなた）
   - **アクセスできるユーザー**: **全員**（重要！匿名アクセス許可）
4. 「デプロイ」をクリック
5. Google アカウント認証ダイアログが出たら許可
6. 表示される「ウェブアプリの URL」をコピー（`https://script.google.com/macros/s/.../exec` 形式）

## ステップ 4: ゲーム側に URL を登録

1. ゲームを起動
2. メイン画面 → ランキングボタン → 設定
3. 「Apps Script URL」欄に上記 URL を貼り付け → 保存

ブラウザの localStorage (`mct.rankingApiUrl`) に保存され、以後ランキング送信が有効化されます。

## 動作確認

1. ランキング画面を開いて「ランキングを取得」→ 空のリストが表示されれば API は動作中
2. テスト送信: ゲームクリア時にスコア送信モーダルが出れば成功

## トラブルシュート

### `HTTP 401` エラー
- デプロイ時の「アクセスできるユーザー」が「全員」になっていない可能性
- デプロイをやり直してアクセス権限を確認

### `HTTP 302` リダイレクト
- ウェブアプリの URL が古い可能性。再デプロイで新 URL を取得

### CORS エラー
- GAS は通常 CORS を許可するが、ブラウザのセキュリティ設定で弾かれる場合あり
- `Content-Type: text/plain` で送信しているので preflight は発生しないはず
- それでも問題があれば、別ブラウザ／別端末で試す

### `Range not found` エラー（doGet 側）
- `ranking` シートが存在しない / 名前が違う
- ステップ 1 の 3 を再確認

## Spreadsheet を公開して誰でも閲覧可能にする（オプション）

1. Spreadsheet 右上「共有」→「リンクを取得」
2. 「リンクを知っている全員」→「閲覧者」
3. 公開リンクを SNS 等で共有可能

## デプロイ更新（コード変更時）

GAS のコードを変更した場合:
1. 「デプロイ」→「デプロイを管理」→ 既存のデプロイの編集アイコン
2. バージョン: 「新しいバージョン」を選択
3. 「デプロイ」

URL は変わらないので、ゲーム側の設定変更は不要です。

## 不正対策について

クライアント送信型のため、スコアは技術的には偽装可能です。SPEC-007 では「カジュアルランキング」として位置づけ、対策はしていません。コミュニティで明らかな不正が問題化した場合は、GAS の `doPost` に異常値フィルタを追加することで対応可能です。

例:
```javascript
if (data.score > 10000000) return /* reject */;
if (data.turns < 5) return /* reject */;
```
