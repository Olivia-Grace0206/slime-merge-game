import type { VisualCombination } from './ornamentConfig'

/** Small shared accents; major per-attribute silhouettes remain above these paths. */
export function SynergyDecoration({ combination }: { combination: VisualCombination }) {
  if (combination === 'golden-flame') return <g data-synergy={combination} fill="#ffe58a" stroke="#a98229" strokeWidth=".8" strokeLinejoin="round">
    <path d="m84 30 1-2 1 2 2 1-2 1-1 2-1-2-2-1Z" /><path d="m91 42 1-2 1 2 2 1-2 1-1 2-1-2-2-1Z" />
  </g>
  if (combination === 'charged-ice') return <g data-synergy={combination} fill="none" stroke="#5f9fc0" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
    <path d="m33 26 4 2-2 3 5-1" /><path d="m78 36 3-2-1 4 3-1" stroke="#f1d565" />
  </g>
  return <g data-synergy={combination} fill="none" stroke="#8d67ab" strokeWidth="1" strokeLinecap="round">
    <path d="M46 28c9 2-1 5 8 8M54 28c-9 2 1 5-8 8M48 30h4m-4 4h4" />
  </g>
}
