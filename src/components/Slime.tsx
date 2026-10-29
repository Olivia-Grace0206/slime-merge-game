import type { CSSProperties } from 'react'
export function Slime({ tier }: { tier: number }) {
  const colors = ['#82d963', '#6ebff4', '#fb828a']
  const color = colors[tier - 1] ?? `hsl(${(tier * 47 + 12) % 360} 77% 72%)`
  return (
    <span
      className={`slime-art ${tier >= 11 ? 'patterned' : ''} ${tier >= 21 ? 'radiant' : ''}`}
      style={
        {
          '--slime-color': color,
          '--accent': `hsl(${(tier * 47 + 100) % 360} 85% 86%)`,
        } as CSSProperties
      }
      aria-hidden="true"
    >
      {tier >= 21 && <span className="crown">✦</span>}
      <span className="slime-body">
        <span className="shine" />
        <span className="eyes">
          <i />
          <i />
        </span>
        <span className="blush left" />
        <span className="blush right" />
        <span className="smile" />
      </span>
      <span className="tier-pill">{tier}</span>
    </span>
  )
}
