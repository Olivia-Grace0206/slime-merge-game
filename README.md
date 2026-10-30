# スライムマージゲーム

同じTierへ重ねてドロップし、3体→上位1体／5体→上位2体へ進化させるブラウザゲームです。

**main：Phase 1・仕様v0.2.6をマージ済み。Phase 1.1：`feature/phase01-1-viewport-zoom-tier40` に実装・検証済み、Draft PRでレビュー待ち。** Privateを維持し、Pagesは公開していません。React/Vite版のため、HTMLのダブルクリックでは起動しません。

## Windowsで試遊

1. GitHub DesktopでFetch origin → `feature/phase01-1-viewport-zoom-tier40` を選択 → 更新があればPull origin。
2. Node.js 22系 / npm 10系を準備し、Repository → Open in Terminal。
3. 以下を実行し、ターミナルに表示されるURL（通常 `http://localhost:5173/slime-merge-game/`）を開きます。

```sh
node --version
npm --version
npm ci
npm run dev
```

初期の左側スライムを中央の同Tier個体へドラッグします。検証メニューで3/5/8/11体・斜め・高Tierを切替可能。盤面リセットも同メニューにあります。

- **盤面だけズーム**：PCホイール／2本指ピンチ／＋・−ボタン。
- **パン**：空きマスからドラッグ。表示リセットで盤面全体へ戻ります。
- **取消**：Escape／フォーカス喪失／pointercancel。2本指になると素材ドラッグを取り消し、全指を離すまで新しいドラッグを始めません。
- **キーボード**：Tabでセルへ、Enter/Spaceで個体選択、移動先で再度Enter。Escapeで取消。
- **外見メニュー**：Tier1〜40を比較できるデザイン試作。正式アートや本格図鑑ではありません。
- **保存・生成は未実装**：リロードで初期化。配置切替は新しい検証セッションで、最高到達Tierも初期化します。

## Phase 1.1の実装

一画面UI・端メニュー・盤面フィット・カーソル/ピンチ中点を保つズーム・パン・Tier40上限。盤面は7×7、初期100%は利用可能幅と高さの両方へフィット。幅900px以下の縦長画面は下部メニュー、低い横画面は細い左右メニューです。

**暫定値**：ズーム75〜300%、ホイールは指数倍率、4px未満はタップ、カメラは最低1セルを見失わない範囲。画面リサイズ/回転はジェスチャー取消＋100%へrefit。正式配色・名称は未決定です。通常の最高到達Tier履歴は移動・マージ消費で減少しません。高Tierプリセットは39と40を配置するため履歴を40へ初期化します。

マージは既存の同Tier個体へのドロップ時だけ。8方向連結、5体優先→3体→余り保持、プレビューと消費ID/出力セルの一致を維持しました。Coreの探索・計画・適用処理は開始mainから無変更、domainの上限定数を30→40へ変更しました。

## 技術・品質

Node22.23.4 / npm10.9.9で検証。React19.3.1 / TypeScript6.0.3 / Vite8.3.5 / Vitest5.0.5 / ESLint10.13.0。直接依存・lockfile・CI workflowは無変更です。

```sh
npm run lint
npm test -- --run
npm run build
npm run preview
```

`build`は型チェック（tsc -b）→Vite本番Build。`preview`はBuild後に実行します。

| 検証 | Phase 1.1の実測 |
|---|---|
| npm ci / Lint / 型チェック・Build | 成功、Lint警告0 |
| Vitest | **214件成功**、失敗0・skip0、7ファイル |
| ブラウザ | **既存回帰54＋追加100＝154項目成功**、JS例外/console error/request failure 0 |
| 一画面 | 指定10サイズでdocument縦横スクロールなし、盤面全面表示、全主要ボタンに到達 |
| 盤面の一辺 | 1440×900：772px / 1366×768：640px / 390×844：374px |
| 実機 | Windows/実iPhone Safari/Android/iPadは未確認。上記はChromiumのエミュレーション |
| CI | 最終PR HEADと対応runをPR本文で照合・記録 |

詳細：[Phase 1.1引き継ぎ](docs/PHASE1_1_HANDOFF.md)、[全寸法・操作結果・画像](docs/validation/phase1-1/RESULTS.md)。旧[Phase 1記録](docs/PHASE1_HANDOFF.md)は当時の記録として保全しています。

## 構成

| パス | 責務 |
|---|---|
| `src/domain/`、`src/core/board,grid,merge/` | React非依存の状態・8方向探索・計画・原子的適用 |
| `src/core/input/coordinates.ts` | 既存の座標変換・パン関数（互換維持） |
| `src/app/input/camera.ts` | UI用のworld/screen変換・フィット・中心固定ズーム・パン制限 |
| `src/app/input/gestures.ts` | UI用の単指/ピンチ/取消状態遷移。Coreへブラウザ依存を追加しない |
| `src/components/GameBoard.tsx` | 入力とCoreの接続、組別プレビュー、カメラ |
| `src/components/GameMenu.tsx` | native dialog、プリセット、遊び方、外見比較、表示軽減 |
| `src/components/Slime.tsx` / `src/styles/global.css` | 40Tierの本体・顔・番号レイヤー、レスポンシブUI |
| `tests/` | Vitestと隔離Playwrightブラウザrunner |

## 正本・次のPhase

正本はGitHub **main** の [CURRENT.md](docs/specifications/CURRENT.md) → [完全仕様書v0.2.6](docs/specifications/Slime_Merge_Game_Specification_v0.2.6_2026-10-30.md)。仕様書に残る「PR #4/#5未マージ」は作成当時の記録です。2026-10-30の開始時には両方マージ済みとGitHubで確認しました。仕様書本文と【未決定】は今回変更していません。

| Phase | 状態・範囲 |
|---|---|
| 0 / 1 | 開発基盤・マージ核。mainへマージ済み |
| 1.1 | 一画面UI・ズーム・Tier40。本ブランチに実装・自動検証済み、ユーザー試遊とPR採用待ち |
| 2 | 生成・貯蔵・クリック・売却/GOLD・保存・金10回イベント。未着手、数値シミュレーションと必要仕様を先に合意 |
| 3 | 10属性・紫覚醒・青共鳴・闇消滅・通常属性コピー/覚醒非増殖。未着手 |
| 4 | 世界・土地解放・本格図鑑。未着手 |

生成正規分布は過去最高到達Tierを基準とする方式、μ/σ/候補帯の数値は未決定です。属性・覚醒・金紫青・売却・保存を今回先行実装していません。

Feature Branch → 検証 → Draft PR → ユーザー判断のマージ。mainへ直接Pushしません。Public化とPages公開は別の依頼で行います。参考[array-puzzle](https://github.com/Olivia-Grace0206/array-puzzle)はレイアウト/構成を読み取り参照しただけで、コードのコピー・変更はありません。

## ブラウザ試験の再実行

通常の試遊にPlaywrightは不要です。隔離フォルダに `playwright@1.51.1` とそのChromium shellを準備し、`PLAYWRIGHT_MODULE`へ絶対パスを指定します。Build後に以下を順番に実行します。

```sh
node tests/browser/phase1.cjs
node tests/browser/phase1-1.cjs
```

`BROWSER_ARTIFACT_DIR`で出力先、`GAME_URL`で既存のローカルURLを指定できます。未指定時はrunner自身がpreviewを起動/終了します。詳細は[検証記録](docs/validation/phase1-1/RESULTS.md)を参照。
