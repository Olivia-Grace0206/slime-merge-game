import { fixtureJSON } from '../helpers/serialization'
import { mkdirSync, writeFileSync } from 'node:fs'
import { it, expect } from 'vitest'
import { freshSession, reduceSession, sessionRules, type Command } from '../../src/core/progression/session'
import { planDrop } from '../../src/core/merge/plan'
import { decodeSession, encodeSession, isSession } from '../../src/core/progression/persistence'
function simulate(chance:number,initialSeed:number) {
 let seed=initialSeed,s={...freshSession(0),researchLevel:16,researchMaxTier:40},merges=0,sales=0,attributedSales=0,attributedGenerated=0,saveChecks=0,attributedSaves=0,occupancy=0,fullSteps=0,blocked=0,highestLv=0,firstAttribute:number|null=null
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
 function cmd(c:Command,now=s.savedAtMs){s=reduceSession(s,c,now,random,{...sessionRules(s),attributeChance:chance})}
 for(let step=1;step<=500;step++){
  cmd({type:'tick'},step*15000)
  const a=s.generator.storedAttributes?.[0]??[]
  if(a.length){attributedGenerated++;firstAttribute??=step}
  if(s.game.slimes.length===16){fullSteps++;const sell=[...s.game.slimes].sort((a,b)=>(a.attributes?.length??0)-(b.attributes?.length??0)||a.tier-b.tier)[0]!;if(sell.attributes?.length)attributedSales++;cmd({type:'sell',id:sell.id});sales++}
  cmd({type:'withdraw',expectedId:s.nextId})
  // Repeatedly use legal merge plans. Trial policy keeps attributed specimens when selling.
  for(let attempt=0;attempt<8;attempt++){
   const plans=s.game.slimes.flatMap(a=>s.game.slimes.filter(b=>a.id!==b.id&&a.tier===b.tier).map(b=>planDrop(s.game,a.id,b.position,40)))
   if(plans.some(p=>p.kind==='swap'&&p.reason==='attribute-limit'))blocked++
   const choices=plans.filter(p=>p.kind==='merge').sort((a,b)=>b.outputTier-a.outputTier||b.groups.reduce((n,g)=>n+(g.attributes?.length??0),0)-a.groups.reduce((n,g)=>n+(g.attributes?.length??0),0))
   if(!choices.length)break
   cmd({type:'drop',plan:choices[0]!});merges++
  }
  occupancy+=s.game.slimes.filter(a=>a.attributes?.length).length
  highestLv=Math.max(highestLv,...s.game.slimes.flatMap(a=>(a.attributes??[]).map(x=>x.level)))
  if(step%10===0){expect(isSession(s)).toBe(true);const d=decodeSession(encodeSession(s),s.savedAtMs);expect(d.ok&&d.session).toEqual(s);saveChecks++;if(s.game.slimes.some(x=>x.attributes?.length)||s.generator.storedAttributes?.some(a=>a.length))attributedSaves++}
 }
 return{chance,seed:initialSeed,generated:s.generator.totalGenerated,attributedGenerated,firstAttributeAfterGenerated:firstAttribute,firstAttributeAtSeconds:firstAttribute===null?null:firstAttribute*15,highestTier:s.game.highestTierReached,highestLv,merges,sales,attributedSales,fullSteps,attributeBlockedDecisions:blocked,meanAttributedBoard:occupancy/500,saveChecks,attributedSaves,endingCount:s.game.slimes.length}
}
it('three provisional generation rates on real4x4, preserving attributed stock/saves and measuring cleanup',()=>{
 const results=[.03,.08,.18].flatMap(p=>[12,61,210].map(seed=>simulate(p,seed)))
 const summary=[.03,.08,.18].map(chance=>{const r=results.filter(x=>x.chance===chance);const mean=(key:keyof typeof r[number])=>r.reduce((n,x)=>n+Number(x[key]),0)/r.length;return{chance,attributedGenerated:mean('attributedGenerated'),firstAttributeSeconds:mean('firstAttributeAtSeconds'),highestTier:mean('highestTier'),highestLv:mean('highestLv'),merges:mean('merges'),sales:mean('sales'),attributedSales:mean('attributedSales'),meanAttributedBoard:mean('meanAttributedBoard'),attributeBlockedDecisions:mean('attributeBlockedDecisions'),attributedSaveRate:r.reduce((n,x)=>n+x.attributedSaves,0)/r.reduce((n,x)=>n+x.saveChecks,0)}})
 mkdirSync('docs/validation/phase4a/regression/balance-phase3c/regression-phase3b/regression-phase3a',{recursive:true});writeFileSync('docs/validation/phase4a/regression/balance-phase3c/regression-phase3b/regression-phase3a/simulation.json',fixtureJSON({model:'PROVISIONAL. Actual4x4 Core, 500 steps at15s with Phase3B effects, FIFO random withdrawal, research40 to isolate attributes, no shops/events, legal merge-first preserving attributed specimens in full-board sales, 3seeds; no claim of human fun or optimality. 1% per-group mutation unchanged in all arms; save roundtrip each10generations.',results,summary},null,2))
 expect(results).toHaveLength(9);expect(results.every(r=>r.generated>=500&&r.endingCount<=16&&r.saveChecks===50)).toBe(true)
},120000)
