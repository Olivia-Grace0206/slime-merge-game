import { mkdirSync, writeFileSync } from 'node:fs'
import { it, expect } from 'vitest'
import { boardEffects, EFFECTS, levelPower, saleValue, specialCellWeights } from '../../src/core/attributes/effects'
import { drawAttributes } from '../../src/core/attributes/inheritance'
import { advanceGenerator, newGenerator, drawTier, tierWeights } from '../../src/core/progression/generation'
import { freshSession, reduceSession, sessionRules, type Command } from '../../src/core/progression/session'
import { withdrawFocused } from '../../src/core/progression/focus'
import { upgradeCost } from '../../src/core/progression/economy'
import { researchCost } from '../../src/core/progression/research'
import { planDrop, compareNear } from '../../src/core/merge/plan'
import { isSession, decodeSession, encodeSession } from '../../src/core/progression/persistence'
import type { Attributes } from '../../src/domain/attributes'
const dir='docs/balance/phase3b1/regression-phase3b'
const rng=(seed:number)=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
const write=(name:string,data:unknown)=>{mkdirSync(dir,{recursive:true});writeFileSync(`${dir}/${name}.json`,JSON.stringify(data,null,2))}
it('compares provisional pace, Lv curves and bounded maximum support',()=>{
 const pace=[{base:10000,factor:.9,tap:350},...[12000,15000,18000].flatMap(base=>[.95,.97].flatMap(factor=>[100,200].map(tap=>({base,factor,tap}))))].flatMap(c=>[0,1,5,10,16].map(lv=>{
  const interval=Math.max(2000,Math.round(c.base*c.factor**lv)),advance=1000+c.tap*lv
  let floorLv=0;while(c.base*c.factor**floorLv>2000)floorLv++
  const stockScenarios=[0,10].flatMap(clicksPerMinute=>[30,60].map(withdrawEverySeconds=>{
   let g=newGenerator(0),full=0,generated=0
   for(let second=1;second<=3600;second++){
    g=advanceGenerator(g,second*1000,1,{intervalMs:interval,capacity:10,tapAdvanceMs:advance},()=>.5)
    if(clicksPerMinute&&second%6===0){g=advanceGenerator({...g,progressMs:g.progressMs+Math.min(advance,Math.floor(interval*.75))},second*1000,1,{intervalMs:interval,capacity:10,tapAdvanceMs:advance},()=>.5)}
    if(g.storedTiers.length===10)full++
    if(second%withdrawEverySeconds===0){generated+=Math.min(2,g.storedTiers.length);g={...g,storedTiers:g.storedTiers.slice(2)}}
   }
   return{clicksPerMinute,withdrawEverySeconds,fullRatio:full/3600,withdrawn:generated}
  }))
  return{...c,lv,intervalMs:interval,naturalPerMinute:60000/interval,tenClickSeconds:Math.min(advance,Math.floor(interval*.75))/100,unboundedFloorLv:floorLv,floorReachableAtShop16:floorLv<=16,stockScenarios}
 }))
 const levels=[1,5,10,20,50,99].map(lv=>({lv,linear:1+.3*(lv-1),diminishing:levelPower(lv),fireBaseFraction:.08*levelPower(lv),goldMultiplier:1+.15*levelPower(lv),darkMultiplier:1+levelPower(lv)}))
 const maxima=['ice','lightning','nature','luck','magnet'].map(id=>{
  const s=freshSession(0),game={...s.game,slimes:Array.from({length:16},(_,i)=>({id:`max-${i}`,tier:1,position:{x:i%4,y:Math.floor(i/4)},attributes:[{id,level:99}] as Attributes}))}
  return{id,...boardEffects(game),magnetWeights:specialCellWeights({...game,slimes:game.slimes.slice(0,15)},[{x:3,y:3}])}
 })
 write('parameters',{provisional:true,pace,levels,maxima,config:EFFECTS,darkComparison:{chance:.2,group:{expectedDarkOutputs:1.6,variance:.64,anyLoss:.2},perOutput:{expectedDarkOutputs:1.6,variance:.32,anyLoss:.36},adopted:'one shared trial per merge group; no five-merge bonus'}})
 expect(pace).toHaveLength(65);expect(levels.at(-1)!.diminishing).toBeLessThan(3)
})
it('100-resource comparisons of normal, FIFO-stock A, future-generation B and focus probabilities',()=>{
 const results=[1,5,10,20,40].flatMap(H=>[.2,.35,.5].flatMap(chance=>Array.from({length:30},(_,i)=>i+1).map(seed=>{
  const random=rng(seed),s=freshSession(0),game={...s.game,highestTierReached:H}
  let generator={...newGenerator(0),storedTiers:Array.from({length:100},()=>drawTier(H,random())),storedAttributes:[] as Attributes[],totalGenerated:100}
  generator.storedAttributes=generator.storedTiers.map(()=>drawAttributes(random,.03))
  const original=[...generator.storedTiers],normalAttributes=generator.storedAttributes.filter(a=>a.length).length,normalGold=generator.storedTiers.reduce((n,t,i)=>n+saleValue({tier:t,attributes:generator.storedAttributes[i]!}),0)
  let conversions=0,newAttributes=0,outGOLD=0;const outputTiers:number[]=[]
  while(generator.storedTiers.length>=10){
   const result=withdrawFocused(game,generator,'focused',chance,random);if(!result.ok)throw Error('focus')
   generator={...result.generator,storedTiers:[...result.generator.storedTiers],storedAttributes:[...(result.generator.storedAttributes??[])]}
   const out=result.game.slimes[0]!;conversions++;newAttributes+=out.attributes!.length?1:0;outGOLD+=saleValue(out);outputTiers.push(out.tier)
  }
  const remainingGold=generator.storedTiers.reduce((n,t,i)=>n+saleValue({tier:t,attributes:generator.storedAttributes[i]!}),0)
  const B=Array.from({length:10},()=>({tier:drawTier(H,random()),attributes:drawAttributes(random,chance)}))
  return{H,chance,seed,resources:100,normal:{count:100,attributes:normalAttributes,gold:normalGold,tierHistogram:histogram(original)},
   A:{conversions,count:generator.storedTiers.length+conversions,retainedCount:generator.storedTiers.length,attributes:normalAttributes+newAttributes,newAttributes,gold:outGOLD+remainingGold,goldOpportunityCost:normalGold-outGOLD-remainingGold,outputTierHistogram:histogram(outputTiers)},
   B:{count:10,attributes:B.filter(x=>x.attributes.length).length,gold:B.reduce((n,x)=>n+saleValue(x),0),tierHistogram:histogram(B.map(x=>x.tier))}}
 })))
 write('generation-modes',{provisional:true,model:'100 fresh normal draws (3% existing attributes) for A; FIFO head10 regardless of attributes/Tier. A min consumed Tier. B ten future cycles→one normal weighted Tier with focused chance. No board constraint for resource experiment. GOLD is immediate liquidation opportunity, not actual play income.',analytic:[.2,.35,.5].map(chance=>({chance,normalOutputs:100,normalAttributes:3,tenSafeConversionsOutputs:10,tenSafeConversionsNewAttributes:10*chance,BAttributes:10*chance})),results})
 expect(results).toHaveLength(450);expect(results.every(x=>x.A.count===10&&x.A.conversions===10&&x.A.retainedCount===0)).toBe(true)
})
function histogram(values:readonly number[]){const r:Record<number,number>={};for(const v of values)r[v]=(r[v]??0)+1;return r}
type Style='normal'|'focus'|'ice-lightning'|'nature'|'luck-mutation'|'sale'|'light-magnet'|'combo'
const styles:Style[]=['normal','focus','ice-lightning','nature','luck-mutation','sale','light-magnet','combo']
const attr=(id:Attributes[number]['id'],level=5):Attributes=>[{id,level}]
function play(style:Style,seed:number,policy:'research'|'production') {
 const random=rng(seed);let s=freshSession(0),adds=0,taps=0,full=0,stockFull=0,attributes=0,sales=0,saleGold=0,eventGold=0,researchBuys=0,firstResearch:number|null=null,focus=0,maxLv=0
 const milestones:Record<number,number|null>={5:null,10:null,20:null,30:null,40:null}
 // Explicit matched loadouts, no discovery/wealth grants. Loadout IDs do not overlap generated IDs.
 const loadouts:Partial<Record<Style,readonly Attributes[]>>={
  'ice-lightning':[[...attr('ice'),...attr('lightning')]],nature:[attr('nature')],
  'luck-mutation':[[...attr('luck'),...attr('mutation')]],sale:[[...attr('fire'),...attr('gold'),...attr('dark')]],
  'light-magnet':[attr('light'),attr('magnet')],combo:[[...attr('ice'),...attr('lightning')],[...attr('luck'),...attr('mutation')],attr('light')]}
 const loadout=loadouts[style]??[]
 s={...s,game:{...s.game,slimes:loadout.map((attributes,i)=>({id:`support-${i}`,tier:1,attributes,position:{x:i,y:3}}))}}
 const supportIds=new Set((style==='sale'||style==='luck-mutation'||style==='combo')?[]:s.game.slimes.map(x=>x.id))
 function cmd(c:Command,time:number){const before=s;s=reduceSession(s,c,time,random)
  if(s===before)return
  if(c.type==='withdraw'){adds++;attributes+=(s.game.slimes.find(x=>x.id===`p-${before.nextId}`)?.attributes?.length??0)>0?1:0;focus+=s.focusedGenerated-before.focusedGenerated}
  if(c.type==='sell'){sales++;saleGold+=s.wallet.gold-before.wallet.gold}else eventGold+=Math.max(0,s.wallet.gold-before.wallet.gold)
  if(c.type==='tap')taps++
  if(c.type==='research'){researchBuys++;firstResearch??=time}
 }
 const limit=8*3600000,dt=5000;let steps=0
 for(let now=dt;now<=limit;now+=dt){
  cmd({type:'tick'},now);if(now%6000===0)cmd({type:'tap'},now) // 2 clicks/min on this 5s decision grid, deliberately modest
  steps++;if(s.game.slimes.length===16)full++;if(s.generator.storedTiers.length>=sessionRules(s).capacity)stockFull++
  const options=s.game.slimes.filter(x=>!supportIds.has(x.id)),source=s.event?.sourceId
  let chosen:ReturnType<typeof planDrop>|undefined
  for(const a of options){for(const b of options){if(a.id===b.id||a.tier!==b.tier)continue
   const p=planDrop(s.game,a.id,b.position,s.researchMaxTier)
   if(p.kind==='merge'&&!p.groups.some(g=>g.consumedIds.some(id=>supportIds.has(id)||id===source))&&(p.groups.some(g=>g.consumedIds.length===5)||s.game.slimes.length>=12||p.outputTier>s.game.highestTierReached)){chosen=p;break}
  }if(chosen)break}
  if(chosen)cmd({type:'drop',plan:chosen},now)
  else if(style==='focus'&&s.generator.storedTiers.length>=10&&s.game.slimes.length<16){
   cmd({type:'generation-mode',value:'focused'},now);cmd({type:'withdraw',expectedId:s.nextId,expectedMode:'focused'},now);cmd({type:'generation-mode',value:'normal'},now)
  }else if(s.generator.storedTiers.length&&s.game.slimes.length<16&&(style!=='focus'||s.generator.storedTiers.length>=sessionRules(s).capacity||s.generator.storedAttributes?.[0]?.length))cmd({type:'withdraw',expectedId:s.nextId,expectedMode:'normal'},now)
  else{
   // Reposition disconnected equals using actual empty-cell moves. No idealized inventory merging.
   let moved=false
   const empty=Array.from({length:16},(_,i)=>({x:i%4,y:Math.floor(i/4)})).filter(p=>!s.game.slimes.some(x=>x.position.x===p.x&&x.position.y===p.y))
   for(const a of options){const peers=options.filter(b=>b.id!==a.id&&b.tier===a.tier);if(peers.length<2||a.tier>=s.researchMaxTier)continue
    const nearest=[...empty].sort((a,b)=>compareNear(peers[0]!.position,a,b))[0]
    if(nearest&&Math.max(Math.abs(a.position.x-peers[0]!.position.x),Math.abs(a.position.y-peers[0]!.position.y))>1){cmd({type:'drop',plan:planDrop(s.game,a.id,nearest,s.researchMaxTier)},now);moved=true;break}}
   if(!moved&&options.length&&(s.game.slimes.length===16||s.game.highestTierReached>=s.researchMaxTier)){
    const expendable=options.filter(x=>x.id!==source).sort((a,b)=>s.game.highestTierReached>=s.researchMaxTier?b.tier-a.tier:a.tier-b.tier)[0]
    if(expendable)cmd({type:'sell',id:expendable.id},now)
   }
  }
  // High duplicates fund progression; support showcase specimen is retained, not consumed.
  if(now%30000===0){const dup=options.filter(a=>a.id!==source&&s.game.slimes.filter(b=>b.tier===a.tier&&!supportIds.has(b.id)).length>=3).sort((a,b)=>b.tier-a.tier)[0];if(dup)cmd({type:'sell',id:dup.id},now)}
  const blocked=s.game.highestTierReached>=s.researchMaxTier
  if((policy==='research'||blocked)&&s.researchLevel<16&&s.wallet.gold>=researchCost(s.researchLevel))cmd({type:'research',expectedLevel:s.researchLevel},now)
  for(const key of ['speed','tap','storage'] as const){const lv=s.wallet.upgrades[key],reserve=blocked&&s.researchLevel<16?researchCost(s.researchLevel):0
   if(lv<(key==='storage'?3:policy==='research'?5:16)&&s.wallet.gold>=upgradeCost(key,lv)+reserve)cmd({type:'buy',key,expectedLevel:lv},now)}
  if(!s.goldCellUnlocked&&s.wallet.gold>=128)cmd({type:'gold-unlock'},now)
  if(!blocked&&s.researchLevel<16&&s.wallet.gold>=researchCost(s.researchLevel))cmd({type:'research',expectedLevel:s.researchLevel},now)
  for(const tier of [5,10,20,30,40])if(s.game.highestTierReached>=tier)milestones[tier]??=now
  maxLv=Math.max(maxLv,...s.game.slimes.flatMap(x=>(x.attributes??[]).map(a=>a.level)))
  if(now%600000===0){expect(isSession(s)).toBe(true);expect(decodeSession(encodeSession(s),now).ok).toBe(true)}
  if(milestones[40]!==null)break
 }
 return{style,seed,policy,initialLoadout:loadout,durationMs:s.savedAtMs,highest:s.game.highestTierReached,milestones,generated:s.generator.totalGenerated,natureGenerated:s.nature.totalGenerated,generatedPerMinute:s.generator.totalGenerated/(s.savedAtMs/60000),adds,taps,focus,attributes,sales,saleGold,eventGold,averageGoldPerMinute:(saleGold+eventGold)/(s.savedAtMs/60000),researchBuys,firstResearchMs:firstResearch,boardFullRatio:full/steps,stockFullRatio:stockFull/steps,maxAttributeLv:maxLv,endingEffects:boardEffects(s.game)}
}
it('multiple seeds and buying policies integrate effects and focused mode on constrained4x4',()=>{
 const results=styles.flatMap(style=>(['research','production'] as const).flatMap(policy=>[12,61,210].map(seed=>play(style,seed,policy))))
 // Inventory-only ideal: same discovery table, instantaneous five-first count merging; no board, research, sales or attributes.
 const ideal=[12,61,210].map(seed=>{const random=rng(seed),counts=Array(41).fill(0),milestones:Record<number,number|null>={5:null,10:null,20:null,30:null,40:null};let H=1;let n:number
  for(n=1;n<=50000&&H<40;n++){counts[drawTier(H,random())]++
   for(let t=1;t<40;t++){while(counts[t]>=5){counts[t]-=5;counts[t+1]+=2;H=Math.max(H,t+1)}if(counts[t]>=3){counts[t]-=3;counts[t+1]++;H=Math.max(H,t+1)}}
   for(const t of [5,10,20,30,40])if(H>=t)milestones[t]??=n*15000}
  return{seed,generated:n-1,milestones,highest:H}})
 const summaries=styles.map(style=>{const r=results.filter(x=>x.style===style),keys=['generatedPerMinute','adds','taps','attributes','averageGoldPerMinute','boardFullRatio','stockFullRatio'] as const
  return{style,metrics:Object.fromEntries(keys.map(k=>{const v=r.map(x=>x[k]),mean=v.reduce((a,b)=>a+b,0)/v.length;return[k,{mean,min:Math.min(...v),max:Math.max(...v),standardDeviation:Math.sqrt(v.reduce((a,b)=>a+(b-mean)**2,0)/v.length)}]})),milestones:Object.fromEntries([5,10,20,30,40].map(t=>{const v=r.map(x=>x.milestones[t]).filter((n):n is number=>n!==null);return[t,{reached:v.length,runs:r.length,meanMs:v.length?v.reduce((a,b)=>a+b,0)/v.length:null,minMs:v.length?Math.min(...v):null,maxMs:v.length?Math.max(...v):null}]}))}})
 write('integrated',{provisional:true,model:'Actual immutable production Session/Core,4x4,8h right censor,5s decision; click every30s (2/min); random FIFO; actual move/merge/sell/research/shop. No oracle auto merge. Explicit Lv5 Tier1 showcase loadouts: production/place-support holders retained, sale/genetic/combo holders join ordinary legal merges/sales; showcase conditions, not naturally earned build forecasts. 3seeds×2shop policies×8styles. Focus consumes FIFO10 else falls back normal on stock pressure. GOLD events use normal tick cadence, no extra privileged receipt scheduling. Ideal inventory experiment separate, no research or spatial cost.',summaries,results,ideal,weights:[1,5,10,20,40].map(H=>({H,weights:tierWeights(H)}))})
 expect(results).toHaveLength(48);expect(results.every(x=>Number.isFinite(x.averageGoldPerMinute)&&x.highest<=40)).toBe(true)
},480000)
