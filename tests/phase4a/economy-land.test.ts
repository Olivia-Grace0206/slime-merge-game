import { describe, it, expect, vi, afterEach } from 'vitest'
import { baseSaleValue, isGold, moneyJSON } from '../../src/core/progression/money'
import { saleValue, fireSaleBonus, attributePower, comboPower } from '../../src/core/attributes/effects'
import { safeRoundedSale } from '../../src/core/progression/legacyRounding'
import { freshSession, reduceSession, goldPayment, type Session } from '../../src/core/progression/session'
import { canUnlock, landCost, LAND_PRICES, purchaseLand, unlockedCellCount } from '../../src/core/progression/land'
import { freshWallet, purchaseUpgrade, upgradeCost, sellSlime } from '../../src/core/progression/economy'
import { frequencyCost, researchCost } from '../../src/core/progression/research'
import { emptyCells, withdrawToCell } from '../../src/core/progression/generation'
import { availableSpecialCells } from '../../src/core/special/state'
import { planDrop } from '../../src/core/merge/plan'
import { encodeSession, decodeSession, commitStorage, SAVE_KEY } from '../../src/core/progression/persistence'
import { SessionStore } from '../../src/app/sessionStore'
import type { Attributes } from '../../src/domain/attributes'
const quiet=()=>.99
const rich=():Session=>{const s=freshSession(0);return {...s,wallet:{...s.wallet,gold:10n**40n}}}
const buy=(s:Session,plot:'B'|'C'|'D',expectedCount=s.game.bounds.plots!.length)=>reduceSession(s,{type:'land',plot,expectedCount},s.savedAtMs,quiet)
afterEach(()=>vi.unstubAllGlobals())

describe('exact currency and historical rounding',()=>{
 it.each(Array.from({length:40},(_,i)=>i+1))('Tier%d has exact fourfold price and both merge advantages',tier=>{
  const price=baseSaleValue(tier)
  expect(price).toBe(2n*4n**BigInt(tier-1));expect(saleValue({tier})).toBe(price)
  if(tier<40){expect(baseSaleValue(tier+1)*3n).toBe(price*4n*3n);expect(baseSaleValue(tier+1)*2n*5n).toBe(price*8n*5n)}
 })
 it('matches the supplied reference prices exactly and rejects Tier41',()=>{
  expect([1,2,10,20,40].map(baseSaleValue)).toEqual([2n,8n,524288n,549755813888n,604462909807314587353088n])
  expect(()=>baseSaleValue(41)).toThrow();expect(()=>baseSaleValue(0)).toThrow()
 })
 it('preserves the old safe-range evaluation order across every level/awakening and thousands of combinations',()=>{
  for(const base of [2,8,512,524288,2**40]) for(let lv=1;lv<=99;lv++) for(let mask=0;mask<8;mask++){
   const attrs:Attributes=(['fire','gold','dark'] as const).map((id,i)=>({id,level:lv,awakened:!!(mask&(1<<i))}))
   const f=attributePower(attrs,'fire'),g=1+.15*attributePower(attrs,'gold'),d=1+attributePower(attrs,'dark'),c=1+.05*comboPower(attrs,'fire','gold')
   expect(safeRoundedSale(BigInt(base),f,[g,d,c])).toBe(BigInt(Math.floor((base+Math.ceil(base*.08*f))*g*d*c)))
  }
 })
 it('high prices use integer ratios including exact Lv1 golden/dark multipliers',()=>{
  const b=baseSaleValue(40)
  expect(saleValue({tier:40,attributes:[{id:'gold',level:1}]})).toBe(b*115n/100n)
  expect(saleValue({tier:40,attributes:[{id:'dark',level:1,awakened:true}]})).toBe(b*24n/10n)
  const a:Attributes=[{id:'fire',level:99,awakened:true},{id:'gold',level:99,awakened:true},{id:'dark',level:99,awakened:true}]
  const value=saleValue({tier:40,attributes:a});expect(value).toBeGreaterThan(b*10n);expect(isGold(value)).toBe(true)
 })
 it('shops retain every pre-migration integer price',()=>{
  for(const key of ['speed','tap','storage'] as const)for(let lv=0;lv<=(key==='storage'?30:16);lv++){
   expect(upgradeCost(key,lv)).toBe(BigInt(Math.ceil(({speed:12,tap:16,storage:20}[key])*(key==='storage'?1.35:1.7)**lv)))
  }
  expect(researchCost(0)).toBe(96n);expect(()=>researchCost(15,1e300)).toThrow(/Unsafe legacy research coefficient/);expect(frequencyCost(5)).toBe(4096n)
  const wallet={...freshWallet(),gold:10n**30n},p=purchaseUpgrade(wallet,'speed');expect(p.wallet.gold).toBe(wallet.gold-12n)
 })
 it('new rewards scale with new base; old contracts retain exact units for all Tiers/attribute counts',()=>{
  for(let tier=1;tier<=40;tier++)for(let a=0;a<=10;a++)for(const v of [1,2] as const){
   const base=2**tier*.05,expected=Math.max(1,Math.floor((v===1?base:Math.max(tier,base))/(1+a*.25)))
   expect(goldPayment(tier,a,v)).toBe(BigInt(expected))
  }
  expect(goldPayment(40,0)).toBe(baseSaleValue(40)/20n)
 })
})

