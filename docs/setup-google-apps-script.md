# ランキング機能 Google Apps Script セットアップ手順

> **エンドユーザーの方へ**: 通常はこの手順は **不要** です。本ゲームには既定のランキング API URL が組み込まれており、起動するだけでランキング機能を利用できます。本手順は **独自のランキングサーバーを立てたい開発者向け** です。

SPEC-007 のランキング機能を独自サーバーで動かしたい場合の手順。所要時間 10 分程度。

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
const HEADERS = [
  "timestamp", "playerName", "score", "regulation",
  "turns", "deckSize", "llExt", "heroIds",
  "absoluteHpE", "absoluteDmgE", "absoluteHpP", "absoluteDmgP",
  "version",
];

/**
 * ranking シートを取得 / 自動生成。シートが無ければ作成し、ヘッダー行も投入する。
 */
function _ensureSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  // ヘッダー行が無い / ずれている場合は再投入
  const firstRow = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  const headerMissing = firstRow.every((v) => v === "" || v === null);
  if (headerMissing) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = _ensureSheet();
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
    const sheet = _ensureSheet();
    const allRows = sheet.getDataRange().getValues();
    const rows = allRows.length > 1 ? allRows.slice(1) : []; // skip header
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

/**
 * ダミーデータ投入（任意）。GAS エディタで実行ボタンから手動実行する。
 * 既存のランキングが空のときに、UI 動作確認用として 12 件を投入する。
 * 何度実行しても重複追加されるので、必要に応じて追加実行 / シート手動クリア。
 */
function seedDummyData() {
  const sheet = _ensureSheet();
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  // [playerName, score, regulation, turns, deckSize, llExt, heroIds, abs(オブジェクト or null)]
  const samples = [
    ["DragonSlayer", 215000, "absolute", 65, 28, 2, "1004,2002,3001", { enemyHpMult: 2.5, enemyDmgMult: 2.0, playerHpMult: 0.5, playerDmgMult: 0.8 }],
    ["bearko",       180400, "red",      72, 25, 2, "1010,2037,3025", null],
    ["NightOwl",     162300, "red",      78, 24, 2, "1008,2013,4016", null],
    ["MoonRider",    145800, "absolute", 88, 22, 2, "1004,1009,2021", { enemyHpMult: 1.8, enemyDmgMult: 1.3, playerHpMult: 0.7, playerDmgMult: 1.0 }],
    ["StarGazer",    132400, "blue",     95, 20, 2, "1006,2002,3010", null],
    ["WindWalker",   118500, "blue",    100, 19, 1, "2001,2010,3026", null],
    ["FireFox",      102000, "baby",    110, 18, 1, "1004,2007,3017", null],
    ["IceQueen",      89500, "baby",    115, 18, 1, "1007,2049,4002", null],
    ["RogueOne",      72300, "egg",     130, 16, 1, "1003,2024,3012", null],
    ["CasualPlayer",  65800, "egg",     135, 15, 0, "1001,2003,3003", null],
    ["NoobMaster",    52400, "common",  150, 14, 0, "1002,2008,3009", null],
    ["FirstTry",      38200, "common",  170, 12, 0, "1001,1002,1003", null],
  ];
  samples.forEach((s, i) => {
    const ts = new Date(now - (samples.length - i) * day);
    sheet.appendRow([
      ts,
      s[0], s[1], s[2], s[3], s[4], s[5], s[6],
      s[7]?.enemyHpMult ?? "",
      s[7]?.enemyDmgMult ?? "",
      s[7]?.playerHpMult ?? "",
      s[7]?.playerDmgMult ?? "",
      "beta1-seed",
    ]);
  });
  Logger.log("Seeded " + samples.length + " dummy rows.");
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

## ステップ 4: ゲーム側に URL を登録（独自サーバー利用時のみ）

> **注**: 本ゲームには既定 URL が `prototype/js/ranking-client.js` に base64 で組み込まれているため、通常はこのステップは不要です。**独自の GAS を使いたい場合のみ** 以下を実施してください。

1. ゲームを起動
2. タイトル画面の右下「🏆 ランキング」ボタン → ランキング画面へ
3. 画面下部の **「上級設定: 別のランキングサーバーを使う」** を展開
4. 「Apps Script URL」欄に上記 URL を貼り付け → 「保存」をクリック

ブラウザの localStorage (`mct.rankingApiUrl`) に保存され、以後そのカスタム URL が使われます。空欄で「保存」を押すと既定 URL に戻ります。

### ソース埋め込み URL を変更する場合（フォーク開発者向け）

`prototype/js/ranking-client.js` 内の `_DEFAULT_API_URL_ENC` 定数（base64 エンコード済み）を書き換えます:

```js
// ブラウザコンソールで生成
btoa("https://script.google.com/macros/s/<YOUR_SCRIPT_ID>/exec");
```

得られた文字列を `_DEFAULT_API_URL_ENC` に貼り付けてコミット。

> **セキュリティ注記**: クライアント側 JS に URL を埋め込んでも、ブラウザの DevTools / Network タブで容易に観察可能です。base64 エンコードはあくまで「ソースを casual に眺めただけでは見えない」程度の難読化であり、機密情報としては扱えません。本機能の URL は誰でも POST 可能な公開エンドポイントである前提で運用してください。

## 動作確認

1. ランキング画面を開いて「ランキングを取得」→ 空のリストが表示されれば API は動作中
2. テスト送信: ゲームクリア時にスコア送信モーダルが出れば成功

## ダミーデータの投入（テスト用）

ランキング機能の UI 動作確認のため、12 件のダミーデータを投入できます:

1. GAS エディタで関数選択ドロップダウンから **`seedDummyData`** を選択
2. 「実行」ボタン（▶）をクリック
3. 初回実行時は権限承認ダイアログが出るので許可

完了後、Spreadsheet の `ranking` シートに 12 行のダミーデータが追加されます。ゲーム側のランキング画面でも反映を確認できます。

不要になったらシートの行を手動削除してください。

## トラブルシュート

### `TypeError: Cannot read properties of null (reading 'getDataRange')`

旧バージョンの GAS コードでは `ranking` という名前のシートが存在しない場合に出るエラー。**新バージョンの GAS コード（`_ensureSheet()` を含む）に置き換えてください**。

新コードはシートが無ければ自動で作成し、ヘッダー行も投入します。Spreadsheet 側で事前にシート作成や列ヘッダーを準備する必要はありません。

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
