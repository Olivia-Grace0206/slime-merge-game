import { fixtureJSON } from '../helpers/serialization'
import { mkdirSync, writeFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'
import { expect, it } from 'vitest'
import { advanceGenerator, newGenerator } from '../../src/core/progression/generation'
import { withdrawFocused } from '../../src/core/progression/focus'
import { freshSession, sessionRules, type Session } from '../../src/core/progression/session'
import { encodeSession, decodeSession, commitStorage } from '../../src/core/progression/persistence'
import { upgradeCost } from '../../src/core/progression/economy'
import type { Attributes } from '../../src/domain/attributes'
const dir='docs/validation/phase4a/regression/balance-phase3b1'
const rng=(seed:number)=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
it('compares stock10/58/100/160, capacity/price proposals, and bounded save/generation performance',()=>{
 const proposals=[{name:'previous',perLevel:3,maxLevel:16,growth:1.7},{name:'A',perLevel:4,maxLevel:30,growth:1.35},{name:'B',perLevel:5,maxLevel:30,growth:1.35},{name:'C',perLevel:5,maxLevel:40,growth:1.35}].map(p=>({...p,maxCapacity:10+p.perLevel*p.maxLevel,levels:[0,1,5,10,16,20,30,40].filter(lv=>lv<=p.maxLevel).map(lv=>{
  const spent=Array.from({length:lv},(_,i)=>Math.ceil(20*p.growth**i)).reduce((a,b)=>a+b,0),next=Math.ceil(20*p.growth**lv)
  return{lv,capacity:10+p.perLevel*lv,cumulativeGOLD:spent,nextGOLD:lv===p.maxLevel?null:next,oneTierSaleCoveringCumulative:Math.max(1,Math.ceil(Math.log2(Math.max(2,spent))))}
 })}))
 const priceCurves=[1.25,1.35,1.5,1.7].map(growth=>({growth,levels:[1,5,10,16,20,30].map(lv=>({lv,next:Math.ceil(20*growth**lv),cumulative:Array.from({length:lv},(_,i)=>Math.ceil(20*growth**i)).reduce((a,b)=>a+b,0)}))}))
 const stock=[10,58,100,160].flatMap(capacity=>[60,180,600].flatMap(serviceSeconds=>[12,61,210].map(seed=>{
  const random=rng(seed),s=freshSession(0),game={...s.game,highestTierReached:10};let g={...newGenerator(0),storedAttributes:[] as readonly Attributes[]},fullSeconds=0,focused=0,outputAttributes=0,consumedTraits=0
  for(let second=1;second<=3600;second++){
   g=advanceGenerator(g,second*1000,10,{intervalMs:15000,capacity,tapAdvanceMs:1000,attributeChance:.03},random) as typeof g
   if(g.storedTiers.length===capacity)fullSeconds++
   if(second%serviceSeconds===0&&g.storedTiers.length>=10){consumedTraits+=g.storedAttributes.slice(0,10).filter(a=>a.length).length
    const out=withdrawFocused(game,g,'focused',.35,random);if(!out.ok)throw Error('FIFO focus')
    g=out.generator as typeof g;focused++;outputAttributes+=out.game.slimes[0]!.attributes?.length?1:0
   }
  }
  return{capacity,serviceSeconds,seed,generated:g.totalGenerated,fullRatio:fullSeconds/3600,focused,stockConsumed:focused*10,netCompression:focused*9,outputAttributes,consumedAttributedSpecimens:consumedTraits,remaining:g.storedTiers.length}
 })))
 const timings=[10,58,100,160].map(count=>{
  const storage=Math.ceil((count-10)/5),base=freshSession(0),traits:Attributes=[{id:'ice',level:99},{id:'nature',level:99},{id:'mutation',level:99}]
  const s:Session={...base,nextId:17,researchLevel:16,researchMaxTier:40,wallet:{gold:BigInt(1000000),upgrades:{speed:0,tap:0,storage}},game:{...base.game,highestTierReached:40,slimes:Array.from({length:16},(_,i)=>({id:`p-${i+1}`,tier:40,position:{x:i%4,y:Math.floor(i/4)},attributes:traits}))},generator:{...base.generator,storedTiers:Array(count).fill(40),storedAttributes:Array.from({length:count},()=>traits),totalGenerated:count}}
  const raw=encodeSession(s);let current=raw;const memory={getItem:()=>current,setItem:(_:string,v:string)=>{current=v}},times:Record<string,number[]>={encode:[],decode:[],write:[],generate:[]}
  for(let i=0;i<100;i++){
   let at=performance.now();encodeSession(s);times.encode!.push(performance.now()-at)
   at=performance.now();const decoded=decodeSession(raw,0);times.decode!.push(performance.now()-at);if(!decoded.ok)throw Error(decoded.reason)
   at=performance.now();const result=commitStorage(memory,current,s);times.write!.push(performance.now()-at);if(!result.ok)throw Error(result.reason)
   at=performance.now();const generated=advanceGenerator({...newGenerator(0),storedAttributes:[]},86400000,40,sessionRules(s),rng(i+1));times.generate!.push(performance.now()-at);expect(generated.storedTiers.length).toBe(sessionRules(s).capacity)
  }
  const summarize=(numbers:number[])=>({meanMs:numbers.reduce((a,b)=>a+b,0)/numbers.length,p95Ms:[...numbers].sort((a,b)=>a-b)[Math.floor(numbers.length*.95)]!,maxMs:Math.max(...numbers)})
  expect(raw.length).toBeLessThan(100000)
  return{count,actualCapacity:sessionRules(s).capacity,storageLevel:storage,jsonCharacters:raw.length,jsonUTF8Bytes:Buffer.byteLength(raw),nextUpgradeGOLD:upgradeCost('storage',storage),timing:Object.fromEntries(Object.entries(times).map(([k,v])=>[k,summarize(v)]))}
 })
 mkdirSync(dir,{recursive:true});writeFileSync(`${dir}/comparison.json`,fixtureJSON({provisional:true,stockModel:'One-hour pure stock model, fixed15s ordinary production/3% attributes, service FIFO10→1 at60/180/600s, output immediately handled externally; no claim of a constrained4x4 playthrough.3seeds. Tier weights/effects unchanged.',performanceModel:'100 trials/size,16×T40/3attrsLv99 and up to160 stored3attrs; encode/decode/atomic in-memory StoragePort write/one-day bounded generation. Wall timings observational, not device guarantees. Exact58 is legacy stock comparison; modernLv10 capacity60 used for save validity.',proposals,priceCurves,stock,timings},null,2))
 expect(stock).toHaveLength(36);expect(proposals.find(p=>p.name==='B')?.maxCapacity).toBe(160)
},120000)
