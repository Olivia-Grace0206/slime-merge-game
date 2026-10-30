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
