/** Stable IDs; effects/awakening will be added in later phases through a new schema. */
export const ATTRIBUTE_IDS = ['fire', 'gold', 'dark', 'ice', 'lightning', 'nature', 'luck', 'mutation', 'light', 'magnet'] as const
export type AttributeId = typeof ATTRIBUTE_IDS[number]
export type Attribute = Readonly<{ id: AttributeId; level: number }>
export type Attributes = readonly Attribute[]
/** Technical trial settings, NOT approved balance or permanent gameplay limits. */
export const EXPERIMENTAL_ATTRIBUTES = Object.freeze({ maxCount: 3, maxLevel: 99, generationChance: 0.08, mutationChance: 0.01 })
export function isAttributes(value: unknown): value is Attributes {
  if (!Array.isArray(value) || value.length > EXPERIMENTAL_ATTRIBUTES.maxCount) return false
  const seen = new Set<string>()
  return value.every(a => {
    if (!a || typeof a !== 'object' || Array.isArray(a) || Object.keys(a).some(k => k !== 'id' && k !== 'level') ||
      !ATTRIBUTE_IDS.includes(a.id) || seen.has(a.id) || !Number.isSafeInteger(a.level) || a.level < 1 || a.level > EXPERIMENTAL_ATTRIBUTES.maxLevel) return false
    seen.add(a.id); return true
  })
}
