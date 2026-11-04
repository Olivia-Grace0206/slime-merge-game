import { useState } from 'react'
import { MAX_TIER } from '../domain/game'
import { ATTRIBUTE_IDS, type AttributeId, type Attributes } from '../domain/attributes'
import { ATTRIBUTE_LABELS } from './attributeLabels'
import { AttributeIcon } from './AttributeIcon'
import { Slime } from './Slime'

/** Ephemeral appearance preview. Never writes or grants attributes to game entities. */
export function SlimeVisualGallery() {
  const [attributes, setAttributes] = useState<Attributes>([])
  function select(id: AttributeId, checked: boolean) {
    setAttributes(current => checked
      ? current.length < 3 ? [...current, { id, level: 1 }] : current
      : current.filter(a => a.id !== id))
  }
  return <>
    <p className="muted">全40段階のデザイン試作です。正式な配色・名称・完成イラストの承認とは別です。</p>
    <fieldset className="ornament-picker" data-testid="ornament-picker">
      <legend>装飾プレビュー（最大3属性）</legend>
      <p>外見だけを確認します。属性Lvは装飾を変えません。ゲームの個体・保存は変わりません。</p>
      <div className="ornament-options">{ATTRIBUTE_IDS.map(id => {
        const selected = attributes.find(a => a.id === id)
        return <div key={id} className={`ornament-option attribute-${id}`}>
          <label><input type="checkbox" data-testid={`visual-select-${id}`} checked={!!selected}
            disabled={!selected && attributes.length >= 3} onChange={e => select(id, e.target.checked)} />
            <AttributeIcon id={id} />{ATTRIBUTE_LABELS[id]}</label>
          {selected && <label className="ornament-awaken"><input type="checkbox" data-testid={`visual-awaken-${id}`} checked={selected.awakened === true}
            onChange={e => setAttributes(current => current.map(a => a.id === id ? { ...a, awakened: e.target.checked } : a))} />覚醒★</label>}
        </div>
      })}</div>
    </fieldset>
    {[['通常・単色', 1], ['模様', 11], ['宝石・発光', 21], ['星・カオス・超越', 31]].map(([label, start]) => <section key={start} className="tier-section"><h3>{label} · Tier {start}〜{Number(start) + 9}</h3><div className="tier-gallery">{Array.from({ length: 10 }, (_, i) => Number(start) + i).map(tier => <figure key={tier} data-preview-tier={tier}><div className="gallery-slime"><Slime tier={tier} attributes={attributes} /></div><figcaption>Tier {tier}{tier === 30 ? ' · 虹' : tier === MAX_TIER ? ' · 最終' : ''}</figcaption></figure>)}</div></section>)}
  </>
}
