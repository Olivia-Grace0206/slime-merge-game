import { describe, expect, it } from 'vitest'
import { createPreset } from '../../src/app/presets'
import { EXPERIMENTAL_GENERATION, advanceGenerator, drawTier, newGenerator, tapGenerator, tierWeights, withdrawToCell } from '../../src/core/progression/generation'
import { baseSaleValue, beginGoldRush, freshWallet, generationRules, payGoldRush, purchaseUpgrade, sellSlime, upgradeCost } from '../../src/core/progression/economy'
import { decodeProgression, encodeProgression, isProgressionSnapshot } from '../../src/core/progression/save'

describe('Phase 2 generated Tier distribution (EXPERIMENTAL values)', () => {
  it('H=1 only generates Tier1', () => {
    expect(tierWeights(1)).toEqual([{ tier: 1, probability: 1 }])
    expect(drawTier(1, 0)).toBe(1)
    expect(drawTier(1, 0.999999999)).toBe(1)
  })
  it('all Tier weights sum to 1 and never exceed highest-ever Tier', () => {
    for (let h = 1; h <= 40; h++) {
      const w = tierWeights(h)
      expect(w).toHaveLength(h)
      expect(w.every(({ tier, probability }) => tier >= 1 && tier <= h && probability >= 0)).toBe(true)
      expect(w.reduce((n, p) => n + p.probability, 0)).toBeCloseTo(1, 12)
      for (const u of [0, 0.01, 0.24, 0.5, 0.75, 0.99, 0.999999]) {
        expect(drawTier(h, u)).toBeGreaterThanOrEqual(1)
        expect(drawTier(h, u)).toBeLessThanOrEqual(h)
      }
    }
  })
  it('expected generated Tier rises monotonically as highest-ever Tier increases', () => {
    let prev = 0
    for (let h = 1; h <= 40; h++) {
      const expected = tierWeights(h).reduce((sum, x) => sum + x.tier * x.probability, 0)
      expect(expected).toBeGreaterThanOrEqual(prev)
      prev = expected
    }
  })
  it('uses injected draws predictably and rejects invalid values', () => {
    const a = drawTier(20, 0.412)
    expect(drawTier(20, 0.412)).toEqual(a)
    expect(() => drawTier(20, 1)).toThrow(RangeError)
    expect(() => drawTier(20, -0.1)).toThrow(RangeError)
    expect(() => drawTier(41, 0.5)).toThrow(RangeError)
    expect(() => tierWeights(2, { centerSlope: 0.5, spreadRatio: 0, minimumSpread: 1 })).toThrow(RangeError)
  })
  it('H=40 never draws Tier41 or higher', () => {
    expect(drawTier(40, 0.999999999999)).toBe(40)
  })
})

describe('Phase 2 elapsed-time storage and click acceleration', () => {
  const rules = generationRules(freshWallet())
  it('starts with a 10s interval, 10 capacity and separate tap advance', () => {
    expect(rules.intervalMs).toBe(EXPERIMENTAL_GENERATION.baseIntervalMs)
    expect(rules.capacity).toBe(10)
    expect(rules.tapAdvanceMs).toBe(1000)
  })
  it('generates by elapsed time independently of frame rate', () => {
    const s = newGenerator(100)
    const a = advanceGenerator(s, 3100, 1, rules, () => 0)
    expect(a.storedTiers).toEqual([])
    expect(a.progressMs).toBe(3000)
    const b = advanceGenerator(a, 20100, 1, rules, () => 0)
    expect(b.storedTiers).toEqual([1, 1])
    expect(b.progressMs).toBe(0)
    expect(s.storedTiers).toEqual([])
  })
  it('offline time stops at capacity without banking infinite credit', () => {
    let calls = 0
    const a = advanceGenerator(newGenerator(0), 86_400_000, 1, rules, () => { calls++; return 0 })
    expect(a.storedTiers).toHaveLength(10)
    expect(a.progressMs).toBe(0)
    expect(calls).toBe(10)
    const b = advanceGenerator(a, 86_500_000, 1, rules, () => { calls++; return 0 })
    expect(b.storedTiers).toHaveLength(10)
    expect(b.progressMs).toBe(0)
    expect(calls).toBe(10)
  })
  it('10 taps accumulate to one generated unit, without wall-clock effects', () => {
    let g = newGenerator(120)
    for (let i = 0; i < 9; i++) g = tapGenerator(g, 1, rules, () => 0)
    expect(g.progressMs).toBe(9000)
    expect(g.storedTiers).toEqual([])
    g = tapGenerator(g, 1, rules, () => 0)
    expect(g.storedTiers).toEqual([1])
    expect(g.progressMs).toBe(0)
    expect(g.updatedAtMs).toBe(120)
  })
  it('clock rollback and corrupt random input do not create phantom slimes', () => {
    const old = newGenerator(5000)
    expect(advanceGenerator(old, 1000, 1, rules, () => 0)).toBe(old)
    expect(() => advanceGenerator(old, 15_000, 1, rules, () => 1)).toThrow(RangeError)
  })
  it('storage withdraw is atomic and checks occupied/duplicate/out-of-board', () => {
    const board = createPreset('five')
    const storage = { ...newGenerator(0), storedTiers: [1, 1], totalGenerated: 2 }
    const occupied = withdrawToCell(board, storage, { x: 0, y: 3 }, 'new-a')
    expect(occupied.ok).toBe(false)
    expect(occupied.game).toBe(board)
    expect(occupied.generator).toBe(storage)
    expect(withdrawToCell(board, storage, { x: 7, y: 0 }, 'new-a').ok).toBe(false)
    expect(withdrawToCell(board, storage, { x: 6, y: 6 }, 'drag').ok).toBe(false)
    const result = withdrawToCell(board, storage, { x: 6, y: 6 }, 'new-a')
    expect(result.ok).toBe(true)
    expect(result.generator.storedTiers).toEqual([1])
    expect(result.game.slimes).toHaveLength(board.slimes.length + 1)
    expect(result.game.highestTierReached).toBe(1)
    expect(storage.storedTiers).toEqual([1, 1])
  })
})

