import type { Attributes } from '../domain/attributes'
import { ATTRIBUTE_LABELS } from './attributeLabels'
/** Text glyphs avoid platform emoji gaps; separate edge layer never covers face/Tier. */
export function AttributeBadges({ attributes = [] }: { attributes?: Attributes }) {
  return <span className="attribute-badges" data-testid="attribute-badges">{attributes.map(a => <span className={`attribute-badge attribute-${a.id}`} key={a.id} title={`${ATTRIBUTE_LABELS[a.id][0]} Lv${a.level}`} data-attribute={a.id}><b>{ATTRIBUTE_LABELS[a.id][1]}</b><small>{a.level}</small></span>)}</span>
}
