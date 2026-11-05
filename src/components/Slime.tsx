import { AttributeDecorationLayer } from './slime-visuals/AttributeDecorationLayer'
import {awakeningCount} from '../core/attributes/awakening'
import type { Attributes } from '../domain/attributes'
import { AttributeBadges } from './AttributeBadges'
import { memo, type CSSProperties } from 'react'
/** Tier body, face and badge are independent layers. Future trait/aura slots stay separate. */
export const Slime = memo(function Slime({ tier, attributes }: { tier: number; attributes?: Attributes | undefined }) {
  const awake=awakeningCount(attributes)
  const colors = ['#82d963', '#6ebff4', '#fb828a']
  const color = tier === 4 ? '#c9a0ed' : colors[tier - 1] ?? `hsl(${(tier * 47 + 12) % 360} 77% 72%)`
  const family = tier <= 10 ? 'plain' : tier <= 20 ? 'patterned' : tier <= 30 ? 'gem radiant' : 'cosmic radiant'
  const variant = (tier - 1) % 10
  return <span data-awakening={awake} className={`slime-art awakening-${awake} ${tier === 4 ? 'violet-drop' : ''} ${family} ${attributes?.length ? 'has-ornaments' : ''} variant-${variant} ${tier === 30 ? 'rainbow' : ''} ${tier === 40 ? 'transcendent' : ''}`}
    style={{ '--slime-color': color, '--accent': `hsl(${(tier * 47 + 100) % 360} 85% 86%)`, '--pattern-angle': `${variant * 19 + 15}deg` } as CSSProperties} aria-hidden="true">
    {awake > 0 && <>
      <span className="awakening-aura" data-testid="awakening-aura"><span className="aura-ring" /><i className="aura-spark first" />{awake > 1 && <i className="aura-spark second" />}{awake > 2 && <i className="aura-spark third" />}</span>
      <span className="awakening-rank" data-testid="awakening-rank">{'★'.repeat(awake)}</span>
    </>}
    {!!attributes?.length && <AttributeDecorationLayer attributes={attributes} layer="back" />}
    {tier >= 21 && <span className="crown">{tier === 40 ? '♛' : tier >= 31 ? '✧' : '◆'}</span>}
    <span className="slime-body"><span className="shine" /><span className="eyes"><i /><i /></span><span className="blush left" /><span className="blush right" /><span className="smile" /></span>
    {tier >= 31 && <span className="tier-orbit" />}
    {!!attributes?.length && <AttributeDecorationLayer attributes={attributes} layer="front" />}
    <AttributeBadges {...(attributes ? { attributes } : {})} />
    <span className="tier-pill">{tier}</span>
  </span>
})