describe('Phase 2 GOLD economy and event primitive', () => {
  it('prices grow by Tier, remain finite through Tier40', () => {
    expect(baseSaleValue(1)).toBe(2)
    expect(baseSaleValue(40)).toBe(2 ** 40)
    expect(Number.isSafeInteger(baseSaleValue(40))).toBe(true)
    expect(() => baseSaleValue(41)).toThrow(RangeError)
  })
  it('sale changes GOLD and board together, preserving highest-ever Tier', () => {
    const g = createPreset('high')
    const w = freshWallet()
    const result = sellSlime(g, w, 'drag')
    expect(result.ok).toBe(true)
    expect(result.earned).toBe(baseSaleValue(39))
    expect(result.game.slimes.some(s => s.id === 'drag')).toBe(false)
    expect(result.game.highestTierReached).toBe(40)
    expect(result.wallet.gold).toBe(result.earned)
    expect(g.slimes.some(s => s.id === 'drag')).toBe(true)
    const duplicate = sellSlime(result.game, result.wallet, 'drag')
    expect(duplicate.ok).toBe(false)
    expect(duplicate.wallet).toBe(result.wallet)
  })
  it('shop prevents insufficient funds and uses increasing costs', () => {
    const w = freshWallet()
    expect(purchaseUpgrade(w, 'speed').ok).toBe(false)
    const funded = { ...w, gold: 1000 }
    const a = purchaseUpgrade(funded, 'speed')
    expect(a.ok).toBe(true)
    expect(a.cost).toBe(upgradeCost('speed', 0))
    expect(a.wallet.upgrades.speed).toBe(1)
    expect(generationRules(a.wallet).intervalMs).toBeLessThan(10_000)
    expect(upgradeCost('speed', 1)).toBeGreaterThan(upgradeCost('speed', 0))
    expect(purchaseUpgrade(w, 'storage').wallet).toBe(w)
    expect(purchaseUpgrade(w, 'tap').wallet).toBe(w)
  })
  it('GOLD rush pays exactly ten times without selling its target slime', () => {
    const start = freshWallet()
    let wallet = start
    let event = beginGoldRush('event-1', 10, 0)
    for (let i = 0; i < 10; i++) {
      const r = payGoldRush(wallet, event)
      expect(r.ok).toBe(true)
      wallet = r.wallet
      event = r.event
    }
    expect(event.paid).toBe(10)
    expect(wallet.gold).toBe(event.unitGOLD * 10)
    const extra = payGoldRush(wallet, event)
    expect(extra.ok).toBe(false)
    expect(extra.wallet).toBe(wallet)
    expect(extra.event).toBe(event)
    expect(beginGoldRush('event-2', 10, 0).unitGOLD)
      .toBeGreaterThan(beginGoldRush('event-3', 10, 3).unitGOLD)
  })
})

describe('Phase 2 future LocalStorage codec', () => {
  const initial = {
    version: 1 as const,
    savedAtMs: 10_000,
    nextId: 1,
    game: createPreset('five'),
    wallet: freshWallet(),
    generator: newGenerator(0),
  }
  it('round trips a versioned, validated session', () => {
    expect(isProgressionSnapshot(initial)).toBe(true)
    expect(decodeProgression(encodeProgression(initial))).toEqual(initial)
  })
  it('rejects malformed saves, invalid versions and stored Tier above history', () => {
    expect(decodeProgression('{')).toBeNull()
    expect(decodeProgression('{"version":0}')).toBeNull()
    expect(decodeProgression(JSON.stringify({ ...initial, version: 2 }))).toBeNull()
    const invalid = { ...initial, generator: { ...initial.generator, storedTiers: [40], totalGenerated: 1 } }
    expect(decodeProgression(JSON.stringify(invalid))).toBeNull()
    const negativeGold = { ...initial, wallet: { ...initial.wallet, gold: -1 } }
    expect(decodeProgression(JSON.stringify(negativeGold))).toBeNull()
    expect(decodeProgression(JSON.stringify({ ...initial, savedAtMs: -1 }))).toBeNull()
  })
})
