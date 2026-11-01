import type { Attributes } from '../domain/attributes'
export const ATTRIBUTE_LABELS = {
  fire: ['炎', '炎'], gold: ['黄金', '金'], dark: ['闇', '闇'], ice: ['氷', '氷'], lightning: ['雷', '雷'],
  nature: ['自然', '葉'], luck: ['幸運', '幸'], mutation: ['変異', '変'], light: ['光', '光'], magnet: ['磁力', '磁'],
} as const
export function attributeText(attributes: Attributes = []): string {
  return attributes.length ? attributes.map(a => `${ATTRIBUTE_LABELS[a.id][0]}Lv${a.level}`).join('・') : '無属性'
}
