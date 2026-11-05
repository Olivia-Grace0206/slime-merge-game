import { fixtureJSON } from '../helpers/serialization'
import { expect, it } from 'vitest'
import { ATTRIBUTE_IDS } from '../../src/domain/attributes'
import { EFFECTS, levelPower } from '../../src/core/attributes/effects'
import { GENERATION_PACE } from '../../src/core/progression/economy'
import { attributeGuide, COMBINATIONS, percent } from '../../src/components/attributeGuide'
import { ATTRIBUTE_LABELS, attributeText } from '../../src/components/attributeLabels'
import { AttributeIcon } from '../../src/components/AttributeIcon'
it.each(ATTRIBUTE_IDS)('%s has one stable named SVG shape and complete guide without ownership gates',id=>{
 const guide=attributeGuide().find(a=>a.id===id)!;expect(guide.name).toBe(ATTRIBUTE_LABELS[id]);expect(guide.condition.length).toBeGreaterThan(0)
 for(const field of ['effect','growth','limit','note'] as const)expect(guide[field].length).toBeGreaterThan(5)
 expect(guide.growth).toContain(String(EFFECTS.levelSlope));expect(guide.growth).toContain(levelPower(5).toFixed(2))
 const icon=AttributeIcon({id}),props=icon.props as {viewBox:string;children:unknown;'aria-hidden':string;'data-attribute-icon':string}
 expect(icon.type).toBe('svg');expect(props.viewBox).toBe('0 0 24 24');expect(props['data-attribute-icon']).toBe(id);expect(props['aria-hidden']).toBe('true');expect(props.children).toBeTruthy()
 expect(attributeText([{id,level:99}])).toBe(`${ATTRIBUTE_LABELS[id]}Lv99`)
})
it('all10 icon silhouettes differ rather than relying on colors/characters',()=>{
 const shapes=ATTRIBUTE_IDS.map(id=>fixtureJSON((AttributeIcon({id}).props as {children:unknown}).children))
 expect(new Set(shapes).size).toBe(10);expect(attributeGuide().map(a=>a.id)).toEqual([...ATTRIBUTE_IDS])
})
it('guide limits and probabilities derive from live Core constants',()=>{
 const guide=Object.fromEntries(attributeGuide().map(a=>[a.id,a]))
 expect(guide.dark!.effect).toContain(percent(EFFECTS.darkLossChance));expect(guide.dark!.limit).toContain('共通判定')
 expect(guide.ice!.limit).toContain(percent(EFFECTS.iceCap));expect(guide.lightning!.limit).toContain(percent(EFFECTS.lightningCap));expect(guide.lightning!.limit).toContain(percent(GENERATION_PACE.maxTapIntervalFraction))
 expect(guide.nature!.limit).toContain(String(EFFECTS.natureMinimumMs/1000));expect(guide.nature!.effect).toContain(String(EFFECTS.natureBaseMs/1000))
 expect(guide.luck!.note).toContain(percent(EFFECTS.focusChance));expect(guide.luck!.note).toContain('確定保証なし');expect(guide.mutation!.limit).toContain(percent(EFFECTS.mutationCap))
 expect(guide.light!.limit).toContain(percent(EFFECTS.lightCap));expect(guide.magnet!.limit).toContain(String(EFFECTS.magnetWeightCap));expect(guide.magnet!.note).toContain('頻度は増やしません')
})
it('three combinations use matching IDs and Core coefficients without replacements',()=>{
 expect(COMBINATIONS.map(c=>c.ids)).toEqual([['fire','gold'],['ice','lightning'],['luck','mutation']])
 expect(COMBINATIONS[0]!.description()).toContain(String(EFFECTS.saleComboRate))
 expect(COMBINATIONS[1]!.description()).toContain(percent(EFFECTS.iceComboRate));expect(COMBINATIONS[1]!.description()).toContain(percent(EFFECTS.tapComboRate))
 expect(COMBINATIONS[2]!.description()).toContain(percent(EFFECTS.luckComboRate));expect(COMBINATIONS[2]!.description()).toContain(percent(EFFECTS.mutationCap))
})
