import type {GameState,MergePlan} from '../domain/game'
import type {EffectContext} from '../domain/special'
import {geneticsForGroup} from '../core/attributes/effects'
import {ATTRIBUTE_LABELS} from './attributeLabels'
import {AttributeTokens} from './AttributeBadges'
export function MergeAttributePreview({plan,game,context}:{plan:MergePlan;game:GameState;context:EffectContext}){
 const warning=plan.groups.some(g=>g.awakening?.surplus.length)
 return <div style={{position:'fixed',left:'50%',top:plan.target.y>=game.bounds.height/2?66:'auto',bottom:plan.target.y<game.bounds.height/2?8:'auto'}} className={`operation-preview merge-attribute-preview ${plan.groups.length>2?'many-groups':''}`} data-testid="attribute-preview"><strong>マージ → Tier {plan.outputTier}</strong>{warning&&<small>警告中もマージはそのまま実行できます。</small>}{plan.groups.map(g=>{const risk=geneticsForGroup(game,g.consumedIds,context);return <section key={g.number} data-testid={`merge-group-${g.number}`}><small>組{g.number} ×{g.outputs.length}：<AttributeTokens attributes={g.attributes}/> · 変異 仮{(risk.mutationChance*100).toFixed(1)}%</small>{g.awakening&&<small>{g.awakening.outputs.map((ids,i)=><span key={i}>第{i+1}{plan.groups.length>2?'':'出力'}：{ids.length?ids.map(id=>'★'+ATTRIBUTE_LABELS[id]).join('・'):'覚醒なし'} </span>)}</small>}{g.awakening?.surplus.length? <p className="awakening-warning" data-testid="awakening-warning">組{g.number} 警告：{g.awakening.surplus.map(a=>`${ATTRIBUTE_LABELS[a.id]}の覚醒が${a.count}個`).join('、')}失われます。</p>:null}{risk.darkLossChance>0&&<b className="dark-risk" data-testid="dark-risk">闇のみ消失 仮{risk.darkLossChance*100}%/組{g.outputs.length===2?'（2出力共通）':''}。覚醒分配は闇が残る場合。闇の覚醒も同時に失います。</b>}</section>})}<small>余剰は確定・闇は確率抽選。抽選は確定時のみ。</small></div>
}
