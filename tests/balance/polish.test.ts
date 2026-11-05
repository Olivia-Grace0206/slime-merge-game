/// <reference types="node" />
import { fixtureJSON } from '../helpers/serialization'
import { mkdirSync, writeFileSync } from 'node:fs'
import { it, expect } from 'vitest'
import { freshSession as newSession, reduceSession, sessionRules, goldPayment, type Command } from '../../src/core/progression/session'
// Legacy regression fixture: research40 and GOLD already unlocked, as migrated pre-research saves.
const freshSession = (now: number) => ({ ...newSession(now), researchLevel: 16, researchMaxTier: 40, goldCellUnlocked: true })
import { tierWeights, type DistributionProfile } from '../../src/core/progression/generation'
import { planDrop } from '../../src/core/merge/plan'
import { upgradeCost } from '../../src/core/progression/economy'
import { isSession, encodeSession, decodeSession } from '../../src/core/progression/persistence'
const profiles=[.92,.90,.88].map(centerSlope=>({centerSlope,spreadRatio:.10,minimumSpread:1,maximumSpread:1.8}))
function rng(seed:number){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}}
function simulate(profile:DistributionProfile,seed:number){
 const random=rng(seed);let s=freshSession(0), fullSteps=0, stopped=0, mergeReady=0, steps=0, samples=0, tierSum=0, near=0, merges=0, sales=0, goldIncome=0, saleIncome=0
 const reached:Record<string,number|null>={5:null,10:null,20:null,30:null,40:null}
 const dt=2000,limit=6*3600000
 function cmd(c:Command,now:number){const old=s,beforeGenerated=s.generator.totalGenerated;s=reduceSession(s,c,now,random,{...sessionRules(s), attributeChance:0, attributeMutationChance:0,distribution:profile});
  goldIncome+=Math.max(0,Number(s.wallet.gold-old.wallet.gold)-(c.type==='sell'?Math.min(2**(old.game.slimes.find(x=>x.id===c.id)?.tier??0),Number.MAX_SAFE_INTEGER-Number(old.wallet.gold)):0))
  const n=s.generator.totalGenerated-beforeGenerated
  if(n>0){const created=s.generator.storedTiers.slice(-n);samples+=n;for(const t of created){tierSum+=t;if(t>=old.game.highestTierReached-1)near++}}
 }
 let now:number
 for(now=dt;now<=limit;now+=dt){
  // Resolve every due receipt at its actual timestamp between decisions (no batch payment).
  while(s.event?.tier!==null&&s.event&&s.event.nextPaymentAtMs<=now){const at=s.event.nextPaymentAtMs;cmd({type:'tick'},Math.max(at,s.savedAtMs));if(s.event&&s.event.nextPaymentAtMs===at)throw Error('stuck receipt')}
  cmd({type:'tick'},now);cmd({type:'tap'},now);steps++
  if(s.game.slimes.length===16)fullSteps++
  if(s.generator.storedTiers.length===sessionRules(s).capacity)stopped++
  const protectedSource=s.event?.tier!==null?s.event?.sourceId:null
  const options=s.game.slimes.flatMap(a=>s.game.slimes.filter(b=>b.id!==a.id&&a.tier===b.tier).map(b=>planDrop(s.game,a.id,b.position))).filter(p=>p.kind==='merge')
  if(options.length)mergeReady++
  const merge=options.filter(p=>!p.groups.some(g=>g.consumedIds.includes(protectedSource??''))).sort((a,b)=>b.groups.flatMap(g=>g.consumedIds).length-a.groups.flatMap(g=>g.consumedIds).length).find(p=>p.groups.some(g=>g.consumedIds.length===5)||s.game.slimes.length>=13)
  if(merge){cmd({type:'drop',plan:merge},now);merges++}
  else if(s.event?.tier===null&&s.game.slimes.length){const best=[...s.game.slimes].sort((a,b)=>b.tier-a.tier)[0]!;cmd({type:'drop',plan:planDrop(s.game,best.id,s.event.cell)},now)}
  else {
   const moved=false
   if(!moved){
    if(s.game.slimes.length===16){const lowest=[...s.game.slimes].filter(x=>x.id!==protectedSource).sort((a,b)=>a.tier-b.tier)[0]!
     const prev=s.wallet.gold;cmd({type:'sell',id:lowest.id},now);sales++;saleIncome+=Number(s.wallet.gold-prev)}
    else if(s.generator.storedTiers.length)cmd({type:'withdraw',expectedId:s.nextId},now)
   }
  }
  if(now%30000===0){const dup=[...s.game.slimes].sort((a,b)=>b.tier-a.tier).find(a=>a.id!==protectedSource&&s.game.slimes.filter(b=>b.tier===a.tier).length>=2)
   if(dup){const prev=s.wallet.gold;cmd({type:'sell',id:dup.id},now);sales++;saleIncome+=Number(s.wallet.gold-prev)}}
  for(const key of ['speed','tap','storage'] as const){const lv=s.wallet.upgrades[key];if(lv<16&&s.wallet.gold>=upgradeCost(key,lv))cmd({type:'buy',key,expectedLevel:lv},now)}
  for(const t of [5,10,20,30,40])if(s.game.highestTierReached>=t)reached[t]??=now
  if(now%600000===0){expect(isSession(s)).toBe(true);const load=decodeSession(encodeSession(s),now);expect(load.ok).toBe(true)}
  if(reached[40]!==null)break
 }
 return {slope:profile.centerSlope,seed,reached,endingH:s.game.highestTierReached,durationMs:Math.min(now,limit),meanGeneratedTier:tierSum/Math.max(1,samples),nearHighestRatio:near/Math.max(1,samples),boardFullRatio:fullSteps/steps,storageStoppedRatio:stopped/steps,mergeReadyRatio:mergeReady/steps,merges,sales,goldIncome,saleIncome,goldShare:goldIncome/Math.max(1,goldIncome+saleIncome)}
}
it('Polish 4x4 progression: three distributions, seeded random placements and actual moves/merges/sales',()=>{
 const results=profiles.flatMap(p=>[12,61,210,513,901].map(seed=>simulate(p,seed)))
 const distributions=profiles.flatMap(p=>[5,10,20,30,40].map(H=>{const w=tierWeights(H,p);return{slope:p.centerSlope,H,mean:w.reduce((a,b)=>a+b.tier*b.probability,0),pHighest:w.at(-1)!.probability,pNearHighest:w.filter(x=>x.tier>=H-1).reduce((a,b)=>a+b.probability,0)}}))
 const rewards=[1,2,3,4,5,10,20,30,40].map(tier=>({tier,sale:2**tier,old:goldPayment(tier,0,1),linearFloor:goldPayment(tier,0),additive:Math.max(1,Math.floor(2**tier*.05))+tier-1,doubleRate:Math.max(1,Math.floor(2**tier*.1)),attributes3:goldPayment(tier,3),totalToSale:10*Number(goldPayment(tier,0))/(2**tier)}))
 mkdirSync('docs/validation/phase4a/regression/validation-phase3c/regression-phase3b/regression/regression-balance/legacy-gaussian',{recursive:true});writeFileSync('docs/validation/phase4a/regression/validation-phase3c/regression-phase3b/regression/regression-balance/legacy-gaussian/simulation.json',fixtureJSON({model:'4x4 actual Core; random FIFO; one board action / 2s plus tap, 5 preferred then 3 at >=13, periodic duplicate sale / 30s, shops bought when affordable. Seek gold then hold source. Five fixed seeds, six-hour censor; receipt times 350ms. Bot comparison, not a human time forecast.',results,distributions,rewards},null,2))
 expect(results).toHaveLength(15)
},240000)

