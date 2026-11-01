import type { AttributeId, Attributes } from '../domain/attributes'
export const ATTRIBUTE_LABELS:Readonly<Record<AttributeId,string>>={fire:'炎',gold:'黄金',dark:'闇',ice:'氷',lightning:'雷',nature:'自然',luck:'幸運',mutation:'変異',light:'光',magnet:'磁力'}
export function attributeText(attributes:Attributes=[]):string{
 return attributes.length?attributes.map(a=>`${ATTRIBUTE_LABELS[a.id]}Lv${a.level}`).join('・'):'無属性'
}
