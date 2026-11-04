import { ATTRIBUTE_IDS, type AttributeId, type Attributes } from '../../domain/attributes'

export type OrnamentSlot = Readonly<{ x: number; y: number; size: number; angle: number; layer: 'back' | 'front' }>
/** Coordinates in the existing Slime's 100×100 box. Never depend on array order or Lv. */
export const ORNAMENT_SLOTS: Readonly<Record<AttributeId, OrnamentSlot>> = {
  fire: { x: 73, y: 15, size: 25, angle: 8, layer: 'front' },
  gold: { x: 89, y: 61, size: 22, angle: 12, layer: 'front' },
  dark: { x: 9, y: 79, size: 29, angle: -10, layer: 'back' },
  ice: { x: 25, y: 16, size: 27, angle: -12, layer: 'front' },
  lightning: { x: 89, y: 43, size: 22, angle: 9, layer: 'front' },
  nature: { x: 13, y: 32, size: 26, angle: -18, layer: 'front' },
  luck: { x: 39, y: 32, size: 18, angle: -8, layer: 'front' },
  mutation: { x: 61, y: 32, size: 18, angle: 8, layer: 'front' },
  light: { x: 91, y: 80, size: 30, angle: 12, layer: 'back' },
  magnet: { x: 10, y: 58, size: 22, angle: -14, layer: 'front' },
}

export const VISUAL_COMBINATIONS = [
  { id: 'golden-flame', attributes: ['fire', 'gold'] },
  { id: 'charged-ice', attributes: ['ice', 'lightning'] },
  { id: 'helix-clover', attributes: ['luck', 'mutation'] },
] as const
export type VisualCombination = typeof VISUAL_COMBINATIONS[number]['id']

/** Read-only derived view. The decoration result intentionally contains no level. */
export function composeOrnaments(attributes: Attributes = []) {
  const present = new Set(attributes.map(a => a.id))
  return {
    ornaments: ATTRIBUTE_IDS.filter(id => present.has(id)).map(id => ({
      id, awakened: attributes.some(a => a.id === id && a.awakened === true), slot: ORNAMENT_SLOTS[id],
    })),
    combinations: VISUAL_COMBINATIONS.filter(c => c.attributes.every(id => present.has(id))).map(c => c.id),
  }
}
