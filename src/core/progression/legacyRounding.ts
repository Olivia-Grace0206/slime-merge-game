import type { Ratio } from './money'

/** Reproduce historical binary64 rounding using integers, only for safe-range quotes.
 * Currency is never converted to Number. This preserves old rounding at integer boundaries;
 * high quotes use unrounded integer ratios instead (see saleValue).
 */
function binaryRatio(value: number): Ratio {
  const view = new DataView(new ArrayBuffer(8))
  view.setFloat64(0, value)
  const bits = view.getBigUint64(0), exponent = Number((bits >> 52n) & 2047n)
  const significand = (bits & ((1n << 52n) - 1n)) + (exponent ? 1n << 52n : 0n)
  const shift = (exponent || 1) - 1023 - 52
  return shift >= 0 ? {numerator:significand << BigInt(shift),denominator:1n} : {numerator:significand,denominator:1n << BigInt(-shift)}
}
function rounded(r: Ratio): Ratio {
  if (!r.numerator) return r
  let exponent = r.numerator.toString(2).length - r.denominator.toString(2).length
  const below = exponent >= 0 ? r.numerator < (r.denominator << BigInt(exponent)) : (r.numerator << BigInt(-exponent)) < r.denominator
  if (below) exponent--
  const shift = 52 - exponent
  const n = shift >= 0 ? r.numerator << BigInt(shift) : r.numerator
  const d = shift >= 0 ? r.denominator : r.denominator << BigInt(-shift)
  let q = n / d
  const remainder = n % d
  if (remainder * 2n > d || (remainder * 2n === d && q % 2n)) q++
  return shift >= 0 ? {numerator:q,denominator:1n << BigInt(shift)} : {numerator:q << BigInt(-shift),denominator:1n}
}
const multiply = (a: Ratio, b: number) => {const r=binaryRatio(b);return rounded({numerator:a.numerator*r.numerator,denominator:a.denominator*r.denominator})}
export function safeRoundedFire(base: bigint, fire: number): bigint | null {
  if (base > BigInt(Number.MAX_SAFE_INTEGER)) return null
  const add = multiply(multiply({numerator:base,denominator:1n}, .08), fire)
  return fire ? (add.numerator + add.denominator - 1n) / add.denominator : 0n
}
export function safeRoundedSale(base: bigint, fire: number, rates: readonly number[]): bigint | null {
  if (base > BigInt(Number.MAX_SAFE_INTEGER)) return null
  const added = safeRoundedFire(base,fire)!
  let value = rounded({numerator:base + added,denominator:1n})
  for (const rate of rates) value = multiply(value,rate)
  const result = value.numerator / value.denominator
  return result <= BigInt(Number.MAX_SAFE_INTEGER) ? result : null
}
