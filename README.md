# スライムマージゲーム

時間でスライムを貯蔵し、盤面へ追加→3/5体マージ→売却→GOLDで強化するReactブラウザゲーム。

**Phase 2実装ブランチ：`feature/phase02-generation-core-simulation` / [Draft PR #8](https://github.com/Olivia-Grace0206/slime-merge-game/pull/8)**。mainのPhase1.1（PR #7）を継承。Private維持、main未マージ、Pages未公開。最終HEADと対応CIはPR本文を参照。実機試遊待ち。

## Windowsで試遊

GitHub DesktopでFetch origin → 上記ブランチを選択 → Pull origin。Node.js 22 / npm 10を使い、Repository → Open in Terminal。

```sh
npm ci
npm run dev
```

通常 `http://localhost:5173/slime-merge-game/` を開く。React/Vite版なのでHTMLダブルクリックでは起動しない。

1. 初期4×4・空盤面から開始。10秒待つか「生成加速」を押すと貯蔵が増える。
2. 大きい「スライム追加」→空きマスをタップ。もう一度同ボタン/Escapeで取消。占有/盤面外では減らない。
3. 同Tierの既存個体へドラッグして離すと8方向連結で判定。3→1、5→2、5優先・余り保持。単なる隣接/空きマス移動では進化しない。
4. 売却エリアへドラッグ→額を確認→売却。キャンセルは元に戻る。個体をタップした詳細で売却保護を切替（マージは保護対象外）。
5. ショップで生成間隔/クリック加速/容量を強化。所持GOLD・Lv・現効果・次効果・価格を表示。
6. 金マスが現れたら個体を置く。10回のGOLD報酬（個体は消費しない）。途中のリロードでも既払いは再受取しない。
7. 進行は通常プレイ専用のLocalStorageへ自動保存。検証メニューの7×7プリセット/全40Tier外見確認は別セッションで、通常セーブを上書きしない。「通常プレイへ戻る」で再開。

PCホイール/2指ピンチで盤面だけズーム、空きマスからパン。設定の表示リセット、補助＋/−。2本目の指で素材ドラッグを取消し、全指を離して再操作。Tab→Enter/Spaceで素材選択/移動、Escapeで取消。通常ログと倍率の常設表示はない。

## 保存と環境

保存には**HTTPSまたはlocalhost**と、Web Locks/LocalStorage対応ブラウザが必要。LAN上の通常HTTPでは安全な保存ロックが使えず、保存エラーを表示して進行を停止する。実スマホはHTTPS経由で試す。端末間の自動同期はない。

売却・マージ・購入・出庫・各報酬は、全状態を書き込んでから画面へ反映。書込失敗なら直前状態を保ち、再試行を案内。破損/未知の形式は原本を残して停止する。別タブが更新した場合も上書きせず再読み込みを案内。同時プレイは1タブを推奨。

v2はイベントID/支給回数/受領額/上限超過額/永続ID/保護/表示軽減を含む。旧v1は妥当な4×4のみ移行し、7×7検証セーブは自動で切り詰めない。GOLD上限はNumber.MAX_SAFE_INTEGER。上限で盤面が詰まないよう売却は実受取額（0もある）と警告を確認して整理できる。金報酬の上限超過額は別記録し、10回を終える。

ブラウザ強制終了後のOS書込保証、実Windows/実iPhone・iPad Safari/Androidは未確認。自動検証の範囲は[検証結果](docs/validation/phase2/RESULTS.md)で明示する。

## 仮設定

価格・確率・速度は全て**未承認の仮仕様**。10秒/10容量/1秒加速、生成分布は履歴Hに基づくμ=1+0.92(H−1)、σ=min(1.8,max(1,0.1H))、候補1〜H。売却2^Tier、強化費用1.7倍、金は0.05×基本価格（属性数で減額、最低1）を700ms間隔で10回。終了後60〜120秒のランダム待機。低Tierは整数丸めで同額になる場合がある。

[比較条件・採用理由・制約](docs/balance/phase2/RESULTS.md)、[全シミュレーション](docs/balance/phase2/simulation.json)。botの到達時間は人のプレイ予測ではない。高Tierではショップが早期に上限へ達するため、実機試遊で再調整する。

## 開発・検証

```sh
npm ci
npm run lint
npm test -- --run
npm run build
```

ゲーム依存はReact/ReactDOMのみ、TypeScript/Vite/Vitest/ESLint。バックエンド/ゲームエンジン追加なし。既存merge/board/domain/camera/gesturesは無変更。`src/core/progression`が統合状態、`src/app/sessionStore.ts`がブラウザ保存、`GameBoard`が入力/描画を担当。

隔離Playwright 1.51.1とChromium shellを準備し、`PLAYWRIGHT_MODULE`へ絶対パスを指定してBuild後に実行する（アプリ依存への追加不要）。

```sh
node tests/browser/phase2.cjs
node tests/browser/phase1.cjs
node tests/browser/phase1-1.cjs
```

各runnerはpreviewを起動/停止する。`BROWSER_ARTIFACT_DIR`で保存先を変更できる。既存runnerは`docs/validation/phase2/regression`と`viewport-regression`を指定すると過去証跡を上書きしない。

## 正本・引き継ぎ

[CURRENT](docs/specifications/CURRENT.md) → [完全仕様書v0.2.7](docs/specifications/Slime_Merge_Game_Specification_v0.2.7_2026-10-31.md)がmainの現行正本。完全仕様書と旧成果は保全。今回の仮値は新たな【合意】に格上げしない。

[Phase2引き継ぎ](docs/PHASE2_HANDOFF.md)、[独立監査](docs/validation/phase2/AUDIT.md)、[検証結果/画面](docs/validation/phase2/RESULTS.md)、[Checkpoint](docs/validation/phase2/CHECKPOINTS.md)。

Phase3へ属性・Lv・覚醒・紫/青・闇・複合効果を残す。Phase4へ4×4区画購入/土地/3エリア/発見ロック図鑑を残す。マージ規則とTier40上限は維持。mainマージ・Public化・Pages公開はユーザー判断で、今回実施しない。
