import { MAX_TIER, type GameState, type Slime } from '../domain/game'
export const PRESETS = [
  { id: 'three', label: '3体マージ', count: 3 },
  { id: 'five', label: '5体マージ', count: 5 },
  { id: 'eight', label: '8体マージ', count: 8 },
  { id: 'eleven', label: '11体マージ', count: 11 },
  { id: 'diagonal', label: '斜め連結', count: 5 },
  { id: 'high', label: '高Tier試験', count: 3 },
] as const
export type PresetId = typeof PRESETS[number]['id']
/** Each preset is a new test session; history starts at the highest placed tier. */
export function createPreset(id: PresetId, revision = 0): GameState {
  const count = PRESETS.find(p => p.id === id)!.count
  const tier = id === 'high' ? MAX_TIER - 1 : 1
  const cells = id === 'diagonal' ? [{ x: 2, y: 2 }, { x: 3, y: 3 }, { x: 4, y: 4 }, { x: 5, y: 5 }]
    : Array.from({ length: count - 1 }, (_, i) => ({ x: 2 + i % 3, y: 2 + Math.floor(i / 3) }))
  const slimes: Slime[] = [{ id: 'drag', tier, position: { x: 0, y: 3 } },
    ...cells.map((position, i) => ({ id: `seed-${i}`, tier, position }))]
  if (id === 'high') for (let i = 0; i < 3; i++) slimes.push({ id: `cap-${i}`, tier: MAX_TIER, position: { x: 2 + i, y: 5 } })
  return { bounds: { origin: { x: 0, y: 0 }, width: 7, height: 7 }, slimes,
    highestTierReached: id === 'high' ? MAX_TIER : tier, revision }
}
