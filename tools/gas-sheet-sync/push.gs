/**
 * push.gs — Spreadsheet を JSON に再構築して GitHub に PR 作成
 *
 * 権限チェック: PUSH_ALLOWED_EMAIL に一致するユーザのみ実行可。
 * Pull した時点の SHA (lastSyncedSha) と現在の main HEAD を比較し、
 * ズレていれば warn (force push したいなら Yes で続行)。
 *
 * メニューから sheet を選んで個別に Push できるよう、3 つの公開関数を提供:
 *   - pushHeroesAsPR()         heroes だけ
 *   - pushLlExtensionsAsPR()   ll-extensions だけ
 *   - pushAllToGitHubAsPR()    全シート (まとめて 1 PR)
 */

// ─── 公開エントリ ────────────────────────────────────────────────
function pushHeroesAsPR()       { pushSchemasAsPR_([HEROES_SCHEMA], "heroes"); }
function pushLlExtensionsAsPR() { pushSchemasAsPR_([LL_EXT_SCHEMA], "ll-extensions"); }
function pushAllToGitHubAsPR()  { pushSchemasAsPR_(ALL_SCHEMAS, "all-sheets"); }

/** extensions 専用 Push (cards.js text の安全フィールドだけ regex で書き戻し)
 *  ダメージ係数 (play() 関数内) は対象外 — README 参照 */
function pushExtensionsAsPR() {
  const ui = SpreadsheetApp.getUi();
  try {
    ghAssertPushAllowed_();
  } catch (e) {
    ui.alert(e.message);
    return;
  }

  const props = ghProps_();
  // 1. シート読込
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName(EXTENSIONS_SCHEMA.sheetName);
  if (!sheet) { ui.alert("extensions シートがありません。先に Pull を実行してください。"); return; }
  const last = sheet.getLastRow();
  if (last < 2) { ui.alert("extensions シートに行がありません。"); return; }
  const cols = EXTENSIONS_SCHEMA.columns;
  const rows = sheet.getRange(2, 1, last - 1, cols.length).getValues();

  // 2. 現在の cards.js を fetch
  const cardsJsBefore = ghFetchRawText(PATH_CARDS_JS, props.base);

  // 3. シート行を反映
  const { text: cardsJsAfter, summary } = pushExtensionsToCardsJs_(rows, cardsJsBefore);
  if (cardsJsAfter === cardsJsBefore) {
    ui.alert("変更なし\nシートと cards.js が一致しているため PR は作成されません。" +
      (summary.missingExt.length > 0 ? "\n\n[警告] 未知の libraryKey: " + summary.missingExt.slice(0,5).join(",") : ""));
    return;
  }

  // 4. lastSyncedSha 比較
  const headSha = ghGetRefSha(props.base);
  const lastSyncedSha = getMetaValue_("lastSyncedSha");
  let staleWarning = "";
  if (lastSyncedSha && lastSyncedSha !== headSha) {
    staleWarning = "\n⚠️ pull SHA (" + String(lastSyncedSha).substring(0,7) + ") ≠ main HEAD (" + headSha.substring(0,7) + ")。pull し直し推奨。";
  }

  // 5. 確認ダイアログ
  const confirm = ui.alert(
    "extensions Push 確認",
    "cards.js に対して " + summary.fieldChanges + " 件のフィールド変更 (" + summary.changed + " カード) が反映されます。\n" +
    "対象フィールド: extNameJa / skillNameJa / skillIcon / cost / type / target / caster / rarity / effect_*_text\n" +
    "(ダメージ係数 = play() 内は対象外)\n\n" +
    "base: " + props.base + staleWarning + "\n\n続行しますか?",
    ui.ButtonSet.YES_NO,
  );
  if (confirm !== ui.Button.YES) return;

  // 6. 新ブランチ作成 + cards.js PUT + PR 作成
  const ts = Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyyMMdd-HHmmss");
  const branch = "balance/sheet-sync-extensions-" + ts;
  ghCreateBranch(branch, headSha);
  const current = ghGetFile(PATH_CARDS_JS, props.base);
  ghPutFile(PATH_CARDS_JS, branch, cardsJsAfter, "balance: " + PATH_CARDS_JS + " (sheet sync extensions)", current.sha);

  const title = "balance: シート同期 extensions (" + ts + ")";
  const body =
    "Spreadsheet (extensions シート) からの自動 PR — top-level literal フィールドのみ更新\n\n" +
    "## 変更内訳\n" +
    "- 変更カード数: " + summary.changed + "\n" +
    "- 総フィールド変更数: " + summary.fieldChanges + "\n" +
    (summary.missingExt.length > 0
      ? "- ⚠️ シートに未知の libraryKey 行 (skip): " + summary.missingExt.length + " 件\n"
      : "") +
    "\n## 対象フィールド (Push 対象)\n" +
    "extNameJa / skillNameJa / skillIcon / cost / type / target / caster / rarity / effect_*_text\n\n" +
    "## 対象外 (cards.js 直接編集)\n" +
    "- libraryKey / extId (識別子)\n" +
    "- effect_*_target (play() 連動のため)\n" +
    "- ダメージ係数 (play() / effectSummaryLines() / previewLines() 内 hardcoded)\n\n" +
    "## 実行情報\n" +
    "- 実行ユーザ: " + (Session.getActiveUser().getEmail() || "(unknown)") + "\n" +
    "- 実行時刻: " + new Date().toISOString() + "\n" +
    "- base SHA: " + headSha + "\n" +
    "- 元 pull SHA: " + (lastSyncedSha || "(未記録)") + "\n";
  const pr = ghCreatePullRequest(title, branch, props.base, body);

  // 7. 通知
  setMetaValue_("lastPushAt", new Date().toISOString());
  setMetaValue_("lastPushBy", Session.getActiveUser().getEmail() || "(unknown)");
  setMetaValue_("lastPushBranch", branch);
  setMetaValue_("lastPushPr", pr.html_url);
  ui.alert("PR 作成完了 (extensions)\n" + pr.html_url + "\n\n" + summary.changed + " カード / " + summary.fieldChanges + " フィールド変更。");
}

