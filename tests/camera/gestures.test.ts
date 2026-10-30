import { expect, it } from 'vitest'
import { idleGesture, transition, type GestureState } from '../../src/app/input/gestures'
import { initialCamera } from '../../src/app/input/camera'
const down = (state: GestureState, id: number, sourceId: string | null = 'drag') => transition(state, {type:'down',id,point:{x:id*20,y:40},sourceId,camera:initialCamera()}).state
const move = (state: GestureState, id: number) => transition(state,{type:'move',id,point:{x:60,y:90}}).state
const up = (state: GestureState, id: number) => transition(state,{type:'up',id,point:{x:60,y:90}})
it('one-contact drag authorizes exactly one drop; unknown pointer cannot move or drop it',()=>{
  const state=down(idleGesture(),1)
  expect(state.mode).toBe('drag');expect(move(state,99)).toBe(state)
  expect(up(state,99).drop).toBeUndefined()
  const result=up(move(state,1),1);expect(result.drop?.sourceId).toBe('drag')
  expect(up(result.state,1).drop).toBeUndefined()
})
it('empty cell starts pan and can never authorize a drop',()=>{
  const state=down(idleGesture(),1,null);expect(state.mode).toBe('pan');expect(up(state,1).drop).toBeUndefined()
})
it.each([1,2])('second contact cancels drag; lifting %i first and residual movement cannot merge',first=>{
  const state=down(move(down(idleGesture(),1),1),2)
  expect(state.mode).toBe('pinch');expect(state.single).toBeUndefined()
  const result=up(state,first);expect(result.drop).toBeUndefined();expect(result.state.blocked).toBe(true)
  const last=first===1?2:1
  const residual=move(result.state,last);expect(residual.mode).toBe('idle')
  const done=up(residual,last);expect(done.drop).toBeUndefined();expect(done.state.blocked).toBe(false)
  expect(down(done.state,3).mode).toBe('drag')
})
it.each(['drag','pan','pinch'])('cancel %s blocks surviving contacts until all lift',mode=>{
  let state=down(idleGesture(),1,mode==='pan'?null:'drag')
  if(mode==='pinch')state=down(state,2)
  state=transition(state,{type:'cancel'}).state
  expect(state.mode).toBe('idle');expect(state.blocked).toBe(true)
  expect(up(state,1).drop).toBeUndefined()
})
it('third finger aborts pinch and cannot become a new single drag',()=>{
  let state=down(down(down(idleGesture(),1),2),3)
  expect(state.mode).toBe('idle');expect(state.blocked).toBe(true)
  for(const id of [2,1,3]){const r=up(state,id);expect(r.drop).toBeUndefined();state=r.state}
  expect(state).toEqual(idleGesture())
})