describe('four-plot atomic land',()=>{
 it.each([['B','C','D'],['C','B','D']] as const)('unlock order %s/%s/%s preserves cells/camera-independent individual data',(...order)=>{
  let s=rich();expect(emptyCells(s.game)).toHaveLength(16);const original=s.wallet.gold
  const individual={id:'p-1',tier:1,position:{x:3,y:3},attributes:[{id:'fire' as const,level:3,awakened:true}]}
  s={...s,nextId:2,protectedIds:['p-1'],game:{...s.game,slimes:[individual]}}
  for(let i=0;i<order.length;i++){
   expect(landCost(s.game.bounds)).toBe(LAND_PRICES[i]);const old=s;s=buy(s,order[i]!)
   expect(s.wallet.gold).toBe(old.wallet.gold-LAND_PRICES[i]!);expect(unlockedCellCount(s.game.bounds)).toBe(32+i*16)
   expect(s.game.slimes[0]).toBe(individual);expect(s.protectedIds).toEqual(['p-1']);expect(buy(s,order[i]!)).toBe(s)
  }
  expect(original-s.wallet.gold).toBe(LAND_PRICES.reduce((a,b)=>a+b,0n));expect(landCost(s.game.bounds)).toBeNull();expect(emptyCells(s.game)).toHaveLength(63)
  const d=decodeSession(encodeSession(s),0);expect(d.ok&&d.session).toEqual(s)
 })
 it('D requires both B/C, rejects stale count/insufficient funds/forged location without partial changes',()=>{
  const s=rich();expect(buy(s,'D')).toBe(s)
  for(const first of ['B','C'] as const){const next=buy(s,first);expect(canUnlock(next.game.bounds,'D')).toBe(false);expect(buy(next,'D')).toBe(next);expect(buy(next,first==='B'?'C':'B',1)).toBe(next)}
  const poor=freshSession(0);expect(buy(poor,'B')).toBe(poor)
  expect(purchaseLand(s.game,s.wallet,'A' as 'B',1).ok).toBe(false)
 })
 it('locked cells reject movement, FIFO withdrawal and every special spawn',()=>{
  let s=rich();s={...s,nextId:2,generator:{...s.generator,storedTiers:[1],storedAttributes:[[]],totalGenerated:1},game:{...s.game,slimes:[{id:'p-1',tier:1,position:{x:0,y:0},attributes:[]}]}}
  for(const cell of [{x:4,y:0},{x:0,y:4},{x:4,y:4}]){
   expect(planDrop(s.game,'p-1',cell).kind).toBe('invalid');expect(withdrawToCell(s.game,s.generator,cell,'new').ok).toBe(false)
  }
  expect(availableSpecialCells(s)).toHaveLength(15)
  s=buy(s,'B');const moved=reduceSession(s,{type:'drop',plan:planDrop(s.game,'p-1',{x:4,y:0})},0,quiet);expect(moved.game.slimes[0]!.position).toEqual({x:4,y:0})
  expect(availableSpecialCells(s).every(p=>p.y<4)).toBe(true)
 })
 it('exact sale at huge balance removes one individual once',()=>{
  const s=rich(),game={...s.game,highestTierReached:40,slimes:[{id:'big',tier:40,position:{x:0,y:0},attributes:[]}]}
  const sale=sellSlime(game,s.wallet,'big');expect(sale.wallet.gold).toBe(s.wallet.gold+baseSaleValue(40));expect(sellSlime(sale.game,sale.wallet,'big').ok).toBe(false)
 })
})

