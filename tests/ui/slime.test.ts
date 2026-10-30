import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { Slime } from '../../src/components/Slime'
import { MAX_TIER } from '../../src/domain/game'
it('M24: every valid tier has its own number and provisional color', () => {
  const colors = new Set<string>()
  for (let tier = 1; tier <= MAX_TIER; tier++) {
    const html = renderToStaticMarkup(createElement(Slime, { tier }))
    expect(html).toContain(`>${tier}</span>`)
    colors.add(html.match(/--slime-color:([^;]+)/)![1]!)
  }
  expect(colors.size).toBe(MAX_TIER)
})
it('M24: preserves agreed green/blue/red and adds higher-tier pattern/glow layers', () => {
  const html = (tier: number) => renderToStaticMarkup(createElement(Slime, { tier }))
  expect(html(1)).toContain('#82d963')
  expect(html(2)).toContain('#6ebff4')
  expect(html(3)).toContain('#fb828a')
  expect(html(11)).toContain('patterned')
  expect(html(MAX_TIER)).toContain('radiant')
})
it('40 tier prototypes have family layers, distinct variants and special milestones', () => {
  const html = (tier: number) => renderToStaticMarkup(createElement(Slime, { tier }))
  expect(html(10)).toContain('plain')
  expect(html(11)).toContain('patterned')
  expect(html(21)).toContain('gem')
  expect(html(30)).toContain('rainbow')
  expect(html(31)).toContain('cosmic')
  expect(html(40)).toContain('transcendent')
  expect(html(40)).toContain('tier-orbit')
  expect(html(40)).not.toContain('awakened')
})
