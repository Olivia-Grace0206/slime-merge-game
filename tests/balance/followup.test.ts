/// <reference types="node" />
import { mkdirSync, writeFileSync } from 'node:fs'
import { it, expect } from 'vitest'
import { freshSession, reduceSession, sessionRules, EXPERIMENTAL_PHASE2, type Command } from '../../src/core/progression/session'
import { GENERATION_WEIGHT_ROWS } from '../../src/core/progression/tierTable'
import { tierWeights, type GenerationProfile } from '../../src/core/progression/generation'
import { RESEARCH_CAPS, researchCost, frequencyCost } from '../../src/core/progression/research'
import { planDrop, compareNear } from '../../src/core/merge/plan'
import { upgradeCost } from '../../src/core/progression/economy'
import { isSession, decodeSession, encodeSession } from '../../src/core/progression/persistence'
const rows = (kind: 'conservative' | 'delayed') => GENERATION_WEIGHT_ROWS.map((row, i) => {
  if (i < 5) return row
  const H = i + 1, r: Record<number, number> = {}
  const weights = kind === 'conservative' ? [2500, 3500, 3000, 980, 20] : [2000, 3000, 4000, 998, 2]
  weights.forEach((w, n) => { const t = Math.max(1, H - 4 + n); r[t] = (r[t] ?? 0) + w })
  return r
})
const profiles: Record<string, GenerationProfile> = { gaussian: EXPERIMENTAL_PHASE2, conservative: { rows: rows('conservative') }, intermediate: { rows: GENERATION_WEIGHT_ROWS }, delayed: { rows: rows('delayed') } }
type Policy = 'production' | 'gold' | 'research' | 'balanced'
function rng(seed: number) { return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 } }
function simulate(name: string, seed: number, policy: Policy = 'balanced', multiplier = 3, unlockPrice = 128) {
  const random = rng(seed), profile = profiles[name]!
  let s = freshSession(0), steps = 0, full = 0, stockFull = 0, mergeReady = 0, sales = 0, low = 0, generated = 0, saleGOLD = 0, eventGOLD = 0, firstUnlock: number | null = null
  const reached: Record<string, number | null> = { 2: null, 3: null, 5: null, 10: null, 20: null, 30: null, 40: null }
  const stages: Record<string, { generated: number; tiers: Record<string, number>; boardLow: number; steps: number }> = {}
  const research: { atMs: number; from: number; to: number; cost: number }[] = []
  function cmd(c: Command, time: number) {
    const old = s, before = s.generator.totalGenerated
    s = reduceSession(s, c, time, random, { ...sessionRules(s), attributeChance:0, attributeMutationChance:0, distribution: profile })
    const n = s.generator.totalGenerated - before, H = String(old.game.highestTierReached)
    const stage = stages[H] ??= { generated: 0, tiers: {}, boardLow: 0, steps: 0 }
    for (const t of s.generator.storedTiers.slice(n ? -n : s.generator.storedTiers.length)) { stage.tiers[t] = (stage.tiers[t] ?? 0) + 1; stage.generated++; generated++; if (t <= 2) low++ }
    if (c.type === 'sell') { if (s !== old) { sales++; saleGOLD += s.wallet.gold - old.wallet.gold } }
    else eventGOLD += Math.max(0, s.wallet.gold - old.wallet.gold)
  }
  function shop(now: number) {
    const lv = s.researchLevel, nextResearchCost = lv < 16 ? researchCost(lv, multiplier) : Infinity
    const blocked = s.game.highestTierReached >= s.researchMaxTier
    const buyResearch = () => {
      if (lv >= 16 || s.wallet.gold < nextResearchCost) return
      const oldCap = s.researchMaxTier
      // Candidate price experiment only: reprice the same atomic production purchase.
      // No extra income is counted and the resulting wallet loses exactly candidate cost.
      s = { ...s, wallet: { ...s.wallet, gold: s.wallet.gold + researchCost(lv) - nextResearchCost } }
      cmd({ type: 'research', expectedLevel: lv }, now)
      research.push({ atMs: now, from: oldCap, to: s.researchMaxTier, cost: nextResearchCost })
    }
    const buyUnlock = () => { if (!s.goldCellUnlocked && s.wallet.gold >= unlockPrice) {
      s = { ...s, wallet: { ...s.wallet, gold: s.wallet.gold + 128 - unlockPrice } }; cmd({ type: 'gold-unlock' }, now); firstUnlock ??= now
    } }
    if (policy === 'gold') { buyUnlock(); if (!s.goldCellUnlocked) return }
    if ((policy === 'research' || blocked) && (policy !== 'gold' || s.goldCellUnlocked)) buyResearch()
    const reserve = policy === 'balanced' && blocked ? nextResearchCost : 0
    for (const key of ['speed', 'tap', 'storage'] as const) {
      const lv = s.wallet.upgrades[key]
      // Large stock is not useful to this active bot; limit capacity spending, retain full stock accounting.
      if (lv < (key === 'storage' ? 3 : policy === 'research' ? 4 : 16) && s.wallet.gold >= upgradeCost(key, lv) + reserve) cmd({ type: 'buy', key, expectedLevel: lv }, now)
    }
    if (policy !== 'research') buyUnlock()
    if (policy === 'gold' && s.goldCellUnlocked && s.goldFrequencyLevel < 5 && s.wallet.gold >= frequencyCost(s.goldFrequencyLevel)) cmd({ type: 'gold-frequency', expectedLevel: s.goldFrequencyLevel }, now)
    if (policy !== 'research' && !blocked && (policy !== 'gold' || s.goldCellUnlocked)) buyResearch()
  }
  const dt = 2000, limit = 12 * 3600000
  let now: number
  for (now = dt; now <= limit; now += dt) {
    while (s.event && s.event.tier !== null && s.event.nextPaymentAtMs <= now) cmd({ type: 'tick' }, Math.max(s.savedAtMs, s.event.nextPaymentAtMs))
    cmd({ type: 'tick' }, now); cmd({ type: 'tap' }, now); steps++
    if (s.game.slimes.length === 16) full++
    if (s.generator.storedTiers.length === sessionRules(s).capacity) stockFull++
    const stage = stages[String(s.game.highestTierReached)] ??= { generated: 0, tiers: {}, boardLow: 0, steps: 0 }
    stage.boardLow += s.game.slimes.filter(x => x.tier <= 2).length; stage.steps++
    const eventSource = s.event?.tier !== null ? s.event?.sourceId : null
    const options = s.game.slimes.flatMap(a => s.game.slimes.filter(b => a.id !== b.id && a.tier === b.tier).map(b => planDrop(s.game, a.id, b.position, s.researchMaxTier))).filter(p => p.kind === 'merge')
    if (options.length) mergeReady++
    const merge = options.filter(p => !p.groups.some(g => g.consumedIds.includes(eventSource ?? ''))).sort((a, b) => b.outputTier - a.outputTier || b.groups.flatMap(g => g.consumedIds).length - a.groups.flatMap(g => g.consumedIds).length).find(p => p.groups.some(g => g.consumedIds.length === 5) || s.game.slimes.length >= 12 || p.outputTier > s.game.highestTierReached)
    if (merge) cmd({ type: 'drop', plan: merge }, now)
    else if (s.event?.tier === null && s.game.slimes.length && now % 10000 === 0) { const best = [...s.game.slimes].sort((a, b) => b.tier - a.tier)[0]!; cmd({ type: 'drop', plan: planDrop(s.game, best.id, s.event.cell, s.researchMaxTier) }, now) }
    else if (s.game.slimes.length < 16 && s.generator.storedTiers.length) cmd({ type: 'withdraw', expectedId: s.nextId }, now)
    else {
      // Rearrange a disconnected equal-Tier group before giving up space. Uses actual single-cell moves.
      const candidates = [...s.game.slimes].filter(x => x.id !== eventSource).sort((a, b) => b.tier - a.tier)
      let moved = false
      if (s.game.slimes.length < 16) for (const a of candidates) {
        const peers = candidates.filter(b => b.id !== a.id && b.tier === a.tier)
        if (peers.length < 2 || a.tier >= s.researchMaxTier) continue
        const dest = peers[0]!.position
        if (Math.max(Math.abs(a.position.x - dest.x), Math.abs(a.position.y - dest.y)) <= 1) continue
        const cells = Array.from({ length: 16 }, (_, i) => ({ x: i % 4, y: Math.floor(i / 4) })).filter(p => !s.game.slimes.some(x => x.position.x === p.x && x.position.y === p.y)).sort((a, b) => compareNear(dest, a, b))
        if (cells[0]) { cmd({ type: 'drop', plan: planDrop(s.game, a.id, cells[0], s.researchMaxTier) }, now); moved = true; break }
      }
      if (!moved && candidates.length && (s.game.slimes.length === 16 || s.game.highestTierReached >= s.researchMaxTier)) {
        const blocked = s.game.highestTierReached >= s.researchMaxTier
        const sale = blocked ? candidates[0]! : candidates[candidates.length - 1]!
        cmd({ type: 'sell', id: sale.id }, now)
      }
    }
    // Regular funding avoids hoarding every valuable duplicate forever.
    if (now % 30000 === 0) { const dup = [...s.game.slimes].filter(a => a.id !== eventSource && (s.game.slimes.filter(b => b.tier === a.tier).length >= 4 || (a.tier >= s.researchMaxTier && s.game.slimes.filter(b => b.tier === a.tier).length >= 2))).sort((a, b) => b.tier - a.tier)[0]; if (dup) cmd({ type: 'sell', id: dup.id }, now) }
    shop(now)
    for (const t of Object.keys(reached)) if (s.game.highestTierReached >= +t) reached[t] ??= now
    if (now % 600000 === 0) { expect(isSession(s)).toBe(true); expect(decodeSession(encodeSession(s), now).ok).toBe(true) }
    if (reached[40] !== null) break
  }
  return { name, seed, policy, multiplier, unlockPrice, reached, research, firstUnlock, endingH: s.game.highestTierReached, durationMs: Math.min(now, limit), sales, saleGOLD, eventGOLD, boardFullRatio: full / steps, stockFullRatio: stockFull / steps, mergeReadyRatio: mergeReady / steps, lowGeneratedRatio: low / Math.max(1, generated), stages }
}
it('follow-up actual 4x4 table/economy/policy comparisons with censored endgame times', () => {
  const seeds = [12, 61, 210]
  const distribution = Object.keys(profiles).flatMap(name => seeds.map(seed => simulate(name, seed)))
  const prices = [1, 3, 8].flatMap(multiplier => seeds.map(seed => simulate('intermediate', seed, 'balanced', multiplier)))
  const policies = (['production', 'gold', 'research', 'balanced'] as const).flatMap(policy => seeds.map(seed => simulate('intermediate', seed, policy)))
  const unlock = [64, 128, 256].map(cost => simulate('intermediate', 12, 'gold', 3, cost))
  const fixedH = Object.entries(profiles).flatMap(([name, p]) => Array.from({ length: 40 }, (_, i) => ({ name, H: i + 1, weights: tierWeights(i + 1, p) })))
  const researchPrices = RESEARCH_CAPS.slice(0, -1).map((cap, i) => ({ from: cap, to: RESEARCH_CAPS[i + 1], variants: [1, 3, 8].map(multiplier => ({ multiplier, cost: researchCost(i, multiplier), capTierSales: multiplier, previousTierSales: multiplier * 2 })) }))
  const out = { model: 'PROVISIONAL. Actual Core 4x4 random FIFO, explicit 2s decisions + acceleration, 5 preferred/3 at >=12 or discovery. Reposition when stock exhausted. Full-board lowest sale; capped-stage highest sale; duplicate sale every30s. One active gold source retained, 350ms independent receipts. Shop policies and candidate costs described in source. 3 seeded runs per primary condition, 12h right censor. Bot times are not human forecasts.', distribution, prices, policies, unlock, fixedH, researchPrices }
  mkdirSync('docs/validation/phase3a/regression-balance', { recursive: true })
  writeFileSync('docs/validation/phase3a/regression-balance/simulation.json', JSON.stringify(out, null, 2))
  expect(distribution).toHaveLength(12); expect(policies).toHaveLength(12)
  expect(prices.every(r => r.saleGOLD > 0 && r.research.length > 0)).toBe(true)
}, 480000)

