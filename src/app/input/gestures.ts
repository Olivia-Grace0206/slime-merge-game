import type { Point } from '../../core/input/coordinates'
import type { Camera } from './camera'
export type Contact = Readonly<{ id: number; point: Point }>
export type Single = Readonly<{ id: number; start: Point; current: Point; sourceId: string | null; camera: Camera }>
export type Pinch = Readonly<{ starts: readonly [Contact, Contact]; camera: Camera }>
export type GestureState = Readonly<{
  mode: 'idle' | 'drag' | 'pan' | 'pinch'
  contacts: readonly Contact[]
  blocked: boolean
  single?: Single | undefined
  pinch?: Pinch
}>
export type GestureEvent =
  | { type: 'down'; id: number; point: Point; sourceId: string | null; camera: Camera }
  | { type: 'move' | 'up'; id: number; point: Point }
  | { type: 'cancel'; id?: number }
export const idleGesture = (): GestureState => ({ mode: 'idle', contacts: [], blocked: false })
/** UI-only transition rules. Only a completed one-contact drag can authorize a drop. */
export function transition(state: GestureState, event: GestureEvent): { state: GestureState; drop?: Single | undefined } {
  if (event.type === 'cancel') {
    const contacts = state.contacts.filter(c => c.id !== event.id)
    return { state: { mode: 'idle', contacts, blocked: contacts.length > 0 } }
  }
  const known = state.contacts.some(c => c.id === event.id)
  if (event.type === 'down') {
    if (known) return { state }
    const contacts = [...state.contacts, { id: event.id, point: event.point }]
    if (state.blocked || contacts.length > 2)
      return { state: { mode: 'idle', contacts, blocked: true } }
    if (contacts.length === 2)
      return { state: { mode: 'pinch', contacts, blocked: false,
        pinch: { starts: [contacts[0]!, contacts[1]!], camera: event.camera } } }
    return { state: { mode: event.sourceId ? 'drag' : 'pan', contacts, blocked: false,
      single: { id: event.id, start: event.point, current: event.point, sourceId: event.sourceId, camera: event.camera } } }
  }
  if (!known) return { state }
  if (event.type === 'up') {
    const contacts = state.contacts.filter(c => c.id !== event.id)
    const drop = state.mode === 'drag' && state.single?.id === event.id
      ? { ...state.single, current: event.point } : undefined
    return { state: { mode: 'idle', contacts, blocked: contacts.length > 0 }, drop }
  }
  const contacts = state.contacts.map(c => c.id === event.id ? { ...c, point: event.point } : c)
  return { state: { ...state, contacts,
    single: state.single?.id === event.id ? { ...state.single, current: event.point } : state.single } }
}