describe('schema8 migration and commit safety',()=>{
 it('schema7 preserves all current individuals/awakening/FIFO and partial gold-purple-blue ledgers',()=>{
  let s=rich();const now=1000,unit=goldPayment(20,2,2)
  s={...s,savedAtMs:now,nextId:3,researchLevel:16,researchMaxTier:40,protectedIds:['p-1'],goldCellUnlocked:true,eventSequence:3,
   game:{...s.game,highestTierReached:20,slimes:[{id:'p-1',tier:20,position:{x:1,y:1},attributes:[{id:'fire',level:99,awakened:true}]},{id:'p-2',tier:1,position:{x:2,y:2},attributes:[{id:'ice',level:4}]}]},
   wallet:{...s.wallet,gold:9007199254740991n},generator:{storedTiers:[20,1],storedAttributes:[[{id:'gold',level:3}],[]],totalGenerated:2,progressMs:100,updatedAtMs:now},
   nature:{...s.nature,updatedAtMs:now},event:{id:'gold-3',sequence:3,cell:{x:1,y:1},rewardVersion:2,tier:20,sourceId:'p-1',attributeCount:2,paid:4,receivedGOLD:unit*4n,cappedGOLD:0n,unitGOLD:unit,nextPaymentAtMs:1100,expiresAtMs:45000},
   specials:{...s.specials,sequence:2,events:[{kind:'purple',id:'purple-1',sequence:1,cell:{x:2,y:2},createdAtMs:0,sourceId:'p-2',progressMs:1000,updatedAtMs:now},{kind:'blue',id:'blue-2',sequence:2,cell:{x:3,y:3},createdAtMs:0,expiresAtMs:90000}]}}
  const raw=JSON.stringify({...s,version:7,game:{...s.game,bounds:{origin:{x:0,y:0},width:4,height:4}}},(_k,v:unknown)=>typeof v==='bigint'?Number(v):v)
  const loaded=decodeSession(raw,now);expect(loaded.ok).toBe(true);if(!loaded.ok)throw Error(loaded.reason)
  expect(loaded.session).toEqual(s);expect(loaded.migrated).toBe(true)
  const paid=reduceSession(loaded.session,{type:'pay',eventId:'gold-3',expectedPaid:4},1100,quiet)
  expect(paid.wallet.gold).toBe(s.wallet.gold+unit);expect(paid.event?.paid).toBe(5)
 })
 it.each(['-1','01','1.5','1e24','NaN','Infinity','+2',' 2','',3,null])('rejects malformed schema8 GOLD %s while keeping source bytes',value=>{
  const raw=JSON.parse(encodeSession(rich()));raw.wallet.gold=value;const bytes=JSON.stringify(raw)
  expect(decodeSession(bytes,0).ok).toBe(false);expect(JSON.stringify(raw)).toBe(bytes)
 })
 it.each([Number.MAX_SAFE_INTEGER+1,1.5,-1])('rejects unsafe legacy number %s without reinterpretation',gold=>{
  const s=JSON.parse(encodeSession(freshSession(0)));s.version=7;s.game.bounds={origin:{x:0,y:0},width:4,height:4};s.wallet.gold=gold
  expect(decodeSession(JSON.stringify(s),0).ok).toBe(false)
 })
 it('roundtrip keeps thousand-digit integer, title-ready formatting and exact delta',()=>{
  const s=rich(),n={...s,wallet:{...s.wallet,gold:10n**999n+123456789n}}
  const d=decodeSession(encodeSession(n),0);expect(d.ok&&d.session.wallet.gold).toBe(n.wallet.gold)
  expect(n.wallet.gold.toLocaleString('en-US').endsWith('123,456,789')).toBe(true)
 })
 it('failed disk write never publishes land; two stores race under Web Locks and a duplicate queue charges once',async()=>{
  const s=rich();let raw:string|null=encodeSession(s),fail=false,lock=Promise.resolve()
  const storage={getItem:()=>raw,setItem:(_key:string,value:string)=>{if(fail)throw Error('quota');raw=value}}
  vi.stubGlobal('navigator',{locks:{request:(_key:string,fn:()=>unknown)=>{const p=lock.then(fn);lock=p.then(()=>undefined);return p}}})
  const a=new SessionStore(storage,0),b=new SessionStore(storage,0),command={type:'land',plot:'B',expectedCount:1} as const
  fail=true;await a.dispatch(command,0,quiet);expect(a.state.session).toEqual(s);expect(raw).toBe(encodeSession(s))
  fail=false;a.retry();await Promise.all([a.dispatch(command,0,quiet),b.dispatch(command,0,quiet)])
  const loaded=decodeSession(raw!,0);expect(loaded.ok&&loaded.session.wallet.gold).toBe(s.wallet.gold-LAND_PRICES[0]);expect(b.state.error).toContain('別のタブ')
  const before=raw;await a.dispatch(command,0,quiet);expect(raw).toBe(before)
  const next=buy(a.state.session,'C');expect(commitStorage(storage,'stale',next).ok).toBe(false);expect(raw).toBe(before)
  expect(SAVE_KEY).toBe('slime-merge-normal-v2');expect(moneyJSON(s)).toContain('"gold":"')
 })
})

