# Phase 1.1 引き継ぎ

作業日：2026-10-30（日本時間）。**実装・自動検証完了、実機試遊/採用判断待ち**。Draft PRを未マージで停止する。

## 開始状態と反映先

- Repository：Olivia-Grace0206/slime-merge-game、Private、default main。
- 再取得した開始main：`fd156187e6ee415bfc864d26dbec93a5e3de3267`。PR #4/#5のマージを再確認。
- 開始main CI：[40988484534](https://github.com/Olivia-Grace0206/slime-merge-game/actions/runs/40988484534)、同SHAでcompleted/success。
- 作業ブランチ：`feature/phase01-1-viewport-zoom-tier40`。開始mainから新規作成。
- 実装・テストのコードコミット：`55ad67382a1e9c60f4a2affa5f96d597b69309ec`。
- 全証跡込みの最終HEAD/PR URL/CI URLはPR本文に記録する（文書自身のSHAを文書へ書く自己参照を避ける）。
- main直接Push/マージ/Public化/Pages設定変更なし。既存のCI workflowも無変更。

通常git cloneへ認証が渡らないため、接続済みGitHubから開始mainのファイルを取得し、ローカルsnapshotで実装/試験。Git Data APIで**実際の開始mainを親**とするコミットを作り、expected SHA付きで開発ブランチだけを更新した。ローカルsnapshot用の仮rootコミットはリモートへ反映していない。GitHub Desktopでは通常どおりFetch/Pull可能。

## 読み込み・変更範囲

CURRENT → v0.2.6全文（1309行）→ Phase1引き継ぎ → M01〜M35対応表 → Phase1ブラウザ結果 → README → 既存ソース/テストの順で確認。古いProject添付v0.2.2は正本として使用していない。v0.2.6/CURRENTの未マージ記述は当時の記録として保全し、現在の状態を本書/READMEに記載した。全完全仕様書は無変更、未決定事項の格上げなし。

`array-puzzle`のApp.cssを読み取り、100dvh/min-height:0/低い画面の調整という設計を参考にした。ゲームコードのコピー・同リポジトリの変更なし。

| 変更ファイル | 内容 |
|---|---|
| `src/app/App.tsx` | 大見出し/ポエム削除、固定高のゲームshell |
| `src/components/GameBoard.tsx` | 端メニュー/結果欄、UIカメラ、複数Pointer、同一planプレビュー/確定接続 |
| `src/components/GameMenu.tsx`（新規） | native dialog、操作説明、全プリセット、外見40体、表示軽減 |
| `src/app/input/camera.ts`（新規） | UIカメラのworld/screen変換、fit、zoom、pan |
| `src/app/input/gestures.ts`（新規） | React/DOM非依存のUIジェスチャー遷移、merge Coreとは別管理 |
| `src/components/Slime.tsx` / `src/styles/global.css` | 40Tierの試作アート、一画面grid、モバイル/低画面/内部スクロール |
| `src/domain/game.ts` | **MAX_TIER=30→40のみ** |
| `index.html` | viewport-fit=cover、簡潔なdescription |
| `tests/board/state.test.ts` | 不正な履歴値の境界31→41 |
| `tests/merge/merge.test.ts` | 30→31/39→40、3/5体、上限40、高Tier配置の明示試験。既存ループも39まで実行 |
| `tests/ui/slime.test.ts` | 40体の色/番号、4系列/節目/最終のレイヤー整合 |
| `tests/camera/*.test.ts`（新規2ファイル） | 10画面の座標往復/zoom/pan、取消/残指/重複up/3本目 |
| `tests/browser/phase1.cjs` | 既存54回帰をメニュー経由/上限40の現行UIへ追従 |
| `tests/browser/phase1-1.cjs`（新規） | 10画面100項目、寸法/操作/画像/旧版比較 |
| `README.md` / 本書 / `docs/validation/phase1-1/` | 最新状態、測定/ログ/JSON/スクリーンショット |

**Core保全**：`src/core/merge/{plan,apply}.ts`、`src/core/board/state.ts`、grid/inputの既存関数を変更していない。package.json/package-lock/CIもGit blob SHAで開始mainとの一致を確認。[8ファイルの照合結果](validation/phase1-1/core-preservation.json)。3/5/大量マージ、距離優先、各組追加連結なし、出力位置、一意性の契約は不変。

## レイアウト

大タイトル、285pxの常設パネル、盤面下の大きい説明/統計を除去。shellはヘッダー44px・minmax(0,1fr)・結果52px（画面に応じて42/54、低い横画面36/42）。safe-areaをpaddingへ反映し、ページ全体はoverflow:hiddenで隠さない。

PCは78pxの左メニュー/可変中央viewport/96pxの右表示操作。幅900px以下かつ高さ501px以上は、中央viewport/40px表示操作/48px下部メニュー。低い横画面では左右66/86px。メニューは本文だけ内部スクロールし、native dialogがフォーカス制御と背景入力遮断を行う。偽のショップ/世界ボタンを追加していない。

盤面は論理700×700px（1セル100px）、fit=(min(viewport幅,高さ)-8)/700。初期全7×7が正方形で見える。大画面の上限固定は設けず、利用可能な高さへ拡大。スマホ縦は左右4px＋盤面fit余白4px程度。すべての通常操作と結果欄が画面内。

全10画面のscrollHeight/clientHeight・scrollWidth/clientWidth・盤面寸法/占有率・ヘッダー/メニュー寸法・クリック到達性は[実測表](validation/phase1-1/RESULTS.md)と[JSON](validation/phase1-1/browser-results.json)に記録。主要3サイズ：1440×900=772px、1366×768=640px、390×844=374px。旧版733pxがノートPCで縦に見切れていた点を、単純な拡大率で誤解させない。

## カメラとジェスチャー

【実装済み】PCホイール上＝拡大、下＝縮小。2指を広げる/狭める＝拡大/縮小。空きマスからパン、個体からドラッグ。UIは拡縮しない。＋/−・表示リセットも用意。

**UIだけの座標モデル**：camera.centerを論理world座標で保持、zoomはfit基準の無次元倍率。screen = viewport中央 + (world - camera.center)×fit×zoom。逆変換後に100pxごとにセルを決める。CSS transformのboundingRectと非transformのclientWidthを混用しない。盤面にborderを設けずoutlineを使用し、セル座標のオフセットを除いた。

zoomAtは変更前のカーソル/指中点のworld座標を求め、変更後の中点へ同じ座標が来るようcenterを補正。ピンチ中点が移動する場合も同じ式で追従。パンは画面差分÷(fit×zoom)。安全境界は最低1セルを視野へ残すためだけに制限し、その境界では中心固定より安全なカメラ範囲を優先。

【暫定採用値】100%=全体fit、**75〜300%**、ホイール係数0.0015の指数変換（deltaModeも正規化）、ボタンは1.2倍刻み、4px未満はタップ。75%は少し引いて見渡す余地、300%は番号/柄を確認できる範囲として採用。試験で上下限と中心誤差を確認したが、実機での速度の好みは試遊待ち。画面回転/resize/ブラウザバー由来のviewportサイズ変更では、ドラッグを取消し100%へrefitする。

- idle / drag / pan / pinchとcontacts/blockedをUI側で管理。
- 2本目でsingle情報と組別プレビューを破棄し、盤面を変更せずpinchへ。
- pinchの一方を離したらidle+blocked。残指move/upは素材ドラッグへ移行しない。全指離し後の新しいdownから再開。
- 3本目は安全取消、残指がある間blocked。pointercancel/lost capture/Escape/blur/非表示で確定しない。
- upは既知pointerだけ受理。stateを同期で閉じてからcommitするため、重複upが再適用されない。
- 同じtargetのpreview planを確定へそのまま渡す。upが別セルならそのセルの計画へ更新する。盤面/viewport外なら取消。
- 検証で無関係なpointerupによるプレビュー消失を発見し、既知pointerチェックを追加。Core修正は不要だった。

## Tier40と外見

MAX_TIER=40により既存isTier/状態検証/plan上限/履歴が追従。29→30、30→31、39→40は3/5双方で検証。40→41は無消費の不成立。highestTierReachedは通常移動/消費で低下しない。高TierプリセットはMAX_TIER-1/MAX_TIERを参照しているため、既存の同じコードで39/40へ追従した。

1〜10単色、11〜20は縞/水玉/波紋、21〜30は宝石と静的発光、30は虹、31〜40は星/幾何と軌道、40は専用の冠/二重光輪/多色本体。番号/柄/色を併用し、小さいマスでは22pxの論理番号がfitと一緒に縮小（320幅初期で約9.6px）。

これは**識別可能な40段階のデザイン試作**。正式配色・名称・完成イラストは未承認。外見メニューは比較用UIで、発見/登録/収集する図鑑システムではない。本体・顔・番号/選択のDOM層を分け、将来属性装飾を前後に、覚醒モヤを外周へ追加できる。属性/覚醒の仮データや偽のモヤは追加していない。

## 実行結果・証跡

| 実行 | 結果 |
|---|---|
| Node / npm | 22.23.4 / 10.9.9 |
| npm ci | 成功、固定依存を再現 |
| npm run lint | 成功、警告0 |
| npm test -- --run | **214件成功**、失敗0/skip0、7ファイル |
| npm run build | 成功、tsc -b→Vite。JS241.38kB/gzip76.94kB、CSS11.80kB |
| 既存browser回帰 | **54項目成功**、上限40/新UIへ追従 |
| Phase1.1 browser | **100項目成功**、10サイズ×10項目 |
| ブラウザエラー | pageerror/console error/request failureすべて0 |
| GitHub Actions | 最新PR HEADとrun head_shaを照合し、最終run URLをPR本文へ記録 |

Lint/Vitest/Build/npm ciの生ログは[同証跡ディレクトリ](validation/phase1-1/)、全試験ソースSHA-256は[manifest](validation/phase1-1/tested-source-manifest.json)。Playwrightはアプリ依存へ追加せず隔離環境で使用。新規エンジン・画像・外部フォント通信なし。

M01〜M32は既存Core回帰を保全。M33/M36は全Tier1〜39の進化ループ＋29/30/39の3/5体明示テスト。M34は40上限無消費と不正41拒否、M35は40履歴非減少/プリセット初期値。旧M対応表は過去資料として保全し、本書を現行差分とする。

## 既知の問題・未確認

実施した自動試験の範囲で残存機能不具合は検出していない。**実機確認は未完**：Windows Chrome/Edge、iPhone Safari、Android、iPad、実Safari/WebKit/Firefox、実端末のsafe-area/ブラウザバー/OSジェスチャー/画面回転/長時間の滑らかさとFPS。Chrome Headless134/Playwright1.51.1のマウス・isMobile/hasTouch・CDP入力を実スマホ成功扱いしない。

最新Chromium151のダウンロードが不完全で、入手できた134を使用した制約あり。40個体を描画し目視確認したが、低性能実機の負荷を測定済みではない。常時filterや粒子/タイマーを使わず、軽減設定を用意した。フォントは検証ホストだけへ導入し、アプリへの依存追加なし。

## ユーザー試遊とPhase2

1. READMEのDesktop手順でブランチを取得、npm ci→dev。
2. PCを1366×768相当、スマホ縦/横で表示。全体・主要ボタン・メニュー・番号の読みやすさを確認。
3. ホイール/ピンチ/パン、ズーム後3/5/11体、ドラッグ中2本目→残指→全指離し、高Tier39→40/40上限を確認。
4. 外見メニューで全40体、表示軽減を試す。必要な修正を記録し、Draft PR採用を判断する。本Workでマージしない。
5. Phase2正式依頼前に生成間隔・貯蔵/取出位置・停止/満杯・Gaussian μ/σ/帯域・GOLD/金10回報酬・保存形式/移行をシミュレーションと合意で決める。

今回未実装：時間生成/抽選/貯蔵/クリック/売却/GOLD/設備/特殊3色/10属性/覚醒/闇消滅/土地/本格図鑑/セーブ。カメラ状態とGameStateの保存はまだ行わない。将来マップ拡張時は700固定/49セルのUIを拡張するが、今回は7×7に範囲を限定した。
