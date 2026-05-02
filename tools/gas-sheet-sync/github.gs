/**
 * github.gs — GitHub API 共通ヘルパ
 *
 * PropertiesService から PAT / repo 情報を読み出し、低レベル API を提供。
 *
 * 必要な ScriptProperties:
 *   GITHUB_PAT      … fine-grained PAT (repo 権限: Contents Read/Write + PR Read/Write)
 *   GITHUB_OWNER    … "bearko"
 *   GITHUB_REPO     … "mycryptotactics"
 *   GITHUB_BASE_BRANCH … "main"
 *   PUSH_ALLOWED_EMAIL … "bearko.miyamoto@gmail.com" (Push 実行を許可するユーザのメール)
 */

const GH_API = "https://api.github.com";

function ghProps_() {
  const p = PropertiesService.getScriptProperties();
  const required = ["GITHUB_PAT", "GITHUB_OWNER", "GITHUB_REPO", "GITHUB_BASE_BRANCH", "PUSH_ALLOWED_EMAIL"];
  const missing = required.filter(k => !p.getProperty(k));
  if (missing.length > 0) {
    throw new Error("Script Properties が未設定です: " + missing.join(", ") + "\n[ファイル] → [プロジェクトのプロパティ] → [スクリプトのプロパティ] で設定してください。");
  }
  return {
    pat:    p.getProperty("GITHUB_PAT"),
    owner:  p.getProperty("GITHUB_OWNER"),
    repo:   p.getProperty("GITHUB_REPO"),
    base:   p.getProperty("GITHUB_BASE_BRANCH"),
    pushAllowedEmail: p.getProperty("PUSH_ALLOWED_EMAIL"),
  };
}

/** Push 実行ユーザの権限チェック (bearko.miyamoto@gmail.com のみ許可) */
function ghAssertPushAllowed_() {
  const email = (Session.getActiveUser().getEmail() || "").toLowerCase();
  const allowed = ghProps_().pushAllowedEmail.toLowerCase();
  if (email !== allowed) {
    throw new Error(
      "Push 権限がありません。\n" +
      "実行ユーザ: " + (email || "(取得不可)") + "\n" +
      "許可ユーザ: " + allowed + "\n" +
      "Pull (GitHub から最新を取得) は誰でも実行できます。"
    );
  }
}

/** GitHub API 呼び出し (認証付き) */
function ghApi_(method, path, body) {
  const props = ghProps_();
  const opts = {
    method: method,
    headers: {
      Authorization: "Bearer " + props.pat,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    muteHttpExceptions: true,
    contentType: "application/json",
  };
  if (body) opts.payload = JSON.stringify(body);
  const url = GH_API + path;
  const res = UrlFetchApp.fetch(url, opts);
  const code = res.getResponseCode();
  const text = res.getContentText();
  if (code >= 200 && code < 300) {
    return text ? JSON.parse(text) : null;
  }
  throw new Error("GitHub API " + method + " " + path + " → " + code + "\n" + text);
}

/** raw.githubusercontent.com から JSON を取得 (認証不要、anonymous) */
function ghFetchRawJson(path, ref) {
  const props = ghProps_();
  const url = "https://raw.githubusercontent.com/" + props.owner + "/" + props.repo + "/" + (ref || props.base) + "/" + path;
  const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) {
    throw new Error("raw fetch failed: " + url + " (" + res.getResponseCode() + ")");
  }
  return JSON.parse(res.getContentText());
}

/** 指定 ref (branch) の HEAD commit SHA を取得 */
function ghGetRefSha(ref) {
  const props = ghProps_();
  const r = ghApi_("GET", "/repos/" + props.owner + "/" + props.repo + "/git/refs/heads/" + ref);
  return r.object.sha;
}

/** 新しいブランチを base branch から作成 */
function ghCreateBranch(branchName, baseSha) {
  const props = ghProps_();
  return ghApi_("POST", "/repos/" + props.owner + "/" + props.repo + "/git/refs", {
    ref: "refs/heads/" + branchName,
    sha: baseSha,
  });
}

/** 指定パスの現在の content + sha (file 上書きに必要) を取得 */
function ghGetFile(path, ref) {
  const props = ghProps_();
  return ghApi_("GET", "/repos/" + props.owner + "/" + props.repo + "/contents/" + path + "?ref=" + ref);
}

/** ファイルを PUT (新規作成 or 上書き)
 *  contentStr: 平文 (Base64 化は内部で実施) */
function ghPutFile(path, branch, contentStr, message, currentSha) {
  const props = ghProps_();
  const body = {
    message: message,
    branch: branch,
    content: Utilities.base64Encode(Utilities.newBlob(contentStr).getBytes()),
  };
  if (currentSha) body.sha = currentSha;
  return ghApi_("PUT", "/repos/" + props.owner + "/" + props.repo + "/contents/" + path, body);
}

/** Pull Request 作成 */
function ghCreatePullRequest(title, branch, base, body) {
  const props = ghProps_();
  return ghApi_("POST", "/repos/" + props.owner + "/" + props.repo + "/pulls", {
    title: title,
    head: branch,
    base: base,
    body: body || "",
  });
}