describe('expanded-board regression boundaries',()=>{
 it('five-merge crosses A/B and stale preview is invalidated by a purchase without consuming materials',()=>{
  let s=buy(rich(),'B');s={...s,nextId:6,game:{...s.game,highestTierReached:1,slimes:[{x:3,y:0},{x:4,y:0},{x:4,y:1},{x:5,y:0},{x:5,y:1}].map((position,i)=>({id:`p-${i+1}`,tier:1,position,attributes:[{id:'ice' as const,level:2,awakened:i===0}]}))}}
  const plan=planDrop(s.game,'p-1',{x:4,y:0},40);expect(plan.kind).toBe('merge')
  const grown=buy(s,'C');expect(reduceSession(grown,{type:'drop',plan},0,quiet)).toBe(grown)
  const merged=reduceSession(s,{type:'drop',plan},0,quiet);expect(merged.game.slimes).toHaveLength(2)
  expect(merged.game.slimes.every(x=>x.tier===2)).toBe(true);expect(merged.game.slimes.flatMap(x=>x.attributes??[]).filter(a=>a.awakened)).toHaveLength(1)
  expect(merged.wallet.gold).toBe(s.wallet.gold)
 })
 it.each([1,2,3,4])('all three actual special spawns stay in %i unlocked plots',count=>{
  let s=rich();for(const plot of (['B','C','D'] as const).slice(0,count-1))s=buy(s,plot)
  s={...s,goldCellUnlocked:true};const n=reduceSession(s,{type:'tick'},600000,()=>.999)
  expect(n.event).not.toBeNull();expect(n.specials.events).toHaveLength(2)
  const allowed=emptyCells(s.game).map(p=>`${p.x},${p.y}`)
  for(const cell of [n.event!.cell,...n.specials.events.map(e=>e.cell)])expect(allowed).toContain(`${cell.x},${cell.y}`)
 })
 it('historically capped money stays in the old ledger and is never recovered as a second reward',()=>{
  const base=rich(),unit=goldPayment(40,0,2)
  const s:Session={...base,researchLevel:16,researchMaxTier:40,nextId:2,goldCellUnlocked:true,eventSequence:1,game:{...base.game,highestTierReached:40,slimes:[{id:'p-1',tier:40,position:{x:0,y:0},attributes:[]}]},event:{id:'gold-1',sequence:1,cell:{x:0,y:0},expiresAtMs:45000,tier:40,sourceId:'p-1',attributeCount:0,paid:4,receivedGOLD:3n,cappedGOLD:4n*unit-3n,unitGOLD:unit,rewardVersion:2,nextPaymentAtMs:350}}
  const loaded=decodeSession(encodeSession(s),0);expect(loaded.ok).toBe(true);if(!loaded.ok)throw Error(loaded.reason)
  const n=reduceSession(loaded.session,{type:'pay',eventId:'gold-1',expectedPaid:4},350,quiet)
  expect(n.wallet.gold).toBe(s.wallet.gold+unit);expect(n.event?.cappedGOLD).toBe(s.event!.cappedGOLD)
  expect(reduceSession(n,{type:'pay',eventId:'gold-1',expectedPaid:4},700,quiet)).toBe(n)
 })
})

// An independently discovered display/quote discrepancy at safe integer boundaries must not return.
it('fire detail bonus equals the rounded sale intermediate through every safe-price Tier/Lv/awakening',()=>{
 for(let tier=1;tier<=26;tier++)for(let level=1;level<=99;level++)for(const awakened of [false,true]){
  const slime={tier,attributes:[{id:'fire' as const,level,awakened}]},base=baseSaleValue(tier)
  const expected=BigInt(Math.ceil((2*4**(tier-1))*.08*attributePower(slime.attributes,'fire')))
  expect(fireSaleBonus(slime)).toBe(expected);expect(saleValue(slime)).toBe(base+expected)
 }
})
