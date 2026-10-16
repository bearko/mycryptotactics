// SPEC-008: bearko.games 共通基盤（トロフィー）への窓口。
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
