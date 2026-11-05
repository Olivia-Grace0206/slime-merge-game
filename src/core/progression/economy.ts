import { isGold, baseSaleValue } from './money'
export { baseSaleValue } from './money'
import { saleValue } from '../attributes/effects'
import { isTier, type GameState } from '../../domain/game'
import { isGameState } from '../board/state'
import { EXPERIMENTAL_GENERATION, type GeneratorRules } from './generation'

/**
 * Deliberately temporary Phase 2 economy parameters. User approval of these
 * numbers has NOT been requested or given. Future simulation may replace them.
 */
export const EXPERIMENTAL_ECONOMY = Object.freeze({
  priceBase: 2,
  priceGrowth: 4,
  shopCostGrowth: 1.7,
  goldRushRatePerPayment: 0.2,
  goldRushAttributePenalty: 0.25,
})

/** Storage alone expands; speed/tap keep the Phase3B level limit. All storage values are provisional. */
export const STORAGE_UPGRADE = Object.freeze({perLevel:5,maxLevel:30,costGrowth:1.35})
export const UPGRADE_MAX_LEVEL = Object.freeze({speed:16,tap:16,storage:STORAGE_UPGRADE.maxLevel})
const LEGACY_MAX_LEVEL = Object.freeze({speed:16,tap:16,storage:16})

export type UpgradeKey = 'speed' | 'tap' | 'storage'
export type Upgrades = Readonly<Record<UpgradeKey, number>>
export type Wallet = Readonly<{ gold: bigint; upgrades: Upgrades; goldRushReceipts?: Readonly<Record<string, number>> }>
export type ShopResult = Readonly<{ ok: boolean; wallet: Wallet; cost: bigint }>

export function freshWallet(): Wallet {
  return { gold: 0n, upgrades: { speed: 0, tap: 0, storage: 0 } }
}

function validWallet(value: unknown, limits: Readonly<Record<UpgradeKey,number>>): value is Wallet {
  if (!value || typeof value !== 'object') return false
  const w = value as Wallet
  if (w.goldRushReceipts !== undefined && (!w.goldRushReceipts || typeof w.goldRushReceipts !== 'object' || Array.isArray(w.goldRushReceipts) || Object.entries(w.goldRushReceipts).some(([id, paid]) => !id.trim() || id.length > 100 || !Number.isSafeInteger(paid) || paid < 0 || paid > 10))) return false
  return isGold(w.gold) &&
    !!w.upgrades && (['speed', 'tap', 'storage'] as const).every((key) =>
      Number.isSafeInteger(w.upgrades[key]) &&
      w.upgrades[key] >= 0 &&
      w.upgrades[key] <= limits[key])
}

export function isWallet(value:unknown):value is Wallet{return validWallet(value,UPGRADE_MAX_LEVEL)}
/** Old schemas must be checked against their historical limits, before capacity is re-evaluated. */
export function isLegacyWallet(value:unknown):value is Wallet{return validWallet(value,LEGACY_MAX_LEVEL)}

const SHOP_BASE: Readonly<Record<UpgradeKey, number>> = {
  speed: 12,
  tap: 16,
  storage: 20,
}

export function upgradeCost(key: UpgradeKey, level: number): bigint {
  if (!(Object.hasOwn(SHOP_BASE, key)) || !Number.isSafeInteger(level) || level < 0 || level > UPGRADE_MAX_LEVEL[key]) {
    throw new RangeError('Invalid upgrade')
  }
  return BigInt(Math.ceil(SHOP_BASE[key] * (key==='storage'?STORAGE_UPGRADE.costGrowth:EXPERIMENTAL_ECONOMY.shopCostGrowth) ** level))
}

export function purchaseUpgrade(wallet: Wallet, key: UpgradeKey): ShopResult {
  const reject = (cost = 0n): ShopResult => ({ ok: false, wallet, cost })
  if (!isWallet(wallet) || !(Object.hasOwn(SHOP_BASE, key))) return reject()
  const level = wallet.upgrades[key]
  if (level >= UPGRADE_MAX_LEVEL[key]) return reject()
  const cost = upgradeCost(key, level)
  if (wallet.gold < cost) return reject(cost)
  return {
    ok: true,
    wallet: {
      ...wallet,
      gold: wallet.gold - cost,
      upgrades: { ...wallet.upgrades, [key]: level + 1 },
    },
    cost,
  }
}

