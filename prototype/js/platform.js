// SPEC-008・009・015: bearko.games 共通基盤（トロフィー・総合スコア・RTA）への窓口。
// SDK（https://bearko.games/sdk/v1.js）が読めなくても何もしないで終わる。ゲームの進行は止めない。
// ログイン状態は共通基盤が持つので、ここでは Cookie・localStorage に触らない。

// クリアした章（0 始まり）に対応するトロフィー ID。純関数（tests/platform.test.mjs）
export function trophyIdsForChapterClear(chapterIdx, chapterCount) {
  const ids = [];
  if (chapterIdx === 0) ids.push('tactics.ch1');
  if (chapterIdx === 1) ids.push('tactics.ch2');
  if (chapterCount > 0 && chapterIdx === chapterCount - 1) ids.push('tactics.clear');
  return ids;
}

const sdk = () => (typeof window !== 'undefined' ? window.BearkoGames : undefined);

export function initPlatform(version) {
  const bg = sdk();
  if (!bg) return;
  try {
    Promise.resolve(bg.init({ game: 'tactics', version })).catch((e) => console.warn('[platform] init', e));
  } catch (e) {
    console.warn('[platform] init', e);
  }
}

export function reportChapterClear(chapterIdx, chapterCount) {
  const bg = sdk();
  if (!bg) return;
  for (const id of trophyIdsForChapterClear(chapterIdx, chapterCount)) {
    try {
      Promise.resolve(bg.unlockTrophy(id))
        .then((r) => { if (!r || !r.ok) console.warn('[platform] trophy', id, r && r.error); })
        .catch((e) => console.warn('[platform] trophy', id, e));
    } catch (e) {
      console.warn('[platform] trophy', id, e);
    }
  }
}

// SPEC-009: 総合スコア。挑戦の終わりの成績（共通基盤に送る形）。純関数（tests/platform.test.mjs）
//   chaptersCleared：クリアした章の数、cleared：全章クリアか、finalScore：SPEC-007 の最終スコア（クリア時だけ）
//   baseScore：倍率の前の点（クリア時だけ）、absoluteMult：ABSOLUTE の倍率（ABSOLUTE のときだけ）。共通基盤の tactics.v2 が使う（1.1）
export function scoreMetrics({ chaptersCleared, chapterCount, cleared, finalScore, baseScore, absoluteMult, regulation }) {
  const n = Math.max(0, Math.min(chapterCount, chaptersCleared | 0));
  const all = !!cleared && n === chapterCount;
  const m = {
    chaptersCleared: n,
    cleared: all,
    finalScore: all ? Math.max(0, Math.round(finalScore || 0)) : 0,
    baseScore: all ? Math.max(0, Math.round(baseScore || 0)) : 0,
    regulation: regulation || null, // 共通基盤の難易度の係数を決める
  };
  if (regulation === 'absolute' && Number.isFinite(absoluteMult)) m.absoluteMult = absoluteMult;
  return m;
}

// 挑戦の終わりに送る。章を 1 つもクリアしていなければ送らない
export function reportRunScore(metrics) {
  const bg = sdk();
  if (!bg || typeof bg.submitScore !== 'function' || !metrics || metrics.chaptersCleared < 1) return;
  try {
    Promise.resolve(bg.submitScore(metrics))
      .then((r) => { if (!r || !r.ok) console.warn('[platform] score', r && r.error); })
      .catch((e) => console.warn('[platform] score', e));
  } catch (e) {
    console.warn('[platform] score', e);
  }
}

// SPEC-015: RTA（第 1 章・全 5 章）。「RTA で始める」を選んだときだけ計測する
export const RTA_REGULATIONS = ['tactics-ch1', 'tactics-all5'];

/** SDK の RTA が使えるか（使えなければ RTA の枠を出さない） */
export function rtaAvailable() {
  const bg = sdk();
  return !!(bg && bg.rta && typeof bg.rta.start === 'function');
}

/** 章クリア（0 始まり）で送る区切り ID。送らないなら null。純関数（tests/platform.test.mjs） */
export function rtaCheckpointForChapterClear(regulation, chapterIdx, chapterCount) {
  if (regulation === 'tactics-ch1') return chapterIdx === 0 ? 'ch1' : null;
  if (regulation === 'tactics-all5') {
    if (chapterIdx === chapterCount - 1) return 'clear';
    return chapterIdx >= 0 && chapterIdx < chapterCount - 1 ? 'ch' + (chapterIdx + 1) : null;
  }
  return null;
}

function rtaCall(name, fn) {
  const bg = sdk();
  if (!bg || !bg.rta) return;
  try {
    Promise.resolve(fn(bg.rta))
      .then((r) => { if (r && r.ok === false) console.warn('[platform] rta', name, r.error); })
      .catch((e) => console.warn('[platform] rta', name, e));
  } catch (e) {
    console.warn('[platform] rta', name, e);
  }
}

const rtaRunning = (rta) => !!(rta.current && rta.current());

/** 計測を始める。timerOffset：経過時間の表示を上端からずらす px（資源の行に重ならないように） */
export function rtaStart(regulation, timerOffset) {
  if (!RTA_REGULATIONS.includes(regulation)) return;
  rtaCall('start', (rta) => rta.start({ regulation, timerOffset }));
}

/** 章クリア。turns：その時点までの戦闘のターン数の合計（IGT。igtMs の欄にそのまま入れる） */
export function rtaChapterClear(regulation, chapterIdx, chapterCount, turns) {
  const id = rtaCheckpointForChapterClear(regulation, chapterIdx, chapterCount);
  if (!id) return;
  rtaCall('checkpoint', (rta) => (rtaRunning(rta) ? rta.checkpoint(id, { igtMs: Math.max(0, turns | 0) }) : null));
}

/** 中断（敗北・タイトルに戻ったとき） */
export function rtaAbort() {
  rtaCall('abort', (rta) => (rtaRunning(rta) ? rta.abort() : null));
}

// SPEC-016: bearko.games 共通のアイコン（共通基盤 SPEC-005 5.3。選ぶ窓は SDK 1.7.0 が持つ）
/** 選ぶ窓を出せるか（SDK が読めて 1.7.0 以上） */
export function canPickAvatar() {
  const bg = sdk();
  return !!(bg && typeof bg.openAvatarPicker === 'function');
}
/** アイコンを選ぶ窓（すべてのゲームとチャットで同じ絵になる）。SDK がない・古いときは何もしない */
export function openAvatarPicker() {
  const bg = sdk();
  if (!bg || typeof bg.openAvatarPicker !== 'function') return false;
  try { bg.openAvatarPicker(); } catch (e) { console.warn('[platform] avatar', e); }
  return true;
}
