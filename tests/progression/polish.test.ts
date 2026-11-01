import { describe, it, expect } from 'vitest'
import { freshSession as newSession, reduceSession as currentReduceSession, goldPayment, sessionRules, EXPERIMENTAL_PHASE2, type Session } from '../../src/core/progression/session'
// Legacy regression fixture: research40 and GOLD already unlocked, as migrated pre-research saves.
const freshSession = (now: number) => ({ ...newSession(now), researchLevel: 16, researchMaxTier: 40, goldCellUnlocked: true })
import { withdrawRandom } from '../../src/core/progression/generation'
import { encodeSession, decodeSession, isSession, commitStorage } from '../../src/core/progression/persistence'
import { planDrop } from '../../src/core/merge/plan'
const zero = () => 0
function ready() { const s=freshSession(0); return {...s,generator:{...s.generator,storedTiers: [1,1,1], storedAttributes: [1,1,1].map(() => []),totalGenerated:3}} }
function add(s:Session, random=zero) { return reduceSession(s,{type:'withdraw',expectedId:s.nextId},s.savedAtMs,random) }
function active(tier=5) {
 let s=reduceSession(freshSession(0),{type:'tick'},60000,zero)
 s={...s,game:{...s.game,highestTierReached:tier},generator:{...s.generator,storedTiers: [tier], storedAttributes: [tier].map(() => []),totalGenerated:1}}
 return add(s)
}
function pay(s:Session) { return reduceSession(s,{type:'pay',eventId:s.event!.id,expectedPaid:s.event!.paid},s.event!.nextPaymentAtMs,zero) }
function four() { let s=active();for(let i=0;i<4;i++)s=pay(s);return s }

describe('one-click random FIFO transaction',()=>{
 it.each(Array.from({length:16},(_,i)=>i))('uniform equal-width bucket %i and exact cell placement',i=>{
  const s=ready(),n=add(s,()=> (i+.5)/16)
  expect(n.game.slimes[0]!.position).toEqual({x:i%4,y:Math.floor(i/4)})
  expect(n.generator.storedTiers).toEqual([1,1]);expect(n.nextId).toBe(2)
  expect(isSession(n)).toBe(true)
 })
 it('one free cell always chosen including highest valid random',()=>{
  const s=ready();const game={...s.game,slimes:Array.from({length:15},(_,i)=>({id:`x-${i}`,tier:1,position: {x:i%4,y:Math.floor(i/4)}, attributes: []}))}
  for(const n of [0,.2,.999999])expect(withdrawRandom(game,s.generator,'new',()=>n).game.slimes[15]!.position).toEqual({x:3,y:3})
 })
 it('full board / empty stock rejects without calling random, even after elapsed time',()=>{
  const s=ready();const full={...s,game:{...s.game,slimes:Array.from({length:16},(_,i)=>({id:`x-${i}`,tier:1,position: {x:i%4,y:Math.floor(i/4)}, attributes: []}))}}
  const fail=()=>{throw Error('must not draw')}
  expect(reduceSession(full,{type:'withdraw',expectedId:1},100000,fail)).toBe(full)
  const empty=freshSession(0);expect(reduceSession(empty,{type:'withdraw',expectedId:1},100000,fail)).toBe(empty)
 })
 it('stale rapid duplicate refuses; distinct queued inputs never overwrite stock/cells',()=>{
  const s=ready(),n=add(s)
  expect(reduceSession(n,{type:'withdraw',expectedId:s.nextId},0,zero)).toBe(n)
  const last=add(add(n));expect(last.game.slimes).toHaveLength(3);expect(last.generator.storedTiers).toHaveLength(0)
  expect(new Set(last.game.slimes.map(x=>`${x.position.x},${x.position.y}`)).size).toBe(3)
  expect(last.game.highestTierReached).toBe(1) // adjacent addition never auto-merges
 })
 it.each([NaN,-1,1,Infinity])('invalid draw %s leaves complete state unchanged',n=>expect(add(ready(),()=>n)).toEqual(ready()))
 it('empty gold cell remains a candidate and random add starts that event',()=>{
  const n=active();expect(n.event!.tier).toBe(5);expect(n.event!.sourceId).toBe(n.game.slimes[0]!.id)
 })
 it('save failure does not publish attempted queue/board update',()=>{
  const s=ready(),next=add(s),raw=encodeSession(s)
  expect(commitStorage({getItem:()=>raw,setItem:()=>{throw Error('quota')}},raw,next).ok).toBe(false)
  expect(decodeSession(raw,0)).toEqual({ok:true,session:s,migrated:false})
 })
})

