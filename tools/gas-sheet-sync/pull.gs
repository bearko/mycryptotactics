/**
 * pull.gs — GitHub の最新 JSON を Spreadsheet に流し込み
 *
 * 公開リポなら raw URL から anonymous fetch (PAT 不要)。
 * カスタムメニュー「データ同期」→「GitHub から最新を取得 (Pull)」で実行。
 */

/** メニュー: 全シート pull */
function pullAllFromGitHub() {
  const ui = SpreadsheetApp.getUi();
  try {
    const props = ghProps_();
    const ref = props.base;
    let total = 0;
    for (const schema of ALL_SCHEMAS) {
      const json = ghFetchRawJson(schema.jsonPath, ref);
      const rows = jsonToRows_(json, schema);
      writeSheet_(schema, rows);
      total += rows.length;
    }
    // 同期 SHA をメモ
    const headSha = ghGetRefSha(ref);
    setMetaValue_("lastSyncedSha", headSha);
    setMetaValue_("lastPullAt", new Date().toISOString());
    setMetaValue_("lastPullBy", Session.getActiveUser().getEmail() || "(unknown)");
    ui.alert("Pull 完了\n" + total + " 件を取得しました。\nbase ref: " + ref + "\nSHA: " + headSha.substring(0, 7));
  } catch (e) {
    ui.alert("Pull 失敗\n" + e.message);
    throw e;
  }
}

/** JSON データを 2 次元配列に変換
 *  入力 JSON の形態 (array / object) は schema 側で吸収。
 *  bosses/enemies は object[] でなく {id: {...}} 形式 (今回 P1 では未対応)。 */
function jsonToRows_(json, schema) {
  // P1 対象 (heroes / ll-extensions) は配列形式
  let entries;
  if (Array.isArray(json)) {
    entries = json;
  } else {
    // 万一 object 形式 (id をキー) の場合は値を取り出し、id を 1 列目に noop で扱う想定
    entries = Object.values(json);
  }
  return entries.map(item =>
    schema.columns.map(col => displayValue_(item[col.name]))
  );
}

/** シートに書き込み (header 行 + データ行) + dropdown 設定 */
function writeSheet_(schema, rows) {
  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName(schema.sheetName);
  if (!sheet) sheet = ss.insertSheet(schema.sheetName);

  sheet.clear();
  const headers = schema.columns.map(c => c.name);
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold").setBackground("#e8eaf6");
  sheet.setFrozenRows(1);

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }

  // dropdown
  schema.columns.forEach((col, idx) => {
    if (col.type !== "enum" || !col.options || col.options.length === 0) return;
    const colIdx = idx + 1;
    const range = sheet.getRange(2, colIdx, Math.max(rows.length, 100), 1);
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(col.options, true)
      .setAllowInvalid(false)
      .setHelpText("選択肢: " + col.options.join(" / "))
      .build();
    range.setDataValidation(rule);
  });

  // 列幅自動調整 (heroId 系は固定幅で十分)
  for (let i = 1; i <= headers.length; i++) sheet.autoResizeColumn(i);
  // passiveDesc 列が長い場合は折り返し
  const descColIdx = schema.columns.findIndex(c => /Desc$|^desc$/.test(c.name));
  if (descColIdx >= 0) {
    sheet.getRange(1, descColIdx + 1, sheet.getMaxRows(), 1).setWrap(true);
    sheet.setColumnWidth(descColIdx + 1, 480);
  }
}

// ─── _meta シート ────────────────────────────────────────────────
function getMetaSheet_() {
  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName(SHEET_META);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_META);
    sheet.hideSheet();
    sheet.getRange(1, 1, 1, 2).setValues([["key", "value"]]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getMetaValue_(key) {
  const sheet = getMetaSheet_();
  const last = sheet.getLastRow();
  if (last < 2) return null;
  const data = sheet.getRange(2, 1, last - 1, 2).getValues();
  for (const [k, v] of data) if (k === key) return v;
  return null;
}

function setMetaValue_(key, value) {
  const sheet = getMetaSheet_();
  const last = sheet.getLastRow();
  const data = last >= 2 ? sheet.getRange(2, 1, last - 1, 2).getValues() : [];
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === key) {
      sheet.getRange(i + 2, 2).setValue(value);
      return;
    }
  }
  sheet.appendRow([key, value]);
}
