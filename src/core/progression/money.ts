import { isTier } from '../../domain/game'

/** Currency alone is bigint. Counts, times, coordinates and effect powers remain numbers. */
export type Gold = bigint
export const isGold = (value: unknown): value is Gold => typeof value === 'bigint' && value >= 0n
export function baseSaleValue(tier: number): Gold {
  if (!isTier(tier)) throw new RangeError('Invalid Tier')
  return 2n * 4n ** BigInt(tier - 1)
}
export type Ratio = Readonly<{ numerator: bigint; denominator: bigint }>
/** Exact decimal representation of the existing finite coefficient (including log2 power).
 * No currency passes through Number. No fixed-width cap or intermediate currency rounding.
 */
export function decimalRatio(value: number): Ratio {
  if (!Number.isFinite(value) || value < 0) throw new RangeError('Invalid coefficient')
  const [mantissa = '', exponent = '0'] = String(value).split('e')
  const [whole = '', fraction = ''] = mantissa.split('.')
  const scale = fraction.length - Number(exponent)
  const digits = BigInt(whole + fraction)
  return scale >= 0 ? { numerator: digits, denominator: 10n ** BigInt(scale) }
    : { numerator: digits * 10n ** BigInt(-scale), denominator: 1n }
}
export const floorRatio = (value: Gold, r: Ratio): Gold => value * r.numerator / r.denominator
export const ceilRatio = (value: Gold, r: Ratio): Gold => (value * r.numerator + r.denominator - 1n) / r.denominator
export function multiplyRatios(ratios: readonly Ratio[]): Ratio {
  return ratios.reduce((a, b) => ({ numerator: a.numerator * b.numerator, denominator: a.denominator * b.denominator }), { numerator: 1n, denominator: 1n })
}
/** Only used for trusted schema construction/tests. Public decoder validates exact currency paths. */
export const moneyJSON = (value: unknown): string => JSON.stringify(value, (_key, v: unknown) => typeof v === 'bigint' ? v.toString() : v)
