import { isAttributes } from '../../domain/attributes'
import { RESEARCH_CAPS, legacyResearchLevel, EXPERIMENTAL_RESEARCH } from './research'
import { isProgressionSnapshot } from './save'
import { freshSession, goldPayment, sessionRules, type Session } from './session'
import { inBounds, isGameState } from '../board/state'
import { isWallet } from './economy'
import { isValidGeneratedTier } from './generation'

export const SAVE_KEY = 'slime-merge-normal-v2'
const integer = (n: unknown): n is number => Number.isSafeInteger(n) && (n as number) >= 0
function validateSession(value: unknown, version = 5): value is Session {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const s = value as Session
  if ((s.version as number) !== version || !integer(s.savedAtMs) || !integer(s.sequence) || !integer(s.nextId) || s.nextId < 1 ||
    !isGameState(s.game) || !isWallet(s.wallet) ||
    s.game.bounds.width !== 4 || s.game.bounds.height !== 4 || s.game.bounds.origin.x !== 0 || s.game.bounds.origin.y !== 0 ||
    s.game.slimes.some(x => x.id.length > 100 || (/^p-\d+$/.test(x.id) && Number(x.id.slice(2)) >= s.nextId)) ||
    !Array.isArray(s.protectedIds) || new Set(s.protectedIds).size !== s.protectedIds.length ||
    s.protectedIds.some(x => typeof x !== 'string' || !s.game.slimes.some(y => y.id === x)) ||
    typeof s.reducedEffects !== 'boolean' || !integer(s.eventSequence) || !integer(s.nextEventAtMs)) return false
  if (version >= 4 && (!integer(s.researchLevel) || s.researchLevel >= RESEARCH_CAPS.length || RESEARCH_CAPS[s.researchLevel] !== s.researchMaxTier ||
    s.researchMaxTier < s.game.highestTierReached || typeof s.goldCellUnlocked !== 'boolean' ||
    !integer(s.goldFrequencyLevel) || s.goldFrequencyLevel > EXPERIMENTAL_RESEARCH.frequencyMaxLevel ||
    (!s.goldCellUnlocked && (s.goldFrequencyLevel !== 0 || s.event !== null)) ||
    !['full', 'compact'].includes(s.goldFormat))) return false
  const g = s.generator, rules = sessionRules(s)
  if (!g || !Array.isArray(g.storedTiers) || g.storedTiers.length > rules.capacity ||
    Array.from(g.storedTiers).some(t => !isValidGeneratedTier(t, s.game.highestTierReached)) ||
    !integer(g.totalGenerated) || g.totalGenerated < g.storedTiers.length ||
    !integer(g.progressMs) || g.progressMs >= rules.intervalMs ||
    !integer(g.updatedAtMs) || g.updatedAtMs > s.savedAtMs ||
    (g.storedTiers.length === rules.capacity && g.progressMs !== 0)) return false
  if (version === 5 && (s.game.slimes.some(x => !isAttributes(x.attributes)) || !Array.isArray(g.storedAttributes) || g.storedAttributes.length !== g.storedTiers.length || !Array.from(g.storedAttributes).every(isAttributes))) return false
  if (version < 5 && (s.game.slimes.some(x => x.attributes !== undefined && (!isAttributes(x.attributes) || x.attributes.length > 0)) || (g.storedAttributes !== undefined && (!Array.isArray(g.storedAttributes) || g.storedAttributes.some(a => !isAttributes(a) || a.length > 0))))) return false
  if (s.lastEvent !== null && (!s.lastEvent || typeof s.lastEvent !== 'object' ||
    !/^gold-[1-9]\d*$/.test(s.lastEvent.id) || Number(s.lastEvent.id.slice(5)) > s.eventSequence ||
    !integer(s.lastEvent.paid ?? 10) || (s.lastEvent.paid ?? 10) > 10 || !integer(s.lastEvent.receivedGOLD) || s.lastEvent.receivedGOLD < 0)) return false
  const e = s.event
  if (e === null) return true
  if (!e || typeof e !== 'object' || (version === 2 ? e.rewardVersion !== undefined : ![1, 2].includes(e.rewardVersion ?? 0)) || !integer(e.sequence) || e.sequence < 1 || e.sequence !== s.eventSequence ||
    e.id !== `gold-${e.sequence}` || (s.lastEvent && Number(s.lastEvent.id.slice(5)) >= e.sequence) ||
    !inBounds(s.game.bounds, e.cell) || !integer(e.expiresAtMs) || !integer(e.nextPaymentAtMs) ||
    !integer(e.cappedGOLD ?? 0) ||
    !integer(e.paid) || e.paid >= 10 || !integer(e.receivedGOLD) ||
    !integer(e.attributeCount) || e.attributeCount > 10) return false
  if (e.tier === null) return e.sourceId === null && e.paid === 0 && e.receivedGOLD === 0 && (e.cappedGOLD ?? 0) === 0 && e.unitGOLD === 0 && e.nextPaymentAtMs === 0 && e.attributeCount === 0
  return isValidGeneratedTier(e.tier, s.game.highestTierReached) && typeof e.sourceId === 'string' && !!e.sourceId.trim() &&
    e.unitGOLD === goldPayment(e.tier, e.attributeCount, version === 2 ? 1 : e.rewardVersion) && e.receivedGOLD + (e.cappedGOLD ?? 0) === e.paid * e.unitGOLD
}
function attributeMigration(s: Pick<Session, 'game' | 'generator'>) {
  return { game: { ...s.game, slimes: s.game.slimes.map(x => ({ ...x, attributes: [] })) },
    generator: { ...s.generator, storedAttributes: s.generator.storedTiers.map(() => []) } }
}
export function isSession(value: unknown): value is Session { return validateSession(value) }
export function encodeSession(s: Session): string {
  if (!isSession(s)) throw new RangeError('Invalid save')
  return JSON.stringify(s)
}
export type LoadResult = { ok: true; session: Session; migrated: boolean } | { ok: false; reason: string }
export function decodeSession(raw: string, now: number): LoadResult {
  if (typeof raw !== 'string' || raw.length > 100_000) return { ok: false, reason: '保存データが大きすぎます' }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (isSession(parsed)) return { ok: true, session: parsed, migrated: false }
    for (const version of [4, 3, 2]) if (validateSession(parsed, version)) {
      const researchLevel = version === 4 ? parsed.researchLevel : legacyResearchLevel(parsed.game.highestTierReached)
      const session: Session = { ...parsed, ...attributeMigration(parsed), version: 5, researchLevel, researchMaxTier: RESEARCH_CAPS[researchLevel]!,
        goldCellUnlocked: version === 4 ? parsed.goldCellUnlocked : true, goldFrequencyLevel: version === 4 ? parsed.goldFrequencyLevel : 0, goldFormat: version === 4 ? parsed.goldFormat : 'full',
        event: parsed.event ? { ...parsed.event, rewardVersion: version === 2 ? 1 : parsed.event.rewardVersion! } : null }
      if (isSession(session)) return { ok: true, session, migrated: true }
    }
    if (isProgressionSnapshot(parsed) && parsed.game.slimes.every(x => x.attributes === undefined || (isAttributes(x.attributes) && x.attributes.length === 0)) && (parsed.generator.storedAttributes === undefined || (Array.isArray(parsed.generator.storedAttributes) && parsed.generator.storedAttributes.every(a => isAttributes(a) && a.length === 0)))) {
      // v1 experimental 7x7 presets are not normal-play saves; never crop or silently discard them.
      const researchLevel = legacyResearchLevel(parsed.game.highestTierReached)
      const migrated: Session = { ...freshSession(now), ...parsed, ...attributeMigration(parsed), version: 5, sequence: 0, event: null,
        researchLevel, researchMaxTier: RESEARCH_CAPS[researchLevel]!, goldCellUnlocked: true }
      if (isSession(migrated)) return { ok: true, session: migrated, migrated: true }
      return { ok: false, reason: '旧v1検証盤面は通常4×4へ自動変換できません（原本を保持）' }
    }
    return { ok: false, reason: '保存形式または内容が不正です。原本を保持しています' }
  } catch { return { ok: false, reason: '保存JSONが破損しています。原本を保持しています' } }
}
export interface StoragePort { getItem(key: string): string | null; setItem(key: string, value: string): void }
export type StorageResult = { ok: true; raw: string } | { ok: false; reason: string }
/** Caller holds an origin-wide Web Lock. Write the whole transaction or keep the previous one. */
export function commitStorage(storage: StoragePort, expectedRaw: string | null, next: Session): StorageResult {
  try {
    if (storage.getItem(SAVE_KEY) !== expectedRaw) return { ok: false, reason: '別のタブで保存が更新されました。再読み込みして続行してください' }
    const raw = encodeSession(next)
    storage.setItem(SAVE_KEY, raw)
    return { ok: true, raw }
  } catch { return { ok: false, reason: '保存できません。空き容量・ブラウザの保存許可を確認し、再試行してください' } }
}


