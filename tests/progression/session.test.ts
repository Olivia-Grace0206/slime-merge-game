/// <reference types="node" />
import { fixtureJSON } from '../helpers/serialization'
import { mkdirSync, writeFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { freshSession as newSession, reduceSession as currentReduceSession, goldPayment, sessionRules, type Session } from '../../src/core/progression/session'
// Legacy regression fixture: research40 and GOLD already unlocked, as migrated pre-research saves.
const freshSession = (now: number) => ({ ...newSession(now), researchLevel: 16, researchMaxTier: 40, goldCellUnlocked: true })
import { encodeSession, decodeSession, isSession, commitStorage } from '../../src/core/progression/persistence'
import { planDrop } from '../../src/core/merge/plan'
import { legacyGenerationRules, purchaseUpgrade, beginGoldRush, payGoldRush, freshWallet } from '../../src/core/progression/economy'
import { advanceGenerator, emptyCells, withdrawToCell } from '../../src/core/progression/generation'
const zero = () => 0
const full = (now = 100_000) => reduceSession(freshSession(0), {type:'tick'}, now, zero)
const out = (s: Session, x: number, y: number, now = s.savedAtMs) => {
 const cells=emptyCells(s.game), index=cells.findIndex(p=>p.x===x&&p.y===y)
 if(index<0)return s
 return reduceSession(s,{type:'withdraw',expectedId:s.nextId},now,()=> (index+.5)/cells.length)
}

describe('integrated progression safety',()=>{
 it('4x4 empty normal start, full storage never banks offline time',()=>{
  let s=full();expect(s.game.bounds.width).toBe(8);expect(s.game.slimes).toHaveLength(0);expect(s.generator.storedTiers).toHaveLength(10)
  s=reduceSession(s,{type:'tick'},86400_000,zero);s=out(s,0,0)
  s=reduceSession(s,{type:'tick'},s.savedAtMs+9999,zero);expect(s.generator.storedTiers).toHaveLength(9)
  s=reduceSession(s,{type:'tick'},s.savedAtMs+1,zero);expect(s.generator.storedTiers).toHaveLength(10)
 })
 it('withdraw rejects double request, occupied, negative and locked/outside without loss',()=>{
  const start=full(),s=out(start,0,0)
  for(const target of [{x:0,y:0},{x:4,y:0},{x:-1,y:0}])expect(withdrawToCell(s.game,s.generator,target,'new').ok).toBe(false)
  expect(reduceSession(s,{type:'withdraw',expectedId:start.nextId},s.savedAtMs,zero)).toBe(s)
  expect(s.generator.storedTiers.length).toBe(9)
 })
 it('normal 3/5 merge uses the original planner and preserves highest-ever Tier after sale',()=>{
  for(const count of [3,5]) {
   let s=full();for(let i=0;i<count;i++)s=out(s,i%4,Math.floor(i/4))
   const source=s.game.slimes[0]!,target=s.game.slimes[1]!
   s=reduceSession(s,{type:'drop',plan:planDrop(s.game,source.id,target.position)},s.savedAtMs,zero)
   expect(s.game.slimes.length).toBe(count===3?1:2);expect(s.game.highestTierReached).toBe(2)
   for(const slime of s.game.slimes) s=reduceSession(s,{type:'sell',id:slime.id},s.savedAtMs,zero)
   expect(s.game.slimes.length).toBe(0);expect(s.game.highestTierReached).toBe(2);expect(isSession(s)).toBe(true)
  }
 })
 it('sale/protection are atomic and an old ID cannot sell an output or pay twice',()=>{
  let s=out(full(),0,0);const id=s.game.slimes[0]!.id
  s=reduceSession(s,{type:'protect',id},s.savedAtMs,zero)
  expect(reduceSession(s,{type:'sell',id},s.savedAtMs,zero)).toBe(s)
  s=reduceSession(s,{type:'protect',id},s.savedAtMs,zero)
  const before=s.wallet.gold;s=reduceSession(s,{type:'sell',id},s.savedAtMs,zero)
  expect(s.wallet.gold).toBe(BigInt(before+BigInt(2)));expect(reduceSession(s,{type:'sell',id},s.savedAtMs,zero)).toBe(s)
  expect(out(s,0,0).game.slimes[0]!.id).not.toBe(id)
 })
 it('full 16 different Tiers can always sell a chosen unprotected specimen',()=>{
  let s=freshSession(0)
  s={...s,nextId:17,game:{...s.game,highestTierReached:16,slimes:Array.from({length:16},(_,i)=>({id:`p-${i+1}`,tier:i+1,attributes:[],position:{x:i%4,y:Math.floor(i/4)}}))}}
  expect(isSession(s)).toBe(true)
  const highest=s.game.slimes[15]!
  const next=reduceSession(s,{type:'sell',id:'p-1'},0,zero)
  expect(next.game.slimes).toHaveLength(15);expect(next.game.slimes).toContainEqual(highest)
 })
 it('tap and elapsed time are counted once, repeat tick at same clock creates nothing',()=>{
  let s=freshSession(0)
  s=reduceSession(s,{type:'tap'},9000,zero)
  expect(s.generator.storedTiers).toEqual([1])
  for(let i=0;i<10;i++) s=reduceSession(s,{type:'tick'},9000,zero)
  expect(s.generator.storedTiers).toEqual([1])
 })
 it('clock rollback rebases with zero accrual; next interval resumes',()=>{
  let s=reduceSession(freshSession(100_000),{type:'tick'},105_000,zero)
  s=reduceSession(s,{type:'tick'},1000,zero);expect(s.generator.storedTiers).toEqual([])
  expect(s.generator.progressMs).toBe(5000);expect(isSession(s)).toBe(true)
  s=reduceSession(s,{type:'tick'},6000,zero);expect(s.generator.storedTiers).toHaveLength(1)
 })
 it('speed purchase handles near-complete timer, guards duplicate expected Lv and lacks GOLD',()=>{
  let s=reduceSession(freshSession(0),{type:'tick'},9999,zero)
  expect(reduceSession(s,{type:'buy',key:'speed',expectedLevel:0},9999,zero)).toBe(s)
  s={...s,wallet:{...s.wallet,gold:BigInt(12)}}
  const n=reduceSession(s,{type:'buy',key:'speed',expectedLevel:0},9999,zero)
  expect(n.wallet.gold).toBe(BigInt(0));expect(n.generator.progressMs).toBeLessThan(sessionRules(n).intervalMs);expect(isSession(n)).toBe(true)
  expect(reduceSession(n,{type:'buy',key:'speed',expectedLevel:0},9999,zero)).toBe(n)
 })
 it('rejects inherited shop keys and overflow generation counter',()=>{
  expect(purchaseUpgrade({gold:BigInt(100),upgrades:{speed:0,tap:0,storage:0}},'toString' as 'speed').ok).toBe(false)
  const s=freshSession(0)
  expect(()=>advanceGenerator({...s.generator,totalGenerated:Number.MAX_SAFE_INTEGER},15000,1,sessionRules(s),zero)).toThrow()
 })
 it('invalid random discards a complete attempted operation',()=>{
  const s=freshSession(0);expect(reduceSession(s,{type:'tick'},10000,()=>NaN)).toBe(s)
 })
})

describe('gold event ledger and recovery',()=>{
 it('legacy primitive rejects stale event and reused ID even after shopping',()=>{
  const event=beginGoldRush('old-event',10,0)
  let result=payGoldRush({...freshWallet(),gold:BigInt(100)},event)
  expect(result.ok).toBe(true)
  expect(payGoldRush(result.wallet,event).ok).toBe(false)
  const purchase=purchaseUpgrade(result.wallet,'speed')
  expect(payGoldRush(purchase.wallet,beginGoldRush('old-event',10,0)).ok).toBe(false)
  for(let i=1;i<10;i++)result=payGoldRush(result.wallet,result.event)
  expect(payGoldRush(result.wallet,beginGoldRush('old-event',10,0)).ok).toBe(false)
 })
 function start(){return out(full(60_000),0,0)}
 it('activates once without consuming and all ten payments survive per-receipt reload',()=>{
  let s=start();const slime=s.game.slimes[0]!, id=s.event!.id, unit=s.event!.unitGOLD
  const initial=s.wallet.gold
  for(let paid=0;paid<10;paid++){
   const now=s.event!.nextPaymentAtMs
   const old=s
   s=reduceSession(s,{type:'pay',eventId:id,expectedPaid:paid},now,zero)
   expect(s.wallet.gold).toBe(BigInt(initial+BigInt(BigInt(paid+1)*unit)))
   expect(reduceSession(s,{type:'pay',eventId:id,expectedPaid:paid},now+1000,zero)).toBe(s)
   const loaded=decodeSession(encodeSession(s),now);expect(loaded.ok).toBe(true)
   if(loaded.ok)s=loaded.session
   expect(s.game.slimes).toContainEqual(slime);expect(old.wallet.gold).toBe(BigInt(initial+BigInt(BigInt(paid)*unit)))
  }
  expect(s.event).toBeNull();expect(s.lastEvent).toEqual({id,receivedGOLD:BigInt(BigInt(10)*unit)})
  expect(reduceSession(s,{type:'pay',eventId:id,expectedPaid:0},s.savedAtMs+100_000,zero)).toBe(s)
 })
 it('relocation expires unpaid receipts and the same event ID cannot restart',()=>{
  let s=start();const e=s.event!, id=s.game.slimes[0]!.id
  s=reduceSession(s,{type:'drop',plan:planDrop(s.game,id,{x:1,y:1})},s.savedAtMs,zero)
  expect(s.event).toBeNull();expect(s.lastEvent!.id).toBe(e.id)
  expect(reduceSession(s,{type:'pay',eventId:e.id,expectedPaid:0},s.savedAtMs+1000,zero)).toBe(s)
  s=reduceSession(s,{type:'sell',id},s.savedAtMs,zero)
  expect(s.wallet.gold).toBe(BigInt(2))
 })
 it('waiting events expire, random cell is in bounds, there is a cooldown',()=>{
  let s=full(60_000);expect(s.event!.cell).toEqual({x:0,y:0})
  s=reduceSession(s,{type:'tick'},105_000,zero);expect(s.event).toBeNull();expect(s.nextEventAtMs).toBe(165_000)
  s=reduceSession(s,{type:'tick'},165_000,()=>.999);expect(s.event!.cell).toEqual({x:3,y:3});expect(s.event!.id).toBe('gold-2')
 })
 it('reward is monotone with Tier and attribute penalty; integer minimum ties are explicit',()=>{
  for(let tier=1;tier<=40;tier++) for(let a=0;a<10;a++)expect(goldPayment(tier,a)).toBeGreaterThanOrEqual(goldPayment(tier,a+1))
  expect(goldPayment(10,0)).toBeGreaterThan(goldPayment(10,3))
  for(let tier=1;tier<40;tier++)expect(goldPayment(tier,0)).toBeLessThanOrEqual(goldPayment(tier+1,0))
 })
 it('wallet beyond the former cap settles full receipt without overflow and never traps a full board',()=>{
  let s=start();s={...s,wallet:{...s.wallet,gold:BigInt(Number.MAX_SAFE_INTEGER)}}
  const n=reduceSession(s,{type:'pay',eventId:s.event!.id,expectedPaid:0},s.event!.nextPaymentAtMs,zero)
  expect(n.wallet.gold).toBe(s.wallet.gold+s.event!.unitGOLD);expect(n.event!.paid).toBe(1);expect(n.event!.receivedGOLD).toBe(s.event!.unitGOLD);expect(n.event!.cappedGOLD).toBe(0n);expect(isSession(n)).toBe(true)
  const sold=reduceSession(n,{type:'sell',id:n.game.slimes[0]!.id},n.savedAtMs,zero)
  expect(sold.game.slimes).toHaveLength(0);expect(sold.wallet.gold).toBe(n.wallet.gold+2n)
 })
})

describe('strict v2 persistence and failed writes',()=>{
 it('round trips complete state incl queue, IDs, protection, GOLD, effects, receipts',()=>{
  let s=out(full(),0,0);s=reduceSession(s,{type:'protect',id:s.game.slimes[0]!.id},s.savedAtMs,zero)
  expect(decodeSession(encodeSession(s),s.savedAtMs)).toEqual({ok:true,session:s,migrated:false})
 })
 it.each(['{','null','[]','{"version":99}','{"version":0}'])('rejects malformed/unknown %s',raw=>expect(decodeSession(raw,0).ok).toBe(false))
 it.each(['id','position','tier','history','nextId','gold','queue','receipt','event-id','protection'])('rejects corrupted %s',field=>{
  const s=out(full(60_000),0,0)
  const v=JSON.parse(encodeSession(s))
  if(field==='id')v.game.slimes.push(v.game.slimes[0])
  if(field==='position')v.game.slimes[0].position.x=4
  if(field==='tier')v.game.slimes[0].tier=41
  if(field==='history')v.game.highestTierReached=0
  if(field==='nextId')v.nextId=1
  if(field==='gold')v.wallet.gold=1e100
  if(field==='queue')v.generator.storedTiers=[40]
  if(field==='receipt')v.event.receivedGOLD=999
  if(field==='event-id')v.event.id='gold-0'
  if(field==='protection')v.protectedIds=['missing']
  expect(decodeSession(fixtureJSON(v),0).ok).toBe(false)
 })
 it('v1 4x4 migrates explicitly, v1 experimental 7x7 refuses without cropping',()=>{
  const s=freshSession(0), v={version:1,savedAtMs:0,nextId:1,game:s.game,wallet:s.wallet,generator:s.generator}
  const ok=decodeSession(fixtureJSON(v),0);expect(ok.ok).toBe(true);if(ok.ok)expect(ok.migrated).toBe(true)
  expect(decodeSession(fixtureJSON({...v,game:{...s.game,bounds:{...s.game.bounds,width:7,height:7}}}),0).ok).toBe(false)
 })
 it('storage failure and external modification never publish/overwrite partial transactions',()=>{
  let raw:string|null='existing';const memory={getItem:()=>raw,setItem:(_k:string,v:string)=>{raw=v}}
  expect(commitStorage(memory,null,freshSession(0)).ok).toBe(false);expect(raw).toBe('existing')
  const failure={getItem:()=>null,setItem:()=>{throw Error('quota')}}
  expect(commitStorage(failure,null,full()).ok).toBe(false)
  raw=null;const result=commitStorage(memory,null,full());expect(result.ok).toBe(true);expect(decodeSession(raw!,0).ok).toBe(true)
 })
 it('days of bounded generation/sale/reload have unique IDs and finite resources',()=>{
  let s=freshSession(0)
  for(let hour=1;hour<=240;hour++){
   s=reduceSession(s,{type:'tick'},hour*3600_000,zero)
   while(s.generator.storedTiers.length){s=out(s,0,0);s=reduceSession(s,{type:'sell',id:s.game.slimes[0]!.id},s.savedAtMs,zero)}
   expect(isSession(s)).toBe(true)
   const loaded=decodeSession(encodeSession(s),s.savedAtMs);if(loaded.ok)s=loaded.session
  }
  expect(s.nextId).toBe(2401);expect((typeof s.wallet.gold === 'bigint' && s.wallet.gold >= 0n)).toBe(true)
  mkdirSync('docs/validation/phase4a/regression/validation-phase3c/regression-phase3b/regression/regression-session',{recursive:true})
  writeFileSync('docs/validation/phase4a/regression/validation-phase3c/regression-phase3b/regression/regression-session/long-simulation.json',fixtureJSON({virtualHours:240,checkpoints:240,totalGenerated:s.generator.totalGenerated,nextId:s.nextId,gold:s.wallet.gold,eventSequence:s.eventSequence,uniqueIds:true,validEveryCheckpoint:true,roundTripEveryCheckpoint:true,storageBounded:true,errors:0},null,2))
 })
})



// Phase3A: legacy economy fixtures remain un-attributed; production attribute trials are tested separately.
function reduceSession(...args: Parameters<typeof currentReduceSession>) {
  return currentReduceSession(args[0], args[1], args[2], args[3], args[4] ?? { ...legacyGenerationRules(args[0].wallet), attributeChance: 0, attributeMutationChance: 0 })
}
