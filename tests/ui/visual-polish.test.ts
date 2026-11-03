import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { GameState } from '../../src/domain/game'
import type { Session } from '../../src/core/progression/session'
import { freshSession } from '../../src/core/progression/session'
import { AttributePanel } from '../../src/components/AttributePanel'
import { ATTRIBUTE_INTRO } from '../../src/components/attributeIntro'
import { BlueBuffStatus } from '../../src/components/BlueBuffStatus'
import { Slime } from '../../src/components/Slime'
import { BLUE_MULTIPLIERS, SPECIAL_TIMING } from '../../src/core/special/config'

function sessionWithBlue() {
  const base = freshSession(0)
  const game: GameState = {
    ...base.game,
    slimes: [
      { id: 'test-1', tier: 2, position: { x: 0, y: 0 },
        attributes: [{ id: 'ice', level: 2 }, { id: 'fire', level: 2 }] },
    ],
  }
  const session: Session = {
    ...base, game,
    specials: { ...base.specials, sequence: 1, events: [
      { kind: 'blue', id: 'blue-1', sequence: 1,
        cell: { x: 0, y: 0 }, createdAtMs: 0, expiresAtMs: SPECIAL_TIMING.blueLifetimeMs },
    ] },
  }
  return { game, session }
}

describe('Phase 3C visual polish', () => {
  it('introduces all ten attributes with short summaries on a single initial screen', () => {
    const session = freshSession(0)
    const html = renderToStaticMarkup(createElement(AttributePanel, {
      game: session.game, session, onDetail: () => undefined,
    }))
    expect(html).toContain('data-view="overview"')
    expect(html).toContain('data-testid="attribute-guide"')
    expect((html.match(/data-testid="guide-/g) ?? [])).toHaveLength(10)
    expect(Object.keys(ATTRIBUTE_INTRO)).toHaveLength(10)
    expect(html).toContain('現在の効果・所持スライム')
    expect(html).not.toContain('どんな効果？')
  })

  it('blue status identifies the actively boosted attributes but excludes sale attributes', () => {
    const { game, session } = sessionWithBlue()
    const html = renderToStaticMarkup(createElement(BlueBuffStatus, { game, session }))
    expect(html).toContain('data-testid="blue-buff-status"')
    expect(html).toContain('青共鳴中')
    expect(html).toContain('氷')
    expect(html).toContain('×1.10')
    expect(html).toContain('氷 Lv2')
    expect(html).toContain('属性power倍率・最終上限は別')
    expect(html).not.toContain('炎')
  })

  it('blue status disappears on leaving the tile, expiry, or loss of eligible attributes', () => {
    const { game, session } = sessionWithBlue()
    const movedGame: GameState = {
      ...game, slimes: game.slimes.map(slime => ({ ...slime, position: { x: 1, y: 0 } })),
    }
    expect(renderToStaticMarkup(createElement(BlueBuffStatus, { game: movedGame, session }))).toBe('')
    const expiredSession: Session = { ...session, specials: { ...session.specials, events: [] } }
    expect(renderToStaticMarkup(createElement(BlueBuffStatus, { game, session: expiredSession }))).toBe('')
    const saleOnlyGame: GameState = {
      ...game, slimes: game.slimes.map(slime => ({
        ...slime, attributes: [{ id: 'gold' as const, level: 1 }],
      })),
    }
    expect(renderToStaticMarkup(createElement(BlueBuffStatus, { game: saleOnlyGame, session }))).toBe('')
  })

  it('distinguishes zero to three awakening ranks while retaining the slime body and tier', () => {
    const ids = ['fire', 'ice', 'lightning'] as const
    for (let count = 0; count <= 3; count++) {
      const attributes = ids.slice(0, count).map(id => ({ id, level: 1, awakened: true }))
      const html = renderToStaticMarkup(createElement(Slime, { tier: 5, attributes }))
      expect(html).toContain(`data-awakening="${count}"`)
      expect(html).toContain('slime-body')
      expect(html).toContain('tier-pill')
      if (count === 0) {
        expect(html).not.toContain('data-testid="awakening-aura"')
      } else {
        expect(html).toContain('data-testid="awakening-aura"')
        expect(html).toContain('data-testid="awakening-rank"')
        expect(html).toContain('★'.repeat(count))
        expect((html.match(/class="aura-spark/g) ?? []).length).toBe(count)
      }
    }
  })
})

describe('blue read-only support labels',()=>{
 it.each(['ice','lightning','nature','luck','mutation','light','magnet'] as const)('%s multiplier and level come from the shared Core',id=>{
 const {game,session}=sessionWithBlue();const live={...game,slimes:[{...game.slimes[0]!,attributes:[{id,level:99,awakened:true}]}]}
 const before=JSON.stringify({live,session});const html=renderToStaticMarkup(createElement(BlueBuffStatus,{game:live,session}))
 expect(html).toContain('×'+BLUE_MULTIPLIERS[id].toFixed(2));expect(html).toContain('Lv99');expect(JSON.stringify({live,session})).toBe(before)
 })
})
