/** Original vector art; independent of stored/generated Tier so it cannot preview the FIFO. */
export function SlimeTrio() {
  const body = 'M-25 15Q-27-7-13-18Q0-34 13-18Q27-7 25 15Q17 23 0 22Q-17 23-25 15Z'
  return <svg data-testid="slime-trio" viewBox="0 0 120 80" aria-label="3匹のスライム" role="img">
    <ellipse cx="60" cy="70" rx="50" ry="6" fill="#5e8842" opacity=".16" />
    {[[26, 48, .72, '#a9dbf0'], [94, 48, .72, '#ffd59a'], [60, 43, 1.1, '#b4e58e']].map(([x, y, scale, fill], i) => <g key={i} transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d={body} fill={String(fill)} stroke="#577e57" strokeWidth="2.5" />
      <ellipse cx="-9" cy="-10" rx="7" ry="3" fill="white" opacity=".6" transform="rotate(-25)" />
      <circle cx="-9" cy="3" r="2.4" fill="#354c40" /><circle cx="9" cy="3" r="2.4" fill="#354c40" />
      <path d="M-4 9Q0 14 4 9" fill="none" stroke="#354c40" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="-15" cy="9" rx="4" ry="2.5" fill="#efad9a" opacity=".8" /><ellipse cx="15" cy="9" rx="4" ry="2.5" fill="#efad9a" opacity=".8" />
    </g>)}
  </svg>
}
export function GoldBag() {
  return <svg className="gold-bag" data-testid="gold-bag" viewBox="0 0 48 48" aria-hidden="true">
    <path d="m15 4 9 3 9-3-4 12c20 16 16 28-5 28S-1 32 19 16Z" fill="#e6b35e" stroke="#95632c" strokeWidth="2.5" />
    <path d="M17 17h14M17 20h14" stroke="#866238" strokeWidth="3" strokeLinecap="round" />
    <circle cx="24" cy="31" r="8" fill="#ffdd72" stroke="#ba8b32" strokeWidth="2" /><path d="M27 27h-4q-6 3 0 5h2q5 3-1 4h-4m4-11v13" stroke="#a27324" strokeWidth="1.7" fill="none" />
  </svg>
}
export function StorageBox() {
  return <svg className="storage-box" viewBox="0 0 36 32" aria-hidden="true"><path d="M3 10h30v19H3Z" fill="#dfba84" stroke="#987444" strokeWidth="2" /><path d="m3 10 6-7h18l6 7Z" fill="#f2d6a2" stroke="#987444" strokeWidth="2" /><path d="M14 12h8v5h-8Z" fill="#fff4cc" /><path d="M18 3v7" stroke="#987444" strokeWidth="2" /></svg>
}