describe('gold source identity and atomic exit',()=>{
 it('350ms × 10 individually recorded payments and no early credit',()=>{
  let s=active();const id=s.event!.id
  expect(EXPERIMENTAL_PHASE2.paymentIntervalMs).toBe(350)
  for(let i=0;i<10;i++){
   const at=s.event!.nextPaymentAtMs,prev=s
   expect(reduceSession(s,{type:'pay',eventId:id,expectedPaid:i},at-1,zero)).toBe(s)
   s=pay(s);expect(s.wallet.gold-prev.wallet.gold).toBe(5)
   expect(reduceSession(s,{type:'pay',eventId:id,expectedPaid:i},at,zero)).toBe(s)
  }
  expect(s.event).toBeNull();expect(s.wallet.gold).toBe(50)
  expect(reduceSession(s,{type:'pay',eventId:id,expectedPaid:10},100000,zero)).toBe(s)
 })
 it('occupied cells excluded; all-full skips spawn with finite cooldown and no ID consumed',()=>{
  const s=ready(),n=add(s)
  const spawn=reduceSession(n,{type:'tick'},60000,zero)
  expect(spawn.event!.cell).toEqual({x:1,y:0});expect(spawn.event!.tier).toBeNull()
  const full={...s,game:{...s.game,slimes:Array.from({length:16},(_,i)=>({id:`x-${i}`,tier:1,position: {x:i%4,y:Math.floor(i/4)}, attributes: []}))}}
  const blocked=reduceSession(full,{type:'tick'},60000,zero)
  expect(blocked.event).toBeNull();expect(blocked.eventSequence).toBe(0);expect(blocked.nextEventAtMs).toBe(120000)
 })
 it.each(['move','sell','merge'] as const)('4/10 reload then %s expires 6 payments; never resumes on replacement',kind=>{
  const loaded=decodeSession(encodeSession(four()),0);expect(loaded.ok).toBe(true);if(!loaded.ok)return
  let s=loaded.session;const id=s.event!.id,source=s.event!.sourceId!,received=s.wallet.gold
  if(kind==='move')s=reduceSession(s,{type:'drop',plan:planDrop(s.game,source,{x:3,y:3})},s.event!.nextPaymentAtMs,zero)
  if(kind==='sell')s=reduceSession(s,{type:'sell',id:source},s.event!.nextPaymentAtMs,zero)
  if(kind==='merge'){
   s={...s,nextId:10,game:{...s.game,slimes:[...s.game.slimes,{id:'p-8',tier:5,position: {x:1,y:0}, attributes: []},{id:'p-9',tier:5,position: {x:1,y:1}, attributes: []}]}}
   s=reduceSession(s,{type:'drop',plan:planDrop(s.game,'p-8',{x:0,y:0})},s.event!.nextPaymentAtMs,zero)
  }
  expect(s.event).toBeNull();expect(s.lastEvent).toEqual({id,receivedGOLD:received,paid:4})
  expect(s.wallet.gold).toBe(received+(kind==='sell'?32:0))
  expect(reduceSession(s,{type:'pay',eventId:id,expectedPaid:4},s.savedAtMs+10000,zero)).toBe(s)
  expect(isSession(s)).toBe(true)
 })
 it('same Tier replacement with another ID cannot claim a pending receipt',()=>{
  const s=four(),e=s.event!
  const replaced={...s,nextId:100,game:{...s.game,slimes:[{...s.game.slimes[0]!,id:'p-99'}]}}
  const n=reduceSession(replaced,{type:'pay',eventId:e.id,expectedPaid:4},e.nextPaymentAtMs,zero)
  expect(n.wallet.gold).toBe(s.wallet.gold);expect(n.event).toBeNull()
 })
 it('payment wins before departure only once; departure-first wins with zero extra receipt',()=>{
  const s=four(),id=s.event!.sourceId!,now=s.event!.nextPaymentAtMs
  const paid=reduceSession(s,{type:'tick'},now,zero)
  const moved=reduceSession(paid,{type:'drop',plan:planDrop(paid.game,id,{x:3,y:3})},now,zero)
  expect(moved.wallet.gold).toBe(s.wallet.gold+5);expect(moved.lastEvent!.paid).toBe(5)
  const first=reduceSession(s,{type:'drop',plan:planDrop(s.game,id,{x:3,y:3})},now,zero)
  expect(first.wallet.gold).toBe(s.wallet.gold);expect(first.event).toBeNull()
 })
 it('failed departure keeps source, event and wallet in saved state',()=>{
  const s=four(),raw=encodeSession(s),next=reduceSession(s,{type:'sell',id:s.event!.sourceId!},s.savedAtMs,zero)
  expect(commitStorage({getItem:()=>raw,setItem:()=>{throw Error('quota')}},raw,next).ok).toBe(false)
  const load=decodeSession(raw,0);expect(load.ok&&load.session).toEqual(s)
 })
 it('cap counts receipts without overflow; replay cannot reclaim capped reward',()=>{
  let s=active(40);s={...s,wallet:{...s.wallet,gold:Number.MAX_SAFE_INTEGER-1}}
  s=pay(s);expect(s.event!.receivedGOLD).toBe(1);expect(s.event!.cappedGOLD).toBe(goldPayment(40,0)-1)
  for(let i=1;i<10;i++)s=pay(s)
  expect(isSession(s)).toBe(true);expect(s.wallet.gold).toBe(Number.MAX_SAFE_INTEGER)
 })
})

