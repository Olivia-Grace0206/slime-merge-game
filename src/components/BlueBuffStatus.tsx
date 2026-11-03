import type { GameState } from '../domain/game'
import type { Session } from '../core/progression/session'
import { BLUE_MULTIPLIERS } from '../core/special/config'
import { samePosition } from '../core/grid/coordinates'
import { ATTRIBUTE_LABELS } from './attributeLabels'
import { AttributeIcon } from './AttributeIcon'

/** Live, read-only status: blue multiplies attribute power, not the final capped result. */
export function BlueBuffStatus({ game, session }: { game: GameState; session: Session }) {
  const blue = session.specials.events.find(event => event.kind === 'blue')
  if (!blue) return null

  const slime = game.slimes.find(candidate => samePosition(candidate.position, blue.cell))
  if (!slime) return null

  const buffs = (slime.attributes ?? []).filter(attribute => BLUE_MULTIPLIERS[attribute.id] > 1)
  if (!buffs.length) return null

  return (
    <section className="blue-buff-status" data-testid="blue-buff-status" role="status" aria-live="polite" aria-atomic="true" aria-label="青マスの現在の共鳴バフ">
      <strong><span className="buff-full">≋ 青共鳴中</span><span className="buff-compact">≋ 共鳴</span></strong>
      <small><span className="buff-full">Tier {slime.tier} に発動中</span><span className="buff-compact">T{slime.tier}</span></small>
      <ul>
        {buffs.map(attribute => (
          <li key={attribute.id}>
            <AttributeIcon id={attribute.id} />
            <span>{ATTRIBUTE_LABELS[attribute.id]} Lv{attribute.level}</span>
            <b>×{BLUE_MULTIPLIERS[attribute.id].toFixed(2)}</b>
          </li>
        ))}
      </ul>
      <small className="blue-buff-note"><span className="buff-full">属性power倍率・最終上限は別</span><span className="buff-compact">power</span></small>
    </section>
  )
}
