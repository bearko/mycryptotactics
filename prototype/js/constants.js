export const ASSET_BASE = "https://raw.githubusercontent.com/bearko/mycryptoheroes/main/";
export const img = (path) => ASSET_BASE + path;
export const audioUrl = (relPath) => ASSET_BASE + relPath;

/** 選択可能ヒーロー一覧 */
export const HERO_ROSTER = [
  {
    heroId: 1002,
    nameJa: "甲斐姫",
    hpMax: 70,
    basePhy: 10,
    baseInt: 8,
    baseAgi: 12,
    passiveKey: "kaihime",
    passiveName: "浪切",
    passiveDesc: "スキルカード使用後に50%の確率で発動・先頭の敵にPHYの50%追加ダメージ",
    img: () => img("Image/Heroes/1002.png"),
  },
  {
    heroId: 1001,
    nameJa: "コナン・ドイル",
    hpMax: 85,
    basePhy: 7,
    baseInt: 23,
    baseAgi: 8,
    passiveKey: "doyle",
    passiveName: "シャーロック・ホームズ",
    passiveDesc: "HPが70%未満になったとき1回だけ発動・INT +3",
    img: () => img("Image/Heroes/1001.png"),
  },
  {
    heroId: 1003,
    nameJa: "張遼",
    hpMax: 85,
    basePhy: 15,
    baseInt: 6,
    baseAgi: 10,
    passiveKey: "zhang",
    passiveName: "遼来遼来",
    passiveDesc: "被ダメージ後に50%の確率で発動・先頭の敵にPHYの20%追加ダメージ",
    img: () => img("Image/Heroes/1003.png"),
  },
];

/** リーダー基礎ステ（カードで PHY/INT が変化する前提の初期値）。ヒーロー選択で書き換わる。 */
export let LEADER = { ...HERO_ROSTER[0] };

/** ヒーローを選択して LEADER を更新する */
export function setLeader(hero) {
  Object.assign(LEADER, hero);
}

export const ENEMY_IMG = (id) => img("Image/Enemies/" + id + ".png");
export const EXT_IMG = (id) => img("Image/Extensions/" + id + ".png");
export const BATTLE_BG = (fileId) => img("Image/Backgrounds/" + fileId + ".png");

/** バトル用スプライトシート（Data/Effects/battle_effect_sprites.json と対応） */
export const BATTLE_EFFECT_SPRITE = {
  singleDamage: () => img("Image/Effects/Battle/01_single_damage.png"),
  areaDamage: () => img("Image/Effects/Battle/02_area_damage.png"),
  heal: () => img("Image/Effects/Battle/03_heal_resurrection.png"),
  buff: () => img("Image/Effects/Battle/04_buff.png"),
  debuff: () => img("Image/Effects/Battle/05_debuff_status_effect.png"),
};

/** cutins.json のジングル */
export const AUDIO_URLS = {
  bgmMap: () => audioUrl("Audio/BGM/pve.mp3"),
  bgmPvp: () => audioUrl("Audio/BGM/pvp.mp3"),
  seClear: () => audioUrl("Audio/SE/clear.wav"),
  seBattleSingleDamage: () => audioUrl("Audio/SE/Battle/1_single_damage.mp3"),
  seBattleAreaDamage: () => audioUrl("Audio/SE/Battle/2_area_damage.mp3"),
  seBattleHeal: () => audioUrl("Audio/SE/Battle/3_heal_resurrection.mp3"),
  seBattleBuff: () => audioUrl("Audio/SE/Battle/4_buff.mp3"),
  seBattleDebuff: () => audioUrl("Audio/SE/Battle/5_debuff_status_effect.mp3"),
  jingleWin: () => audioUrl("Audio/SE/Jingles/win.mp3"),
  jingleLose: () => audioUrl("Audio/SE/Jingles/lose.mp3"),
};
