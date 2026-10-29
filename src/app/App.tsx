import { GameBoard } from '../components/GameBoard'
export function App() {
  return (
    <main className="app-shell">
      <header className="app-header">
        <a className="brand" href="#main">
          <span className="brand-icon">♧</span>
          <span>
            SLIME MERGE<small>ちいさな牧場、大きな進化。</small>
          </span>
        </a>
        <span className="phase-badge">Phase 1 · マージであそぼう</span>
      </header>
      <div id="main" className="page-heading">
        <div>
          <span className="eyebrow">A LITTLE MERGE, A LOT OF WONDER</span>
          <h1>
            ぷにっと、育つ。<span>スライムの牧場</span>
          </h1>
        </div>
        <p>つなげて、重ねて、新しい仲間に出会おう。</p>
      </div>
      <GameBoard />
    </main>
  )
}
