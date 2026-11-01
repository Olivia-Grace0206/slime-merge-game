/** All prices and the initial/batch research boundaries are PROVISIONAL. */
export const RESEARCH_CAPS = Object.freeze([5, 10, 15, 20, 25, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40])
export const EXPERIMENTAL_RESEARCH = Object.freeze({ saleMultiplier: 3, goldUnlockCost: 128, frequencyMaxLevel: 5, frequencyDiscount: 0.05 })
export function legacyResearchLevel(highest: number): number {
  return RESEARCH_CAPS.findIndex(cap => cap >= highest)
}
export function researchCost(level: number, multiplier = EXPERIMENTAL_RESEARCH.saleMultiplier): number {
  if (!Number.isInteger(level) || level < 0 || level >= RESEARCH_CAPS.length - 1 || !Number.isFinite(multiplier) || multiplier <= 0) throw new RangeError('Invalid research')
  return Math.ceil(2 ** RESEARCH_CAPS[level]! * multiplier)
}
export function frequencyCost(level: number): number {
  if (!Number.isInteger(level) || level < 0 || level > EXPERIMENTAL_RESEARCH.frequencyMaxLevel) throw new RangeError('Invalid frequency level')
  return 128 * 2 ** level
}
