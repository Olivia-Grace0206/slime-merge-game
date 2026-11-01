import { afterEach, describe, expect, it, vi } from 'vitest'
import { freshSession, reduceSession, type Session } from '../../src/core/progression/session'
import { withdrawFocused } from '../../src/core/progression/focus'
import { decodeSession, encodeSession } from '../../src/core/progression/persistence'
import { SessionStore } from '../../src/app/sessionStore'
import type { Attributes } from '../../src/domain/attributes'
function fixture(count=11): Session {
 const s=freshSession(0),tiers=Array.from({length:count},(_,i)=>10-i%10),attrs=tiers.map((_,i):Attributes=>i%2?[{id:'fire',level:i%9+1}]:[{id:'ice',level:2}])
 return {...s,generationMode:'focused',researchLevel:1,researchMaxTier:10,game:{...s.game,highestTierReached:10},wallet:{...s.wallet,upgrades:{speed:0,tap:0,storage:1}},generator:{...s.generator,storedTiers:tiers,storedAttributes:attrs,totalGenerated:count}}
}
const stream=(...numbers:number[])=>{let i=0;return()=>numbers[i++]??.99}
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks()})
describe('FIFO head10 focus contract',()=>{
 it.each([0,1,9])('%i stored refuses before any RNG/time accrual',count=>{
  const s=fixture(count),random=vi.fn(()=>.5)
  expect(reduceSession(s,{type:'withdraw',expectedId:1,expectedMode:'focused'},100000,random)).toBe(s)
  expect(random).not.toHaveBeenCalled()
 })
 it.each([10,11,12,20])('%i stored consumes exactly first10 including high Tier and attributes',count=>{
  const s=fixture(count),generator=s.generator
  // Pure queue operation is independent of upgrade capacity for these source arrays.
  const r=withdrawFocused(s.game,generator,'one',.35,stream(.5,.9))
  expect(r.ok).toBe(true);expect(r.generator.storedTiers).toEqual(generator.storedTiers.slice(10));expect(r.generator.storedAttributes).toEqual(generator.storedAttributes!.slice(10))
  expect(r.game.slimes).toHaveLength(1);expect(r.game.slimes[0]).toMatchObject({tier:1,attributes:[]})
  expect(r.game.highestTierReached).toBe(10);expect(s.generator).toBe(generator)
 })
 it.each([0,.349999,.35,.999999])('attribute roll %f respects35%% boundary without guarantee',roll=>{
  const s=fixture(11),n=reduceSession(s,{type:'withdraw',expectedId:1,expectedMode:'focused'},0,stream(.5,roll,0))
  expect(n.generator.storedTiers).toEqual([10]);expect(n.generator.storedAttributes).toEqual([s.generator.storedAttributes![10]])
  expect(n.game.slimes[0]!.attributes).toEqual(roll<.35?[{id:'fire',level:1}]:[])
  expect(n.focusedGenerated).toBe(1);expect(n.wallet).toEqual(s.wallet)
  expect(decodeSession(encodeSession(n),0)).toEqual({ok:true,session:n,migrated:false})
 })
 it('normal FIFO still withdraws exactly first one, without re-drawing traits',()=>{
  const s={...fixture(),generationMode:'normal'} as Session,n=reduceSession(s,{type:'withdraw',expectedId:1,expectedMode:'normal'},0,()=>.5)
  expect(n.game.slimes[0]).toMatchObject({tier:10,attributes:s.generator.storedAttributes![0]})
  expect(n.generator.storedTiers).toEqual(s.generator.storedTiers.slice(1));expect(n.generator.storedAttributes).toEqual(s.generator.storedAttributes!.slice(1))
 })
 it('mode change alone preserves queue; duplicate ID/mode cannot consume twice',()=>{
  const s=fixture(),changed=reduceSession(s,{type:'generation-mode',value:'normal'},0,()=>.5)
  expect(changed.generator).toEqual(s.generator);expect(changed.focusedGenerated).toBe(0)
  expect(reduceSession(changed,{type:'withdraw',expectedId:1,expectedMode:'focused'},0,()=>.5)).toBe(changed)
  const n=reduceSession(s,{type:'withdraw',expectedId:1,expectedMode:'focused'},0,()=>.99)
  expect(reduceSession(n,{type:'withdraw',expectedId:1,expectedMode:'focused'},0,()=>.99)).toBe(n)
 })
 it.each([NaN,-1,1])('invalid random %f rolls back FIFO and new individual',r=>{
  const s=fixture();expect(reduceSession(s,{type:'withdraw',expectedId:1,expectedMode:'focused'},0,()=>r)).toBe(s)
 })
 it('board full refuses without spending or random; no unexpected Tier discovery',()=>{
  const start=fixture(),s={...start,nextId:17,game:{...start.game,slimes:Array.from({length:16},(_,i)=>({id:`p-${i+1}`,tier:1,position:{x:i%4,y:Math.floor(i/4)},attributes:[]}))}},random=vi.fn(()=>0)
  expect(reduceSession(s,{type:'withdraw',expectedId:17,expectedMode:'focused'},0,random)).toBe(s);expect(random).not.toHaveBeenCalled()
 })
 it('Quota and external updates retain original attributed FIFO; retry is one transaction',async()=>{
  vi.spyOn(Date,'now').mockReturnValue(0);vi.stubGlobal('navigator',{locks:{request:async(_:string,run:()=>unknown)=>run()}})
  const s=fixture(),original=encodeSession(s);let raw=original,fail=true
  const port={getItem:()=>raw,setItem:(_:string,value:string)=>{if(fail)throw Error('Quota');raw=value}},store=new SessionStore(port,0),cmd={type:'withdraw',expectedId:1,expectedMode:'focused'} as const
  await store.dispatch(cmd,0,()=>.99);expect(store.state.session).toEqual(s);expect(raw).toBe(original)
  fail=false;store.retry();await Promise.all([store.dispatch(cmd,0,()=>.99),store.dispatch(cmd,0,()=>.99)])
  expect(store.state.session.generator.storedTiers).toEqual([10]);expect(store.state.session.focusedGenerated).toBe(1)
  const other=new SessionStore(port,0),before=other.state.session;raw='other tab'
  await other.dispatch({type:'generation-mode',value:'normal'},0,()=>.99);expect(other.state.session).toBe(before);expect(raw).toBe('other tab')
 })
})
