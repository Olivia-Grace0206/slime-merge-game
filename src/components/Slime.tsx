import type { CSSProperties } from 'react'
/** Tier body, face and badge are independent layers. Future trait/aura slots stay separate. */
export function Slime({ tier }: { tier: number }) {
  const colors = ['#82d963', '#6ebff4', '#fb828a']
  const color = tier === 4 ? '#c9a0ed' : colors[tier - 1] ?? `hsl(${(tier * 47 + 12) % 360} 77% 72%)`
  const family = tier <= 10 ? 'plain' : tier <= 20 ? 'patterned' : tier <= 30 ? 'gem radiant' : 'cosmic radiant'
  const variant = (tier - 1) % 10
  return <span className={`slime-art ${tier === 4 ? 'violet-drop' : ''} ${family} variant-${variant} ${tier === 30 ? 'rainbow' : ''} ${tier === 40 ? 'transcendent' : ''}`}
    style={{ '--slime-color': color, '--accent': `hsl(${(tier * 47 + 100) % 360} 85% 86%)`, '--pattern-angle': `${variant * 19 + 15}deg` } as CSSProperties} aria-hidden="true">
    {tier >= 21 && <span className="crown">{tier === 40 ? '♛' : tier >= 31 ? '✧' : '◆'}</span>}
    <span className="slime-body"><span className="shine" /><span className="eyes"><i /><i /></span><span className="blush left" /><span className="blush right" /><span className="smile" /></span>
    {tier >= 31 && <span className="tier-orbit" />}
    <span className="tier-pill">{tier}</span>
  </span>
}

