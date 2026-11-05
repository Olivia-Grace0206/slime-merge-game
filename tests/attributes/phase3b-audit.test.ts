import { fixtureJSON } from '../helpers/serialization'
import { it, expect } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { freshSession, reduceSession, type Command, type Session } from '../../src/core/progression/session'
import { isSession, decodeSession, encodeSession } from '../../src/core/progression/persistence'
import { planDrop } from '../../src/core/merge/plan'

/** A separate invariant oracle checks ownership/conservation, without reproducing effect formulas. */
it('independent conservation audit: 20k mixed saved transactions with stale requests and protected specimens',()=>{
 const reports=[]
 for(const initialSeed of [12,61,210,901]){
  let seed=initialSeed,now=0,s:Session={...freshSession(0),researchLevel:16,researchMaxTier:40,goldCellUnlocked:true,wallet:{gold:BigInt(10000),upgrades:{speed:0,tap:0,storage:0}}}
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296},seen=new Set<string>(),counts:Record<string,number>={}
  for(let step=0;step<5000;step++){
   now+=Math.floor(random()*15000)
   const choice=Math.floor(random()*11),a=s.game.slimes[Math.floor(random()*s.game.slimes.length)],b=s.game.slimes[Math.floor(random()*s.game.slimes.length)]
   let c:Command={type:'tick'}
   if(choice===0)c={type:'tap'}
   if(choice===1||choice===2)c={type:'withdraw',expectedId:s.nextId,expectedMode:s.generationMode}
   if(choice===3&&a)c={type:'sell',id:a.id}
   if(choice===4&&a&&b)c={type:'drop',plan:planDrop(s.game,a.id,b.position,40)}
   if(choice===5&&a)c={type:'protect',id:a.id}
   if(choice===6)c={type:'generation-mode',value:s.generationMode==='normal'?'focused':'normal'}
   if(choice===7)c={type:'buy',key:'storage',expectedLevel:s.wallet.upgrades.storage}
   if(choice===10&&a)c={type:'strip-attributes',id:a.id}
   if(choice===8)c={type:'withdraw',expectedId:0,expectedMode:s.generationMode}
   const before=fixtureJSON(s),next=reduceSession(s,c,now,random)
   expect(fixtureJSON(s)).toBe(before)
   if(!isSession(next)){mkdirSync('docs/validation/phase3c/regression-phase3b/audit',{recursive:true});writeFileSync('docs/validation/phase3c/regression-phase3b/audit/failed-transaction.json',fixtureJSON({initialSeed,step,command:c,before:s,after:next},null,2))}
   expect(isSession(next)).toBe(true)
   expect(next.game.highestTierReached).toBeGreaterThanOrEqual(s.game.highestTierReached)
   expect(new Set(next.game.slimes.map(x=>x.id)).size).toBe(next.game.slimes.length)
   expect(new Set(next.game.slimes.map(x=>`${x.position.x},${x.position.y}`)).size).toBe(next.game.slimes.length)
   for(const slime of next.game.slimes)if(!s.game.slimes.some(x=>x.id===slime.id)){expect(seen.has(slime.id)).toBe(false);seen.add(slime.id)}
   if(c.type==='drop'&&c.plan.kind==='swap'&&next!==s){
    expect(next.game.slimes.map(({id,tier,attributes})=>({id,tier,attributes}))).toEqual(s.game.slimes.map(({id,tier,attributes})=>({id,tier,attributes})))
    expect(next.protectedIds).toEqual(s.protectedIds)
   }
   if(c.type==='drop'&&c.plan.kind==='merge'&&next!==s){const used=c.plan.groups.reduce((n,g)=>n+g.consumedIds.length,0),made=c.plan.groups.reduce((n,g)=>n+g.outputs.length,0);expect(next.game.slimes.length).toBe(s.game.slimes.length-used+made);for(const id of c.plan.remainderIds)expect(next.game.slimes.find(x=>x.id===id)).toEqual(s.game.slimes.find(x=>x.id===id))}
   if(c.type==='strip-attributes'){
    expect(next.game.slimes.map(({id,tier,position})=>({id,tier,position}))).toEqual(s.game.slimes.map(({id,tier,position})=>({id,tier,position})))
    expect(next.wallet.gold).toBe(s.wallet.gold);expect(next.protectedIds).toEqual(s.protectedIds)
    for(const x of next.game.slimes)expect(x.attributes).toEqual(x.id===c.id?[]:s.game.slimes.find(y=>y.id===x.id)!.attributes)
    if(!s.game.slimes.find(x=>x.id===c.id)?.attributes?.length)expect(next).toBe(s)
   }
   if(c.type==='sell'&&s.protectedIds.includes(c.id))expect(next).toBe(s)
   if(c.type==='withdraw'&&c.expectedId===0)expect(next).toBe(s)
   if(step%100===0){const d=decodeSession(encodeSession(next),now);expect(d.ok&&d.session).toEqual(next)}
   counts[c.type]=(counts[c.type]??0)+1;s=next
  }
  reports.push({seed:initialSeed,attempts:5000,counts,uniqueIndividualIds:seen.size,highestTier:s.game.highestTierReached,generated:s.generator.totalGenerated,natureGenerated:s.nature.totalGenerated,focusedGenerated:s.focusedGenerated,saveChecks:50,violations:0})
 }
 mkdirSync('docs/validation/phase3c/regression-phase3b/audit',{recursive:true});writeFileSync('docs/validation/phase3c/regression-phase3b/audit/transactions.json',fixtureJSON({oracle:'Ownership/ID/cell/count/immutability/save invariants, separate from effect formulas. Same implementation agent; no third-party review claimed.',reports},null,2))
},120000)
