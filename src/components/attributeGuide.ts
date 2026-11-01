import { ATTRIBUTE_IDS, EXPERIMENTAL_ATTRIBUTES, type AttributeId } from '../domain/attributes'
import { EFFECTS, levelPower } from '../core/attributes/effects'
import { GENERATION_PACE } from '../core/progression/economy'
import { ATTRIBUTE_LABELS } from './attributeLabels'
export const percent=(n:number)=>`${Number((n*100).toFixed(3))}%`
export type GuideEntry=Readonly<{id:AttributeId;name:string;condition:string;effect:string;growth:string;limit:string;note:string}>
/** Numeric copy derives from the same configuration used by production Core. */
export function attributeGuide():readonly GuideEntry[]{
 const p='p(L)=1+'+EFFECTS.levelSlope+'×log₂(L)'
 const growth=`属性Lvは${p}で逓減強化。Lv1=${levelPower(1).toFixed(2)}、Lv5=${levelPower(5).toFixed(2)}、Lv10=${levelPower(10).toFixed(2)}。`
 const data:Record<AttributeId,Omit<GuideEntry,'id'|'name'|'growth'>>={
  fire:{condition:'売却時',effect:`基本売値B=2^Tierにceil(B×${EFFECTS.fireRate}×p) GOLDを加算。Lv1は基本値の約${percent(EFFECTS.fireRate)}。`,limit:'最後に切り捨て。GOLDの空き額・安全整数が上限。',note:'GOLDマス10回報酬へは売却補正を掛けません。'},
  gold:{condition:'売却時',effect:`加算後の売値を×(1+${EFFECTS.goldRate}×p)。Lv1は×${1+EFFECTS.goldRate}。`,limit:'GOLDの空き額・安全整数が上限。',note:'炎とは加算後に乗算。GOLDマス報酬は別計算。'},
  dark:{condition:'売却時・マージ時',effect:`売値×(1+${EFFECTS.darkRate}×p)。Lv1は×${1+EFFECTS.darkRate}。継承した闇だけマージ時に${percent(EFFECTS.darkLossChance)}/組で消失。`,limit:'5体の2出力は共通判定。スライム本体・Tier・他属性・出力数は失いません。',note:'リスクは確定前に予告。新たに変異で得た闇は直後に消失させません。'},
  ice:{condition:'盤面配置中',effect:`通常生成時間を${percent(EFFECTS.iceRate)}×有効pずつ短縮（Lv1単体）。`,limit:`全体の短縮率上限${percent(EFFECTS.iceCap)}。クリック加速とは別。`,note:'周囲の光・氷＋雷の複合を合算してから上限。間隔変更時は進捗率を保持。'},
  lightning:{condition:'盤面配置中・クリック時',effect:`クリック短縮量を${percent(EFFECTS.lightningRate)}×有効pずつ増加。`,limit:`全体補正上限${percent(EFFECTS.lightningCap)}。1クリックは最終生成間隔の${percent(GENERATION_PACE.maxTapIntervalFraction)}まで。`,note:'自然生成の間隔は直接変えません。光・氷＋雷の複合を含めて上限。'},
  nature:{condition:'盤面配置中',effect:`追加生成間隔=round(${EFFECTS.natureBaseMs/1000}秒÷盤面の有効p合計)。Lv1単体は${EFFECTS.natureBaseMs/1000}秒。`,limit:`全体最短${EFFECTS.natureMinimumMs/1000}秒。満杯・配置0体で停止。`,note:'通常生成後の空き貯蔵へ送る独立の追加生産。発見済みTierと通常属性率で抽選、素材還元ではありません。'},
  luck:{condition:'盤面配置中',effect:`通常属性率へ${percent(EFFECTS.luckRate)}ポイント×有効pを加算。属性重視は補正${EFFECTS.focusLuckScale}倍。`,limit:`複合込み補正上限${percent(EFFECTS.luckCap)}ポイント、通常率最大${percent(EFFECTS.normalChanceCap)}、重視率最大${percent(EFFECTS.focusChanceCap)}。`,note:`基本は通常${percent(EFFECTS.normalChance)}／重視${percent(EFFECTS.focusChance)}、確定保証なし。現係数での重視最大は${percent(Math.min(EFFECTS.focusChanceCap,EFFECTS.focusChance+EFFECTS.luckCap*EFFECTS.focusLuckScale))}。`},
  mutation:{condition:'マージ参加時',effect:`新属性変異率=基本${percent(EFFECTS.mutationBase)}+参加個体の有効pの最大値×${percent(EFFECTS.mutationRate)}+複合補正。`,limit:`組全体上限${percent(EFFECTS.mutationCap)}、${EXPERIMENTAL_ATTRIBUTES.maxCount}属性が埋まっていれば見送り。`,note:'入力数の合計で加算しないため5体専用優遇なし。確定的な同Lv継承とは別に、新属性1種を追加。'},
  light:{condition:'周囲8マスの配置中個体へ',effect:`近隣の生のp×${percent(EFFECTS.lightRate)}で支援属性を増幅。`,limit:`受け手の全体増幅上限${percent(EFFECTS.lightCap)}。一段だけで再帰なし。`,note:'氷・雷・自然・幸運・変異・磁力を支援。光自身と売却属性には適用しません。'},
  magnet:{condition:'盤面配置中・特殊マス位置抽選時',effect:`周囲${EFFECTS.magnetRadius}マスに重み${EFFECTS.magnetRate}×有効p÷距離を加算（基礎1）。`,limit:`合計重み最大${EFFECTS.magnetWeightCap}倍。空きセルのみ。`,note:'出現総数・頻度は増やしません。GOLD未解放では発生なし。紫・青は未実装。'},
 }
 return ATTRIBUTE_IDS.map(id=>({id,name:ATTRIBUTE_LABELS[id],growth,...data[id]}))
}
export const COMBINATIONS=[
 {ids:['fire','gold'] as const,name:'炎＋黄金：売却特化',description:()=>`2属性の小さいpをCとして、売却最後に×(1+${EFFECTS.saleComboRate}×C)。Lv1はさらに${percent(EFFECTS.saleComboRate)}。`},
 {ids:['ice','lightning'] as const,name:'氷＋雷：生成とクリック連携',description:()=>`小さい有効pをCとして、通常生成短縮へ${percent(EFFECTS.iceComboRate)}×C、クリック補正へ${percent(EFFECTS.tapComboRate)}×Cを加算。全体${percent(EFFECTS.iceCap)}/${percent(EFFECTS.lightningCap)}の上限内。`},
 {ids:['luck','mutation'] as const,name:'幸運＋変異：属性育成',description:()=>`小さい有効pをCとして、通常属性率へ${percent(EFFECTS.luckComboRate)}ポイント×C、マージ変異率へ${percent(EFFECTS.mutationComboRate)}ポイント×参加個体の最大Cを加算。重視は幸運補正${EFFECTS.focusLuckScale}倍、変異は組最大${percent(EFFECTS.mutationCap)}。`},
]
