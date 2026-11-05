import { fixtureJSON } from '../helpers/serialization'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ATTRIBUTE_IDS, type Attributes } from '../../src/domain/attributes'
import { stripAttributes } from '../../src/core/attributes/strip'
import { boardEffects, saleValue, specialCellWeights } from '../../src/core/attributes/effects'
import { operationZoneAt } from '../../src/core/input/dropZones'
import { freshSession, reduceSession, sessionRules, goldPayment, type Session } from '../../src/core/progression/session'
import { decodeSession, encodeSession, isSession } from '../../src/core/progression/persistence'
import { SessionStore } from '../../src/app/sessionStore'
import { planDrop } from '../../src/core/merge/plan'
const a=(id:Attributes[number]['id'],level=3):Attributes=>[{id,level}]
function fixture(attrs:readonly Attributes[]=[a('fire')]):Session {
 const s=freshSession(0)
 return {...s,nextId:attrs.length+1,researchLevel:1,researchMaxTier:10,protectedIds:attrs.length?['p-1']:[],wallet:{gold:BigInt(500),upgrades:{speed:0,tap:0,storage:0}},game:{...s.game,highestTierReached:8,slimes:attrs.map((attributes,i)=>({id:`p-${i+1}`,tier:8,position:{x:i%4,y:Math.floor(i/4)},attributes,tag:`individual-${i}`}))}}
}
const quiet=()=>.99
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals()})
describe('free whole-attribute removal',()=>{
 it.each([1,2,3])('%i attributes removed; only target attributes/revision change',count=>{
  const attrs=[...a('fire'),...a('ice'),...a('mutation')].slice(0,count),s=fixture([attrs,a('gold')]),before=fixtureJSON(s)
  const r=stripAttributes(s.game,'p-1')
  expect(r.ok&&r.changed).toBe(true);expect(r.game.revision).toBe(s.game.revision+1)
  expect(r.game.slimes[0]).toEqual({...s.game.slimes[0],attributes:[]});expect(r.game.slimes[1]).toBe(s.game.slimes[1]);expect(r.game.highestTierReached).toBe(8)
  const n=reduceSession(s,{type:'strip-attributes',id:'p-1'},0,quiet)
  expect(n.wallet).toEqual(s.wallet);expect(n.protectedIds).toEqual(s.protectedIds);expect(n.researchLevel).toBe(s.researchLevel);expect(n.nextId).toBe(s.nextId);expect(n.game.slimes).toHaveLength(2)
  expect(fixtureJSON(s)).toBe(before);expect(isSession(n)).toBe(true)
  expect(decodeSession(encodeSession(n),0)).toEqual({ok:true,session:n,migrated:false})
 })
 it.each(['','missing','p-999'])('invalid target %s refuses before elapsed/RNG/resources',id=>{
  const s=fixture(),random=vi.fn(quiet);expect(reduceSession(s,{type:'strip-attributes',id},100000,random)).toBe(s);expect(random).not.toHaveBeenCalled()
  expect(stripAttributes(s.game,id)).toEqual({ok:false,changed:false,game:s.game})
 })
 it('un-attributed target is no-op including clocks, sequence, ID, RNG and storage writes',async()=>{
  const s=fixture([[]]),random=vi.fn(quiet),r=stripAttributes(s.game,'p-1')
  expect(r).toEqual({ok:true,changed:false,game:s.game});expect(reduceSession(s,{type:'strip-attributes',id:'p-1'},999999,random)).toBe(s);expect(random).not.toHaveBeenCalled()
  vi.spyOn(Date,'now').mockReturnValue(0);vi.stubGlobal('navigator',{locks:{request:async(_:string,run:()=>unknown)=>run()}})
  const setter=vi.fn(),store=new SessionStore({getItem:()=>encodeSession(s),setItem:setter},0)
  await store.dispatch({type:'strip-attributes',id:'p-1'},0,random);expect(setter).not.toHaveBeenCalled();expect(store.state.session).toEqual(s)
 })
 it.each(ATTRIBUTE_IDS)('%s effect ends while unrelated individuals and base pace persist',id=>{
  const s=fixture([a(id)]),n=reduceSession(s,{type:'strip-attributes',id:'p-1'},0,quiet)
  expect(n.game.slimes[0]!.attributes).toEqual([])
  expect(boardEffects(n.game)).toEqual(boardEffects(fixture([[]]).game))
  expect(saleValue(n.game.slimes[0]!)).toBe(32768n);expect(sessionRules(n).intervalMs).toBe(15000);expect(sessionRules(n).tapAdvanceMs).toBe(1000)
  expect(specialCellWeights(n.game,[{x:1,y:0},{x:3,y:3}])).toEqual([1,1])
 })
 it.each([['fire','gold'],['ice','lightning'],['luck','mutation']] as const)('%s+%s combo ends on stripping', (first,second)=>{
  const s=fixture([[...a(first),...a(second)]]),n=reduceSession(s,{type:'strip-attributes',id:'p-1'},0,quiet)
  expect(boardEffects(n.game)).toEqual(boardEffects(fixture([[]]).game));expect(saleValue(n.game.slimes[0]!)).toBe(32768n)
 })
 it('ice removal preserves normal progress fraction without producing any extra specimen',()=>{
  const s=fixture([a('ice')]),interval=sessionRules(s).intervalMs,ready={...s,generator:{...s.generator,progressMs:Math.floor(interval*.6)}}
  const n=reduceSession(ready,{type:'strip-attributes',id:'p-1'},0,quiet)
  expect(n.generator.progressMs/sessionRules(n).intervalMs).toBeCloseTo(ready.generator.progressMs/interval,3)
  expect(n.generator.totalGenerated).toBe(0);expect(n.generator.storedTiers).toEqual([])
 })
 it('remaining nature sources keep progress fraction; final source stops and preserves cumulative count',()=>{
  const s=fixture([a('nature',5),a('nature',1)]),oldI=boardEffects(s.game).natureIntervalMs!,ready={...s,generator:{...s.generator,totalGenerated:5},nature:{...s.nature,progressMs:Math.floor(oldI*.4),totalGenerated:2}}
  const n=reduceSession(ready,{type:'strip-attributes',id:'p-1'},0,quiet),newI=boardEffects(n.game).natureIntervalMs!
  expect(n.nature.progressMs/newI).toBeCloseTo(ready.nature.progressMs/oldI,3);expect(n.nature.totalGenerated).toBe(2)
  const last=reduceSession(n,{type:'strip-attributes',id:'p-2'},0,quiet)
  expect(last.nature.progressMs).toBe(0);expect(last.nature.totalGenerated).toBe(2);expect(last.generator.totalGenerated).toBe(5);expect(isSession(last)).toBe(true)
 })
 it('removing light rebases remaining supported ice/nature without recursive or extra generation',()=>{
  const s=fixture([a('light',5),[...a('nature'),...a('ice')]]),oldNature=boardEffects(s.game).natureIntervalMs!,oldNormal=sessionRules(s).intervalMs
  const ready={...s,generator:{...s.generator,progressMs:Math.floor(oldNormal*.5)},nature:{...s.nature,progressMs:Math.floor(oldNature*.5)}}
  const n=reduceSession(ready,{type:'strip-attributes',id:'p-1'},0,quiet)
  expect(n.nature.progressMs/boardEffects(n.game).natureIntervalMs!).toBeCloseTo(.5,3)
  expect(n.generator.progressMs/sessionRules(n).intervalMs).toBeCloseTo(.5,3);expect(n.generator.totalGenerated).toBe(0)
 })
 it('active GOLD contract retains frozen count/unit/paid and same ID+cell, then pays old amount',()=>{
  const base=fixture([[...a('fire'),...a('gold'),...a('dark')]]),unit=goldPayment(8,3,2)
  const s:Session={...base,goldCellUnlocked:true,eventSequence:1,event:{id:'gold-1',sequence:1,rewardVersion:2,cell:{x:0,y:0},tier:8,sourceId:'p-1',attributeCount:3,paid:4,receivedGOLD:BigInt(unit*BigInt(4)),cappedGOLD:BigInt(0),unitGOLD:unit,nextPaymentAtMs:350,expiresAtMs:45000}}
  const n=reduceSession(s,{type:'strip-attributes',id:'p-1'},0,quiet);expect(n.event).toEqual(s.event);expect(n.wallet.gold).toBe(s.wallet.gold)
  const loaded=decodeSession(encodeSession(n),0);expect(loaded.ok).toBe(true);if(!loaded.ok)throw Error(loaded.reason)
  const paid=reduceSession(loaded.session,{type:'pay',eventId:'gold-1',expectedPaid:4},350,quiet)
  expect(paid.wallet.gold).toBe(s.wallet.gold+unit);expect(paid.event?.attributeCount).toBe(3);expect(paid.event?.paid).toBe(5)
 })
 it('clearing revision invalidates older merge/swap preview; no individual is moved or consumed',()=>{
  const s=fixture([a('fire'),[],[]]),plan=planDrop(s.game,'p-1',{x:1,y:0},10),n=reduceSession(s,{type:'strip-attributes',id:'p-1'},0,quiet)
  expect(reduceSession(n,{type:'drop',plan},0,quiet)).toBe(n);expect(n.game.slimes.map(x=>[x.id,x.position,x.tier])).toEqual(s.game.slimes.map(x=>[x.id,x.position,x.tier]))
 })
 it('revision exhaustion refuses without partial attribute loss',()=>{
  const s=fixture(),game={...s.game,revision:Number.MAX_SAFE_INTEGER-1};expect(stripAttributes(game,'p-1').ok).toBe(false)
 })
 it('Quota preserves all attributes/clock/position/wallet; retry saves once; external raw conflict refuses',async()=>{
  vi.spyOn(Date,'now').mockReturnValue(0);vi.stubGlobal('navigator',{locks:{request:async(_:string,run:()=>unknown)=>run()}})
  const s=fixture([[...a('ice'),...a('nature')]]),original=encodeSession(s);let raw=original,fail=true,writes=0
  const port={getItem:()=>raw,setItem:(_:string,v:string)=>{if(fail)throw Error('Quota');writes++;raw=v}},store=new SessionStore(port,0),cmd={type:'strip-attributes',id:'p-1'} as const
  await store.dispatch(cmd,0,quiet);expect(store.state.session).toEqual(s);expect(raw).toBe(original)
  fail=false;store.retry();await Promise.all([store.dispatch(cmd,0,quiet),store.dispatch(cmd,0,quiet)]);expect(writes).toBe(1);expect(store.state.session.game.slimes[0]!.attributes).toEqual([])
  const other=new SessionStore(port,0),before=other.state.session;raw='other tab';await other.dispatch({type:'protect',id:'p-1'},0,quiet);expect(other.state.session).toBe(before);expect(raw).toBe('other tab')
 })
})
describe('exclusive strip vs sale drop destinations',()=>{
 const zones={strip:{left:0,right:100,top:0,bottom:50},sale:{left:0,right:100,top:56,bottom:106}}
 it.each([[0,0,'strip'],[99,49,'strip'],[50,50,null],[50,55,null],[0,56,'sale'],[99,105,'sale'],[100,56,null],[50,106,null],[-1,1,null],[NaN,10,null]] as const)('point(%s,%s) resolves to %s', (clientX,clientY,want)=>expect(operationZoneAt({clientX,clientY},zones)).toBe(want))
 it('overlap refuses; absent or invalid rectangles cannot become a destructive destination',()=>{
  expect(operationZoneAt({clientX:50,clientY:25},{strip:zones.strip,sale:zones.strip})).toBe('ambiguous')
  expect(operationZoneAt({clientX:50,clientY:25},{strip:null,sale:{...zones.sale,left:NaN}})).toBeNull()
 })
})
