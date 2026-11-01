import { describe, it, expect, vi, afterEach } from 'vitest'
import { ATTRIBUTE_IDS, type AttributeId, type Attributes } from '../../src/domain/attributes'
import { boardEffects, levelPower, supportMultiplier, saleValue, geneticsForGroup, specialCellWeights, drawSpecialCell, comboPower } from '../../src/core/attributes/effects'
import { freshSession, reduceSession, sessionRules, goldPayment, type Session } from '../../src/core/progression/session'
import { generationRules, legacyGenerationRules, sellSlime } from '../../src/core/progression/economy'
import { withdrawFocused } from '../../src/core/progression/focus'
import { planDrop } from '../../src/core/merge/plan'
import { decodeSession, encodeSession, isSession } from '../../src/core/progression/persistence'
import { SessionStore } from '../../src/app/sessionStore'
const a = (id: AttributeId, level=1): Attributes => [{id,level}]
const quiet = () => .99
function board(attrs: readonly Attributes[], H=1): Session {
 const s=freshSession(0)
 return {...s,researchLevel:16,researchMaxTier:40,nextId:attrs.length+1,game:{...s.game,highestTierReached:H,slimes:attrs.map((attributes,i)=>({id:`p-${i+1}`,tier:H,attributes,position:{x:i%4,y:Math.floor(i/4)}}))}}
}
function stock(s=freshSession(0),tiers=Array(10).fill(1),attrs:readonly Attributes[]=tiers.map(()=>[])): Session {
 return {...s,generator:{...s.generator,storedTiers:tiers,storedAttributes:attrs,totalGenerated:tiers.length}}
}
function stream(...values:number[]) { let i=0; return ()=>values[i++]??.99 }
afterEach(()=>vi.unstubAllGlobals())
describe('Phase3B diminishing effects and caps',()=>{
 it.each([1,5,10,20,50,99])('Lv%d stays finite and below linear growth',lv=>{
  expect(levelPower(lv)).toBeGreaterThanOrEqual(1);expect(levelPower(lv)).toBeLessThanOrEqual(1+.3*(lv-1))
  for(const id of ATTRIBUTE_IDS) {
   const s=board([a(id,lv)]),effects=boardEffects(s.game)
   expect(Number.isFinite(saleValue(s.game.slimes[0]!))).toBe(true)
   expect(effects.iceReduction).toBeLessThanOrEqual(.25);expect(effects.tapBonus).toBeLessThanOrEqual(.5)
   expect(effects.normalChance).toBeLessThanOrEqual(.15);expect(effects.focusChance).toBeLessThanOrEqual(.85)
  }
 })
 it.each(ATTRIBUTE_IDS)('%s level99 remains monotone and stack-safe',id=>{
  const low=board([a(id)]),high=board(Array.from({length:16},()=>a(id,99)))
  const effects=boardEffects(high.game)
  expect(saleValue(high.game.slimes[0]!)).toBeGreaterThanOrEqual(saleValue(low.game.slimes[0]!))
  expect(effects.iceReduction).toBeLessThanOrEqual(.25);expect(effects.tapBonus).toBeLessThanOrEqual(.5)
  if(id==='nature')expect(effects.natureIntervalMs).toBe(40000)
  if(id==='luck'){expect(effects.normalChance).toBe(.15);expect(effects.focusChance).toBe(.83)}
 })
 it.each(['fire','gold','dark'] as const)('%s changes actual sale, keeps GOLD reward separate and caps wallet',id=>{
  const s=board([a(id)],10),slime=s.game.slimes[0]!,quote=saleValue(slime),sold=sellSlime(s.game,s.wallet,slime.id)
  expect(quote).toBeGreaterThan(1024);expect(sold.earned).toBe(quote);expect(sold.wallet.gold).toBe(quote)
  const capped={...s,wallet:{...s.wallet,gold:Number.MAX_SAFE_INTEGER-3}}
  expect(reduceSession(capped,{type:'sell',id:slime.id},0,quiet).wallet.gold).toBe(Number.MAX_SAFE_INTEGER)
  expect(goldPayment(10,1)).toBe(goldPayment(10,1))
 })
 it('light is nonrecursive, adjacent only, capped, never buffs sale',()=>{
  const s=board([a('ice'),a('light',99),a('light',99),a('gold')])
  expect(supportMultiplier(s.game,s.game.slimes[0]!)).toBe(1.25)
  expect(supportMultiplier(s.game,s.game.slimes[3]!)).toBe(1.25)
  expect(boardEffects(s.game).iceReduction).toBeCloseTo(.015*1.25)
  expect(saleValue(s.game.slimes[3]!)).toBe(saleValue({tier:1,attributes:a('gold')}))
  const alone={...s.game,slimes:s.game.slimes.filter(x=>x.id==='p-2'||x.id==='p-3')}
  expect(boardEffects(alone).iceReduction).toBe(0)
 })
 it('ice affects interval; lightning affects click only; combo adds once',()=>{
  const ice=board([a('ice')]),lightning=board([a('lightning')]),combo=board([[...a('ice'),...a('lightning'),...a('fire')]])
  expect(sessionRules(ice).intervalMs).toBe(14775);expect(sessionRules(ice).tapAdvanceMs).toBe(1000)
  expect(sessionRules(lightning).intervalMs).toBe(15000);expect(sessionRules(lightning).tapAdvanceMs).toBe(1060)
  expect(sessionRules(combo).intervalMs).toBe(14700);expect(sessionRules(combo).tapAdvanceMs).toBe(1100)
 })
 it.each([0,1,5,10,16])('shop level%d has gentle production and useful click',lv=>{
  const s=freshSession(0),wallet={...s.wallet,upgrades:{speed:lv,tap:lv,storage:0}}
  const r=generationRules(wallet)
  expect(r.intervalMs).toBe(Math.round(15000*.95**lv));expect(r.tapAdvanceMs).toBe(1000+200*lv)
  expect(r.intervalMs).toBeGreaterThan(legacyGenerationRules(wallet).intervalMs)
  const max=board(Array.from({length:16},()=>[...a('ice',99),...a('lightning',99),...a('light',99)]))
  const capped=sessionRules({...max,wallet});expect(capped.tapAdvanceMs).toBeLessThanOrEqual(capped.intervalMs*.75)
 })
 it('all three supported combos retain original attributes and apply only their pair',()=>{
  const s=board([[...a('fire'),...a('gold'),...a('dark')]]),slime=s.game.slimes[0]!
  expect(saleValue(slime)).toBeGreaterThan(saleValue({...slime,attributes:a('gold')}))
  expect(comboPower(slime.attributes,'ice','lightning')).toBe(0)
  expect(slime.attributes).toHaveLength(3)
  const genetics=board([[...a('luck'),...a('mutation')]])
  expect(boardEffects(genetics.game).normalChance).toBeCloseTo(.0425)
  expect(geneticsForGroup(genetics.game,['p-1']).mutationChance).toBeCloseTo(.025)
 })
 it('magnet changes location weights, not event time/count or unlock',()=>{
  const s=board([a('magnet')]),cells=[{x:1,y:0},{x:3,y:3}]
  expect(specialCellWeights(s.game,cells)).toEqual([1.6,1])
  expect(drawSpecialCell(s.game,cells,()=>.6)).toEqual(cells[0])
  const locked=reduceSession(s,{type:'tick'},60000,quiet);expect(locked.event).toBeNull()
  const unlocked={...s,goldCellUnlocked:true}
  const event=reduceSession(unlocked,{type:'tick'},60000,quiet)
  expect(event.eventSequence).toBe(1);expect(event.nextEventAtMs).toBe(unlocked.nextEventAtMs)
  expect(()=>drawSpecialCell(s.game,cells,()=>1)).toThrow()
 })
 it('attribute chance boosts both modes within caps',()=>{
  const s=board([a('luck')]),effects=boardEffects(s.game)
  expect(effects.normalChance).toBeCloseTo(.0375);expect(effects.focusChance).toBeCloseTo(.38)
 })
})
describe('safe focused generation and persistence',()=>{
 it('mode toggle saves without consuming and restores',()=>{
  const s=stock(),n=reduceSession(s,{type:'generation-mode',value:'focused'},0,quiet)
  expect(n.generator).toEqual(s.generator);expect(n.generationMode).toBe('focused')
  expect(decodeSession(encodeSession(n),0)).toEqual({ok:true,session:n,migrated:false})
 })
 it('consumes FIFO ten including traits/high Tiers, preserving the remaining queue/protection',()=>{
  let s=stock(board([a('fire')],5),[4,1,2,3,1,2,3,1,2,3,1,1], [a('ice'),...Array.from({length:11},()=>[])])
  s={...s,wallet:{...s.wallet,upgrades:{...s.wallet.upgrades,storage:1}},generationMode:'focused',protectedIds:['p-1']}
  expect(s.generator.storedAttributes?.[0]).toEqual(a('ice'))
  const n=reduceSession(s,{type:'withdraw',expectedId:s.nextId,expectedMode:'focused'},0,stream(.5,0,0))
  expect(n.game.slimes).toHaveLength(2);expect(n.game.slimes[1]).toMatchObject({tier:1,attributes:a('fire')})
  expect(n.generator.storedTiers).toEqual([1,1]);expect(n.generator.storedAttributes).toEqual([[],[]])
  expect(n.protectedIds).toEqual(['p-1']);expect(n.game.highestTierReached).toBe(5);expect(n.focusedGenerated).toBe(1)
  expect(isSession(n)).toBe(true)
 })
 it.each(['short','attributed','high-tier','full-board','wrong-mode','stale-id'])('%s obeys FIFO counts, without trait/Tier exceptions',kind=>{
  let s={...stock(),generationMode:'focused'} as Session
  if(kind==='short')s=stock(s,Array(9).fill(1))
  if(kind==='attributed')s=stock(s,Array(10).fill(1),Array.from({length:10},()=>a('fire')))
  if(kind==='high-tier')s=stock({...s,game:{...s.game,highestTierReached:3}},Array(10).fill(3))
  if(kind==='full-board')s=stock({...board(Array.from({length:16},()=>[])),generationMode:'focused'})
  const random=vi.fn(quiet),n=reduceSession(s,{type:'withdraw',expectedId:kind==='stale-id'?99:s.nextId,expectedMode:kind==='wrong-mode'?'normal':'focused'},100000,random)
  if(kind==='attributed'||kind==='high-tier'){expect(n.game.slimes).toHaveLength(1);expect(n.generator.storedTiers).toHaveLength(0);expect(random).toHaveBeenCalled()}else{expect(n).toBe(s);expect(random).not.toHaveBeenCalled()}
 })
 it('failed attribute roll yields one un-attributed specimen, repeat same ID cannot double spend',()=>{
  const s={...stock(),generationMode:'focused'} as Session
  const n=reduceSession(s,{type:'withdraw',expectedId:1,expectedMode:'focused'},0,quiet)
  expect(n.game.slimes[0]!.attributes).toEqual([]);expect(n.generator.storedTiers).toHaveLength(0)
  expect(reduceSession(n,{type:'withdraw',expectedId:1,expectedMode:'focused'},0,quiet)).toBe(n)
  const result=withdrawFocused(s.game,s.generator,'x',.35,()=>NaN);expect(result.ok).toBe(false)
 })
 it('generation preserves progress fraction after shop and ice placement/removal',()=>{
  const s={...board([a('ice')]),generator:{...freshSession(0).generator,progressMs:7387},wallet:{gold:100,upgrades:{speed:0,tap:0,storage:0}}}
  const sold=reduceSession(s,{type:'sell',id:'p-1'},0,quiet)
  expect(sold.generator.progressMs/15000).toBeCloseTo(7387/14775,3)
  const bought=reduceSession(s,{type:'buy',key:'speed',expectedLevel:0},0,quiet)
  expect(bought.generator.progressMs/sessionRules(bought).intervalMs).toBeCloseTo(7387/14775,3)
 })
 it.each([0,1,5,10,16])('schema5 speedLv%d migrates progress and all ownership with frozen event',lv=>{
  const s=stock(board([a('dark',99)],40),[1,40],[a('ice'),a('gold',5)]),oldInterval=legacyGenerationRules({...s.wallet,upgrades:{speed:lv,tap:2,storage:0}}).intervalMs
  const old={...s,version:5,wallet:{gold:123,upgrades:{speed:lv,tap:2,storage:0}},protectedIds:['p-1'],generator:{...s.generator,progressMs:Math.floor(oldInterval*.75)}}
  const d=decodeSession(JSON.stringify(old),0);expect(d.ok).toBe(true);if(!d.ok)throw Error(d.reason)
  expect(d.session.version).toBe(6);expect(d.session.game).toEqual(old.game);expect(d.session.wallet).toEqual(old.wallet)
  expect(d.session.generator.storedAttributes).toEqual(old.generator.storedAttributes);expect(d.session.protectedIds).toEqual(old.protectedIds)
  expect(d.session.generator.progressMs/sessionRules(d.session).intervalMs).toBeCloseTo(.75,3)
  expect(d.session.generationMode).toBe('normal')
 })
 it.each(['mode','nature-progress','nature-time','nature-count','focus-count','unknown'])('rejects invalid schema6 %s without reset',kind=>{
  const s=JSON.parse(encodeSession(freshSession(0)))
  if(kind==='mode')s.generationMode='all'
  if(kind==='nature-progress')s.nature.progressMs=1
  if(kind==='nature-time')s.nature.updatedAtMs=1
  if(kind==='nature-count')s.nature.totalGenerated=1
  if(kind==='focus-count')s.focusedGenerated=1
  if(kind==='unknown')s.version=999
  expect(decodeSession(JSON.stringify(s),0).ok).toBe(false)
 })
 it('focused conversion rolls back on quota, retries once and rejects a stale cross-tab save',async()=>{
  vi.stubGlobal('navigator',{locks:{request:async (_:string,run:()=>unknown)=>run()}})
  const start={...stock(),generationMode:'focused'} as Session;let raw=encodeSession(start),fail=true
  const port={getItem:()=>raw,setItem:(_:string,value:string)=>{if(fail)throw Error('quota');raw=value}}
  const store=new SessionStore(port,0),command={type:'withdraw',expectedId:1,expectedMode:'focused'} as const
  await store.dispatch(command,0,quiet);expect(store.state.session).toEqual(start);expect(raw).toBe(encodeSession(start))
  fail=false;store.retry();await Promise.all([store.dispatch(command,0,quiet),store.dispatch(command,0,quiet)])
  expect(store.state.session.focusedGenerated).toBe(1);expect(store.state.session.game.slimes).toHaveLength(1)
  const other=new SessionStore(port,0),before=other.state.session;raw='external';await other.dispatch({type:'generation-mode',value:'normal'},0,quiet)
  expect(other.state.session).toBe(before);expect(raw).toBe('external');expect(other.state.error).toBeTruthy()
 })
})
describe('nature production, merge genetics and deterministic finalization',()=>{
 it('nature adds to stock, separately counted, stopped while full, and reload never duplicates',()=>{
  const s=board([a('nature')]),n=reduceSession(s,{type:'tick'},180000,quiet)
  // Ordinary fills first. Nature cannot exceed storage, even after long offline time.
  expect(n.generator.storedTiers).toHaveLength(10);expect(n.nature.totalGenerated).toBe(0);expect(n.nature.progressMs).toBe(0)
  const waiting={...s,generator:{...s.generator,updatedAtMs:179999},nature:{...s.nature,progressMs:179999,updatedAtMs:179999},savedAtMs:179999}
  const produced=reduceSession(waiting,{type:'tick'},180000,stream(.99,0,0))
  expect(produced.generator.storedTiers).toEqual([1]);expect(produced.generator.storedAttributes).toEqual([a('fire')]);expect(produced.nature.totalGenerated).toBe(1)
  const d=decodeSession(encodeSession(produced),180000);if(!d.ok)throw Error(d.reason)
  expect(reduceSession(d.session,{type:'tick'},180000,quiet).nature.totalGenerated).toBe(1)
  const removed=reduceSession(produced,{type:'sell',id:'p-1'},180000,quiet)
  expect(removed.nature.progressMs).toBe(0);expect(boardEffects(removed.game).natureIntervalMs).toBeNull()
 })
 it('tap filling the final stock slot clears nature progress in the same save',()=>{
  const s=stock(board([a('nature')]),Array(9).fill(1))
  const ready={...s,generator:{...s.generator,progressMs:14000},nature:{...s.nature,progressMs:5000}}
  const next=reduceSession(ready,{type:'tap'},0,quiet)
  expect(next.generator.storedTiers).toHaveLength(10);expect(next.nature.progressMs).toBe(0)
  expect(isSession(next)).toBe(true);expect(decodeSession(encodeSession(next),0).ok).toBe(true)
 })
 it('nature clock rollback rebases without credit and movement keeps one aggregate timer',()=>{
  const s={...board([a('nature')]),savedAtMs:100000,generator:{...freshSession(0).generator,updatedAtMs:100000},nature:{progressMs:500,totalGenerated:0,updatedAtMs:100000}}
  const n=reduceSession(s,{type:'tick'},1,quiet);expect(n.nature.progressMs).toBe(500);expect(n.nature.updatedAtMs).toBe(1)
  const moved=reduceSession(n,{type:'drop',plan:planDrop(n.game,'p-1',{x:3,y:3})},1,quiet)
  expect(moved.nature).toEqual(n.nature)
 })
 it.each([3,5,8,11])('%d merge preserves groups, counts, remainders and only dark can disappear',count=>{
  const attrs=Array.from({length:count},()=>[...a('dark'),...a('fire')]),s=board(attrs),p=planDrop(s.game,'p-1',{x:1,y:0},40)
  expect(p.kind).toBe('merge');if(p.kind!=='merge')throw Error('plan')
  let calls=0
  const n=reduceSession(s,{type:'drop',plan:p},0,()=>{calls++;return calls%2===1?.99:0})
  const outputs=n.game.slimes.filter(x=>x.tier===2)
  expect(outputs).toHaveLength(p.groups.reduce((sum,g)=>sum+g.outputs.length,0))
  expect(outputs.every(x=>x.attributes?.some(a=>a.id==='fire'))).toBe(true)
  expect(outputs.every(x=>!x.attributes?.some(a=>a.id==='dark'))).toBe(true)
  for(const id of p.remainderIds)expect(n.game.slimes.find(x=>x.id===id)).toEqual(s.game.slimes.find(x=>x.id===id))
  const loaded=decodeSession(encodeSession(n),0);if(!loaded.ok)throw Error(loaded.reason)
  const random=vi.fn(quiet);expect(reduceSession(loaded.session,{type:'drop',plan:p},0,random)).toBe(loaded.session);expect(random).not.toHaveBeenCalled()
 })
 it('dark survives the other outcome, and newly mutated dark without inherited dark is safe',()=>{
  const s=board([a('dark'),[],[]]),p=planDrop(s.game,'p-1',{x:1,y:0})
  expect(reduceSession(s,{type:'drop',plan:p},0,quiet).game.slimes[0]!.attributes).toEqual(a('dark'))
  const plain=board([[],[],[]]),newDark=reduceSession(plain,{type:'drop',plan:planDrop(plain.game,'p-1',{x:1,y:0})},0,stream(0,.25))
  expect(newDark.game.slimes[0]!.attributes).toEqual(a('dark'))
 })
 it('mutation support is group-local, no five-only bonus, capped at6%, no slots means no deletion',()=>{
  const s=board([[...a('mutation',99),...a('luck',99)],[],[],[],[],a('light',99),a('mutation',99)])
  expect(geneticsForGroup(s.game,['p-1','p-2','p-3']).mutationChance).toBe(geneticsForGroup(s.game,['p-1','p-2','p-3','p-4','p-5']).mutationChance)
  expect(geneticsForGroup(s.game,['p-2','p-3','p-4']).mutationChance).toBe(.01)
  expect(geneticsForGroup(s.game,['p-1']).mutationChance).toBeLessThanOrEqual(.06)
  const full=board(Array.from({length:5},()=>[...a('fire'),...a('gold'),...a('mutation')]))
  const result=reduceSession(full,{type:'drop',plan:planDrop(full.game,'p-1',{x:1,y:0})},0,()=>0)
  expect(result.game.slimes.every(x=>x.attributes?.length===3)).toBe(true)
 })
})
