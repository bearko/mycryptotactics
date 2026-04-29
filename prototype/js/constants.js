export const ASSET_BASE = "https://raw.githubusercontent.com/bearko/mycryptoheroes/main/";
export const img = (path) => ASSET_BASE + path;

export const LEADER = {
  heroId: 1002,
  nameJa: "甲斐姫",
  hpMax: 70,
  img: () => img("Image/Heroes/1002.png"),
};

export const ENEMY_IMG = (id) => img("Image/Enemies/" + id + ".png");
export const EXT_IMG = (id) => img("Image/Extensions/" + id + ".png");
export const BATTLE_BG = (fileId) => img("Image/Backgrounds/" + fileId + ".png");
