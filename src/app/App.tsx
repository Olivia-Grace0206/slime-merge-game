import { SlimeIllustration } from '../components/SlimeIllustration'

export function App() {
  return (
    <div className="page-shell">
      <a className="skip-link" href="#main">本文へ移動</a>
      <header className="site-header">
        <a className="brand" href="#main" aria-label="スライムマージゲーム トップ">
          <span className="brand-icon"><SlimeIllustration /></span>
          <span>SLIME MERGE<span className="brand-caption">ちいさな牧場、ふしぎな進化。</span></span>
        </a>
        <span className="status-badge"><span /> 開発中</span>
      </header>

      <main id="main">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">WELCOME TO OUR LITTLE MEADOW</p>
            <h1 id="hero-title">スライム<br />マージゲーム<span className="title-dot">.</span></h1>
            <p className="hero-description">くっついて、育って、ちょっとふしぎに。<br />スライムたちの小さな牧場を、準備しています。</p>
            <a className="primary-link" href="#development">開発状況を見る <span aria-hidden="true">↓</span></a>
            <p className="hero-note">ただいま準備中。ゲーム操作は次のフェーズで登場します。</p>
          </div>
          <figure className="meadow" aria-label="草原で過ごす緑・青・赤の3体のスライムの仮イラスト">
            <span className="sun" aria-hidden="true" />
            <span className="cloud cloud--one" aria-hidden="true" />
            <span className="cloud cloud--two" aria-hidden="true" />
            <span className="meadow-label">のんびり、すくすく。</span>
            <div className="hill hill--back" /><div className="hill hill--front" />
            <div className="meadow-slime meadow-slime--blue"><SlimeIllustration color="blue" /></div>
            <div className="meadow-slime meadow-slime--red"><SlimeIllustration color="red" /></div>
            <div className="meadow-slime meadow-slime--green"><SlimeIllustration /></div>
            <span className="flower flower--one" aria-hidden="true">✿</span>
            <span className="flower flower--two" aria-hidden="true">✿</span>
            <figcaption>ここから、育つ世界。</figcaption>
          </figure>
        </section>

        <section className="development" id="development" aria-labelledby="development-title">
          <div className="section-heading">
            <div><p className="eyebrow">DEVELOPMENT DIARY</p><h2 id="development-title">牧場づくりの、はじめの一歩。</h2></div>
            <span className="phase-label">PHASE 0 / 環境構築</span>
          </div>
          <div className="development-grid">
            <article className="development-card card--current">
              <span className="card-number">00 <span>いまここ</span></span>
              <h3>遊びの土台をつくる</h3>
              <p>初期画面と開発環境を整えています。<br />この画面は、開発中の仮デザインです。</p>
            </article>
            <article className="development-card">
              <span className="card-number">01 <span>次のステップ</span></span>
              <h3>スライムを動かそう</h3>
              <p>重ねてドロップ、3体・5体マージ。<br />次は、実際に触れる体験へ。</p>
            </article>
            <article className="development-card">
              <span className="card-number">02+ <span>これから</span></span>
              <h3>育てて、広がる牧場へ</h3>
              <p>生成・売却・強化、そして属性育成。<br />少しずつ、できることを増やします。</p>
            </article>
          </div>
        </section>
      </main>
      <footer className="site-footer"><span>SLIME MERGE <span aria-hidden="true">✿</span></span><p>Phase 0 · 初期画面プレビュー / 仮タイトル・仮デザイン</p></footer>
    </div>
  )
}
