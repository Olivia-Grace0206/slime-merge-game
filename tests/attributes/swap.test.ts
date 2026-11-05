import { describe, it, expect } from 'vitest'
import { planDrop } from '../../src/core/merge/plan'
import { applyPlan } from '../../src/core/merge/apply'
import { freshSession, reduceSession } from '../../src/core/progression/session'
import type { GameState } from '../../src/domain/game'
const at = { x: 1, y: 0 }
function board(tiers = [1, 2]): GameState {
  return { ...freshSession(0).game, highestTierReached: Math.max(...tiers), slimes: tiers.map((tier, i) => ({ id: `s${i}`, tier, position: { x: i % 4, y: Math.floor(i / 4) } })) }
}
const noId = () => { throw Error('must not allocate ID') }
describe('Phase3A swap invariants', () => {
  it.each([[1, 2, 'different-tier'], [1, 1, 'too-few'], [40, 40, 'max-tier'], [5, 5, 'research-locked']] as const)('%i/%i => %s swap', (a, b, reason) => {
    const s = board([a,b]), p = planDrop(s, 's0', at, reason === 'research-locked' ? 5 : 40)
    expect(p.kind).toBe('swap'); if(p.kind !== 'swap') throw Error('swap')
    expect(p.reason).toBe(reason)
    const result = applyPlan(s,p,noId,reason === 'research-locked' ? 5 : 40)
    expect(result.ok).toBe(true); expect(result.createdIds).toEqual([])
    expect(result.state.slimes).toEqual(s.slimes.map(x => ({...x,position:x.id==='s0'?at:{x:0,y:0}})))
    expect(result.state.highestTierReached).toBe(s.highestTierReached)
    const reverse = applyPlan(result.state,planDrop(result.state,'s0',{x:0,y:0}, reason === 'research-locked' ? 5 : 40),noId, reason === 'research-locked' ? 5 : 40)
    expect(reverse.state.slimes).toEqual(s.slimes)
  })
  it.each([3,5,8,11])('%i inputs prioritize existing merge', n => {
    const s=board(Array(n).fill(1)),p=planDrop(s,'s0',at); expect(p.kind).toBe('merge')
  })
  it('empty movement, same cell and out of bounds',()=>{
    const s=board();expect(planDrop(s,'s0',{x:3,y:3}).kind).toBe('move')
    expect(planDrop(s,'s0',{x:0,y:0})).toEqual({kind:'invalid',reason:'same-cell'})
    expect(planDrop(s,'s0',{x:4,y:0})).toEqual({kind:'invalid',reason:'outside-board'})
    expect(planDrop(s,'s0',at,NaN)).toEqual({kind:'invalid',reason:'invalid-state'})
  })
  it('stale and forged swaps rejected',()=>{
    const s=board(),p=planDrop(s,'s0',at);expect(applyPlan({...s,revision:1},p,noId).ok).toBe(false)
    if(p.kind!=='swap')throw Error('swap')
    expect(applyPlan(s,{...p,targetId:'s0'},noId).ok).toBe(false)
    expect(applyPlan(s,{...p,sourcePosition:{x:3,y:3}},noId).ok).toBe(false)
  })
  it('protection and wallet preserved; GOLD target departure closes event with receipts retained',()=>{
    const base=freshSession(0),game=board([5,5]),unit=5
    const s={...base,game,protectedIds:['s0'],goldCellUnlocked:true,eventSequence:1,event:{id:'gold-1',sequence:1,cell:{x:0,y:0},expiresAtMs:45000,tier:5,sourceId:'s0',attributeCount:0,paid:4,receivedGOLD:BigInt(20),unitGOLD:BigInt(unit),nextPaymentAtMs:1400,rewardVersion:2 as const}}
    const next=reduceSession(s,{type:'drop',plan:planDrop(s.game,'s0',at,5)},1000,()=>.9)
    expect(next.game.slimes).toHaveLength(2);expect(next.protectedIds).toEqual(['s0']);expect(next.wallet).toEqual(s.wallet)
    expect(next.event).toBeNull();expect(next.lastEvent).toEqual({id:'gold-1',receivedGOLD:BigInt(20),paid:4});expect(next.eventSequence).toBe(1)
    expect(reduceSession(next,{type:'pay',eventId:'gold-1',expectedPaid:4},1400,()=>.9)).toBe(next)
  })
})
