import { describe, expect, it } from 'vitest'
import { freshSession, reduceSession, sessionRules, type Session } from '../../src/core/progression/session'
import { tierWeights, drawTier, withdrawToCell } from '../../src/core/progression/generation'
import { RESEARCH_CAPS, researchCost, legacyResearchLevel, frequencyCost } from '../../src/core/progression/research'
import { GENERATION_WEIGHT_ROWS } from '../../src/core/progression/tierTable'
import { planDrop } from '../../src/core/merge/plan'
import { applyPlan } from '../../src/core/merge/apply'
import { commitStorage, decodeSession, encodeSession, isSession } from '../../src/core/progression/persistence'
const zero = () => 0
const cmd = (s: Session, c: Parameters<typeof reduceSession>[1]) => reduceSession(s, c, s.savedAtMs, zero)
function board(tier: number, count: number, cap = 5): Session {
  const s = freshSession(0), researchLevel = legacyResearchLevel(cap)
  return { ...s, nextId: count + 1, researchLevel, researchMaxTier: RESEARCH_CAPS[researchLevel]!, game: { ...s.game, highestTierReached: tier,
    slimes: Array.from({ length: count }, (_, i) => ({ id: `p-${i + 1}`, tier, position: { x: i % 4, y: Math.floor(i / 4) } })) } }
}
describe('table discovery contract', () => {
  it.each(Array.from({ length: 40 }, (_, i) => i + 1))('H=%i complete normalized row, zero beyond discovery, seeded frequencies and boundaries', H => {
    const w = tierWeights(H), row = GENERATION_WEIGHT_ROWS[H - 1]!
    expect(Object.values(row).reduce((a, b) => a + b, 0)).toBe(10000)
    expect(Object.keys(row).every(t => +t <= H && +t >= 1)).toBe(true)
    expect(w).toHaveLength(H); expect(w.every(x => x.probability >= 0)).toBe(true)
    expect(w.reduce((a, b) => a + b.probability, 0)).toBeCloseTo(1, 14)
    // Stratified 10k samples hit every basis-point bucket exactly; no statistical flakiness.
    const counts = Array<number>(H).fill(0)
    for (let i = 0; i < 10000; i++) counts[drawTier(H, (i + .5) / 10000) - 1]!++
    for (const entry of w) expect(counts[entry.tier - 1]).toBe(row[entry.tier] ?? 0)
    expect(drawTier(H, 0)).toBeGreaterThanOrEqual(1); expect(drawTier(H, 1 - Number.EPSILON)).toBeLessThanOrEqual(H)
    let edge = 0
    for (const entry of w.filter(x => x.probability > 0)) { expect(drawTier(H, edge + entry.probability / 2)).toBe(entry.tier); edge += entry.probability }
  })
  it('H1 and H2 exact approved probabilities; H2 boundary .99', () => {
    expect(tierWeights(1)).toEqual([{ tier: 1, probability: 1 }])
    expect(tierWeights(2)).toEqual([{ tier: 1, probability: .99 }, { tier: 2, probability: .01 }])
    expect(drawTier(2, .99 - Number.EPSILON)).toBe(1); expect(drawTier(2, .99)).toBe(2)
  })
  it('production uses the table, research and reload never advance discovery', () => {
    const s = freshSession(0), funded = { ...s, wallet: { ...s.wallet, gold: 10000 } }, r = cmd(funded, { type: 'research', expectedLevel: 0 })
    expect(r.researchMaxTier).toBe(10); expect(r.game.highestTierReached).toBe(1)
    expect(sessionRules(r).distribution).toBeUndefined()
    const generated = reduceSession(r, { type: 'tick' }, 100000, () => 1 - Number.EPSILON)
    expect(generated.generator.storedTiers).toEqual(Array(10).fill(1))
    const load = decodeSession(encodeSession(generated), 100000)
    expect(load.ok && tierWeights(load.session.game.highestTierReached)).toEqual(tierWeights(1))
  })
  it('forged stored Tier cannot discover a Tier during withdrawal', () => {
    const s = freshSession(0), g = { ...s.generator, storedTiers: [2], totalGenerated: 1 }
    expect(withdrawToCell(s.game, g, { x: 0, y: 0 }, 'x').ok).toBe(false)
  })
  it('first new Tier comes from actual merge, and sale retains history', () => {
    let s = board(1, 3)
    s = cmd(s, { type: 'drop', plan: planDrop(s.game, 'p-1', { x: 1, y: 0 }, s.researchMaxTier) })
    expect(s.game.highestTierReached).toBe(2)
    s = cmd(s, { type: 'sell', id: s.game.slimes[0]!.id }); expect(s.game.highestTierReached).toBe(2)
    expect(tierWeights(s.game.highestTierReached)[1]!.probability).toBe(.01)
  })
})
describe('research transactions and materials', () => {
  it('real new game has research5 and GOLD locked', () => {
    expect(freshSession(0)).toMatchObject({ version: 4, researchLevel: 0, researchMaxTier: 5, goldCellUnlocked: false, goldFrequencyLevel: 0, goldFormat: 'full' })
    expect(isSession(freshSession(0))).toBe(true)
  })
  it.each(RESEARCH_CAPS.slice(1).map((cap, i) => [i, cap]))('stage %i unlocks cap %i once, without discovery', (lv, cap) => {
    const base = freshSession(0), s = { ...base, researchLevel: lv!, researchMaxTier: RESEARCH_CAPS[lv!]!, wallet: { ...base.wallet, gold: researchCost(lv!) * 2 } }
    const n = cmd(s, { type: 'research', expectedLevel: lv! })
    expect(n.researchMaxTier).toBe(cap); expect(n.wallet.gold).toBe(s.wallet.gold - researchCost(lv!)); expect(n.game).toEqual(s.game)
    expect(cmd(n, { type: 'research', expectedLevel: lv! })).toBe(n); expect(isSession(n)).toBe(true)
  })
  it.each([3, 5, 8, 11, 16])('blocked %i specimens: preview/apply/session preserve every material, queue and GOLD', count => {
    const s = board(5, count), target = { x: 1, y: 0 }
    expect(planDrop(s.game, 'p-1', target, 5)).toEqual({ kind: 'invalid', reason: 'research-locked' })
    const unrestricted = planDrop(s.game, 'p-1', target)
    let calls = 0
    expect(applyPlan(s.game, unrestricted, () => String(calls++), 5)).toEqual({ ok: false, state: s.game, createdIds: [] })
    expect(calls).toBe(0); expect(cmd(s, { type: 'drop', plan: unrestricted })).toBe(s)
    const funded = { ...s, wallet: { ...s.wallet, gold: researchCost(0) } }, unlocked = cmd(funded, { type: 'research', expectedLevel: 0 })
    const n = cmd(unlocked, { type: 'drop', plan: planDrop(unlocked.game, 'p-1', target, unlocked.researchMaxTier) })
    expect(n.game.highestTierReached).toBe(6); expect(n.game.slimes.length).toBeLessThan(count)
  })
  it('insufficient GOLD / final cap40 / malformed cap refuse without loss; below cap succeeds', () => {
    const s = freshSession(0); expect(cmd(s, { type: 'research', expectedLevel: 0 })).toBe(s)
    const t = board(40, 3, 40); expect(planDrop(t.game, 'p-1', { x: 1, y: 0 }, 40).kind).toBe('invalid')
    expect(cmd(t, { type: 'research', expectedLevel: 16 })).toBe(t)
    expect(isSession({ ...s, researchLevel: -1, researchMaxTier: undefined })).toBe(false)
    const a = board(4, 3); expect(cmd(a, { type: 'drop', plan: planDrop(a.game, 'p-1', { x: 1, y: 0 }, 5) }).game.highestTierReached).toBe(5)
  })
  it('locked at cap still sells and can fund research from ordinary sales without gold cells', () => {
    let s = board(5, 5)
    for (const x of s.game.slimes.slice(0, 3)) s = cmd(s, { type: 'sell', id: x.id })
    expect(s.wallet.gold).toBe(researchCost(0)); expect(cmd(s, { type: 'research', expectedLevel: 0 }).researchMaxTier).toBe(10)
  })
})
describe('GOLD unlock, format and migration', () => {
  it('locked events do not spawn, purchase costs128, duplicates refused, frequency requires unlock', () => {
    let s = freshSession(0)
    s = reduceSession(s, { type: 'tick' }, 100000, zero); expect(s.event).toBeNull()
    s = { ...s, wallet: { ...s.wallet, gold: 1000 } }
    expect(cmd(s, { type: 'gold-frequency', expectedLevel: 0 })).toBe(s)
    const n = cmd(s, { type: 'gold-unlock' }); expect(n.wallet.gold).toBe(872); expect(n.goldCellUnlocked).toBe(true)
    expect(cmd(n, { type: 'gold-unlock' })).toBe(n)
    const f = cmd(n, { type: 'gold-frequency', expectedLevel: 0 }); expect(f.wallet.gold).toBe(872 - frequencyCost(0)); expect(f.goldFrequencyLevel).toBe(1)
    expect(cmd(f, { type: 'gold-frequency', expectedLevel: 0 })).toBe(f)
    const event = reduceSession(f, { type: 'tick' }, f.nextEventAtMs, zero)
    expect(event.event?.tier).toBeNull(); expect(event.event).not.toBeNull(); expect(isSession(event)).toBe(true)
  })
  it.each([1, 2, 3])('legacy v%i preserves high Tiers, FIFO, GOLD and free research/event access', version => {
    const s = board(33, 3, 35), saved = { ...s, generator: { ...s.generator, storedTiers: [2, 31, 33], totalGenerated: 3 }, wallet: { ...s.wallet, gold: 12345 } }
    const legacy = { ...saved, version } as Record<string, unknown>
    for (const key of ['researchLevel', 'researchMaxTier', 'goldCellUnlocked', 'goldFrequencyLevel', 'goldFormat']) delete legacy[key]
    const raw = JSON.stringify(legacy), load = decodeSession(raw, 0)
    expect(load.ok).toBe(true)
    if (load.ok) { expect(load.migrated).toBe(true); expect(load.session).toMatchObject({ researchMaxTier: 33, goldCellUnlocked: true, goldFormat: 'full' }); expect(load.session.game).toEqual(saved.game); expect(load.session.generator).toEqual(saved.generator); expect(load.session.wallet).toEqual(saved.wallet) }
  })
  it('v3 partially paid event keeps its exact unit, receipt and reward version; migration does not replay', () => {
    let s = { ...board(5, 1), goldCellUnlocked: true }
    s = reduceSession(s, { type: 'tick' }, 60000, () => .1)
    s = cmd(s, { type: 'drop', plan: planDrop(s.game, 'p-1', s.event!.cell, s.researchMaxTier) })
    for (let i = 0; i < 4; i++) s = reduceSession(s, { type: 'tick' }, s.event!.nextPaymentAtMs, zero)
    const old = { ...s, version: 3 }, load = decodeSession(JSON.stringify(old), s.savedAtMs)
    expect(load.ok).toBe(true)
    if (load.ok) { expect(load.session.event).toEqual(s.event); expect(load.session.wallet).toEqual(s.wallet); const moved = cmd(load.session, { type: 'sell', id: 'p-1' }); expect(moved.event).toBeNull(); expect(cmd(moved, { type: 'pay', eventId: s.event!.id, expectedPaid: 4 })).toBe(moved) }
  })
  it('settings persist; failed purchases never write either half, and stale raw prevents all changes', () => {
    const s = freshSession(0), funded = { ...s, wallet: { ...s.wallet, gold: 1000 } }
    for (const c of [{ type: 'research', expectedLevel: 0 }, { type: 'gold-unlock' }, { type: 'gold-format', value: 'compact' }] as const) {
      const n = cmd(funded, c); expect(isSession(n)).toBe(true)
      let raw = encodeSession(funded)
      expect(commitStorage({ getItem: () => raw, setItem: () => { throw Error('Quota') } }, raw, n).ok).toBe(false)
      expect(raw).toBe(encodeSession(funded))
      expect(commitStorage({ getItem: () => raw, setItem: (_k, v) => { raw = v } }, 'stale', n).ok).toBe(false)
      const load = decodeSession(encodeSession(n), 0); expect(load.ok && load.session).toEqual(n)
    }
  })
})
