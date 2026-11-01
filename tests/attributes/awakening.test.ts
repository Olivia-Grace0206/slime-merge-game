import {describe,it,expect} from 'vitest'
import {allocateAwakenings,withAwakenings,awakeningCandidates} from '../../src/core/attributes/awakening'
import {isAttributes,type Attributes,type AttributeId} from '../../src/domain/attributes'
import {planDrop} from '../../src/core/merge/plan'
import {applyPlan} from '../../src/core/merge/apply'
import {freshSession} from '../../src/core/progression/session'
import {decodeSession} from '../../src/core/progression/persistence'
const a=(id:AttributeId,awakened=true)=>({id,level:1,...(awakened?{awakened:true}:{})})
const f=a('fire'),ice=a('ice'),lightning=a('lightning')
describe('approved concentrated awakening allocation',()=>{
 const cases:{name:string;input:Attributes[];out:AttributeId[][];lost:{id:AttributeId;count:number}[]}[]=[
 {name:'3/fire1',input:[[f],[],[]],out:[['fire']],lost:[]},
 {name:'3/fire2',input:[[f],[f],[]],out:[['fire']],lost:[{id:'fire',count:1}]},
 {name:'3/fire+ice',input:[[f],[ice],[]],out:[['fire','ice']],lost:[]},
 {name:'5/fire1',input:[[f],[],[],[],[]],out:[['fire'],[]],lost:[]},
 {name:'5/fire2',input:[[f],[f],[],[],[]],out:[['fire'],['fire']],lost:[]},
 {name:'5/fire3',input:[[f],[f],[f],[],[]],out:[['fire'],['fire']],lost:[{id:'fire',count:1}]},
 {name:'5/fire+ice',input:[[f],[ice],[],[],[]],out:[['fire','ice'],[]],lost:[]},
 {name:'5/fire2+ice',input:[[f],[f],[ice],[],[]],out:[['fire','ice'],['fire']],lost:[]},
 {name:'5/three distinct',input:[[f],[ice],[lightning],[],[]],out:[['fire','ice','lightning'],[]],lost:[]},
 ]
 for(const c of cases)it(c.name,()=>{
  const ids=[...new Set(c.input.flat().map(x=>x.id))],normal=ids.map(id=>a(id,false));const outputs=Array.from({length:c.input.length===5?2:1},()=>normal)
  expect(allocateAwakenings(c.input,outputs)).toEqual({outputs:c.out,surplus:c.lost})
 })
 it('retains maximum before concentrating with different output capabilities',()=>{
  expect(allocateAwakenings([[f,ice]],[[a('fire',false)],[a('ice',false)]])).toEqual({outputs:[['fire'],['ice']],surplus:[]})
 })
 it('matches independent per-ID upper bounds for all32768 three-attribute/5-input patterns',()=>{
  const ids=['fire','ice','lightning'] as const,normal=ids.map(id=>a(id,false))
  for(let mask=0;mask<32768;mask++){
   const input=Array.from({length:5},(_,i)=>ids.flatMap((id,j)=>(mask>>(i*3+j)&1)?[a(id)]:[]))
   const r=allocateAwakenings(input,[normal,normal]);expect(r.outputs[0]!.length).toBeLessThanOrEqual(3)
   for(const id of ids){const n=input.filter(x=>x.some(a=>a.id===id)).length;expect(r.outputs.filter(x=>x.includes(id)).length).toBe(Math.min(n,2));expect(r.surplus.find(x=>x.id===id)?.count??0).toBe(Math.max(0,n-2))}
   expect(r.outputs[0]).toEqual(ids.filter(id=>input.some(x=>x.some(a=>a.id===id))))
  }
 })
 for(const count of [3,5,8,11,13,15])it(`merge ${count} preserves groups, bodies and remainder without cloning flags`,()=>{
  const base=freshSession(0).game,game={...base,highestTierReached:2,slimes:Array.from({length:count},(_,i)=>({id:`s${i}`,tier:2,position:{x:i%4,y:Math.floor(i/4)},attributes:[f]}))}
  const plan=planDrop(game,'s0',{x:1,y:0});expect(plan.kind).toBe('merge');if(plan.kind!=='merge')throw Error('merge expected')
  let id=0;const result=applyPlan(game,plan,()=>`new-${id++}`,40,()=>.99);expect(result.ok).toBe(true)
  for(const group of plan.groups){expect(group.awakening?.outputs).toEqual(group.outputs.map(()=>['fire']));expect(group.awakening?.surplus).toEqual([{id:'fire',count:group.consumedIds.length-group.outputs.length}])}
  expect(result.state.slimes.filter(s=>s.tier===3).length).toBe(plan.groups.reduce((n,g)=>n+g.outputs.length,0))
  for(const id of plan.remainderIds)expect(result.state.slimes.find(s=>s.id===id)).toEqual(game.slimes.find(s=>s.id===id))
  expect(result.state.slimes.flatMap(s=>s.attributes??[]).filter(a=>a.awakened).length).toBe(result.state.slimes.length)
 })
 it('normal attributes copy while awakening stays first',()=>expect(withAwakenings([a('fire',false),a('ice',false)],['fire'])).toEqual([f,a('ice',false)]))
 it('no duplicate awakening candidates',()=>expect(awakeningCandidates([f,a('ice',false)])).toEqual([a('ice',false)]))
 it('validates flags and excludes a fourth attribute',()=>{expect(isAttributes([f])).toBe(true);expect(isAttributes([{...f,awakened:1}])).toBe(false);expect(isAttributes([f,ice,lightning,a('light')])).toBe(false)})
 it('old schema6 must not silently acquire awakening flags',()=>{
  const s=freshSession(0);expect(decodeSession(JSON.stringify({...s,nextId:2,game:{...s.game,slimes:[{id:'p-1',tier:1,position:{x:0,y:0},attributes:[f]}]}}),0).ok).toBe(false)
 })
})
