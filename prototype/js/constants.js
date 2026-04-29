export const ASSET_BASE = "https://raw.githubusercontent.com/bearko/mycryptoheroes/main/";
export const img = (path) => ASSET_BASE + path;
export const audioUrl = (relPath) => ASSET_BASE + relPath;

/** リーダー基礎ステ（カードで PHY/INT が変化する前提の初期値） */
export const LEADER = {
  heroId: 1002,
  nameJa: "甲斐姫",
  hpMax: 70,
  basePhy: 10,
  baseInt: 8,
  baseAgi: 12,
  img: () => img("Image/Heroes/1002.png"),
};

export const ENEMY_IMG = (id) => img("Image/Enemies/" + id + ".png");
export const EXT_IMG = (id) => img("Image/Extensions/" + id + ".png");
export const BATTLE_BG = (fileId) => img("Image/Backgrounds/" + fileId + ".png");

/** mycryptoheroes リポジトリ内の BGM / SE */
export const AUDIO_URLS = {
  bgmPvp: () => audioUrl("Audio/BGM/pvp.mp3"),
  seClear: () => audioUrl("Audio/SE/clear.wav"),
  seBattleSingleDamage: () => audioUrl("Audio/SE/Battle/1_single_damage.mp3"),
  seBattleAreaDamage: () => audioUrl("Audio/SE/Battle/2_area_damage.mp3"),
  seBattleHeal: () => audioUrl("Audio/SE/Battle/3_heal_resurrection.mp3"),
  seBattleBuff: () => audioUrl("Audio/SE/Battle/4_buff.mp3"),
  seBattleDebuff: () => audioUrl("Audio/SE/Battle/5_debuff_status_effect.mp3"),
};
