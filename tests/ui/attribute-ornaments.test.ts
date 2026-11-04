import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ATTRIBUTE_IDS, type AttributeId, type Attributes } from '../../src/domain/attributes'
import { Slime } from '../../src/components/Slime'
import { AttributeDecorationLayer } from '../../src/components/slime-visuals/AttributeDecorationLayer'
import { composeOrnaments } from '../../src/components/slime-visuals/ornamentConfig'

const draw = (attributes: Attributes) => (['back', 'front'] as const)
  .map(layer => renderToStaticMarkup(createElement(AttributeDecorationLayer, { attributes, layer }))).join('')
const expectedPairs = [
  ['fire', 'gold', 'golden-flame'], ['ice', 'lightning', 'charged-ice'], ['luck', 'mutation', 'helix-clover'],
] as const
const combinations: AttributeId[][] = []
for (let i = 0; i < 10; i++) for (let j = i + 1; j < 10; j++) {
  combinations.push([ATTRIBUTE_IDS[i]!, ATTRIBUTE_IDS[j]!])
  for (let k = j + 1; k < 10; k++) combinations.push([ATTRIBUTE_IDS[i]!, ATTRIBUTE_IDS[j]!, ATTRIBUTE_IDS[k]!])
}

describe('static local attribute ornaments', () => {
  it.each(ATTRIBUTE_IDS)('%s has distinct normal/awakened shapes, independent of level and input mutation', id => {
    const make = (level: number, awakened: boolean) => Object.freeze([Object.freeze({ id, level, awakened })])
    const normal = draw(make(1, false)), awake = draw(make(1, true))
    expect(normal).toContain(`data-decoration="${id}"`)
    expect(normal).toContain('data-ornament-state="normal"')
    expect(awake).toContain('data-ornament-state="awakened"')
    expect(normal).not.toBe(awake)
    expect(normal).toBe(draw(make(99, false)))
    expect(awake).toBe(draw(make(99, true)))
    expect(normal).toMatch(/<(path|circle)/)
    expect(awake).not.toMatch(/<filter|<animate|<image|url\(#/)
  })

  it('adds no decoration for an unattributed slime and collapses duplicate IDs without changing inputs', () => {
    expect(draw([])).toBe('')
    expect(draw([{ id: 'fire', level: 1 }, { id: 'fire', level: 99, awakened: true }]).match(/data-decoration=/g)).toHaveLength(1)
    expect(composeOrnaments().combinations).toEqual([])
  })

  it('retains Lv values in the badge even though the decoration result has no Lv', () => {
    const a = [{ id: 'fire' as const, level: 1 }], b = [{ id: 'fire' as const, level: 99 }]
    expect(composeOrnaments(a)).toEqual(composeOrnaments(b))
    expect(renderToStaticMarkup(createElement(Slime, { tier: 1, attributes: a }))).toContain('炎 Lv1')
    expect(renderToStaticMarkup(createElement(Slime, { tier: 1, attributes: b }))).toContain('炎 Lv99')
  })

  it.each(Array.from({ length: 40 }, (_, i) => i + 1))('Tier %i retains body/face/Tier and no added ornament when empty', tier => {
    const plain = renderToStaticMarkup(createElement(Slime, { tier }))
    expect(plain).toContain('slime-body')
    expect(plain).toContain('class="eyes"')
    expect(plain).toContain(`class="tier-pill">${tier}<`)
    expect(plain).not.toContain('data-decoration=')
    expect(plain).not.toContain('awakening-aura')
    if (tier >= 21) expect(plain).toContain('class="crown"')
    if (tier >= 31) expect(plain).toContain('class="tier-orbit"')
  })
})

describe('all45 pairs and120 triples, all awakening masks', () => {
  it.each(combinations.map(ids => ({ name: ids.join('+'), ids })))('$name keeps every attribute, independent flags, canonical order and only the three existing combinations', ({ ids }) => {
    for (let mask = 0; mask < 2 ** ids.length; mask++) {
      const attributes = Object.freeze(ids.map((id, i) => Object.freeze({ id, level: 1 + i * 49, awakened: !!(mask & (1 << i)) })))
      const before = JSON.stringify(attributes), html = draw(attributes)
      expect(html.match(/data-decoration=/g)).toHaveLength(ids.length)
      for (const a of attributes) expect(html).toContain(`data-decoration="${a.id}" data-ornament-state="${a.awakened ? 'awakened' : 'normal'}"`)
      const expected = expectedPairs.filter(([a, b]) => ids.includes(a) && ids.includes(b)).map(([, , id]) => id)
      expect(composeOrnaments(attributes).combinations).toEqual(expected)
      expect(html.match(/data-synergy=/g) ?? []).toHaveLength(expected.length)
      const full = renderToStaticMarkup(createElement(Slime, { tier: 40, attributes }))
      const reversed = [...attributes].reverse()
      expect(full).toBe(renderToStaticMarkup(createElement(Slime, { tier: 40, attributes: reversed })))
      expect(draw(reversed)).toBe(html)
      expect(full).toContain(`data-awakening="${attributes.filter(a => a.awakened).length}"`)
      expect(JSON.stringify(attributes)).toBe(before)
    }
  })
})
