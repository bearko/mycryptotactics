/**
 * caster.js — SPEC-006 Phase 4b: カードキャスター解決とプレイ可否判定
 *
 * 純粋関数のみ。DOM / 副作用なし。card schema の `caster: CasterRole` (SPEC-006 §5)
 * を読んで、戦闘状態 `combat` から実ヒーロー Unit を返す。
 */

import { foremostAlive, rearmostAlive, pickByMax } from "./targeting.js";

/**
 * カード定義の `caster` ロールから Unit を解決する。
 * @param {string|undefined} role  SPEC-006 §5 の識別子。未指定は "foremost" 扱い。
 * @param {{heroes: any[]}} s      戦闘状態
 * @returns {object|null}          生存している該当ヒーロー、不在なら null
 */
export function resolveCaster(role, s) {
  const heroes = (s && Array.isArray(s.heroes)) ? s.heroes : [];
  const aliveAtFixed = (idx) => {
    const h = heroes[idx];
    return h && h.alive !== false && (h.hp ?? 0) > 0 ? h : null;
  };
  switch (role) {
    case "front":       return aliveAtFixed(0);
    case "mid":         return aliveAtFixed(1);
    case "back":        return aliveAtFixed(2);
    case "foremost":    return foremostAlive(heroes);
    case "rearmost":    return rearmostAlive(heroes);
    case "highest_phy": return pickByMax(heroes, h => h.phy ?? 0);
    case "highest_int": return pickByMax(heroes, h => h.int ?? 0);
    case "highest_hp":  return pickByMax(heroes, h => h.hp ?? 0);
    default:            return foremostAlive(heroes); // 未指定 / 不明はフォールバック
  }
}

/** カードがプレイ可能か。コスト + キャスター不在の 2 条件を判定。 */
export function canPlayCard(card, s) {
  if (!card || !s) return false;
  if ((card.cost ?? 0) > (s.energy ?? 0)) return false;
  if (resolveCaster(card.caster, s) == null) return false;
  return true;
}

/**
 * プレイ不能の理由を返す（UI のグレーアウト原因バッジに使う）。
 * @returns {'energy'|'caster'|null} 両方ダメなら 'energy' を優先。
 */
export function unplayableReason(card, s) {
  if (!card || !s) return null;
  if ((card.cost ?? 0) > (s.energy ?? 0)) return "energy";
  if (resolveCaster(card.caster, s) == null) return "caster";
  return null;
}

/**
 * バッジ用の短ラベルとツールチップ文字列のペアを返す。
 * @returns {{badge: string, title: string} | null}
 */
export function unplayableBadge(card, s) {
  const reason = unplayableReason(card, s);
  if (reason === "energy") {
    return {
      badge: "⚡不足",
      title: `エナジーが ${card.cost} 必要ですが ${s.energy ?? 0} しかありません`,
    };
  }
  if (reason === "caster") {
    const role = card?.caster ?? "foremost";
    const roleLabel = CASTER_ROLE_LABELS[role] || role;
    return {
      badge: "👤不在",
      title: `キャスター「${roleLabel}」が解決できません（該当ヒーロー全員死亡）`,
    };
  }
  return null;
}

/** バトル外の券面で「キャスターロール」を日本語表示するためのラベル。 */
export const CASTER_ROLE_LABELS = {
  front: "前衛",
  mid: "中衛",
  back: "後衛",
  foremost: "先頭",
  rearmost: "最後尾",
  highest_phy: "高PHY",
  highest_int: "高INT",
  highest_hp: "高HP",
};