// ─── 内部実装 ───────────────────────────────────────────────────

/** 指定 schema 群を JSON に再構築 → 1 ブランチ 1 PR で push */
function pushSchemasAsPR_(schemas, label) {
  const ui = SpreadsheetApp.getUi();
  try {
    ghAssertPushAllowed_();
  } catch (e) {
    ui.alert(e.message);
    return;
  }

  // 1. シートから JSON 構築
  const built = [];
  for (const schema of schemas) {
    const json = readSheetAsJson_(schema);
    built.push({ schema: schema, jsonStr: prettyJsonString_(json, schema) });
  }

  // 2. main HEAD と lastSyncedSha を比較
  const props = ghProps_();
  const headSha = ghGetRefSha(props.base);
  const lastSyncedSha = getMetaValue_("lastSyncedSha");
  let staleWarning = "";
  if (lastSyncedSha && lastSyncedSha !== headSha) {
    staleWarning = "\n⚠️ 警告: pull した時点の SHA (" + String(lastSyncedSha).substring(0,7) + ") と現在の main HEAD (" + headSha.substring(0,7) + ") が異なります。pull し直してから push することを推奨します。";
  }

  // 3. diff 確認 — 各ファイルの現在内容を取得して比較、変更が無ければ skip
  const changedFiles = [];
  for (const item of built) {
    const current = ghGetFile(item.schema.jsonPath, props.base);
    const currentStr = Utilities.newBlob(Utilities.base64Decode(current.content.replace(/\n/g, ""))).getDataAsString();
    if (currentStr.trim() === item.jsonStr.trim()) continue;
    changedFiles.push({ path: item.schema.jsonPath, jsonStr: item.jsonStr, sha: current.sha });
  }
  if (changedFiles.length === 0) {
    ui.alert("変更なし\n対象シート (" + label + ") の内容が GitHub の最新と一致しているため PR は作成されません。" + staleWarning);
    return;
  }

  // 4. 確認
  const fileList = changedFiles.map(f => "  - " + f.path).join("\n");
  const confirm = ui.alert(
    "Push 確認 (" + label + ")",
    "以下の " + changedFiles.length + " ファイルを変更して PR を作成します:\n\n" + fileList + "\n\nbase: " + props.base + staleWarning + "\n\n続行しますか?",
    ui.ButtonSet.YES_NO,
  );
  if (confirm !== ui.Button.YES) return;

  // 5. 新ブランチ作成
  const ts = Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyyMMdd-HHmmss");
  const branch = "balance/sheet-sync-" + label + "-" + ts;
  ghCreateBranch(branch, headSha);

  // 6. 各ファイル PUT
  for (const f of changedFiles) {
    ghPutFile(f.path, branch, f.jsonStr, "balance: " + f.path + " (sheet sync " + label + ")", f.sha);
  }

  // 7. PR 作成
  const title = "balance: シート同期 " + label + " (" + ts + ")";
  const body =
    "Spreadsheet からの自動 PR\n\n" +
    "## 対象\n" +
    "シート: " + label + "\n\n" +
    "## 変更ファイル\n" +
    changedFiles.map(f => "- `" + f.path + "`").join("\n") + "\n\n" +
    "## 実行情報\n" +
    "- 実行ユーザ: " + (Session.getActiveUser().getEmail() || "(unknown)") + "\n" +
    "- 実行時刻: " + new Date().toISOString() + "\n" +
    "- base SHA: " + headSha + "\n" +
    "- 元 pull SHA: " + (lastSyncedSha || "(未記録)") + "\n";
  const pr = ghCreatePullRequest(title, branch, props.base, body);

  // 8. 通知
  setMetaValue_("lastPushAt", new Date().toISOString());
  setMetaValue_("lastPushBy", Session.getActiveUser().getEmail() || "(unknown)");
  setMetaValue_("lastPushBranch", branch);
  setMetaValue_("lastPushPr", pr.html_url);
  ui.alert("PR 作成完了 (" + label + ")\n" + pr.html_url + "\n\n" + changedFiles.length + " ファイル変更。");
}

