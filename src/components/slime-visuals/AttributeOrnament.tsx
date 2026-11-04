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
    case 'gold': return <g stroke="#98701d" fill="#ffd45c" strokeWidth="1.25" strokeLinejoin="round">
      <path d="M12 2V0" fill="none" /><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="7" fill="#ffeaa1" />
      {awakened ? <><path d="m12 5 2 4 5 1-4 4 1 5-4-2-4 2 1-5-4-4 5-1Z" fill="#b9f2ec" /><path d="m12 7 2 4-2 4-2-4Z" fill="#fcffff" stroke="#50968b" strokeWidth=".7" /></> : <path d="M9 8h6m-6 8h6m-3-9v10" fill="none" strokeWidth="1.8" />}
      {combination === 'golden-flame' && <path d="M11 18C6 16 11 13 11 10Q16 13 15 16L18 14Q20 20 14 20Z" fill="#ff9755" stroke="#ac5f25" strokeWidth=".8" />}
    </g>
    case 'dark': return <g stroke="#513968" fill={awakened ? '#8967bc' : '#735584'} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d={awakened ? 'M23 21C11 25-2 17 2 10C5 3 15 7 12 12C10 15 5 11 8 10Q3 18 15 16L21 12Z' : 'M23 20C12 25 0 18 3 11C7 4 16 9 12 14Q7 18 8 12Q3 18 14 18L21 14Z'} />
      {awakened && <><path d="m5 1 5 6-3 7-6-6Z" fill="#d7c1ff" /><path d="m5 3 1 7M13 3l2 2" fill="none" stroke="#f4e7ff" /></>}
    </g>
    case 'lightning': return <g stroke="#9b701d" fill={combination === 'charged-ice' ? '#e5fbff' : '#ffe361'} strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">
      <path d={awakened ? 'M14 1 3 12h7L6 23 21 9h-8Z' : 'M14 1 4 13h7L9 23 21 9h-7Z'} />
      {awakened && <><path d="m16 3 5 1-3 3 4 1M5 6 1 9l4 1-3 6" fill="none" stroke="#589bcb" strokeWidth="1.8" /><path d="m13 6-4 6h4l-2 5" fill="none" stroke="#fff" /></>}
    </g>
    case 'luck': return <g stroke={awakened ? '#a27b23' : '#3a855a'} fill="#78c78e" strokeWidth={awakened ? '1.8' : '1.25'} strokeLinejoin="round">
      <path d="M12 11C-1 12 0 2 7 3Q12 3 12 11C11-2 22 0 21 7Q21 12 12 11C25 10 24 21 17 21Q12 21 12 11C13 24 2 25 2 17Q2 12 12 11Z" />
      <path d="M12 11v9l4 3" fill="none" />
      {awakened ? <path d="m12 7 1.5 3 3.5 1-3 2 .5 4-2.5-2-3 2 1-4-3-2 3.5-1Z" fill="#fff3a5" strokeWidth=".7" /> : <path d="m5 5 14 14M18 5 5 18" fill="none" stroke="#d0f2b1" />}
      {combination === 'helix-clover' && <path d="M8 5c8 3 0 8 8 13M15 5c-8 3 0 8-8 13m2-10h5m-4 5h5" fill="none" stroke="#6956a7" strokeWidth="1.25" />}
    </g>
    case 'mutation': return <g fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
      {awakened ? <><path d="M6 2c0 8 12 12 12 20" stroke="#b76abb" /><path d="M18 2c0 8-12 12-12 20" stroke="#50a9bc" /><path d="M7 5h10m-8 4h6" stroke="#e6b642" /><path d="M9 15h6m-8 4h10" stroke="#79b97c" /></> : <><path d="M6 3c13-6 15 10 6 9S2 22 18 21" stroke="#9156a4" /><path d="M18 3C5-3 3 13 12 12s10 16-6 9" stroke="#c67eb7" /></>}
    </g>
    case 'light': return <g fill="#fff3b9" stroke="#a38a48" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d={awakened ? 'M2 21C12 24 24 17 23 3L18 7 18 1 12 9 9 5 6 13 2 11Z' : 'M2 21C11 24 23 17 22 5L16 10 14 4 9 13 6 9 2 14Z'} />
      <path d="M6 19Q15 17 19 10M9 19l6-5" fill="none" stroke="#e0c56e" />
      {awakened && <><path d="M3 17Q11 13 11 7L7 9 5 4 1 13Z" fill="#ffffe7" /><path d="M17 0 19-2M23 11h2M1 5 0 3" fill="none" stroke="#e5c45b" /></>}
    </g>
    case 'magnet': return <g stroke="#5c668c" fill="#b4c3ec" strokeWidth="1.3" strokeLinejoin="round">
      <path d="M4 3h5v10a3 3 0 0 0 6 0V3h5v10a8 8 0 0 1-16 0Z" />
      <path d="M4 3h5v5H4Z" fill="#fb969b" /><path d="M15 3h5v5h-5Z" fill="#87c9f3" />
      {awakened && <><path d="M1 7Q-2 19 10 23M23 7Q26 19 14 23" fill="none" stroke="#a694ce" /><circle cx="2" cy="16" r="2" fill="#f4fbff" /><circle cx="22" cy="16" r="2" fill="#f4fbff" /></>}
    </g>
  }
}
