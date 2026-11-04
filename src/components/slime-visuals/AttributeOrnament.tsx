import type { AttributeId } from '../../domain/attributes'
import type { VisualCombination } from './ornamentConfig'

/** Local 24×24 silhouettes: static paths, no filters, IDs, random values or timers. */
export function AttributeOrnament({ id, awakened, combination }: {
  id: AttributeId; awakened: boolean; combination?: VisualCombination | undefined
}) {
  switch (id) {
    case 'fire': return <g stroke="#963d27" fill="#ff963e" strokeWidth="1.25" strokeLinejoin="round">
      <path d={awakened ? 'M6 21C-1 16 7 10 5 6L10 10 13 1Q19 6 17 11L20 7C24 15 22 21 15 22Z' : 'M7 21C0 17 6 11 8 7L11 11Q15 8 13 2C23 10 22 19 16 22Z'} />
      <path d={awakened ? 'M10 20Q5 15 11 11L13 15 16 7Q21 16 15 20Z' : 'M10 20Q7 17 12 13Q18 17 14 20Z'} fill={awakened ? '#d6fbff' : '#fff0a0'} stroke={awakened ? '#4584ba' : '#cf6625'} />
      {combination === 'golden-flame' && <path d="m3 6 1-3 1 3 3 1-3 1-1 3-1-3-2-1Z" fill="#ffe575" stroke="#b88023" />}
    </g>
    case 'ice': return <g stroke="#347f9e" fill="#bdedff" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      {awakened ? <><path d="M12 1v22M2 6l20 12M2 18 22 6M8 3l4 4 4-4M8 21l4-4 4 4M2 11l5-2-1-5M22 13l-5 2 1 5M2 13l5 2-1 5M22 11l-5-2 1-5" stroke="#dafaff" strokeWidth="3.4" /><path d="M12 1v22M2 6l20 12M2 18 22 6M8 3l4 4 4-4M8 21l4-4 4 4" fill="none" /><path d="m12 8 4 4-4 4-4-4Z" fill="#f8ffff" /></> : <><path d="m12 1 8 11-5 11H8L4 12Z" /><path d="m12 1-1 11 4 11M4 12h16M11 12l9 0" fill="none" stroke="#69b6d0" /><path d="m12 4-4 7h3Z" fill="#fff" stroke="none" /></>}
      {combination === 'charged-ice' && <path d="m13 5-5 8h5l-2 7 7-10h-5Z" fill="#ffed77" stroke="#7b8ca2" strokeWidth=".8" />}
    </g>
    case 'nature': return <g stroke="#367843" fill="#8bdd6b" strokeWidth="1.25" strokeLinejoin="round">
      <path d="M12 23V12M12 17Q1 17 2 7Q13 6 12 17ZM12 15Q23 15 22 5Q12 4 12 15Z" />
      <path d="M5 10l7 7m7-9-7 7" fill="none" stroke="#e7f8b2" />
      {awakened && <><path d="M12 4C7-4 2 4 7 7C-1 9 4 16 9 12C9 21 17 17 16 11C24 14 25 5 17 6C21-1 13-4 12 4Z" fill="#ffb6d5" stroke="#a94c77" /><circle cx="12" cy="8" r="3.2" fill="#fff29b" stroke="#b58a32" /></>}
    </g>
    default: return null
  }
}
