/** All prices and the initial/batch research boundaries are PROVISIONAL. */
export const RESEARCH_CAPS = Object.freeze([5, 10, 15, 20, 25, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40])
export const EXPERIMENTAL_RESEARCH = Object.freeze({ saleMultiplier: 3, goldUnlockCost: 128n, frequencyMaxLevel: 5, frequencyDiscount: 0.05 })
export function legacyResearchLevel(highest: number): number {
  return RESEARCH_CAPS.findIndex(cap => cap >= highest)
}
export function researchCost(level: number, multiplier: number = EXPERIMENTAL_RESEARCH.saleMultiplier): bigint {
  if (!Number.isInteger(level) || level < 0 || level >= RESEARCH_CAPS.length - 1 || !Number.isFinite(multiplier) || multiplier <= 0) throw new RangeError('Invalid research')
  const price = Math.ceil(2 ** RESEARCH_CAPS[level]! * multiplier)
  if (!Number.isSafeInteger(price)) throw new RangeError('Unsafe legacy research coefficient')
  return BigInt(price)
}
export function frequencyCost(level: number): bigint {
  if (!Number.isInteger(level) || level < 0 || level > EXPERIMENTAL_RESEARCH.frequencyMaxLevel) throw new RangeError('Invalid frequency level')
  return 128n * 2n ** BigInt(level)
}
