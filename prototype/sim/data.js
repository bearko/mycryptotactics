/**
 * Data loader — reads enemies/bosses from prototype/data/*.json,
 * chapters/heroes/llExt inline (small enough, port directly).
 */
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.resolve(__dirname, "..", "data");

function loadJson(name) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, name), "utf8"));
}

const ENEMIES = loadJson("enemies.json");
const BOSSES = loadJson("bosses.json");

// chapters: ported from prototype/js/chapters.js
const CHAPTERS = [
  {
    id: 1, name: "アバカス",
    enemyPool: ["sn-001", "sn-002", "sn-003"],
    elitePool: ["sn-e01"],
    cardPool: ["cd101","cd102","cd103","cd104","cd105","cd106","cd107","cd108","ext2004"],
    bossId: "boss-ch1", bossRewardGold: 50,
    mapRules: { layers: 10, nodesPerLayerMin: 3, nodesPerLayerMax: 4,
      nodeRatios: { fight: 0.50, rest: 0.15, shop: 0.10, elite: 0.10, craft: 0.08, event: 0.07 } },
  },
  {
    id: 2, name: "ホレリス",
    enemyPool: ["hl-001","hl-002","hl-003"],
    elitePool: ["hl-e01"],
    cardPool: ["cdH01","cdH02","cdH03","cdH04","cdH05","cdH06"],
    bossId: "boss-hl", bossRewardGold: 70,
    mapRules: { layers: 5, nodesPerLayerMin: 3, nodesPerLayerMax: 5,
      nodeRatios: { fight: 0.47, rest: 0.13, shop: 0.10, elite: 0.12, craft: 0.10, event: 0.08 } },
  },
  {
    id: 3, name: "アンティキティラ",
    enemyPool: ["en-301","en-302","en-303"],
    elitePool: ["en-e01"],
    cardPool: ["cd301","cd302","cd303","cd304","cd305"],
    bossId: "boss-ch3", bossRewardGold: 100,
    mapRules: { layers: 5, nodesPerLayerMin: 3, nodesPerLayerMax: 5,
      nodeRatios: { fight: 0.37, rest: 0.10, shop: 0.13, elite: 0.15, craft: 0.10, event: 0.15 } },
  },
  {
    id: 4, name: "アタナソフ",
    enemyPool: ["vp-001","vp-002","vp-003"],
    elitePool: ["vp-e01"],
    cardPool: ["cd201","cd202","cd203","cd204","cd205","cd206"],
    bossId: "boss-ch2", bossRewardGold: 120,
    mapRules: { layers: 5, nodesPerLayerMin: 3, nodesPerLayerMax: 5,
      nodeRatios: { fight: 0.42, rest: 0.13, shop: 0.13, elite: 0.10, craft: 0.10, event: 0.12 } },
  },
  {
    id: 5, name: "トロイ",
    enemyPool: ["tr-001","tr-002","tr-003"],
    elitePool: ["tr-e01"],
    cardPool: ["cd301","cd302","cd303","cd304","cd305","cd201","cd202","cd203","cd204","cd205","cd206","cdH01","cdH02","cdH03","cdH04"],
    bossId: "boss-troy", bossRewardGold: 180,
    mapRules: { layers: 6, nodesPerLayerMin: 3, nodesPerLayerMax: 5,
      nodeRatios: { fight: 0.38, rest: 0.07, shop: 0.13, elite: 0.20, craft: 0.10, event: 0.12 } },
  },
];

const HEROES = [
  { heroId: 1002, key: "kaihime",  nameJa: "甲斐姫",
    hpMax: 70, basePhy: 10, baseInt: 8,  baseAgi: 12, passiveKey: "kaihime" },
  { heroId: 1001, key: "doyle",    nameJa: "ドイル",
    hpMax: 60, basePhy: 7,  baseInt: 14, baseAgi: 8,  passiveKey: "doyle" },
  { heroId: 1003, key: "zhang",    nameJa: "張遼",
    hpMax: 85, basePhy: 15, baseInt: 6,  baseAgi: 10, passiveKey: "zhang" },
];

const LL_EXT_POOL = [
  { extId: 5501, name: "真・MCHブレード",   skillName: "天の一撃",          effectKey: "blade" },
  { extId: 5502, name: "真・グランダルメ",   skillName: "グランダルメ攻撃縦隊", effectKey: "grande" },
  { extId: 5503, name: "真・劇作家の羽ペン", skillName: "アンサンブル・カーテンコール", effectKey: "pen" },
  { extId: 5504, name: "真・MCHアーマー",   skillName: "ダイヤモンドパワー",   effectKey: "armor" },
  { extId: 5509, name: "マリーアントワネット・ブルー", skillName: "希望の燐光", effectKey: "blue" },
  { extId: 5561, name: "悪魔金魚",          skillName: "悪魔だからな",       effectKey: "fish" },
];

module.exports = { ENEMIES, BOSSES, CHAPTERS, HEROES, LL_EXT_POOL };
