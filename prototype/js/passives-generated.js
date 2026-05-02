/**
 * passives-generated.js — SPEC-006 §18 Phase 4j codemod 出力 (v2)
 *
 * 全 210 体のヒーローパッシブを宣言形式 PassiveDef に変換。
 * 元データ: prototype/data/heroes.json
 * 生成スクリプト: prototype/tools/gen-passives.js
 *
 * 変換方針:
 * - passiveDesc を '<trigger 句>に発動・<effects>' 形式でパース
 * - effects は ／ 区切りで個別パース、解析不能部は notes に記録
 * - 別ステ参照バフ (e.g. INTを最大AGIの30%アップ) は buffStatFromOther action で表現
 * - 状態異常 stack 数は CSV の明示値をそのまま使用
 * - 致死時生存は revive action (hpRatio 0.01) として inline 化
 *
 * runtime 仕様: prototype/js/passive-runtime.js + SPEC-006 §18.6
 */

export const PASSIVES = {
  // heroId: 1001
  "doyle": {
    passiveKey: "doyle",
    trigger: "self.hpBelow",
    triggerRate: 1,
    oncePerCombat: true,
    threshold: 0.7,
    effects: [
      {"target":"self","action":"buffStat","stat":"int","value":3}
    ],
    cutinSkillName: "シャーロック・ホームズ"
  },
  // heroId: 1002
  "kaihime": {
    passiveKey: "kaihime",
    trigger: "self.cardPlayed",
    triggerRate: 0.5,
    oncePerCombat: false,
    effects: [
      {"target":"enemy.foremost","action":"damage","coef":{"phy":0.5}}
    ],
    cutinSkillName: "浪切"
  },
  // heroId: 1003
  "zhang": {
    passiveKey: "zhang",
    trigger: "self.tookDamage",
    triggerRate: 0.5,
    oncePerCombat: false,
    effects: [
      {"target":"enemy.foremost","action":"damage","coef":{"phy":0.2}}
    ],
    cutinSkillName: "遼来遼来"
  },
  // heroId: 1004
  "seton": {
    passiveKey: "seton",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"enemy.foremost","action":"damage","coef":{"int":0.4}}
    ],
    cutinSkillName: "狼王ロボ"
  },
  // heroId: 1005
  "inoh": {
    passiveKey: "inoh",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"buffStatFromOther","stat":"int","fromStat":"agi","pct":0.3}
    ],
    cutinSkillName: "大日本沿海輿地全図"
  },
  // heroId: 1006
  "pythagoras": {
    passiveKey: "pythagoras",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"buffStatFromOther","stat":"phy","fromStat":"int","pct":0.2},
      {"target":"self","action":"buffStatFromOther","stat":"int","fromStat":"phy","pct":0.2}
    ],
    cutinSkillName: "テトラクテュス"
  },
  // heroId: 1007
  "daejanggeum": {
    passiveKey: "daejanggeum",
    trigger: "self.cardPlayed",
    triggerRate: 0.3,
    oncePerCombat: false,
    effects: [
      {"target":"self","action":"heal","coef":{"hpRatio":0.1}}
    ],
    cutinSkillName: "李氏朝鮮、宮廷医女"
  },
  // heroId: 1008
  "sullivan": {
    passiveKey: "sullivan",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"buffStat","stat":"phy","value":5}
    ],
    cutinSkillName: "ボストン・ストロング・ボーイ"
  },
  // heroId: 1009
  "hercules": {
    passiveKey: "hercules",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"enemy.foremost","action":"buffStatPct","stat":"int","pct":-0.3}
    ],
    cutinSkillName: "ローリングドライバー"
  },
  // heroId: 1010
  "giraffa": {
    passiveKey: "giraffa",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"enemy.foremost","action":"damage","coef":{"phy":0.4}}
    ],
    cutinSkillName: "ブルロック"
  },
  // heroId: 2001
  "wright_brothers": {
    passiveKey: "wright_brothers",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"buffStat","stat":"agi","value":1}
    ],
    cutinSkillName: "ライトフライヤー号"
  },
  // heroId: 2002
  "spartacus": {
    passiveKey: "spartacus",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"enemy.foremost","action":"damage","coef":{"phy":0.4}},
      {"target":"enemy.foremost","action":"damage","coef":{"phy":0.4}},
      {"target":"self","action":"buffStat","stat":"phy","value":5}
    ],
    cutinSkillName: "剣闘士の反乱"
  },
  // heroId: 2003
  "jack_ripper": {
    passiveKey: "jack_ripper",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"enemy.foremost","action":"damage","coef":{"phy":0.2}},
      {"target":"self","action":"buffStat","stat":"agi","value":1}
    ],
    cutinSkillName: "ランゲルライン"
  },
  // heroId: 2004
  "schubert": {
    passiveKey: "schubert",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"enemy.foremost","action":"applyStatus","status":"bleed","stacks":1},
      {"target":"self","action":"revive","coef":{"hpRatio":0.01}}
    ],
    cutinSkillName: "魔王"
  },
  // heroId: 2005
  "grimm": {
    passiveKey: "grimm",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"heal","coef":{"int":0.1}},
      {"target":"enemy.foremost","action":"applyStatus","status":"poison","stacks":1}
    ],
    cutinSkillName: "ブレーメンの音楽隊"
  },
  // heroId: 2006
  "archimedes": {
    passiveKey: "archimedes",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"addShield","value":8}
    ],
    cutinSkillName: "ヘウレーカ！ヘウレーカ！"
  },
  // heroId: 2007
  "santa": {
    passiveKey: "santa",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"self","action":"heal","coef":{"int":0.185}}
    ],
    cutinSkillName: "プレゼント・フォー・ユー"
  },
  // heroId: 2008
  "schrodinger": {
    passiveKey: "schrodinger",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"buffStat","stat":"int","value":2},
      {"target":"self","action":"buffStat","stat":"agi","value":2},
      {"target":"self","action":"revive","coef":{"hpRatio":0.01}}
    ],
    cutinSkillName: "シュレディンガーの猫"
  },
  // heroId: 2009
  "ranmaru": {
    passiveKey: "ranmaru",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"enemy.foremost","action":"buffStat","stat":"agi","value":-4},
      {"target":"enemy.foremost","action":"applyStatus","status":"poison","stacks":1}
    ],
    cutinSkillName: "天下人の使者"
  },
  // heroId: 2010
  "kafka": {
    passiveKey: "kafka",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"heal","coef":{"int":0.3}},
      {"target":"self","action":"buffStat","stat":"agi","value":1}
    ],
    cutinSkillName: "変身"
  },
  // heroId: 2011
  "sunzi": {
    passiveKey: "sunzi",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"enemy.foremost","action":"buffStat","stat":"agi","value":-2}
    ],
    cutinSkillName: "兵は詭道なり"
  },
  // heroId: 2012
  "mitsunari": {
    passiveKey: "mitsunari",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"buffStat","stat":"phy","value":2},
      {"target":"enemy.foremost","action":"buffStat","stat":"int","value":-4}
    ],
    cutinSkillName: "大一大万大吉"
  },
  // heroId: 2013
  "xuchu": {
    passiveKey: "xuchu",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"self","action":"buffStat","stat":"phy","value":5},
      {"target":"self","action":"buffStat","stat":"int","value":4},
      {"target":"self","action":"buffStat","stat":"agi","value":5}
    ],
    cutinSkillName: "虎痴"
  },
  // heroId: 2014
  "yoshinobu": {
    passiveKey: "yoshinobu",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"self","action":"buffStat","stat":"int","value":3},
      {"target":"enemy.foremost","action":"buffStat","stat":"phy","value":-1},
      {"target":"enemy.foremost","action":"buffStat","stat":"int","value":-1}
    ],
    cutinSkillName: "大政奉還"
  },
  // heroId: 2015
  "montesquieu": {
    passiveKey: "montesquieu",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"buffStat","stat":"int","value":1},
      {"target":"self","action":"buffStat","stat":"agi","value":1},
      {"target":"enemy.foremost","action":"buffStat","stat":"int","value":-3}
    ],
    cutinSkillName: "法の精神"
  },
  // heroId: 2016
  "anastasia": {
    passiveKey: "anastasia",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"enemy.foremost","action":"damage","coef":{"int":0.45}},
      {"target":"enemy.foremost","action":"buffStat","stat":"int","value":-4}
    ],
    cutinSkillName: "幻の生存者"
  },
  // heroId: 2017
  "geronimo": {
    passiveKey: "geronimo",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"enemy.foremost","action":"buffStat","stat":"int","value":-1}
    ],
    cutinSkillName: "荒野の復讐者"
  },
  // heroId: 2018
  "chacha": {
    passiveKey: "chacha",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"buffStat","stat":"phy","value":3},
      {"target":"self","action":"addShield","value":8}
    ],
    cutinSkillName: "錦城の女主"
  },
  // heroId: 2019
  "kintaro": {
    passiveKey: "kintaro",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"self","action":"buffStat","stat":"phy","value":4}
    ],
    cutinSkillName: "けだものあつめて すもうのけいこ"
  },
  // heroId: 2020
  "mitsuhide": {
    passiveKey: "mitsuhide",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"enemy.foremost","action":"damage","coef":{"int":0.8}},
      {"target":"enemy.foremost","action":"applyStatus","status":"poison","stacks":1}
    ],
    cutinSkillName: "本能寺の変"
  },
  // heroId: 2021
  "shinsaku": {
    passiveKey: "shinsaku",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"addGuard","value":6}
    ],
    cutinSkillName: "奇兵隊"
  },
  // heroId: 2022
  "andersen": {
    passiveKey: "andersen",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"enemy.foremost","action":"damage","coef":{"int":0.45}}
    ],
    cutinSkillName: "マッチ売りの少女"
  },
  // heroId: 2023
  "michelangelo": {
    passiveKey: "michelangelo",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"buffStat","stat":"int","value":5}
    ],
    cutinSkillName: "ダビデの覚醒"
  },
  // heroId: 2024
  "salome": {
    passiveKey: "salome",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"buffStat","stat":"phy","value":1},
      {"target":"enemy.foremost","action":"applyStatus","status":"poison","stacks":1}
    ],
    cutinSkillName: "ヘロディアの娘"
  },
  // heroId: 2025
  "satoshi": {
    passiveKey: "satoshi",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"self","action":"buffStat","stat":"phy","value":1},
      {"target":"self","action":"buffStat","stat":"agi","value":1}
    ],
    cutinSkillName: "マイニング ALPHA CC"
  },
  // heroId: 2026
  "hideyoshi": {
    passiveKey: "hideyoshi",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"buffStat","stat":"agi","value":2}
    ],
    cutinSkillName: "功名立志伝"
  },
  // heroId: 2027
  "aesop": {
    passiveKey: "aesop",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"enemy.foremost","action":"buffStat","stat":"agi","value":-4}
    ],
    cutinSkillName: "うさぎとかめ"
  },
  // heroId: 2028
  "chun_sisters": {
    passiveKey: "chun_sisters",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"enemy.foremost","action":"damage","coef":{"phy":0.45}},
      {"target":"enemy.foremost","action":"damage","coef":{"int":0.45}}
    ],
    cutinSkillName: "姉妹の反乱"
  },
  // heroId: 2029
  "ikkyu": {
    passiveKey: "ikkyu",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"enemy.foremost","action":"damage","coef":{"int":0.4}},
      {"target":"self","action":"revive","coef":{"hpRatio":0.01}}
    ],
    cutinSkillName: "めでたくもあり・めでたくもなし"
  },
  // heroId: 2030
  "izumo": {
    passiveKey: "izumo",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"enemy.foremost","action":"damage","coef":{"phy":0.45}}
    ],
    cutinSkillName: "ややこ踊り"
  },
  // heroId: 2031
  "bismarck": {
    passiveKey: "bismarck",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"enemy.foremost","action":"applyStatus","status":"poison","stacks":1}
    ],
    cutinSkillName: "鉄血演説"
  },
  // heroId: 2032
  "montgomery": {
    passiveKey: "montgomery",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"enemy.foremost","action":"damage","coef":{"int":0.3}}
    ],
    cutinSkillName: "グリーンゲイブルズ"
  },
  // heroId: 2033
  "goethe": {
    passiveKey: "goethe",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"enemy.foremost","action":"buffStat","stat":"phy","value":-4},
      {"target":"enemy.foremost","action":"applyStatus","status":"poison","stacks":1}
    ],
    cutinSkillName: "若きウェルテルの悩み"
  },
  // heroId: 2034
  "plato": {
    passiveKey: "plato",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"buffStat","stat":"phy","value":1},
      {"target":"self","action":"buffStat","stat":"agi","value":1},
      {"target":"enemy.foremost","action":"buffStat","stat":"phy","value":-3}
    ],
    cutinSkillName: "イデア論"
  },
  // heroId: 2035
  "sarutahiko": {
    passiveKey: "sarutahiko",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"self","action":"buffStat","stat":"int","value":3}
    ],
    cutinSkillName: "西暦3344年"
  },
  // heroId: 2036
  "ichiyo": {
    passiveKey: "ichiyo",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"buffStat","stat":"int","value":5},
      {"target":"enemy.foremost","action":"buffStat","stat":"agi","value":-3}
    ],
    cutinSkillName: "たけくらべ"
  },
  // heroId: 2037
  "sunce": {
    passiveKey: "sunce",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"enemy.foremost","action":"damage","coef":{"phy":0.15}},
      {"target":"enemy.foremost","action":"damage","coef":{"phy":0.15}},
      {"target":"enemy.foremost","action":"damage","coef":{"phy":0.15}},
      {"target":"enemy.foremost","action":"damage","coef":{"phy":0.15}},
      {"target":"enemy.foremost","action":"damage","coef":{"phy":0.15}},
      {"target":"self","action":"buffStat","stat":"phy","value":2}
    ],
    cutinSkillName: "長沙桓王"
  },
  // heroId: 2038
  "kiyomori": {
    passiveKey: "kiyomori",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"enemy.foremost","action":"damage","coef":{"phy":0.45}},
      {"target":"enemy.foremost","action":"buffStat","stat":"phy","value":-4}
    ],
    cutinSkillName: "治承三年の政変"
  },
  // heroId: 2039
  "dostoevsky": {
    passiveKey: "dostoevsky",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"buffStat","stat":"int","value":5},
      {"target":"self","action":"buffStat","stat":"agi","value":3}
    ],
    cutinSkillName: "カラマーゾフの兄弟"
  },
  // heroId: 2040
  "mulan": {
    passiveKey: "mulan",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"addGuard","value":6}
    ],
    cutinSkillName: "三綱五常"
  },
  // heroId: 2041
  "franklin": {
    passiveKey: "franklin",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"buffStat","stat":"phy","value":5},
      {"target":"self","action":"buffStat","stat":"int","value":5}
    ],
    cutinSkillName: "凧とライデン瓶の雷実験"
  },
  // heroId: 2042
  "gama": {
    passiveKey: "gama",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"self","action":"buffStat","stat":"agi","value":1},
      {"target":"self","action":"addGuard","value":6}
    ],
    cutinSkillName: "サン・ガブリエル"
  },
  // heroId: 2043
  "saizo": {
    passiveKey: "saizo",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"buffStat","stat":"int","value":5},
      {"target":"enemy.foremost","action":"buffStat","stat":"phy","value":-1},
      {"target":"enemy.foremost","action":"applyStatus","status":"poison","stacks":1}
    ],
    cutinSkillName: "忍術・毒霧"
  },
  // heroId: 2044
  "socrates": {
    passiveKey: "socrates",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"buffStat","stat":"int","value":3},
      {"target":"enemy.foremost","action":"buffStat","stat":"int","value":-4}
    ],
    cutinSkillName: "アレテー"
  },
  // heroId: 2045
  "daruma": {
    passiveKey: "daruma",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"enemy.foremost","action":"buffStat","stat":"agi","value":-2}
    ],
    cutinSkillName: "二入四行論"
  },
  // heroId: 2046
  "masako": {
    passiveKey: "masako",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"self","action":"buffStat","stat":"phy","value":1}
    ],
    cutinSkillName: "尼将軍"
  },
  // heroId: 2047
  "aristotle": {
    passiveKey: "aristotle",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"enemy.foremost","action":"damage","coef":{"int":0.45}}
    ],
    cutinSkillName: "アイテール"
  },
  // heroId: 2048
  "renoir": {
    passiveKey: "renoir",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"enemy.foremost","action":"damage","coef":{"int":0.2}}
    ],
    cutinSkillName: "ムーラン・ド・ラ・ギャレットの舞踏会"
  },
  // heroId: 2049
  "chopin": {
    passiveKey: "chopin",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"enemy.foremost","action":"buffStat","stat":"agi","value":-1},
      {"target":"enemy.foremost","action":"applyStatus","status":"bleed","stacks":1}
    ],
    cutinSkillName: "ワルツ9番 告別"
  },
  // heroId: 2050
  "ippatsuman": {
    passiveKey: "ippatsuman",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"buffStat","stat":"phy","value":5},
      {"target":"self","action":"addGuard","value":6}
    ],
    cutinSkillName: "逆転王、見参!!"
  },
  // heroId: 2051
  "armaroid": {
    passiveKey: "armaroid",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"self","action":"buffStat","stat":"int","value":2},
      {"target":"enemy.foremost","action":"applyStatus","status":"bleed","stacks":1}
    ],
    cutinSkillName: "ライブ・メタル"
  },
  // heroId: 2052
  "uka": {
    passiveKey: "uka",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"enemy.foremost","action":"damage","coef":{"int":0.33}}
    ],
    cutinSkillName: "遮二無二"
  },
  // heroId: 2053
  "ramon": {
    passiveKey: "ramon",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"enemy.foremost","action":"damage","coef":{"phy":0.55}},
      {"target":"self","action":"buffStat","stat":"phy","value":5}
    ],
    cutinSkillName: "タイマン"
  },
  // heroId: 3001
  "etheremon_red": {
    passiveKey: "etheremon_red",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"enemy.foremost","action":"damage","coef":{"phy":0.7}},
      {"target":"self","action":"buffStat","stat":"phy","value":6}
    ],
    cutinSkillName: "キャリスラッシュ"
  },
  // heroId: 3002
  "dartagnan": {
    passiveKey: "dartagnan",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"buffStat","stat":"phy","value":1},
      {"target":"self","action":"buffStat","stat":"int","value":1}
    ],
    cutinSkillName: "ワンフォーオール・オールフォーワン"
  },
  // heroId: 3003
  "gennai": {
    passiveKey: "gennai",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"enemy.foremost","action":"damage","coef":{"int":0.4}},
      {"target":"self","action":"buffStat","stat":"int","value":6}
    ],
    cutinSkillName: "エレキテル"
  },
  // heroId: 3004
  "mata_hari": {
    passiveKey: "mata_hari",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"enemy.foremost","action":"damage","coef":{"int":0.2}},
      {"target":"enemy.foremost","action":"buffStat","stat":"int","value":-1},
      {"target":"enemy.foremost","action":"applyStatus","status":"poison","stacks":2}
    ],
    cutinSkillName: "アイ・オブ・ザ・デイ"
  },
  // heroId: 3005
  "etheremon_blue": {
    passiveKey: "etheremon_blue",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"enemy.foremost","action":"damage","coef":{"int":0.5}},
      {"target":"self","action":"buffStat","stat":"int","value":5},
      {"target":"self","action":"buffStat","stat":"agi","value":5}
    ],
    cutinSkillName: "オムノンタクティクス"
  },
  // heroId: 3006
  "etheremon_green": {
    passiveKey: "etheremon_green",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"self","action":"heal","coef":{"int":0.3}},
      {"target":"self","action":"buffStat","stat":"phy","value":5},
      {"target":"self","action":"buffStat","stat":"int","value":5}
    ],
    cutinSkillName: "ミントルアート"
  },
  // heroId: 3007
  "nero": {
    passiveKey: "nero",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"buffStat","stat":"int","value":5}
    ],
    cutinSkillName: "暴君"
  },
  // heroId: 3008
  "nostradamus": {
    passiveKey: "nostradamus",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"enemy.foremost","action":"applyStatus","status":"poison","stacks":2}
    ],
    cutinSkillName: "大予言"
  },
  // heroId: 3009
  "taikoubou": {
    passiveKey: "taikoubou",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"buffStat","stat":"int","value":5}
    ],
    cutinSkillName: "六韜"
  },
  // heroId: 3010
  "hattori": {
    passiveKey: "hattori",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"heal","coef":{"int":1}}
    ],
    cutinSkillName: "伊賀越え"
  },
  // heroId: 3011
  "keiji": {
    passiveKey: "keiji",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"self","action":"buffStat","stat":"phy","value":1}
    ],
    cutinSkillName: "戦国一の傾奇者"
  },
  // heroId: 3012
  "shiro_amakusa": {
    passiveKey: "shiro_amakusa",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"enemy.foremost","action":"damage","coef":{"phy":0.45}},
      {"target":"enemy.foremost","action":"damage","coef":{"int":0.45}},
      {"target":"self","action":"buffStat","stat":"phy","value":6},
      {"target":"self","action":"buffStat","stat":"int","value":6},
      {"target":"self","action":"buffStat","stat":"agi","value":6}
    ],
    cutinSkillName: "島原の乱"
  },
  // heroId: 3013
  "goemon": {
    passiveKey: "goemon",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"enemy.foremost","action":"damage","coef":{"phy":0.2}},
      {"target":"self","action":"revive","coef":{"hpRatio":0.01}}
    ],
    cutinSkillName: "世に盗人の種は尽くまじ"
  },
  // heroId: 3014
  "kanetsugu": {
    passiveKey: "kanetsugu",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"enemy.foremost","action":"buffStat","stat":"phy","value":-1},
      {"target":"enemy.foremost","action":"buffStat","stat":"int","value":-1},
      {"target":"enemy.foremost","action":"applyStatus","status":"poison","stacks":2},
      {"target":"enemy.foremost","action":"applyStatus","status":"bleed","stacks":2}
    ],
    cutinSkillName: "直江状"
  },
  // heroId: 3015
  "ivan": {
    passiveKey: "ivan",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"enemy.foremost","action":"damage","coef":{"int":0.15}},
      {"target":"self","action":"buffStat","stat":"phy","value":2},
      {"target":"self","action":"buffStat","stat":"int","value":2}
    ],
    cutinSkillName: "ツァーリズム"
  },
  // heroId: 3016
  "basho": {
    passiveKey: "basho",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"self","action":"buffStat","stat":"agi","value":1}
    ],
    cutinSkillName: "おくのほそ道"
  },
  // heroId: 3017
  "sanzo": {
    passiveKey: "sanzo",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"self","action":"buffStat","stat":"int","value":1}
    ],
    cutinSkillName: "大唐西域記"
  },
  // heroId: 3018
  "benkei": {
    passiveKey: "benkei",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"revive","coef":{"hpRatio":0.01}}
    ],
    cutinSkillName: "弁慶の立往生"
  },
  // heroId: 3019
  "huangzhong": {
    passiveKey: "huangzhong",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"enemy.foremost","action":"buffStat","stat":"phy","value":-3},
      {"target":"enemy.foremost","action":"buffStat","stat":"agi","value":-2}
    ],
    cutinSkillName: "神箭手"
  },
  // heroId: 3020
  "diaochan": {
    passiveKey: "diaochan",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"enemy.foremost","action":"buffStat","stat":"phy","value":-1},
      {"target":"enemy.foremost","action":"buffStat","stat":"int","value":-1}
    ],
    cutinSkillName: "連環の計"
  },
  // heroId: 3021
  "valentinus": {
    passiveKey: "valentinus",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"self","action":"heal","coef":{"int":0.15}}
    ],
    cutinSkillName: "ヴァレンティヌスの祝福"
  },
  // heroId: 3022
  "pocahontas": {
    passiveKey: "pocahontas",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"self","action":"heal","coef":{"int":0.15}},
      {"target":"enemy.foremost","action":"buffStat","stat":"agi","value":-1}
    ],
    cutinSkillName: "ポウハタンの姫"
  },
  // heroId: 3023
  "sunjian": {
    passiveKey: "sunjian",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"enemy.foremost","action":"damage","coef":{"phy":0.5}},
      {"target":"self","action":"buffStat","stat":"phy","value":6},
      {"target":"self","action":"buffStat","stat":"agi","value":6}
    ],
    cutinSkillName: "江東猛虎"
  },
  // heroId: 3024
  "rubens": {
    passiveKey: "rubens",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"self","action":"buffStat","stat":"agi","value":5}
    ],
    cutinSkillName: "黄金の工房"
  },
  // heroId: 3025
  "yukimura": {
    passiveKey: "yukimura",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"enemy.foremost","action":"buffStat","stat":"phy","value":-5},
      {"target":"enemy.foremost","action":"buffStat","stat":"int","value":-5}
    ],
    cutinSkillName: "真田丸"
  },
  // heroId: 3026
  "robin_hood": {
    passiveKey: "robin_hood",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"enemy.foremost","action":"damage","coef":{"int":0.3}},
      {"target":"self","action":"heal","coef":{"int":0.3}},
      {"target":"self","action":"addGuard","value":6}
    ],
    cutinSkillName: "緑衣の義賊"
  },
  // heroId: 3027
  "yangduanhe": {
    passiveKey: "yangduanhe",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"buffStat","stat":"phy","value":4},
      {"target":"self","action":"buffStat","stat":"agi","value":4}
    ],
    cutinSkillName: "威風凛々"
  },
  // heroId: 3028
  "monet": {
    passiveKey: "monet",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"enemy.foremost","action":"applyStatus","status":"bleed","stacks":2}
    ],
    cutinSkillName: "睡蓮"
  },
  // heroId: 3029
  "mary_read": {
    passiveKey: "mary_read",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"enemy.foremost","action":"damage","coef":{"phy":1.2}}
    ],
    cutinSkillName: "一閃のカットラス"
  },
  // heroId: 3030
  "shakespeare": {
    passiveKey: "shakespeare",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"self","action":"buffStat","stat":"int","value":2},
      {"target":"enemy.foremost","action":"applyStatus","status":"bleed","stacks":2}
    ],
    cutinSkillName: "エイボンの吟遊詩人"
  },
  // heroId: 3031
  "earp": {
    passiveKey: "earp",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"buffStat","stat":"int","value":1},
      {"target":"enemy.foremost","action":"applyStatus","status":"poison","stacks":2}
    ],
    cutinSkillName: "不屈のガンマン"
  },
  // heroId: 3032
  "bonny": {
    passiveKey: "bonny",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"enemy.foremost","action":"damage","coef":{"int":1}},
      {"target":"self","action":"buffStat","stat":"int","value":3}
    ],
    cutinSkillName: "精緻のマスケット"
  },
  // heroId: 3034
  "percival": {
    passiveKey: "percival",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"heal","coef":{"int":0.6}},
      {"target":"self","action":"buffStat","stat":"agi","value":5}
    ],
    cutinSkillName: "聖杯探索"
  },
  // heroId: 3035
  "komachi": {
    passiveKey: "komachi",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"buffStat","stat":"phy","value":6},
      {"target":"self","action":"buffStat","stat":"int","value":6}
    ],
    cutinSkillName: "七小町"
  },
  // heroId: 3036
  "starr": {
    passiveKey: "starr",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"enemy.foremost","action":"damage","coef":{"int":0.7}}
    ],
    cutinSkillName: "山賊女王の伝説"
  },
  // heroId: 3037
  "magellan": {
    passiveKey: "magellan",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"buffStat","stat":"phy","value":2},
      {"target":"self","action":"revive","coef":{"hpRatio":0.01}}
    ],
    cutinSkillName: "受け継がれた世界一周"
  },
  // heroId: 3038
  "sasuke": {
    passiveKey: "sasuke",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"self","action":"buffStat","stat":"phy","value":2}
    ],
    cutinSkillName: "地雷火"
  },
  // heroId: 3039
  "lakshmibai": {
    passiveKey: "lakshmibai",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"buffStat","stat":"agi","value":1},
      {"target":"enemy.foremost","action":"buffStat","stat":"agi","value":-1}
    ],
    cutinSkillName: "メーレー・ジャーンシー・ナヒン・デーンゲー"
  },
  // heroId: 3040
  "gilgamesh": {
    passiveKey: "gilgamesh",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"heal","coef":{"int":1}}
    ],
    cutinSkillName: "フンババとの戦い"
  },
  // heroId: 3041
  "raphael": {
    passiveKey: "raphael",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"self","action":"buffStat","stat":"int","value":2}
    ],
    cutinSkillName: "システィーナの聖母"
  },
  // heroId: 3042
  "columbus": {
    passiveKey: "columbus",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"heal","coef":{"int":0.3}}
    ],
    cutinSkillName: "西廻り航路の夢"
  },
  // heroId: 3043
  "newton": {
    passiveKey: "newton",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"buffStat","stat":"agi","value":6},
      {"target":"enemy.foremost","action":"buffStat","stat":"agi","value":-5},
      {"target":"self","action":"addGuard","value":6}
    ],
    cutinSkillName: "万有引力"
  },
  // heroId: 3044
  "ieyasu": {
    passiveKey: "ieyasu",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"heal","coef":{"int":1}}
    ],
    cutinSkillName: "東照大権現"
  },
  // heroId: 3045
  "hajime": {
    passiveKey: "hajime",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"enemy.foremost","action":"damage","coef":{"phy":0.25}},
      {"target":"enemy.foremost","action":"applyStatus","status":"poison","stacks":2}
    ],
    cutinSkillName: "無敵の剣"
  },
  // heroId: 3046
  "maria_theresia": {
    passiveKey: "maria_theresia",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"enemy.foremost","action":"buffStat","stat":"agi","value":-1},
      {"target":"enemy.foremost","action":"applyStatus","status":"bleed","stacks":2}
    ],
    cutinSkillName: "七年戦争"
  },
  // heroId: 3047
  "attila": {
    passiveKey: "attila",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"buffStat","stat":"phy","value":4}
    ],
    cutinSkillName: "フン族の大王"
  },
  // heroId: 3048
  "machao": {
    passiveKey: "machao",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"self","action":"buffStat","stat":"phy","value":1}
    ],
    cutinSkillName: "五虎・左将軍"
  },
  // heroId: 3049
  "dongzhuo": {
    passiveKey: "dongzhuo",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"enemy.foremost","action":"buffStat","stat":"agi","value":-5},
      {"target":"enemy.foremost","action":"applyStatus","status":"poison","stacks":2},
      {"target":"self","action":"addGuard","value":6}
    ],
    cutinSkillName: "専横跋扈"
  },
  // heroId: 3050
  "maeve": {
    passiveKey: "maeve",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"heal","coef":{"int":0.25}},
      {"target":"enemy.foremost","action":"buffStat","stat":"phy","value":-3},
      {"target":"enemy.foremost","action":"buffStat","stat":"agi","value":-4}
    ],
    cutinSkillName: "女王のトリスケリオン"
  },
  // heroId: 3051
  "yoritomo": {
    passiveKey: "yoritomo",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"buffStat","stat":"phy","value":6}
    ],
    cutinSkillName: "天下の草創"
  },
  // heroId: 3052
  "casshern": {
    passiveKey: "casshern",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"enemy.foremost","action":"damage","coef":{"int":0.65}}
    ],
    cutinSkillName: "超破壊光線"
  },
  // heroId: 3053
  "crystal_boy": {
    passiveKey: "crystal_boy",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"self","action":"buffStat","stat":"agi","value":1},
      {"target":"self","action":"addShield","value":8}
    ],
    cutinSkillName: "ライブ・クリスタル"
  },
  // heroId: 3054
  "douran": {
    passiveKey: "douran",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"buffStat","stat":"phy","value":1}
    ],
    cutinSkillName: "花魁道中"
  },
  // heroId: 4001
  "zhangfei": {
    passiveKey: "zhangfei",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"revive","coef":{"hpRatio":0.01}}
    ],
    cutinSkillName: "一騎当千"
  },
  // heroId: 4002
  "nightingale": {
    passiveKey: "nightingale",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"self","action":"heal","coef":{"int":1}}
    ],
    cutinSkillName: "白衣の天使"
  },
  // heroId: 4003
  "beethoven": {
    passiveKey: "beethoven",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"enemy.foremost","action":"buffStat","stat":"phy","value":-2},
      {"target":"enemy.foremost","action":"buffStat","stat":"int","value":-2},
      {"target":"enemy.foremost","action":"buffStat","stat":"agi","value":-2}
    ],
    cutinSkillName: "歓喜の歌"
  },
  // heroId: 4004
  "kojiro": {
    passiveKey: "kojiro",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"self","action":"buffStat","stat":"agi","value":1}
    ],
    cutinSkillName: "燕返し"
  },
  // heroId: 4005
  "katsu_kaishu": {
    passiveKey: "katsu_kaishu",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"self","action":"buffStat","stat":"phy","value":3},
      {"target":"self","action":"buffStat","stat":"int","value":3}
    ],
    cutinSkillName: "無血開城"
  },
  // heroId: 4006
  "billy_kid": {
    passiveKey: "billy_kid",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"enemy.foremost","action":"damage","coef":{"int":0.4}}
    ],
    cutinSkillName: "ワンホールショット"
  },
  // heroId: 4007
  "edison": {
    passiveKey: "edison",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"self","action":"buffStat","stat":"int","value":3}
    ],
    cutinSkillName: "エジソン・エフェクト"
  },
  // heroId: 4008
  "marco_polo": {
    passiveKey: "marco_polo",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"heal","coef":{"int":0.7}},
      {"target":"enemy.foremost","action":"buffStat","stat":"phy","value":-4},
      {"target":"self","action":"revive","coef":{"hpRatio":0.01}}
    ],
    cutinSkillName: "東方見聞録"
  },
  // heroId: 4009
  "masamune": {
    passiveKey: "masamune",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"enemy.foremost","action":"damage","coef":{"int":1.4}}
    ],
    cutinSkillName: "独眼竜"
  },
  // heroId: 4010
  "ouki": {
    passiveKey: "ouki",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"buffStat","stat":"phy","value":7}
    ],
    cutinSkillName: "大将軍"
  },
  // heroId: 4011
  "marx": {
    passiveKey: "marx",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"buffStat","stat":"int","value":3},
      {"target":"enemy.foremost","action":"applyStatus","status":"bleed","stacks":3},
      {"target":"self","action":"revive","coef":{"hpRatio":0.01}}
    ],
    cutinSkillName: "資本論"
  },
  // heroId: 4012
  "okita": {
    passiveKey: "okita",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"enemy.foremost","action":"damage","coef":{"phy":0.5}},
      {"target":"enemy.foremost","action":"damage","coef":{"phy":0.5}},
      {"target":"enemy.foremost","action":"damage","coef":{"phy":0.5}}
    ],
    cutinSkillName: "三段突き"
  },
  // heroId: 4013
  "tchaikovsky": {
    passiveKey: "tchaikovsky",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"buffStat","stat":"agi","value":3},
      {"target":"self","action":"revive","coef":{"hpRatio":0.01}}
    ],
    cutinSkillName: "白鳥の湖"
  },
  // heroId: 4014
  "antoinette": {
    passiveKey: "antoinette",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"enemy.foremost","action":"damage","coef":{"int":0.25}},
      {"target":"enemy.foremost","action":"applyStatus","status":"poison","stacks":3}
    ],
    cutinSkillName: "ブリオッシュート"
  },
  // heroId: 4015
  "yang_guifei": {
    passiveKey: "yang_guifei",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"enemy.foremost","action":"buffStat","stat":"agi","value":-6}
    ],
    cutinSkillName: "傾国の美女"
  },
  // heroId: 4016
  "lubu": {
    passiveKey: "lubu",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"enemy.foremost","action":"damage","coef":{"phy":0.6}},
      {"target":"self","action":"buffStat","stat":"phy","value":1},
      {"target":"enemy.foremost","action":"applyStatus","status":"poison","stacks":3}
    ],
    cutinSkillName: "人中に呂布あり"
  },
  // heroId: 4017
  "curie": {
    passiveKey: "curie",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"self","action":"heal","coef":{"int":0.25}},
      {"target":"self","action":"buffStat","stat":"phy","value":1},
      {"target":"self","action":"addShield","value":8}
    ],
    cutinSkillName: "プチ・キュリー"
  },
  // heroId: 4018
  "sunquan": {
    passiveKey: "sunquan",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"buffStat","stat":"phy","value":2},
      {"target":"self","action":"buffStat","stat":"int","value":2},
      {"target":"self","action":"buffStat","stat":"agi","value":2},
      {"target":"self","action":"addGuard","value":6}
    ],
    cutinSkillName: "若き後継者"
  },
  // heroId: 4019
  "kamehameha": {
    passiveKey: "kamehameha",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"addShield","value":8}
    ],
    cutinSkillName: "ママラホエ・カナヴィ"
  },
  // heroId: 4020
  "calamity_jane": {
    passiveKey: "calamity_jane",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"enemy.foremost","action":"buffStat","stat":"phy","value":-1},
      {"target":"enemy.foremost","action":"buffStat","stat":"int","value":-1},
      {"target":"enemy.foremost","action":"buffStat","stat":"agi","value":-1}
    ],
    cutinSkillName: "法廷の疫病神"
  },
  // heroId: 4021
  "vangogh": {
    passiveKey: "vangogh",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"self","action":"buffStat","stat":"int","value":3},
      {"target":"enemy.foremost","action":"applyStatus","status":"poison","stacks":3}
    ],
    cutinSkillName: "ひまわり"
  },
  // heroId: 4022
  "tomoe": {
    passiveKey: "tomoe",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"enemy.foremost","action":"damage","coef":{"phy":0.3}}
    ],
    cutinSkillName: "最後のいくさしてみせ奉らん"
  },
  // heroId: 4023
  "zhaoyun": {
    passiveKey: "zhaoyun",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"enemy.foremost","action":"buffStat","stat":"int","value":-5},
      {"target":"enemy.foremost","action":"buffStat","stat":"agi","value":-5}
    ],
    cutinSkillName: "虎威将軍"
  },
  // heroId: 4024
  "yuefei": {
    passiveKey: "yuefei",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"self","action":"buffStat","stat":"phy","value":1}
    ],
    cutinSkillName: "尽忠報国"
  },
  // heroId: 4025
  "shingen": {
    passiveKey: "shingen",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"buffStat","stat":"phy","value":2},
      {"target":"self","action":"buffStat","stat":"agi","value":2}
    ],
    cutinSkillName: "風林火山"
  },
  // heroId: 4026
  "caesar": {
    passiveKey: "caesar",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"buffStat","stat":"phy","value":3},
      {"target":"enemy.foremost","action":"buffStat","stat":"int","value":-3}
    ],
    cutinSkillName: "来た、見た、勝った"
  },
  // heroId: 4027
  "hijikata": {
    passiveKey: "hijikata",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"self","action":"buffStat","stat":"phy","value":3},
      {"target":"enemy.foremost","action":"buffStat","stat":"agi","value":-1}
    ],
    cutinSkillName: "鬼の副長"
  },
  // heroId: 4028
  "darwin": {
    passiveKey: "darwin",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"enemy.foremost","action":"buffStat","stat":"phy","value":-6},
      {"target":"enemy.foremost","action":"buffStat","stat":"agi","value":-6}
    ],
    cutinSkillName: "種の起源"
  },
  // heroId: 4029
  "yamato_takeru": {
    passiveKey: "yamato_takeru",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"self","action":"buffStat","stat":"phy","value":1}
    ],
    cutinSkillName: "三種の神器"
  },
  // heroId: 4030
  "mozart": {
    passiveKey: "mozart",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"buffStat","stat":"phy","value":1}
    ],
    cutinSkillName: "アイネ・クライネ・ナハトムジーク"
  },
  // heroId: 4031
  "masakado": {
    passiveKey: "masakado",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"enemy.foremost","action":"damage","coef":{"phy":0.7}},
      {"target":"enemy.foremost","action":"applyStatus","status":"poison","stacks":3}
    ],
    cutinSkillName: "首塚伝説"
  },
  // heroId: 4032
  "kenshin": {
    passiveKey: "kenshin",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"buffStat","stat":"int","value":2},
      {"target":"self","action":"buffStat","stat":"agi","value":2}
    ],
    cutinSkillName: "毘沙門天の化身"
  },
  // heroId: 4033
  "lincoln": {
    passiveKey: "lincoln",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"enemy.foremost","action":"damage","coef":{"int":0.45}},
      {"target":"self","action":"heal","coef":{"int":0.5}}
    ],
    cutinSkillName: "奴隷解放宣言"
  },
  // heroId: 4034
  "satoshi_omega": {
    passiveKey: "satoshi_omega",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"self","action":"buffStat","stat":"phy","value":3},
      {"target":"self","action":"buffStat","stat":"agi","value":3}
    ],
    cutinSkillName: "マイニング OMEGA CC"
  },
  // heroId: 4035
  "kondo": {
    passiveKey: "kondo",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"self","action":"buffStat","stat":"phy","value":3},
      {"target":"enemy.foremost","action":"applyStatus","status":"poison","stacks":3}
    ],
    cutinSkillName: "長曽祢虎徹"
  },
  // heroId: 4036
  "blackbeard": {
    passiveKey: "blackbeard",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"self","action":"buffStat","stat":"agi","value":2},
      {"target":"enemy.foremost","action":"buffStat","stat":"agi","value":-2}
    ],
    cutinSkillName: "クイーン・アンズ・リベンジ"
  },
  // heroId: 4037
  "guanyu": {
    passiveKey: "guanyu",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"enemy.foremost","action":"damage","coef":{"phy":0.45}},
      {"target":"self","action":"buffStat","stat":"phy","value":2}
    ],
    cutinSkillName: "過五関斬六将"
  },
  // heroId: 4038
  "brynhildr": {
    passiveKey: "brynhildr",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"buffStat","stat":"phy","value":7},
      {"target":"self","action":"buffStat","stat":"agi","value":7}
    ],
    cutinSkillName: "冥府への旅"
  },
  // heroId: 4039
  "saigo": {
    passiveKey: "saigo",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"enemy.foremost","action":"buffStat","stat":"int","value":-4},
      {"target":"enemy.foremost","action":"applyStatus","status":"bleed","stacks":3}
    ],
    cutinSkillName: "田原坂"
  },
  // heroId: 4040
  "hanxin": {
    passiveKey: "hanxin",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"enemy.foremost","action":"damage","coef":{"phy":1.2}}
    ],
    cutinSkillName: "国士無双"
  },
  // heroId: 4041
  "tesla": {
    passiveKey: "tesla",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"self","action":"buffStat","stat":"phy","value":3},
      {"target":"enemy.foremost","action":"applyStatus","status":"poison","stacks":3}
    ],
    cutinSkillName: "テスラコイル"
  },
  // heroId: 4042
  "buddha": {
    passiveKey: "buddha",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"buffStat","stat":"int","value":1},
      {"target":"self","action":"buffStat","stat":"agi","value":2}
    ],
    cutinSkillName: "悟り"
  },
  // heroId: 4043
  "atom": {
    passiveKey: "atom",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"self","action":"buffStat","stat":"phy","value":1}
    ],
    cutinSkillName: "10万馬力"
  },
  // heroId: 4044
  "fabre": {
    passiveKey: "fabre",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"buffStat","stat":"phy","value":7}
    ],
    cutinSkillName: "動物行動学"
  },
  // heroId: 4045
  "lancelot": {
    passiveKey: "lancelot",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"buffStat","stat":"phy","value":1},
      {"target":"self","action":"buffStat","stat":"agi","value":2}
    ],
    cutinSkillName: "湖の騎士"
  },
  // heroId: 4046
  "rasputin": {
    passiveKey: "rasputin",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"self","action":"buffStat","stat":"phy","value":1}
    ],
    cutinSkillName: "ロシアの怪僧"
  },
  // heroId: 4047
  "hannibal": {
    passiveKey: "hannibal",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"self","action":"buffStat","stat":"phy","value":1}
    ],
    cutinSkillName: "豊穣神バアルの雷光"
  },
  // heroId: 4048
  "zhouyu": {
    passiveKey: "zhouyu",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"enemy.foremost","action":"applyStatus","status":"poison","stacks":3}
    ],
    cutinSkillName: "赤壁の戦い"
  },
  // heroId: 4049
  "xiahoudun": {
    passiveKey: "xiahoudun",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"enemy.foremost","action":"damage","coef":{"int":0.35}},
      {"target":"enemy.foremost","action":"damage","coef":{"int":0.35}},
      {"target":"enemy.foremost","action":"damage","coef":{"int":0.35}},
      {"target":"enemy.foremost","action":"damage","coef":{"int":0.35}}
    ],
    cutinSkillName: "隻眼の豪傑"
  },
  // heroId: 4050
  "simayi": {
    passiveKey: "simayi",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"buffStat","stat":"agi","value":7}
    ],
    cutinSkillName: "戦術五事"
  },
  // heroId: 4051
  "rama": {
    passiveKey: "rama",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"enemy.foremost","action":"buffStat","stat":"phy","value":-2},
      {"target":"enemy.foremost","action":"buffStat","stat":"int","value":-2},
      {"target":"enemy.foremost","action":"buffStat","stat":"agi","value":-2}
    ],
    cutinSkillName: "マハー・アヴァターラ"
  },
  // heroId: 4052
  "drake": {
    passiveKey: "drake",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"buffStat","stat":"agi","value":4}
    ],
    cutinSkillName: "女王直属海賊"
  },
  // heroId: 4053
  "tell": {
    passiveKey: "tell",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"enemy.foremost","action":"damage","coef":{"int":1}},
      {"target":"self","action":"buffStat","stat":"int","value":6}
    ],
    cutinSkillName: "解放の一矢"
  },
  // heroId: 4054
  "michizane": {
    passiveKey: "michizane",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"enemy.foremost","action":"damage","coef":{"int":1.1}},
      {"target":"enemy.foremost","action":"applyStatus","status":"poison","stacks":3}
    ],
    cutinSkillName: "天満大自在天神"
  },
  // heroId: 4055
  "tadakatsu": {
    passiveKey: "tadakatsu",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"self","action":"buffStat","stat":"phy","value":7},
      {"target":"self","action":"buffStat","stat":"agi","value":7},
      {"target":"self","action":"addGuard","value":6}
    ],
    cutinSkillName: "花実兼備"
  },
  // heroId: 4056
  "soseki": {
    passiveKey: "soseki",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"buffStat","stat":"phy","value":7},
      {"target":"self","action":"buffStat","stat":"int","value":7},
      {"target":"self","action":"buffStat","stat":"agi","value":7}
    ],
    cutinSkillName: "日月切落、天地粉韲"
  },
  // heroId: 4057
  "boudica": {
    passiveKey: "boudica",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"buffStat","stat":"phy","value":1}
    ],
    cutinSkillName: "イケニ族の女王"
  },
  // heroId: 4058
  "yatterman": {
    passiveKey: "yatterman",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"enemy.foremost","action":"damage","coef":{"int":0.25}},
      {"target":"enemy.foremost","action":"applyStatus","status":"bleed","stacks":3}
    ],
    cutinSkillName: "ケンダマジック & シビレステッキ"
  },
  // heroId: 4059
  "cobra": {
    passiveKey: "cobra",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"self","action":"buffStat","stat":"int","value":6}
    ],
    cutinSkillName: "サイコガン"
  },
  // heroId: 4060
  "suzuishi": {
    passiveKey: "suzuishi",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"enemy.foremost","action":"damage","coef":{"phy":0.3}},
      {"target":"self","action":"buffStat","stat":"phy","value":7}
    ],
    cutinSkillName: "鳴響止水"
  },
  // heroId: 4061
  "tyrfing": {
    passiveKey: "tyrfing",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"enemy.foremost","action":"damage","coef":{"phy":0.225}},
      {"target":"self","action":"addShield","value":8}
    ],
    cutinSkillName: "ショックトゥキル"
  },
  // heroId: 5001
  "nobunaga": {
    passiveKey: "nobunaga",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"enemy.foremost","action":"damage","coef":{"phy":1.75}}
    ],
    cutinSkillName: "天下布武"
  },
  // heroId: 5002
  "napoleon": {
    passiveKey: "napoleon",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"enemy.foremost","action":"damage","coef":{"int":1.75}}
    ],
    cutinSkillName: "コルシカの悪魔"
  },
  // heroId: 5003
  "caocao": {
    passiveKey: "caocao",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"self","action":"buffStat","stat":"phy","value":1}
    ],
    cutinSkillName: "乱世の奸雄"
  },
  // heroId: 5004
  "washington": {
    passiveKey: "washington",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"self","action":"buffStat","stat":"int","value":3},
      {"target":"self","action":"buffStat","stat":"agi","value":3}
    ],
    cutinSkillName: "1stプレジデント"
  },
  // heroId: 5005
  "davinci": {
    passiveKey: "davinci",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"enemy.foremost","action":"damage","coef":{"int":0.8}}
    ],
    cutinSkillName: "モナリザ"
  },
  // heroId: 5006
  "arthur": {
    passiveKey: "arthur",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"enemy.foremost","action":"damage","coef":{"phy":0.5}},
      {"target":"self","action":"heal","coef":{"int":0.3}}
    ],
    cutinSkillName: "エクスカリバー"
  },
  // heroId: 5007
  "jeanne": {
    passiveKey: "jeanne",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"buffStat","stat":"phy","value":2},
      {"target":"enemy.foremost","action":"buffStat","stat":"agi","value":-1},
      {"target":"self","action":"addGuard","value":6}
    ],
    cutinSkillName: "オルレアンの乙女"
  },
  // heroId: 5008
  "ryoma": {
    passiveKey: "ryoma",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"enemy.foremost","action":"damage","coef":{"int":0.2}},
      {"target":"self","action":"heal","coef":{"int":0.4}},
      {"target":"self","action":"buffStat","stat":"int","value":1}
    ],
    cutinSkillName: "海援隊"
  },
  // heroId: 5009
  "liubei": {
    passiveKey: "liubei",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"self","action":"buffStat","stat":"phy","value":3},
      {"target":"self","action":"buffStat","stat":"int","value":3},
      {"target":"self","action":"buffStat","stat":"agi","value":2}
    ],
    cutinSkillName: "三顧の礼"
  },
  // heroId: 5010
  "einstein": {
    passiveKey: "einstein",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"self","action":"buffStat","stat":"phy","value":3},
      {"target":"self","action":"buffStat","stat":"agi","value":3}
    ],
    cutinSkillName: "相対性理論"
  },
  // heroId: 5011
  "himiko": {
    passiveKey: "himiko",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"enemy.foremost","action":"buffStat","stat":"int","value":-5}
    ],
    cutinSkillName: "鬼道"
  },
  // heroId: 5012
  "bach": {
    passiveKey: "bach",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"self","action":"buffStat","stat":"phy","value":1},
      {"target":"self","action":"buffStat","stat":"int","value":1},
      {"target":"self","action":"buffStat","stat":"agi","value":1}
    ],
    cutinSkillName: "バロック"
  },
  // heroId: 5013
  "chinggis": {
    passiveKey: "chinggis",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"enemy.foremost","action":"damage","coef":{"phy":0.4}}
    ],
    cutinSkillName: "蒼狼"
  },
  // heroId: 5014
  "charlemagne": {
    passiveKey: "charlemagne",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"self","action":"buffStat","stat":"int","value":3},
      {"target":"enemy.foremost","action":"buffStat","stat":"int","value":-3}
    ],
    cutinSkillName: "キングオブハート"
  },
  // heroId: 5015
  "kongming": {
    passiveKey: "kongming",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"enemy.foremost","action":"buffStat","stat":"phy","value":-7},
      {"target":"enemy.foremost","action":"buffStat","stat":"int","value":-7},
      {"target":"enemy.foremost","action":"buffStat","stat":"agi","value":-7},
      {"target":"enemy.foremost","action":"applyStatus","status":"poison","stacks":4}
    ],
    cutinSkillName: "死せる孔明生ける仲達を走らす"
  },
  // heroId: 5016
  "cleopatra": {
    passiveKey: "cleopatra",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"enemy.foremost","action":"buffStat","stat":"agi","value":-2}
    ],
    cutinSkillName: "戦乱を呼ぶ美貌"
  },
  // heroId: 5017
  "alexander": {
    passiveKey: "alexander",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"buffStat","stat":"phy","value":9},
      {"target":"self","action":"buffStat","stat":"int","value":9},
      {"target":"self","action":"buffStat","stat":"agi","value":9}
    ],
    cutinSkillName: "征服王の偉業"
  },
  // heroId: 5018
  "qinshihuang": {
    passiveKey: "qinshihuang",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"buffStat","stat":"agi","value":9},
      {"target":"enemy.foremost","action":"buffStat","stat":"agi","value":-7}
    ],
    cutinSkillName: "中国統一"
  },
  // heroId: 5019
  "yoshitsune": {
    passiveKey: "yoshitsune",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"self","action":"buffStat","stat":"agi","value":2},
      {"target":"enemy.foremost","action":"buffStat","stat":"phy","value":-2},
      {"target":"enemy.foremost","action":"applyStatus","status":"poison","stacks":4}
    ],
    cutinSkillName: "鵯越の逆落とし"
  },
  // heroId: 5020
  "tutankhamun": {
    passiveKey: "tutankhamun",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"enemy.foremost","action":"damage","coef":{"phy":0.8}}
    ],
    cutinSkillName: "ファラオの呪い"
  },
  // heroId: 5021
  "seimei": {
    passiveKey: "seimei",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"enemy.foremost","action":"buffStat","stat":"int","value":-2},
      {"target":"enemy.foremost","action":"applyStatus","status":"bleed","stacks":4}
    ],
    cutinSkillName: "急急如律令"
  },
  // heroId: 5022
  "guji": {
    passiveKey: "guji",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"enemy.foremost","action":"buffStat","stat":"phy","value":-5}
    ],
    cutinSkillName: "破滅哀歌"
  },
  // heroId: 5023
  "richard": {
    passiveKey: "richard",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"self","action":"buffStat","stat":"phy","value":3},
      {"target":"enemy.foremost","action":"buffStat","stat":"phy","value":-3},
      {"target":"enemy.foremost","action":"applyStatus","status":"bleed","stacks":4}
    ],
    cutinSkillName: "騎士道の華"
  },
  // heroId: 5024
  "hokusai": {
    passiveKey: "hokusai",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"self","action":"heal","coef":{"int":0.05}},
      {"target":"self","action":"buffStat","stat":"phy","value":1},
      {"target":"self","action":"buffStat","stat":"int","value":9}
    ],
    cutinSkillName: "富嶽三十六景"
  },
  // heroId: 5025
  "xiangyu": {
    passiveKey: "xiangyu",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"enemy.foremost","action":"damage","coef":{"phy":0.45}},
      {"target":"enemy.foremost","action":"damage","coef":{"int":0.45}},
      {"target":"self","action":"buffStat","stat":"phy","value":8},
      {"target":"self","action":"buffStat","stat":"int","value":8},
      {"target":"enemy.foremost","action":"buffStat","stat":"phy","value":-3}
    ],
    cutinSkillName: "西楚の覇王"
  },
  // heroId: 5026
  "liubang": {
    passiveKey: "liubang",
    trigger: "combat.started",
    triggerRate: 1,
    oncePerCombat: true,
    effects: [
      {"target":"enemy.foremost","action":"buffStat","stat":"agi","value":-7}
    ],
    cutinSkillName: "龍顔の高祖"
  },
  // heroId: 5027
  "galileo": {
    passiveKey: "galileo",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"enemy.foremost","action":"damage","coef":{"phy":0.2}},
      {"target":"enemy.foremost","action":"damage","coef":{"int":1}},
      {"target":"self","action":"buffStat","stat":"int","value":8}
    ],
    cutinSkillName: "天文対話"
  },
  // heroId: 5028
  "yoichi": {
    passiveKey: "yoichi",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"self","action":"buffStat","stat":"phy","value":7},
      {"target":"enemy.foremost","action":"applyStatus","status":"bleed","stacks":4}
    ],
    cutinSkillName: "南無八幡大菩薩"
  },
  // heroId: 5029
  "black_prince": {
    passiveKey: "black_prince",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"enemy.foremost","action":"damage","coef":{"phy":0.2}},
      {"target":"self","action":"buffStat","stat":"agi","value":3}
    ],
    cutinSkillName: "ポワティエの戦い"
  },
  // heroId: 5030
  "wuzetian": {
    passiveKey: "wuzetian",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"self","action":"buffStat","stat":"int","value":4},
      {"target":"enemy.foremost","action":"applyStatus","status":"bleed","stacks":4},
      {"target":"self","action":"addGuard","value":6}
    ],
    cutinSkillName: "聖神皇帝"
  },
  // heroId: 5031
  "scipio": {
    passiveKey: "scipio",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"self","action":"addGuard","value":6}
    ],
    cutinSkillName: "クイントカントゥス"
  },
  // heroId: 5032
  "musashi": {
    passiveKey: "musashi",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"self","action":"buffStat","stat":"phy","value":1}
    ],
    cutinSkillName: "二天一流"
  },
  // heroId: 5033
  "yatagarasu": {
    passiveKey: "yatagarasu",
    trigger: "self.cardPlayed",
    triggerRate: 0.4,
    oncePerCombat: false,
    effects: [
      {"target":"enemy.foremost","action":"damage","coef":{"phy":0.35}},
      {"target":"enemy.foremost","action":"damage","coef":{"int":0.35}}
    ],
    cutinSkillName: "心眼一閃"
  },
};

