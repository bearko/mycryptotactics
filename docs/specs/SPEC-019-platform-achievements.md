# SPEC-019: bearko.games 共通基盤との連携（アチーブメント：名鑑 11 枚・エクステンション 3 個）

| 項目 | 値 |
|------|-----|
| ID | SPEC-019 |
| 状態 | Accepted |
| 作成日 | 2026-10-18 |
| 最終更新 | 2026-10-18（1.0） |
| 作者 | Claude Code（作者 bearko の依頼） |
| レビュア | bearko |
| 関連 | SPEC-008（トロフィー。本 SPEC で広げる）、SPEC-015（RTA）、共通基盤 [bearko/mycryptoportfolio の SPEC-008](https://github.com/bearko/mycryptoportfolio/blob/claude/achievement-system-overhaul-zzt7gf/docs/specs/SPEC-008-achievement-book.md)（アチーブメント名鑑） |

## 1. 概要

共通基盤の「トロフィー」が「アチーブメント」に改まり、ヒーロー名鑑 100 枚とエクステンション 39 個に組み直された（共通基盤 SPEC-008、作者の決定 2026-10-18）。本作の枠は名鑑 11 枚（No.001〜011）とエクステンション 4 個。本作はそのうち、来訪（`tactics.visit`。SDK が自動で送る）を除く 14 個を、条件を満たした瞬間に `BearkoGames.unlockTrophy(id)` で送る。

## 2. 背景と動機

- SPEC-008 で送っていたのは `tactics.ch1`・`tactics.ch2`・`tactics.clear` の 3 つだけ
- 共通基盤 SPEC-008 5.1 で、本作が新しく送るものが決まった：`party3`・`ch3`・`ch4`・`llfull`・`rta1`・`egg`・`rta5`・`red`、`elite`・`llext`・`allalive`
- 本作は遊びの履歴を保存しない（PROJECT_CHARTER 3.1）。だから「セーブから判定してまとめて送る」形はとれず、**その場で送る**

## 3. 目標と非目標

### 目標

- 下の表の 14 個を、条件を満たしたときに送る
- 同じ起動で同じ ID を 2 度送らない。送るときは 1 つずつ、前の返事を待ってから次を送る（未ログインの最初の書き込みで仮アカウントができるため）

### 非目標

- 遊びの履歴（勝った回数・手に入れた LL エクステなど）の保存。localStorage は使わない（CLAUDE.md・PROJECT_CHARTER 3.1）
- ゲームのバランス・遊びの挙動の変更
- `tactics.visit`（SDK が自動で送る）と `cross.*`（共通基盤が判定する）の送信
- アチーブメントの名前・絵の表示（ゲーム内には出していない。通知は SDK が出す）

## 4. スコープ

- `prototype/js/platform.js`：条件 → ID の純関数 2 つ（章クリア・戦闘勝利）と、送る窓口（重ねない・順に送る）
- `prototype/js/main.js`：`advanceToNextChapter`（章クリア）と `endCombatWin`（戦闘勝利）から呼ぶ
- `tests/platform.test.mjs`：純関数と送り方のテスト
- README の「トロフィー」を「アチーブメント」に改める（プレイヤーに見える画面に「トロフィー」の文言はない）

## 5. 契約と挙動

### 5.1 送るもの（共通基盤 `platform/trophies.js`・`docs/ACHIEVEMENT_CATALOG.md`）

| 名鑑 | ID | 名前 | 絵 | 条件 | 判定する場所 |
|---|---|---|---|---|---|
| 001 | `tactics.ch1` | 遼来遼来 | 張遼 | 第 1 章のボスを倒す | 章クリア |
| 002 | `tactics.ch2` | 兵は詭道なり | 孫子 | 第 2 章のボスを倒す | 章クリア |
| 003 | `tactics.party3` | 剣闘士の反乱 | スパルタクス | 3 人パーティで第 1 章のボスを倒す | 章クリア |
| 004 | `tactics.ch3` | 奇兵隊 | 高杉晋作 | 第 3 章のボスを倒す | 章クリア |
| 005 | `tactics.ch4` | 真田丸 | 真田幸村 | 第 4 章のボスを倒す | 章クリア |
| 006 | `tactics.llfull` | 戦国一の傾奇者 | 前田 慶次 | LL エクステの枠を 2 つとも埋める | 戦闘勝利 |
| 007 | `tactics.rta1` | 伊賀越え | 服部半蔵 | RTA「第 1 章」を完走する | 章クリア |
| 008 | `tactics.clear` | 風林火山 | 武田信玄 | 全 5 章をクリアする | 章クリア |
| 009 | `tactics.egg` | 独眼竜 | 伊達政宗 | Dragon Egg で全 5 章をクリアする | 章クリア |
| 010 | `tactics.rta5` | 三段突き | 沖田総司 | RTA「全 5 章」を完走する | 章クリア |
| 011 | `tactics.red` | 天下布武 | 織田信長 | Red Dragon で全 5 章をクリアする | 章クリア |
| エクステ | `tactics.elite` | 剣豪の一撃 | 和泉守兼定 | エリートに初めて勝つ | 戦闘勝利 |
| エクステ | `tactics.llext` | インペリアルチャージ | インペリアルブレード | LL エクステを初めて手に入れる | 戦闘勝利 |
| エクステ | `tactics.allalive` | 古今独歩の一突き | 蜻蛉切 | 味方を 1 人も倒されずにボスに勝つ | 戦闘勝利 |

（`tactics.visit`「五事七計」・兵法書は SDK が来訪で送る）

### 5.2 章クリア（`trophyIdsForChapterClear(chapterIdx, chapterCount, { partySize, regulation, rtaMode })`）

`advanceToNextChapter` で `clearedChapters.add` した直後に呼ぶ（SPEC-008 と同じ場所）。

- `chapterIdx` 0〜3 → `tactics.ch1`〜`tactics.ch4`
- `chapterIdx` 0 かつ `partySize === 3`（`runState.party.length`）→ `tactics.party3`
- 最終章（`chapterCount - 1`）→ `tactics.clear`。そのときのレギュレーション（`currentRegulationId`）が `egg` なら `tactics.egg`、`red` なら `tactics.red` も
- RTA（`rtaMode`）の最後の区切りを通ったとき：`tactics-ch1` で第 1 章 → `tactics.rta1`、`tactics-all5` で最終章 → `tactics.rta5`（区切りは SPEC-015 の `rtaCheckpointForChapterClear` と同じ）
- 章選択で途中の章から始めた場合も、その章のボスを倒せば送る（SPEC-008 と同じ）。別のレギュレーションに切り替えると章の進み具合が消えるので、最終章に着いたときのレギュレーションで全 5 章をクリアしている

### 5.3 戦闘勝利（`trophyIdsForCombatWin({ isBoss, isElite, heroes, gotLlExt, llExtSlots })`）

`endCombatWin` で、LL エクステのドロップを決めた直後に呼ぶ。

- `isElite`（エリートのノード）→ `tactics.elite`
- `isBoss` で、`combat.heroes` の全員が生きている（`alive !== false` かつ `hp > 0`）→ `tactics.allalive`
  - 勝った瞬間の状態で見る。前の戦闘で倒れたまま（HP 0）ボス戦に入った味方がいれば満たさない
  - 戦闘中に倒れて、パッシブの復活などで起き上がった味方は「生きている」と数える（本作は戦闘中の倒れた記録を持たない。判定を小さく保つため）
- この勝利で LL エクステを手に入れた（`droppedLlExt`）→ `tactics.llext`。そのあと枠が 2 つとも埋まっていれば `tactics.llfull`
- 「初めて」は保存しないので、条件を満たすたびに送る（共通基盤が 2 度目以降を無視する）。同じ起動では 1 度だけ

### 5.4 送り方（`unlockAchievements(ids)`）

- SDK（`window.BearkoGames.unlockTrophy`）がなければ何もしない。ゲームの進行を止めない・例外を出さない
- 同じ起動で一度送った ID は送らない（SDK があるときに送った ID だけを覚える）
- 1 つずつ順に送る。前の `unlockTrophy` の返事（失敗を含む）を待ってから次を送る
- 失敗は `console.warn` に出すだけ。同じ起動では送り直さない
- 除外する場面：既存の送信と同じく、なし（本作にデバッグモード・RTA 用の使い捨ての状態はない。RTA の遊びもふつうの遊びと同じに数える）

### 5.5 互換性

- 共通基盤が新しい ID を公開するまでは、知らない ID として 400 ではじかれる。`console.warn` に出るだけで遊びに影響しない
- 保存の形は変えない（localStorage の項目は増えない）

## 6. 受け入れ基準

- [ ] 3 人パーティで第 1 章をクリアすると「遼来遼来」「剣闘士の反乱」が順に通知される
- [ ] 第 2 章以降でエリートに勝つと「剣豪の一撃」と、LL エクステの通知（「インペリアルチャージ」）が出る
- [ ] Red Dragon で全 5 章をクリアすると「風林火山」「天下布武」が通知される
- [ ] SDK が読めない状態でも、全章クリアまで遊べる

## 7. テストと証跡

- `tests/platform.test.mjs`（Node 標準 `node:test`・`assert`）：章クリア・戦闘勝利の ID、同じ起動で重ねない、1 つずつ順に送る、SDK がなくても例外を出さない
- 手動 QA は上の受け入れ基準（共通基盤の公開後）

## 8. 改訂履歴

| 日付 | 版 | 内容 |
|---|---|---|
| 2026-10-18 | 1.0 | 初版 |
