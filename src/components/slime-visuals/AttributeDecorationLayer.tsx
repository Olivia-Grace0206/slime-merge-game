import { memo } from 'react'
import type { Attributes } from '../../domain/attributes'
import { composeOrnaments } from './ornamentConfig'
import { SynergyDecoration } from './SynergyDecoration'
import { AttributeOrnament } from './AttributeOrnament'

/** Decorative only. Shared by every Slime render route; no state or persistence. */
export const AttributeDecorationLayer = memo(function AttributeDecorationLayer({ attributes, layer }: {
  attributes: Attributes; layer: 'back' | 'front'
}) {
  const composition = composeOrnaments(attributes)
  const ornaments = composition.ornaments.filter(a => a.slot.layer === layer)
  if (!ornaments.length) return null
  return <svg className={`attribute-decoration attribute-decoration-${layer}`} viewBox="0 0 100 100" preserveAspectRatio="none"
    data-testid={`decoration-${layer}`} aria-hidden="true" focusable="false">
    {layer === 'front' && composition.combinations.map(combination => <SynergyDecoration key={combination} combination={combination} />)}
    {ornaments.map(({ id, awakened, slot }) => <g key={id} data-decoration={id} data-ornament-state={awakened ? 'awakened' : 'normal'}
      transform={`translate(${slot.x} ${slot.y}) rotate(${slot.angle}) scale(${slot.size / 24}) translate(-12 -12)`}>
      <AttributeOrnament id={id} awakened={awakened} combination={composition.combinations[0]} />
    </g>)}
  </svg>
})