/** シートを読み JSON 配列に再構築 */
function readSheetAsJson_(schema) {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName(schema.sheetName);
  if (!sheet) throw new Error("シートが存在しません: " + schema.sheetName + "\n先に [Pull] を実行してシートを作成してください。");

  const last = sheet.getLastRow();
  if (last < 2) return [];
  const cols = schema.columns;
  const data = sheet.getRange(2, 1, last - 1, cols.length).getValues();
  const out = [];
  data.forEach((row, rowIdx) => {
    // 全列が空の行は skip (シート末尾の余白)
    if (row.every(cell => cell === "" || cell === null)) return;
    const obj = {};
    cols.forEach((col, colIdx) => {
      try {
        const v = coerceValue_(row[colIdx], col.type);
        if (v !== null) obj[col.name] = v;
      } catch (e) {
        throw new Error("行 " + (rowIdx + 2) + " 列 " + col.name + ": " + e.message);
      }
    });
    out.push(obj);
  });
  return out;
}

/** 元 JSON と同じ整形 (2 space indent + 末尾改行) で文字列化 */
function prettyJsonString_(jsonArray, schema) {
  // heroes.json と ll-extensions.json は配列形式で、フィールド順序は schema.columns 順序に揃える
  const ordered = jsonArray.map(item => {
    const o = {};
    for (const col of schema.columns) {
      if (item[col.name] !== undefined) o[col.name] = item[col.name];
    }
    return o;
  });
  return JSON.stringify(ordered, null, 2) + "\n";
}
