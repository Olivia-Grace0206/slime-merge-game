import { ATTRIBUTE_IDS } from '../../domain/attributes'
import type { SpecialState,EffectContext } from '../../domain/special'
import type { GameState } from '../../domain/game'
import type { Session } from '../progression/session'
import { inBounds,isGameState } from '../board/state'
import { samePosition,cellKey } from '../grid/coordinates'
import { emptyCells } from '../progression/generation'
import { randomUnit } from '../attributes/inheritance'
import { awakeningCandidates } from '../attributes/awakening'
import { drawSpecialCell } from '../attributes/effects'
import { SPECIAL_TIMING as T } from './config'
export function specialLater(now:number,delta:number){const n=now+delta;if(!Number.isSafeInteger(n)||n<0)throw Error('Special clock exhausted');return n}
export function freshSpecials(now:number):SpecialState{return{sequence:0,nextPurpleAtMs:specialLater(now,T.purpleDelayMs),nextBlueAtMs:specialLater(now,T.blueDelayMs),events:[],lastAwakening:null}}
export function effectContext(s:Readonly<{specials?:SpecialState}>):EffectContext{return{blueCells:s.specials?.events.filter(e=>e.kind==='blue').map(e=>e.cell)??[]}}
export function availableSpecialCells(s:Session){const occupied=[...(s.event?[s.event.cell]:[]),...s.specials.events.map(e=>e.cell)];return emptyCells(s.game).filter(p=>!occupied.some(c=>samePosition(c,p)))}
export function syncPurple(s:Session,now:number):Session{return{...s,specials:{...s.specials,events:s.specials.events.map(e=>{if(e.kind!=='purple')return e;const source=s.game.slimes.find(x=>samePosition(x.position,e.cell)&&awakeningCandidates(x.attributes).length>0);return source?.id===e.sourceId?e:{...e,sourceId:source?.id??null,progressMs:0,updatedAtMs:now}})}}}
export function nextSpecialBoundary(s:Session,now:number){let at=now;for(const e of s.specials.events)at=Math.min(at,e.kind==='blue'?e.expiresAtMs:e.sourceId?specialLater(e.updatedAtMs,T.purpleChargeMs-e.progressMs):now);return at}
export function finishSpecialBoundary(s:Session,now:number,random:()=>number):Session{
 let next=s,sp=s.specials;const events=[]
 for(const e of sp.events){
  if(e.kind==='blue'){if(e.expiresAtMs>now)events.push(e);continue}
  const source=next.game.slimes.find(x=>x.id===e.sourceId&&samePosition(x.position,e.cell)),candidates=awakeningCandidates(source?.attributes)
  if(!source||!candidates.length){events.push({...e,sourceId:null,progressMs:0,updatedAtMs:now});continue}
  const progress=e.progressMs+Math.max(0,now-e.updatedAtMs)
  if(progress<T.purpleChargeMs){events.push({...e,progressMs:progress,updatedAtMs:now});continue}
  const selected=candidates[Math.floor(randomUnit(random)*candidates.length)]!
  const game={...next.game,revision:next.game.revision+1,slimes:next.game.slimes.map(x=>x.id===source.id?{...x,attributes:x.attributes!.map(a=>a.id===selected.id?{...a,awakened:true}:a)}:x)}
  if(!isGameState(game))throw Error('Invalid awakening')
  next={...next,game};sp={...sp,nextPurpleAtMs:specialLater(now,T.purpleDelayMs),lastAwakening:{eventId:e.id,sourceId:source.id,attributeId:selected.id,atMs:now}}
 }
 return{...next,specials:{...sp,events}}
}
export function spawnSpecials(s:Session,now:number,random:()=>number):Session{
 let next=s
 for(const kind of ['purple','blue'] as const){const key=kind==='purple'?'nextPurpleAtMs':'nextBlueAtMs';if(next.specials.events.some(e=>e.kind===kind)||now<next.specials[key])continue
  const cells=availableSpecialCells(next);if(!cells.length||next.specials.events.length+(next.event?1:0)>=T.maxTotal){next={...next,specials:{...next.specials,[key]:specialLater(now,T.retryMs)}};continue}
  const sequence=next.specials.sequence+1;if(!Number.isSafeInteger(sequence))throw Error('Special IDs exhausted')
  const cell=drawSpecialCell(next.game,cells,random,effectContext(next)),base={id:`${kind}-${sequence}`,sequence,cell,createdAtMs:now}
  const event=kind==='purple'?{...base,kind,sourceId:null,progressMs:0,updatedAtMs:now}:{...base,kind,expiresAtMs:specialLater(now,T.blueLifetimeMs)}
  next={...next,specials:{...next.specials,sequence,events:[...next.specials.events,event],[key]:specialLater(now,kind==='purple'?T.purpleDelayMs:T.blueLifetimeMs+T.blueDelayMs)}}
 }return syncPurple(next,now)
}
export function rebaseSpecialClock(s:Session,now:number):SpecialState{const shift=(at:number)=>specialLater(now,Math.max(0,at-s.savedAtMs));return{...s.specials,nextPurpleAtMs:shift(s.specials.nextPurpleAtMs),nextBlueAtMs:shift(s.specials.nextBlueAtMs),events:s.specials.events.map(e=>e.kind==='blue'?{...e,createdAtMs:now,expiresAtMs:shift(e.expiresAtMs)}:{...e,createdAtMs:now,updatedAtMs:now}),lastAwakening:s.specials.lastAwakening?{...s.specials.lastAwakening,atMs:Math.min(now,s.specials.lastAwakening.atMs)}:null}}
const integer=(n:unknown):n is number=>Number.isSafeInteger(n)&&(n as number)>=0
export function isSpecialState(value:unknown,game:GameState,savedAtMs:number,goldCell?:Readonly<{x:number;y:number}>):value is SpecialState{
 if(!value||typeof value!=='object')return false;const s=value as SpecialState
 if(!integer(s.sequence)||!integer(s.nextPurpleAtMs)||!integer(s.nextBlueAtMs)||!Array.isArray(s.events)||s.events.length>2)return false
 const ids=new Set<string>(),cells=new Set<string>(goldCell?[cellKey(goldCell)]:[]),kinds=new Set<string>()
 for(const e of s.events){if(!e||!['purple','blue'].includes(e.kind)||!integer(e.sequence)||e.sequence<1||e.sequence>s.sequence||e.id!==`${e.kind}-${e.sequence}`||ids.has(e.id)||kinds.has(e.kind)||!inBounds(game.bounds,e.cell)||cells.has(cellKey(e.cell))||!integer(e.createdAtMs)||e.createdAtMs>savedAtMs)return false
 ids.add(e.id);cells.add(cellKey(e.cell));kinds.add(e.kind)
 if(e.kind==='blue'){if(!integer(e.expiresAtMs)||e.expiresAtMs<=savedAtMs||e.expiresAtMs<=e.createdAtMs)return false}
 else{if(!integer(e.updatedAtMs)||e.updatedAtMs>savedAtMs||e.updatedAtMs<e.createdAtMs||!integer(e.progressMs)||e.progressMs>=T.purpleChargeMs)return false;if(e.sourceId===null){if(e.progressMs!==0)return false}else if(typeof e.sourceId!=='string'||!game.slimes.some(x=>x.id===e.sourceId&&samePosition(x.position,e.cell)&&awakeningCandidates(x.attributes).length>0))return false}
 }
 const l=s.lastAwakening;if(l!==null&&(!l||!/^purple-[1-9]\d*$/.test(l.eventId)||Number(l.eventId.slice(7))>s.sequence||ids.has(l.eventId)||typeof l.sourceId!=='string'||!l.sourceId.trim()||!ATTRIBUTE_IDS.includes(l.attributeId)||!integer(l.atMs)||l.atMs>savedAtMs))return false
 return true
}
