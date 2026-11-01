/// <reference types="node" />
import { it, expect } from 'vitest'
import { writeFileSync, mkdirSync } from 'node:fs'
import { freshSession as newSession, reduceSession, sessionRules } from '../../src/core/progression/session'
// Legacy regression fixture: research40 and GOLD already unlocked, as migrated pre-research saves.
const freshSession = (now: number) => ({ ...newSession(now), researchLevel: 16, researchMaxTier: 40, goldCellUnlocked: true })
import { advanceGenerator, tapGenerator, type DistributionProfile } from '../../src/core/progression/generation'
import { planDrop } from '../../src/core/merge/plan'
import { baseSaleValue, upgradeCost, type UpgradeKey } from '../../src/core/progression/economy'
import { isSession, encodeSession, decodeSession } from '../../src/core/progression/persistence'

function rng(seed: number) { return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 } }
type Scenario = { name: string; speed?: number; tap?: number; capacity?: number; distribution?: DistributionProfile; saleGrowth?: number; shopGrowth?: number; frequency?: number; passive?: boolean }
const scenarios: Scenario[] = [
  { name: 'adopted' }, { name: 'slow-generation', speed: 1.5 }, { name: 'fast-generation', speed: .6 },
  { name: 'weak-tap', tap: .4 }, { name: 'strong-tap', tap: 2 },
  { name: 'small-storage', capacity: .5 }, { name: 'large-storage', capacity: 2 },
  { name: 'original-wide-low', distribution: { centerSlope: .75, spreadRatio: .22, minimumSpread: 1 } },
  { name: 'high-tier-high', distribution: { centerSlope: 1, spreadRatio: .08, minimumSpread: 1, maximumSpread: 1.4 } },
  { name: 'gentle-sale', saleGrowth: 1.5 }, { name: 'steep-sale', saleGrowth: 2.2 },
  { name: 'gentle-shop', shopGrowth: 1.3 }, { name: 'steep-shop', shopGrowth: 2.2 },
  { name: 'rare-gold', frequency: .25 }, { name: 'frequent-gold', frequency: 3 },
  { name: 'no-gold', frequency: 0 }, { name: 'passive-60s', passive: true },
]
function simulate(c: Scenario, seed: number, mergeAt = 5) {
  const random = rng(seed)
  let s = freshSession(0), full = 0, storageFull = 0, earned = 0, spent = 0, eventGold = 0, firstPurchase: number | null = null
  let first3: number | null = null, first5: number | null = null, soldForSpace = 0
  const reached: Record<string, number | null> = { 5: null, 10: null, 20: null, 30: null, 40: null }, timeline: unknown[] = []
  const dt = 2000, limit = 12 * 3600_000
  function cmd(command: Parameters<typeof reduceSession>[1], now: number) {
    const base={...sessionRules(s),attributeChance:0,attributeMutationChance:0}
    s = reduceSession(s, command, now, random, {...base, capacity:Math.max(s.generator.storedTiers.length,Math.round(base.capacity*(c.capacity??1))), intervalMs:Math.round(base.intervalMs*(c.speed??1)), distribution:c.distribution??base.distribution})
  }
  let now: number
  for (now = dt; now <= limit; now += dt) {
    if(!Number.isSafeInteger(s.wallet.gold)||s.wallet.gold<0)throw Error(c.name+' invalid wallet at '+now+': '+s.wallet.gold)
    const actual = {...sessionRules(s),attributeChance:0,attributeMutationChance:0}, rules = { ...actual, intervalMs: Math.round(actual.intervalMs * (c.speed ?? 1)),
      capacity: Math.max(s.generator.storedTiers.length, Math.round(actual.capacity * (c.capacity ?? 1))),
      tapAdvanceMs: Math.round(actual.tapAdvanceMs * (c.tap ?? 1)), distribution: c.distribution ?? actual.distribution }
    // Scenario overrides are isolated here. Production reduceSession still owns merge/sale/purchase/events.
    const generator = advanceGenerator({ ...s.generator, progressMs: Math.min(s.generator.progressMs, rules.intervalMs - 1) }, now, s.game.highestTierReached, rules, random)
    s = { ...s, generator }
    if (!c.passive) s = { ...s, generator: tapGenerator(s.generator, s.game.highestTierReached, rules, random) }
    // Tick sees zero additional wall time, so it cannot double count custom generation.
    const beforeGold = s.wallet.gold
    const beforeEvent = s.event
    if (c.frequency === 0) s = { ...s, event: null, nextEventAtMs: now + 1_000_000 }
    else if ((c.frequency ?? 1) !== 1 && !s.event && now >= s.nextEventAtMs) s = { ...s, nextEventAtMs: now }
    cmd({ type: 'tick' }, now)
    eventGold += s.wallet.gold - beforeGold; earned += s.wallet.gold - beforeGold
    if (beforeEvent && !s.event && c.frequency && c.frequency !== 1) s = { ...s, nextEventAtMs: now + Math.round((s.nextEventAtMs - now) / c.frequency) }
    if (s.generator.storedTiers.length >= rules.capacity) storageFull += dt
    const acting = !c.passive || now % 60_000 === 0
    if (acting) {
      // Repeated actual Core plans, no count-only or unlimited-inventory oracle.
      for (let action = 0; action < (c.passive ? 20 : 1); action++) {
        const options = s.game.slimes.flatMap(source => s.game.slimes.filter(t => t.id !== source.id && t.tier === source.tier)
          .map(t => planDrop(s.game, source.id, t.position))).filter(p => p.kind === 'merge')
        const merge = options.sort((a, b) => b.groups.flatMap(g => g.consumedIds).length - a.groups.flatMap(g => g.consumedIds).length)
          .find(p => p.groups.some(g => g.consumedIds.length >= mergeAt) || s.game.slimes.length >= 15)
        if (merge) {
          if (merge.groups.some(g => g.consumedIds.length === 3)) first3 ??= now
          if (merge.groups.some(g => g.consumedIds.length === 5)) first5 ??= now
          cmd({ type: 'drop', plan: merge }, now)
        } else {
          if (s.game.slimes.length === 16) {
            full += c.passive ? 60_000 : dt
            // Rescue sells low Tier, keeping the highest specimen; production never auto-sells.
            const lowest = [...s.game.slimes].sort((a,b) => a.tier - b.tier)[0]!
            const value = Math.round(2 * (c.saleGrowth ?? 2) ** (lowest.tier - 1))
            cmd({ type: 'sell', id: lowest.id }, now)
            const correction = value - baseSaleValue(lowest.tier)
            s = { ...s, wallet: { ...s.wallet, gold: s.wallet.gold + correction } }
            earned += value; soldForSpace++
          }
          if (s.generator.storedTiers.length) {
            const tier = s.generator.storedTiers[0]!
            const empty = Array.from({length:16},(_,i)=>({x:i%4,y:Math.floor(i/4)})).filter(p=>!s.game.slimes.some(x=>x.position.x===p.x&&x.position.y===p.y))
            empty.sort((a,b) => {
              const dist=(p: typeof a)=> Math.min(9,...s.game.slimes.filter(x=>x.tier===tier).map(x=>Math.max(Math.abs(x.position.x-p.x),Math.abs(x.position.y-p.y))))
              return dist(a)-dist(b)
            })
            if (empty[0]) cmd({type:'withdraw',expectedId:s.nextId},now)
          } else break
        }
      }
      // Periodically sell an expendable high-Tier duplicate, retaining one specimen at that Tier.
      if(now % 30_000 === 0) {
        const duplicate=[...s.game.slimes].sort((a,b)=>b.tier-a.tier).find(x=>s.game.slimes.filter(y=>y.tier===x.tier).length>=2)
        if(duplicate && s.wallet.gold + Math.round(2*(c.saleGrowth??2)**(duplicate.tier-1)) < Number.MAX_SAFE_INTEGER){
          const value=Math.round(2*(c.saleGrowth??2)**(duplicate.tier-1))
          cmd({type:'sell',id:duplicate.id},now)
          s={...s,wallet:{...s.wallet,gold:s.wallet.gold+value-baseSaleValue(duplicate.tier)}}
          earned+=value
        }
      }
      for (const key of ['speed','tap','storage'] as UpgradeKey[]) {
        const lv = s.wallet.upgrades[key]
        const originalCost=upgradeCost(key,lv), cost=Math.ceil(originalCost*((c.shopGrowth??1.7)/1.7)**lv)
        if(lv<16 && s.wallet.gold>=cost) {
          // Adjust experimental comparison cost around the same pure production purchase path.
          const prior=s.wallet.gold
          if (!Number.isSafeInteger(prior+originalCost-cost) || prior+originalCost-cost<0) continue
          s={...s,wallet:{...s.wallet,gold:s.wallet.gold+originalCost-cost}}
          cmd({type:'buy',key,expectedLevel:lv},now)
          spent+=cost;firstPurchase??=now
          expect(s.wallet.gold).toBe(prior-cost)
        }
      }
    }
    for(const tier of [5,10,20,30,40]) if(s.game.highestTierReached>=tier) reached[tier]??=now
    if(now%3600_000===0) timeline.push({hours:now/3600_000,H:s.game.highestTierReached,gold:s.wallet.gold,earned,spent,stored:s.generator.storedTiers.length})
    if(now%600_000===0 && !c.capacity && !c.speed) {
      expect(isSession(s)).toBe(true)
      const loaded=decodeSession(encodeSession(s),now)
      expect(loaded.ok).toBe(true)
      expect(new Set(s.game.slimes.map(x=>x.id)).size).toBe(s.game.slimes.length)
    }
    if(reached[40]!==null)break
  }
  return {name:c.name,seed,mergeAt,first3,first5,firstPurchase,reached,endingH:s.game.highestTierReached,earned,spent,eventGold,
    storageStoppedRatio:storageFull/now,boardBlockedRatio:Math.min(1,full/now),soldForSpace,timeline,durationMs:Math.min(now,limit)}
}
it('4x4 balance: seeded real-Core agent, seven axes and passive play; writes reproducible evidence',()=>{
  mkdirSync('docs/validation/phase3c/regression-phase3b/regression/regression-balance/legacy-sensitivity',{recursive:true})
  const results=scenarios.flatMap(c=>[12,61,210].map(seed=>simulate(c,seed)))
  const opening=[3,5].flatMap(n=>[12,61,210].map(seed=>simulate({name:'opening-'+n},seed,n)))
  writeFileSync('docs/validation/phase3c/regression-phase3b/regression/regression-balance/legacy-sensitivity/simulation.json',JSON.stringify({model:'4x4 real Core plans, 2s decision step; one tap per 2s active / 60s collection passive; 12h censor; 3 seeds per scenario. Not human play-time predictions.',results,opening},null,2))
  expect(results).toHaveLength(51)
},240_000)


