import { ATTRIBUTE_IDS, type Attributes } from '../domain/attributes'
import { ATTRIBUTE_LABELS } from './attributeLabels'
import { AttributeIcon } from './AttributeIcon'
/** Separate edge layer keeps the face and Tier visible. Parent cell exposes name/Lv to assistive tech. */
export function AttributeBadges({ attributes = [] }: { attributes?: Attributes }) {
 return <span className="attribute-badges" data-testid="attribute-badges">{ATTRIBUTE_IDS.flatMap(id => attributes.filter(a => a.id === id)).map(a=><span className={`attribute-badge attribute-${a.id}`} key={a.id} title={`${ATTRIBUTE_LABELS[a.id]} Lv${a.level}${a.awakened?'★覚醒':''}`} aria-label={`${ATTRIBUTE_LABELS[a.id]} Lv${a.level}${a.awakened?'★覚醒':''}`} data-attribute={a.id}><AttributeIcon id={a.id}/><small>{a.level}{a.awakened?'★':''}</small></span>)}</span>
}
export function AttributeTokens({attributes=[]}:{attributes?:Attributes|undefined}){
 return <span className="attribute-tokens">{attributes.length?attributes.map(a=><span key={a.id} className={`attribute-token attribute-${a.id}`}><AttributeIcon id={a.id}/><span>{ATTRIBUTE_LABELS[a.id]}Lv{a.level}{a.awakened?'★':''}</span></span>):'無属性'}</span>
}
