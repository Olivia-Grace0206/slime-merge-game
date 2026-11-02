import {AWAKENED_DARK_LOSS} from '../core/special/config'
import type { Slime } from '../domain/game'
import { attributePower, EFFECTS, comboPower } from '../core/attributes/effects'
const pct = (n: number) => `${(n*100).toFixed(1)}%`
export function effectLabels(slime: Slime): readonly string[] {
  const a = slime.attributes
  const labels = (a ?? []).map(attr => {
    const p = attributePower(a,attr.id)
    switch(attr.id) {
      case 'fire': return `炎Lv${attr.level}：売却に+${Math.ceil(2**slime.tier*EFFECTS.fireRate*p)} GOLD加算`
      case 'gold': return `黄金Lv${attr.level}：売却×${(1+EFFECTS.goldRate*p).toFixed(2)}`
      case 'dark': return `闇Lv${attr.level}：売却×${(1+EFFECTS.darkRate*p).toFixed(2)}・マージ時に闇だけ${attr.awakened?AWAKENED_DARK_LOSS*100:20}%消失（組単位）`
      case 'ice': return `氷Lv${attr.level}：配置中、通常生成時間−${pct(EFFECTS.iceRate*p)}（合計上限25%）`
      case 'lightning': return `雷Lv${attr.level}：配置中、クリック短縮+${pct(EFFECTS.lightningRate*p)}（合計上限50%）`
      case 'nature': return `自然Lv${attr.level}：配置中、単体約${(EFFECTS.natureBaseMs/p/1000).toFixed(0)}秒で貯蔵へ1体（全体最短40秒・満杯停止）`
      case 'luck': return `幸運Lv${attr.level}：配置中、通常属性率+${pct(EFFECTS.luckRate*p)}・属性重視は補正4倍（全体上限あり）`
      case 'mutation': return `変異Lv${attr.level}：マージ参加時、新属性獲得率+${pct(EFFECTS.mutationRate*p)}（組全体最大6%・空き属性枠のみ）`
      case 'light': return `光Lv${attr.level}：周囲8マスの支援+${pct(EFFECTS.lightRate*p)}（合計上限25%・連鎖なし）`
      case 'magnet': return `磁力Lv${attr.level}：周囲2マスの特殊マス位置を誘引（隣接重み+${(EFFECTS.magnetRate*p).toFixed(2)}・上限4倍、頻度は不変）`
    }
  })
  if(comboPower(a,'fire','gold')) labels.push(`複合：炎＋黄金で売却さらに+${pct(EFFECTS.saleComboRate*comboPower(a,'fire','gold'))}（倍率へ一度だけ適用）`)
  if(comboPower(a,'ice','lightning')) labels.push(`複合：氷＋雷で生成時間さらに−${pct(EFFECTS.iceComboRate*comboPower(a,'ice','lightning'))}・クリック短縮さらに+${pct(EFFECTS.tapComboRate*comboPower(a,'ice','lightning'))}`)
  if(comboPower(a,'luck','mutation')) labels.push(`複合：幸運＋変異で通常属性率さらに+${pct(EFFECTS.luckComboRate*comboPower(a,'luck','mutation'))}ポイント・マージ変異率さらに+${pct(EFFECTS.mutationComboRate*comboPower(a,'luck','mutation'))}ポイント`)
  return labels
}
