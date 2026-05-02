/**
 * menu.gs — onOpen でカスタムメニューを追加
 *
 * Spreadsheet を開くたびに「データ同期」メニューが表示される。
 */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("データ同期")
    .addItem("GitHub から最新を取得 (Pull、全シート)", "pullAllFromGitHub")
    .addSeparator()
    .addSubMenu(
      SpreadsheetApp.getUi().createMenu("Push (シートを選んで PR)")
        .addItem("heroes だけ Push", "pushHeroesAsPR")
        .addItem("ll-extensions だけ Push", "pushLlExtensionsAsPR")
        .addSeparator()
        .addItem("全シート Push (1 PR にまとめる)", "pushAllToGitHubAsPR")
    )
    .addSeparator()
    .addItem("最終同期情報を表示", "showSyncStatus")
    .addItem("Script Properties をチェック", "checkProperties")
    .addToUi();
}

function showSyncStatus() {
  const lines = [
    "── 最終同期情報 ──",
    "lastSyncedSha:    " + (getMetaValue_("lastSyncedSha") || "(未 pull)"),
    "lastPullAt:       " + (getMetaValue_("lastPullAt")    || "—"),
    "lastPullBy:       " + (getMetaValue_("lastPullBy")    || "—"),
    "lastPushAt:       " + (getMetaValue_("lastPushAt")    || "—"),
    "lastPushBy:       " + (getMetaValue_("lastPushBy")    || "—"),
    "lastPushBranch:   " + (getMetaValue_("lastPushBranch")|| "—"),
    "lastPushPr:       " + (getMetaValue_("lastPushPr")    || "—"),
  ];
  SpreadsheetApp.getUi().alert(lines.join("\n"));
}

function checkProperties() {
  try {
    const p = ghProps_();
    SpreadsheetApp.getUi().alert(
      "Script Properties OK\n" +
      "owner: " + p.owner + "\n" +
      "repo:  " + p.repo + "\n" +
      "base:  " + p.base + "\n" +
      "PAT:   " + (p.pat ? "(設定済み, " + p.pat.length + " chars)" : "(未設定)") + "\n" +
      "PUSH_ALLOWED_EMAIL: " + p.pushAllowedEmail + "\n" +
      "現在のユーザ:         " + (Session.getActiveUser().getEmail() || "(取得不可)")
    );
  } catch (e) {
    SpreadsheetApp.getUi().alert(e.message);
  }
}
