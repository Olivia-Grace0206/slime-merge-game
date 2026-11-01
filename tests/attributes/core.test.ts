import { describe, it, expect, vi, afterEach } from 'vitest'
import { ATTRIBUTE_IDS, isAttributes, type Attributes } from '../../src/domain/attributes'
import { drawAttributes, inheritAttributes, mutateAttributes } from '../../src/core/attributes/inheritance'
import { planDrop } from '../../src/core/merge/plan'
import { applyPlan } from '../../src/core/merge/apply'
import { stateSnapshot } from '../../src/core/board/state'
import { freshSession, reduceSession, goldPayment, type Session } from '../../src/core/progression/session'
import { decodeSession, encodeSession, SAVE_KEY, isSession } from '../../src/core/progression/persistence'
import { withdrawToCell } from '../../src/core/progression/generation'
import { SessionStore } from '../../src/app/sessionStore'
const fire=(level=1):Attributes=>[{id:'fire',level}]
const quiet=()=>.9
function stream(...values:number[]) { let i=0; return ()=>values[i++ % values.length]! }
function seed(initial=73) { let n=initial;return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296} }
function board(inputs: readonly Attributes[], tier=1):Session {
  const s=freshSession(0)
  return {...s,nextId:inputs.length+1,researchLevel:16,researchMaxTier:40,game:{...s.game,highestTierReached:tier,slimes:inputs.map((attributes,i)=>({id:`p-${i+1}`,tier,attributes,position:{x:i%4,y:Math.floor(i/4)}}))}}
}
function merge(s:Session,random=quiet) { return reduceSession(s,{type:'drop',plan:planDrop(s.game,'p-1',{x:1,y:0},s.researchMaxTier)},0,random) }
afterEach(()=>vi.unstubAllGlobals())
describe('attribute model and deterministic genetics',()=>{
 it.each(ATTRIBUTE_IDS)('%s valid at1/99 and uniform generated ID',id=>{
  expect(isAttributes([{id,level:1}])).toBe(true);expect(isAttributes([{id,level:99}])).toBe(true)
  expect(drawAttributes(stream(0,(ATTRIBUTE_IDS.indexOf(id)+.5)/10))).toEqual([{id,level:1}])
 })
 it.each([null,{},[{id:'water',level:1}],[{id:'fire',level:0}],[{id:'fire',level:100}],[{id:'fire',level:1.2}],[{id:'fire',level:NaN}],[{id:'fire',level:1},{id:'fire',level:2}],[{id:'fire',level:1,awakened:true}]])('reject invalid attributes %j',a=>expect(isAttributes(a)).toBe(false))
 it('none, boundary probability, seeded reproducibility and invalid randomness',()=>{
  expect(isAttributes([])).toBe(true);expect(drawAttributes(()=>.08)).toEqual([])
  const a=seed(),b=seed();expect(Array.from({length:1000},()=>drawAttributes(a))).toEqual(Array.from({length:1000},()=>drawAttributes(b)))
  for(const x of [NaN,Infinity,-1,1]) { expect(()=>drawAttributes(()=>x)).toThrow();expect(()=>mutateAttributes([],()=>x)).toThrow() }
  expect(()=>drawAttributes(quiet,2)).toThrow();expect(()=>mutateAttributes([],quiet,-1)).toThrow()
 })
 it.each([[2,2,3],[4,2,4],[4,4,5],[3,0,3],[99,99,99]])('growth %i/%i ->%i is provisional and independent of input count',(a,b,out)=>{
  const inputs=[fire(a),b?fire(b):[],[]];expect(inheritAttributes(inputs)).toEqual(fire(out))
  expect(inheritAttributes([...inputs,[],[]])).toEqual(fire(out))
 })
 it('multiple attributes grow independently without decreasing any inherited Lv',()=>{
  expect(inheritAttributes([[{id:'fire',level:2},{id:'ice',level:4}],fire(2),[{id:'ice',level:1}]])).toEqual([{id:'fire',level:3},{id:'ice',level:4}])
 })
 it.each([3,5])('%i merge copies normal result without unique growth/mutation bonus',count=>{
  const s=board([fire(3),...Array.from({length:count-1},():Attributes=>[])])
  const n=merge(s);expect(n.game.slimes).toHaveLength(count===3?1:2)
  for(const x of n.game.slimes)expect(x.attributes).toEqual(fire(3))
  const random=vi.fn(stream(0,.5)),m=merge(s,random)
  expect(random).toHaveBeenCalledTimes(2) // one chance + one ID for the whole group, including both five outputs
  for(const x of m.game.slimes) {expect(x.attributes).toHaveLength(2);expect(x.attributes).toContainEqual({id:'fire',level:3})}
 })
 it.each([8,11])('%i inputs use only their group, all remainder data preserved',count=>{
  const s=board(Array.from({length:count},(_,i)=>i<5?fire():[{id:'ice',level:2}]))
  const p=planDrop(s.game,'p-1',{x:1,y:0});expect(p.kind).toBe('merge');if(p.kind!=='merge')throw Error('merge')
  const n=merge(s)
  for(const g of p.groups)for(const pos of g.outputs)expect(n.game.slimes.find(x=>x.position.x===pos.x&&x.position.y===pos.y)?.attributes).toEqual(inheritAttributes(g.consumedIds.map(id=>s.game.slimes.find(x=>x.id===id)!.attributes!)))
  for(const id of p.remainderIds)expect(n.game.slimes.find(x=>x.id===id)).toEqual(s.game.slimes.find(x=>x.id===id))
 })
 it('overflow in ANY group exchanges only source and target; no lost attributes/IDs/protection/GOLD',()=>{
  const s=board([[{id:'fire',level:2},{id:'ice',level:1}],[{id:'gold',level:4}],[{id:'dark',level:1}]])
  const p=planDrop(s.game,'p-1',{x:1,y:0});expect(p).toMatchObject({kind:'swap',reason:'attribute-limit'})
  const n=reduceSession({...s,protectedIds:['p-1']},{type:'drop',plan:p},0,quiet)
  expect(n.game.slimes.map(x=>[x.id,x.tier,x.attributes])).toEqual(s.game.slimes.map(x=>[x.id,x.tier,x.attributes]));expect(n.nextId).toBe(s.nextId);expect(n.wallet).toEqual(s.wallet);expect(n.protectedIds).toEqual(['p-1'])
 })
 it('second-group overflow cancels whole large merge, not just that group',()=>{
  const s=board([[],[],[],[],[],[{id:'fire',level:1},{id:'ice',level:1}],[{id:'gold',level:1}],[{id:'dark',level:1}]])
  // Choose member identities from deterministic grouping, then inject four IDs only into second group.
  const p=planDrop(s.game,'p-1',{x:1,y:0});if(p.kind!=='merge')throw Error('merge')
  const ids=p.groups[1]!.consumedIds
  const game={...s.game,slimes:s.game.slimes.map(x=>({...x,attributes:ids.includes(x.id)?(x.id===ids[0]?[{id:'fire',level:1},{id:'ice',level:1}]:x.id===ids[1]?[{id:'gold',level:1}]:[{id:'dark',level:1}]) as Attributes:[]}))}
  expect(planDrop(game,'p-1',{x:1,y:0})).toMatchObject({kind:'swap',reason:'attribute-limit'})
 })
 it('mutation never removes and at cap skips acquisition; exact1% boundary',()=>{
  const a:Attributes=[{id:'fire',level:2},{id:'ice',level:3},{id:'gold',level:1}]
  expect(mutateAttributes(a,()=>{throw Error('must skip')})).toBe(a)
  expect(mutateAttributes(fire(4),()=>.01)).toEqual(fire(4))
  expect(mutateAttributes(fire(4),stream(0,0))).toEqual([{id:'fire',level:4},{id:'gold',level:1}])
 })
 it('stale attribute-only changes invalidate displayed merge AND exchange',()=>{
  for(const inputs of [[fire(),[],[]],[fire(),[]]]) {
   const s=board(inputs),p=planDrop(s.game,'p-1',{x:1,y:0}),game={...s.game,slimes:s.game.slimes.map(x=>x.id==='p-1'?{...x,attributes:fire(2)}:x)}
   expect(stateSnapshot(s.game)).not.toBe(stateSnapshot(game));expect(applyPlan(game,p,()=> 'new').ok).toBe(false)
  }
 })
 it('repeat swaps 1000 times preserve every individual field without duplication',()=>{
  const start=board([fire(2),[{id:'ice',level:3}]]).game;let game=start
  for(let i=0;i<1000;i++){const target=game.slimes.find(x=>x.id==='p-2')!.position;const r=applyPlan(game,planDrop(game,'p-1',target),()=>{throw Error('no IDs')});expect(r.ok).toBe(true);game=r.state}
  expect(game.slimes).toEqual(start.slimes);expect(new Set(game.slimes.map(x=>x.id)).size).toBe(2)
 })
})
describe('storage, migration and atomic replay',()=>{
 it.each([1,2,3,4])('schema%i migration keeps Tier40/protected/stock/wallet/research and frozen event ledger',version=>{
  const s=board([[]],40),unit=goldPayment(40,0,version===2?1:2)
  const rawSession={...s,version,wallet:{...s.wallet,gold:4567},goldCellUnlocked:true,protectedIds:['p-1'],generator:{...s.generator,storedTiers:[1,39,40],totalGenerated:3},eventSequence:3,event:{id:'gold-3',sequence:3,cell:{x:0,y:0},tier:40,sourceId:'p-1',attributeCount:0,paid:4,receivedGOLD:4*unit,unitGOLD:unit,nextPaymentAtMs:1400,expiresAtMs:45000,...(version!==2?{rewardVersion:2}:{})}}
  if(version===1){ rawSession.event=null as never } // v1 had no event contract
  const raw=JSON.stringify(rawSession),d=decodeSession(raw,0);expect(d.ok).toBe(true);if(!d.ok)throw Error(d.reason)
  expect(d.session.version).toBe(5);expect(d.migrated).toBe(true);expect(d.session.game.highestTierReached).toBe(40);expect(d.session.game.slimes[0]!.attributes).toEqual([])
  expect(d.session.generator.storedTiers).toEqual([1,39,40]);expect(d.session.generator.storedAttributes).toEqual([[],[],[]]);expect(d.session.wallet.gold).toBe(4567)
  if(version!==1){expect(d.session.protectedIds).toEqual(['p-1']);expect(d.session.event?.unitGOLD).toBe(unit);expect(d.session.event?.paid).toBe(4)}
 })
 it('schema4 research/format/frequency lock fields preserved exactly',()=>{
  const s={...freshSession(0),version:4,goldFrequencyLevel:3,goldCellUnlocked:true,goldFormat:'compact',wallet:{gold:123,upgrades:{speed:1,tap:2,storage:3}}}
  const d=decodeSession(JSON.stringify(s),0);expect(d.ok&&d.session).toMatchObject({...s,version:5})
 })
 it('FIFO stores generation-time attributes; occupied withdrawal and reload never reroll',()=>{
  const s=reduceSession(freshSession(0),{type:'tick'},10000,stream(.9,0,.35))
  expect(s.generator.storedAttributes).toEqual([[{id:'ice',level:1}]]);expect(s.generator.storedTiers).toEqual([1])
  const restored=decodeSession(encodeSession(s),10000);if(!restored.ok)throw Error('save')
  const n=reduceSession(restored.session,{type:'withdraw',expectedId:1},10000,quiet);expect(n.game.slimes[0]!.attributes).toEqual([{id:'ice',level:1}])
  const q={...s.generator,storedTiers:[1,1],storedAttributes:[fire(3),[]],totalGenerated:2}
  expect(withdrawToCell(n.game,q,n.game.slimes[0]!.position,'new')).toEqual({ok:false,game:n.game,generator:q})
  expect(n.generator.storedTiers).toEqual([]);expect(n.generator.storedAttributes).toEqual([])
 })
 it.each(Array.from({length:40},(_,i)=>i+1))('H%i generation stays within discovered Tier despite attrs/research',H=>{
  const s=board([],H),n=reduceSession(s,{type:'tick'},100000,seed(H))
  expect(n.generator.storedTiers.every(t=>t<=H)).toBe(true);expect(n.game.highestTierReached).toBe(H);expect(isSession(n)).toBe(true)
 })
 it('mutation committed once, saved/reloaded output never redraws with stale plan',()=>{
  const s=board([fire(),[],[],[],[]]),p=planDrop(s.game,'p-1',{x:1,y:0}),n=reduceSession(s,{type:'drop',plan:p},0,stream(0,0)),d=decodeSession(encodeSession(n),0)
  expect(d.ok).toBe(true);if(!d.ok)throw Error('load')
  const random=vi.fn(()=>0);expect(reduceSession(d.session,{type:'drop',plan:p},0,random)).toBe(d.session);expect(random).not.toHaveBeenCalled();expect(d.session).toEqual(n)
 })
 it('gold freezes actual attribute count/unit, reload preserves partial payment, same Tier exchange closes it',()=>{
  let s={...board([fire(3),[]],5),goldCellUnlocked:true,eventSequence:1,event:{id:'gold-1',sequence:1,cell:{x:0,y:0},tier:null,sourceId:null,attributeCount:0,paid:0,receivedGOLD:0,unitGOLD:0,nextPaymentAtMs:0,expiresAtMs:45000,rewardVersion:2} } as Session
  s=reduceSession(s,{type:'tick'},0,quiet);expect(s.event?.attributeCount).toBe(1);expect(s.event?.unitGOLD).toBe(4)
  s=reduceSession(s,{type:'pay',eventId:'gold-1',expectedPaid:0},350,quiet)
  const d=decodeSession(encodeSession(s),350);if(!d.ok)throw Error('load');expect(d.session.event).toEqual(s.event)
  const next=reduceSession(d.session,{type:'drop',plan:planDrop(s.game,'p-2',{x:0,y:0},40)},350,quiet)
  expect(next.event).toBeNull();expect(next.wallet.gold).toBe(4);expect(next.lastEvent).toEqual({id:'gold-1',receivedGOLD:4,paid:1})
 })
 it.each(['swap','merge'] as const)('%s save failure publishes no partial state; retry, conflict and lock queue stay safe',async mode=>{
  vi.stubGlobal('navigator',{locks:{request:async (_:string,run:()=>unknown)=>run()}})
  const start=board(mode==='merge'?[fire(),[],[]]:[fire(),[]]),raw=encodeSession(start);let stored=raw,fail=true
  const store=new SessionStore({getItem:()=>stored,setItem:(_,v)=>{if(fail)throw Error('Quota');stored=v}},0)
  const plan=planDrop(start.game,'p-1',{x:1,y:0}),c={type:'drop',plan} as const
  await store.dispatch(c,0,quiet);expect(store.state.session).toEqual(start);expect(stored).toBe(raw);expect(store.state.error).toBeTruthy()
  fail=false;store.retry();const first=store.dispatch(c,0,quiet),second=store.dispatch(c,0,quiet);await Promise.all([first,second])
  expect(store.state.session.game.revision).toBe(1);expect(store.state.error).toBeNull()
  const conflict=new SessionStore({getItem:()=>stored,setItem:()=>{throw Error('must not write')}},0),before=conflict.state.session;stored='another tab'
  await conflict.dispatch({type:'protect',id:before.game.slimes[0]!.id},0,quiet);expect(conflict.state.session).toBe(before);expect(conflict.state.error).toContain('別のタブ')
  expect(SAVE_KEY).toBe('slime-merge-normal-v2')
 })
 it.each(['id','level','duplicate','queue-length','missing','broken'])( 'rejects %s corruption preserving original',kind=>{
  const s=board([fire()]),data=JSON.parse(encodeSession(s))
  if(kind==='id')data.game.slimes[0].attributes[0].id='bogus'
  if(kind==='level')data.game.slimes[0].attributes[0].level=-1
  if(kind==='duplicate')data.game.slimes[0].attributes.push({id:'fire',level:2})
  if(kind==='queue-length')data.generator.storedAttributes=[[]]
  if(kind==='missing')delete data.game.slimes[0].attributes
  const raw=kind==='broken'?'{broken':JSON.stringify(data),store=new SessionStore({getItem:()=>raw,setItem:()=>{throw Error('must preserve')}},0)
  expect(decodeSession(raw,0).ok).toBe(false);expect(store.state.error).toBeTruthy()
 })
})