describe('explicit migration and protection',()=>{
 it.each([null,'waiting','active','detached'] as const)('legacy v2 %s preserves GOLD, queue, IDs and frozen unit',state=>{
  const s=state==='active'||state==='detached'?four():ready()
  const legacy=JSON.parse(JSON.stringify({...s,version:2}))
  if(state==='waiting')legacy.event={id:'gold-1',sequence:1,cell:{x:3,y:3},expiresAtMs:45000,tier:null,sourceId:null,attributeCount:0,paid:0,receivedGOLD:0,unitGOLD:0,nextPaymentAtMs:0}
  if(legacy.event){legacy.eventSequence=1;delete legacy.event.rewardVersion;if(legacy.event.tier!==null){legacy.event.unitGOLD=goldPayment(legacy.event.tier,0,1);legacy.event.receivedGOLD=legacy.event.paid*legacy.event.unitGOLD;legacy.wallet.gold=legacy.event.receivedGOLD}}
  if(state==='detached')legacy.game.slimes=[]
  const raw=JSON.stringify(legacy),load=decodeSession(raw,1000)
  expect(load.ok).toBe(true);if(!load.ok)return
  expect(load.migrated).toBe(true);expect(load.session.version).toBe(5);expect(load.session.wallet).toEqual(legacy.wallet)
  expect(load.session.generator).toEqual(legacy.generator);expect(isSession(load.session)).toBe(true)
  if(state==='active') {const n=pay(load.session);expect(n.wallet.gold-load.session.wallet.gold).toBe(1)}
  if(state==='detached'){const n=pay(load.session);expect(n.event).toBeNull();expect(n.wallet.gold).toBe(legacy.wallet.gold)}
 })
 it('corrupt v2 unit / receipt rejected without forgiving malformed data',()=>{
  const s=JSON.parse(JSON.stringify({...four(),version:2}));delete s.event.rewardVersion
  expect(decodeSession(JSON.stringify(s),0).ok).toBe(false)
 })
 it('protected specimen survives refused sale/reload and remains usable as merge material',()=>{
  let s=add(add(add(ready())));s=reduceSession(s,{type:'protect',id:'p-1'},0,zero)
  expect(reduceSession(s,{type:'sell',id:'p-1'},0,zero)).toBe(s)
  expect(decodeSession(encodeSession(s),0).ok).toBe(true)
  s=reduceSession(s,{type:'drop',plan:planDrop(s.game,'p-1',{x:1,y:0})},0,zero)
  expect(s.game.slimes).toHaveLength(1);expect(s.protectedIds).toEqual([])
 })
 it.each([1,2,3,4,5,10,20,30,40])('Tier%i payment is safe, increases with tier, decreases with attributes',tier=>{
  expect(Number.isSafeInteger(goldPayment(tier,0)*10)).toBe(true)
  if(tier<40)expect(goldPayment(tier+1,0)).toBeGreaterThan(goldPayment(tier,0))
  for(let a=0;a<10;a++)expect(goldPayment(tier,a)).toBeGreaterThanOrEqual(goldPayment(tier,a+1))
 })
})


// Phase3A: legacy economy fixtures remain un-attributed; production attribute trials are tested separately.
function reduceSession(...args: Parameters<typeof currentReduceSession>) {
  return currentReduceSession(args[0], args[1], args[2], args[3], args[4] ?? { ...sessionRules(args[0]), attributeChance: 0, attributeMutationChance: 0 })
}
