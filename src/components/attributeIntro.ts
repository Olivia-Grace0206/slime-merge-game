import type { AttributeId } from '../domain/attributes'

/** Concise, player-facing descriptions. Full formulas belong only to the detail view. */
export const ATTRIBUTE_INTRO: Readonly<Record<AttributeId, string>> = {
  fire: '売るときのGOLDを加算',
  gold: '売却額を倍率で増やす',
  dark: '高額売却・消失リスク',
  ice: '通常の生成時間を短縮',
  lightning: 'タップの加速量を増やす',
  nature: '貯蔵へ追加で自動生成',
  luck: '属性付きの生成率UP',
  mutation: 'マージ時の変異率UP',
  light: '周囲のスライムを支援',
  magnet: '特殊マスを近くへ誘引',
}