export function legacyGenerationRules(wallet: Wallet): GeneratorRules {
  if (!isLegacyWallet(wallet)) throw new RangeError('Invalid wallet')
  return {
    intervalMs: Math.max(2_000, Math.round(10_000 * 0.9 ** wallet.upgrades.speed)),
    tapAdvanceMs: EXPERIMENTAL_GENERATION.baseTapAdvanceMs + wallet.upgrades.tap * 350,
    capacity: EXPERIMENTAL_GENERATION.initialCapacity + wallet.upgrades.storage * 3,
  }
}

/** Phase3B provisional slower pace. Attributes are applied by sessionRules. */
export const GENERATION_PACE = Object.freeze({speedFactor:0.95, tapPerLevelMs:200, minimumIntervalMs:2000,maxTapIntervalFraction:0.75})
export function generationRules(wallet: Wallet): GeneratorRules {
  if (!isWallet(wallet)) throw new RangeError('Invalid wallet')
  return { intervalMs: Math.max(GENERATION_PACE.minimumIntervalMs, Math.round(EXPERIMENTAL_GENERATION.baseIntervalMs * GENERATION_PACE.speedFactor ** wallet.upgrades.speed)),
    tapAdvanceMs: EXPERIMENTAL_GENERATION.baseTapAdvanceMs + wallet.upgrades.tap * GENERATION_PACE.tapPerLevelMs,
    capacity: EXPERIMENTAL_GENERATION.initialCapacity + wallet.upgrades.storage * STORAGE_UPGRADE.perLevel }
}

export type SaleResult = Readonly<{
  ok: boolean
  game: GameState
  wallet: Wallet
  earned: bigint
}>

/** Selling changes the board and GOLD together; highest ever Tier never decreases. */
export function sellSlime(game: GameState, wallet: Wallet, slimeId: string): SaleResult {
  const reject = (): SaleResult => ({ ok: false, game, wallet, earned: 0n })
  if (!isGameState(game) || !isWallet(wallet) || !slimeId.trim()) return reject()
  const target = game.slimes.find((s) => s.id === slimeId)
  if (!target) return reject()
  const earned = saleValue(target)
  if (game.revision >= Number.MAX_SAFE_INTEGER - 1) return reject()
  const next = { ...game, revision: game.revision + 1, slimes: game.slimes.filter((s) => s.id !== slimeId) }
  if (!isGameState(next)) return reject()
  return { ok: true, game: next, wallet: { ...wallet, gold: wallet.gold + earned }, earned }
}

/**
 * Pure 10-payment GOLD event primitive. Cell spawning and event IDs will be
 * integrated in a later Phase 2 increment; this is not an automatic sell.
 */
export type GoldRush = Readonly<{ id: string; tier: number; attributeCount: number; paid: number; unitGOLD: bigint }>
export function beginGoldRush(id: string, tier: number, attributeCount: number): GoldRush {
  if (!id.trim() || id.length > 100 || !isTier(tier) || !Number.isSafeInteger(attributeCount) || attributeCount < 0 || attributeCount > 10)
    throw new RangeError('Invalid event')
  const amount = baseSaleValue(tier) * 4n / (5n * BigInt(4 + attributeCount))
  const unitGOLD = amount > 0n ? amount : 1n
  return { id, tier, attributeCount, paid: 0, unitGOLD }
}

/** Legacy API: wallet carries a receipt ledger. Production uses the bounded Session event ledger. */
export function payGoldRush(wallet: Wallet, event: GoldRush): Readonly<{
  ok: boolean; wallet: Wallet; event: GoldRush
}> {
  const reject = () => ({ ok: false, wallet, event })
  if (!isWallet(wallet) || !event || typeof event.id !== 'string' || !event.id.trim() || event.id.length > 100 || !isTier(event.tier) ||
      !Number.isSafeInteger(event.attributeCount) || event.attributeCount < 0 || event.attributeCount > 10 ||
      !Number.isSafeInteger(event.paid) || event.paid < 0 || event.paid >= 10 ||
      !isGold(event.unitGOLD) || event.unitGOLD <= 0n ||
      (Object.hasOwn(wallet.goldRushReceipts ?? {}, event.id) ? wallet.goldRushReceipts![event.id] : 0) !== event.paid ||
      event.unitGOLD !== beginGoldRush(event.id, event.tier, event.attributeCount).unitGOLD) return reject()
  return {
    ok: true,
    wallet: { ...wallet, gold: wallet.gold + event.unitGOLD, goldRushReceipts: { ...wallet.goldRushReceipts, [event.id]: event.paid + 1 } },
    event: { ...event, paid: event.paid + 1 },
  }
}
