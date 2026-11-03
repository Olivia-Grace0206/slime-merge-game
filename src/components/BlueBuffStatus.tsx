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
    <section className="blue-buff-status" data-testid="blue-buff-status" aria-label="青マスの現在の共鳴バフ">
      <strong>≋ 青共鳴中</strong>
      <small>Tier {slime.tier} に発動中</small>
      <ul>
        {buffs.map(attribute => (
          <li key={attribute.id}>
            <AttributeIcon id={attribute.id} />
            <span>{ATTRIBUTE_LABELS[attribute.id]}</span>
            <b>×{BLUE_MULTIPLIERS[attribute.id].toFixed(2)}</b>
          </li>
        ))}
      </ul>
      <small className="blue-buff-note">属性効果の強さ（最終上限あり）</small>
    </section>
  )
}
