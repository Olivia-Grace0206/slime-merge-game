import { fixtureJSON } from '../helpers/serialization'
import {it,expect} from 'vitest'
import {mkdirSync,writeFileSync} from 'node:fs'
import {ATTRIBUTE_IDS} from '../../src/domain/attributes'
import {freshSession,reduceSession,type Session} from '../../src/core/progression/session'
import {boardEffects,saleValue,attributePower} from '../../src/core/attributes/effects'
import {AWAKENING_MULTIPLIERS,BLUE_MULTIPLIERS,SPECIAL_TIMING} from '../../src/core/special/config'
import {isSession} from '../../src/core/progression/persistence'
import {syncPurple} from '../../src/core/special/state'
function rng(seed:number){let x=seed>>>0;return()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/2**32}}
it('compares provisional times, coefficients, dark risks and actual bounded Core across seeds',()=>{
 const effects=ATTRIBUTE_IDS.flatMap(id=>[1,5,10,20,50,99].flatMap(level=>['normal','awake','awake-blue','awake-light','awake-combo','stacked'].map(mode=>{
 const awake=mode!=='normal',blue=mode==='awake-blue'||mode==='stacked',light=mode==='awake-light'||mode==='stacked',pairs={fire:'gold',gold:'fire',ice:'lightning',lightning:'ice',luck:'mutation',mutation:'luck'} as const
 const other=(pairs as Record<string,string>)[id],attributes=[{id,level,...(awake?{awakened:true}:{})},...((mode==='awake-combo'||mode==='stacked')&&other?[{id:other as typeof id,level,awakened:true}]:[])]
 const s=freshSession(0),slime={id:'p-1',tier:10,position:{x:0,y:0},attributes},game={...s.game,slimes:[slime,...(light?[{id:'p-2',tier:1,position:{x:1,y:0},attributes:[{id:'light' as const,level:5,awakened:true}]}]:[])]}
 return{id,level,mode,power:attributePower(attributes,id),sale:saleValue(slime),...boardEffects(game,blue?{blueCells:[slime.position]}:{})}
 })))
 const timing=[30,60,90].flatMap(charge=>[180,300,600].flatMap(delay=>[1,2,3].flatMap(attributes=>[12,91,2026].map(seed=>{const random=rng(seed);let now=delay,successes=0,waiting=0;while(now<3600){const handling=10+Math.floor(random()*80),interrupted=random()<.1;waiting+=handling;now+=handling+charge*(interrupted?2:1);if(now>3600)break;successes++;now+=delay}return{charge,delay,attributes,seed,successes,waiting,completedSpecimens:Math.floor(successes/attributes)}}))))
 const core=[12,91,2026].flatMap(seed=>['active','idle','full'].map(style=>{const random=rng(seed);let s:Session=freshSession(0),successes=0,full=0;const spawned={purple:0,blue:0};const seen=new Set<string>()
 if(style==='full')s={...s,nextId:17,game:{...s.game,slimes:Array.from({length:16},(_,i)=>({id:`p-${i+1}`,tier:1,position:{x:i%4,y:Math.floor(i/4)},attributes:[{id:'ice' as const,level:1}]}))}}
 for(let sec=1;sec<=3600;sec++){
  if(style==='active'){const purple=s.specials.events.find(e=>e.kind==='purple');if(purple){const current=s.game.slimes.find(x=>x.position.x===purple.cell.x&&x.position.y===purple.cell.y);if(!current||current.attributes?.every(a=>a.awakened)){s={...s,nextId:s.nextId+1,game:{...s.game,slimes:[...s.game.slimes.filter(x=>x.id!==current?.id),{id:`p-${s.nextId}`,tier:1,position:purple.cell,attributes:[{id:'nature',level:1},{id:'ice',level:1},{id:'luck',level:1}]}]}};s=syncPurple(s,s.savedAtMs)}}}
  const prior=s.specials.lastAwakening?.eventId;s=reduceSession(s,{type:'tick'},sec*1000,random)
  if(s.specials.lastAwakening?.eventId&&s.specials.lastAwakening.eventId!==prior)successes++
  for(const e of s.specials.events)if(!seen.has(e.id)){spawned[e.kind]++;seen.add(e.id)}
  if(s.generator.storedTiers.length===10)full++
  if(sec%300===0){expect(isSession(s)).toBe(true);expect(new Set([...(s.event?[s.event.cell]:[]),...s.specials.events.map(e=>e.cell)].map(c=>`${c.x},${c.y}`)).size).toBe(s.specials.events.length+(s.event?1:0))}
 }return{seed,style,successes,spawned,generated:s.generator.totalGenerated,stock:s.generator.storedTiers.length,stockFullRatio:full/3600,awakenings:s.game.slimes.flatMap(s=>s.attributes??[]).filter(a=>a.awakened).length}
 }))
 const candidates=[1.1,1.2,1.5].flatMap(awake=>[1.1,1.25,2].map(blue=>({awake,blue,powerMultiplier:awake*blue})))
 const dark=[.2,.25,.3,.4].flatMap(chance=>[12,91,2026].map(seed=>{const random=rng(seed);let lost=0;for(let i=0;i<10000;i++)if(random()<chance)lost++;return{chance,seed,lost,rate:lost/10000}}))
 mkdirSync('docs/validation/phase4a/regression/balance-phase3c',{recursive:true});writeFileSync('docs/validation/phase4a/regression/balance-phase3c/comparison.json',fixtureJSON({provisional:true,adopted:{AWAKENING_MULTIPLIERS,BLUE_MULTIPLIERS,SPECIAL_TIMING},effects,timing,core,candidates,dark,limitations:'Timing candidates omit geometry and assume supplied specimens; Core active policy injects replacement subjects but performs no ordinary merging or spending. Full storage still permits purple processing. No human progression prediction. Three seeds; offline no missed-event replay.'},null,2))
 expect(effects).toHaveLength(360);expect(core.every(r=>r.stock<=10)).toBe(true)
})
