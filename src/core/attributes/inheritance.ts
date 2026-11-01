import { ATTRIBUTE_IDS, EXPERIMENTAL_ATTRIBUTES, isAttributes, type Attributes } from '../../domain/attributes'

export function randomUnit(random: () => number): number {
  const value = random()
  if (!Number.isFinite(value) || value < 0 || value >= 1) throw new RangeError('Invalid random')
  return value
}
function checkChance(chance: number) {
  if (!Number.isFinite(chance) || chance < 0 || chance > 1) throw new RangeError('Invalid probability')
}
export function drawAttributes(random: () => number, chance: number = EXPERIMENTAL_ATTRIBUTES.generationChance): Attributes {
  checkChance(chance)
  if (chance === 0 || randomUnit(random) >= chance) return []
  return [{ id: ATTRIBUTE_IDS[Math.floor(randomUnit(random) * ATTRIBUTE_IDS.length)]!, level: 1 }]
}
/** Per group, independent per attribute. No three/five-specific growth multiplier. */
export function inheritAttributes(inputs: readonly Attributes[]): Attributes | null {
  if (inputs.some(a => !isAttributes(a))) throw new RangeError('Invalid attributes')
  const result = ATTRIBUTE_IDS.flatMap(id => {
    const levels = inputs.flatMap(a => a.filter(x => x.id === id).map(x => x.level))
    if (!levels.length) return []
    const highest = Math.max(...levels)
    return [{ id, level: Math.min(EXPERIMENTAL_ATTRIBUTES.maxLevel, highest + (levels.filter(l => l === highest).length >= 2 ? 1 : 0)) }]
  })
  return result.length <= EXPERIMENTAL_ATTRIBUTES.maxCount ? result : null
}
/** One trial per GROUP; shared by both five-merge outputs. Only adds, never removes. */
export function mutateAttributes(attributes: Attributes, random: () => number, chance: number = EXPERIMENTAL_ATTRIBUTES.mutationChance): Attributes {
  if (!isAttributes(attributes)) throw new RangeError('Invalid attributes')
  checkChance(chance)
  if (chance === 0 || attributes.length >= EXPERIMENTAL_ATTRIBUTES.maxCount || randomUnit(random) >= chance) return attributes
  const candidates = ATTRIBUTE_IDS.filter(id => !attributes.some(a => a.id === id))
  const id = candidates[Math.floor(randomUnit(random) * candidates.length)]!
  return [...attributes, { id, level: 1 }].sort((a,b) => ATTRIBUTE_IDS.indexOf(a.id) - ATTRIBUTE_IDS.indexOf(b.id))
}
