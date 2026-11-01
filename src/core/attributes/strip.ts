import type { GameState } from '../../domain/game'
import { isGameState } from '../board/state'
export type StripResult = Readonly<{ok:boolean;changed:boolean;game:GameState}>
/** Free, whole-attribute removal. The individual and its original cell remain intact. */
export function stripAttributes(game: GameState, id: string): StripResult {
  const reject={ok:false,changed:false,game}
  if(!isGameState(game)||typeof id!=='string'||!id.trim())return reject
  const target=game.slimes.find(s=>s.id===id)
  if(!target)return reject
  if(!target.attributes?.length)return{ok:true,changed:false,game}
  const next={...game,revision:game.revision+1,slimes:game.slimes.map(s=>s.id===id?{...s,attributes:[]}:s)}
  return isGameState(next)?{ok:true,changed:true,game:next}:reject
}
