# Phase3D 検証結果 — 2026-11-04 JST

新規Draft PR #16、feature/phase03d-attribute-visual-composition。起点main1291226a67a25df254301d1f3e41e0cc46efdc1b（PR13/15マージ済み）、CI41602198033・Pages41602198012成功を開始時に再確認。main/公開Pagesは変更しない。最終HEADと一致するCIはPR本文に記載。

## 結果

| 検証 | 結果 |
|---|---|
| npm ci | 成功、Node22.23.4/npm10.9.9 |
| 基準main | Lint/Build成功、724件/29ファイル成功 |
| 最終Lint | 成功 |
| 最終Vitest | **941件/30ファイル成功**（既存724＋新217、削除なし） |
| 最終Build/型チェック | 成功 |
| ブラウザ最終採用分 | **982件成功、15スイート** |
| 新規属性の実描画 | 200件、10サイズ×7Tier×通常/覚醒＋60操作検査 |
| 全組み合わせ | 45ペア＋120トリプル、全1140覚醒マスクを新単体で検査 |
| 属性なし本体 | 全40Tier、PC/320の6盤面で改修前後PNGがバイト一致 |
| Core/保存/依存/CI | 33ファイルが起点mainとGit blob一致 |
| 比較画像 | 実ブラウザ画像22枚、SHA256/Git blob照合 |

集計正本は[final-summary.json](final-summary.json)。各生レポートへの参照を持ち、試作8件/Smoke20件や改修前性能6件は重複加算しない。検査対象の本番Buildと、ブラウザが読んだ凍結Buildはindex/JS/CSSが完全一致（[tested-artifact.json](tested-artifact.json)）。src51ファイルのハッシュは[tested-source.json](tested-source.json)。

## 実ブラウザ・視覚監査

Chromium134.0.6998.35 / Playwright1.51.1、ヘッドレス。指定の1920×1080、1440×900、1366×768、1280×720、1024×768、768×1024、390×844、375×667、320×568、844×390を全て使用。通常ゲーム画面の縦横スクロールなし、盤面寸法を維持。

最初に炎/氷/自然を通常/覚醒/3属性/3覚醒でTier1/40・1366/320に実描画し、顔/冠/バッジ/★を目視してから残り7属性へ展開した。10通常・10覚醒は固定位置と固有形状を持つ。0〜3オーラは既存のまま。7必須Tier（1/4/10/20/21/30/40）の全10属性と6つの三属性例を各サイズで描画し、SVG形状の存在・属性別フラグ・顔の保護領域・入力非干渉を検査。

3複合は通常・第1属性だけ覚醒・第2だけ覚醒・両方覚醒・第3属性ありを比較。融合細部は主要パーツの下に描画し、覚醒固有の形/第三属性を隠さない。属性Lv1と99のSVGは同一、Lv99はバッジへ表示。入力配列逆順でもSlime全体のHTMLが同一、入力は不変。

ドラッグ中/5体マージ2出力/覚醒非増殖/個体詳細/交換/無料解除/再読込/PC取消/ネイティブタッチ取消/ピンチ/ホイール・軽減で共通Slimeを確認。外見メニューでは最大3属性・個別覚醒を切り替えて全40Tierを確認可能。プレビュー操作でセーブ原文が変わらないことを確認。マージ予測は既存トークン/文章のまま、未確定の乱数結果のキャラクターを先取り表示しない。

旧回帰は3/5/大量マージ、交換、研究、FIFO、属性重視、売却保護、無料解除、GOLD報酬、紫チャージ/離脱、青、保存失敗、旧移行、競合/Locks、ズーム/パン/キャンセルを保持。Coreの計算式/保存/頻度は一切変更せず、[preservation.json](preservation.json)で照合。

## 監査で発見・修正した事項

- 闇/光が既存の覚醒本体のbox-shadowに埋もれた。底角の配置を保ち、本体輪郭手前へレイヤーを移した。オーラをさらに強めて解決していない。
- Tier4だけ本体上端が10%（他は18%）で目が高い。額の幸運/変異に1〜2pxの侵入を検出し、装飾と融合線を3単位上へ移した。顔を隠す条件を緩めていない。
- 旧phase3c試験はドラッグ直後、原子的保存が完了する前に青バフが消えたか即時判定していた。1024幅で競合を検出。保存の位置更新→UI反映を既存untilで待ってから元の0件assertを実行する順に修正し、全80件を再実行して成功。最初の39件レポート（1失敗）も保全し、最終集計では再試験80件だけを採用。
- 初回の標準並列Vitest出力は完了要約を確認できなかったため成功扱いせず、起点mainの独立worktreeでmaxWorkers2により724件を確認。最終941件もmaxWorkers2。CI標準コマンドは最終HEADで別途照合する。
- 環境標準ブラウザのZIP取得が破損したため、従来の検証と同じPlaywright1.51.1/Chromium134を外部環境へ導入。検証用の日本語フォントも外部だけに導入。リポジトリの依存は不変。

## 性能

60実フレームの短時間標本。3サイズ（1366/390/320）×通常/軽減、16体すべてTier40・Lv99・3属性3覚醒・最大GOLD・青共鳴を使用。同じ条件の改修前6標本と比較した。

| 条件 | 改修前平均ms/frame | Phase3D平均ms/frame |
|---|---:|---:|
| PC 通常 | 23.33 | 21.86 |
| PC 軽減 | 16.48 | 16.48 |
| 390 通常 | 16.64 | 16.49 |
| 390 軽減 | 16.55 | 16.52 |
| 320 通常 | 16.33 | 16.41 |
| 320 軽減 | 16.36 | 16.55 |

改修後p95は16体で17.0〜25.9ms、ドライバ経由ドラッグ/取消90〜184ms。16体ではこの標本で著しい悪化を検出せず、ゲーム不変と残留ドラッグなしを確認。性能改善や実機60FPSを保証するものではない。

64体は実際のSlime DOMを複製した8×8開発用描画fixtureで、ゲーム盤面/保存を拡張しない。通常演出46.95ms、軽減17.11ms平均。これはSVG/既存オーラを含むpaint評価であり、64体のReact更新/ゲームCoreの性能保証ではない。将来の土地拡張前に可視範囲描画やオーラ負荷を評価する。

新しいSVGは静的path/circleだけ、filter/gradient ID/乱数/ゲームタイマー/保存処理を持たない。属性レイヤーはmemo化。BuildはJS gzip102.57→105.69KB、CSS gzip10.45→10.65KB。依存追加なし。

## 画像

[screenshots-manifest.json](screenshots-manifest.json)に元PNGのパス・加工・寸法・容量・SHA256/Git blobを保存。実ブラウザのPNGを撮影・検査後に、一覧/複合/拡大/無属性比較は可逆WebP、ゲーム全画面/試作/前後比較は同じ解像度の品質92 WebPへ保存した（PC前後比較だけ650px幅に縮小）。図中の装飾は生成画像ではなく実ゲームの描画。切抜き/配列/説明ラベル以外の画像内容は改変していない。

- [通常10属性](screenshots/normal-10-atlas.webp) / [覚醒10属性](screenshots/awakened-10-atlas.webp)
- [炎＋黄金](screenshots/combo-golden-flame.webp) / [氷＋雷](screenshots/combo-charged-ice.webp) / [幸運＋変異](screenshots/combo-helix-clover.webp)
- [最初の3属性PC](screenshots/prototype-1366x768.webp) / [試作320](screenshots/prototype-320x568.webp)
- [Tier40・3属性3覚醒](screenshots/tier40-three-awake.webp) / [軽減](screenshots/reduced-390x844.webp)
- [改修前後PC](screenshots/before-after-1366x768.webp) / [改修前後320](screenshots/before-after-320x568.webp) / [無属性維持](screenshots/unattributed-before-after.webp)
- 指定全10サイズの全画面画像はscreenshots/game-幅x高さ.webp。

## 再実行

```sh
npm ci
npm run lint
npm test -- --run
npm run build
# 必要なら --maxWorkers=2 をVitestに追加
# 既存の外部PlaywrightをPLAYWRIGHT_MODULE / PLAYWRIGHT_BROWSERS_PATHへ指定
BROWSER_DIST=dist BROWSER_ARTIFACT_DIR=docs/validation/phase3d/regression node tests/browser/visual-regression.cjs
D_DIST=dist node tests/browser/phase3d.cjs
D_MAIN_DIST=/path/to/main-build D_DIST=dist node tests/browser/phase3d-compare.cjs
BROWSER_DIST=dist BROWSER_ARTIFACT_DIR=docs/validation/phase3d/performance node tests/browser/phase3d-performance.cjs
```

ブラウザ実行中に同じdistを書き換えない。今回は最終Buildとバイト一致する外部コピーを固定して使用。port5173〜5183を使用する。試験は隔離ブラウザのローカルfixtureだけに保存し、公開URLやユーザー実セーブへ書き込まない。

## 未確認

Windows/iPhone実機、Edge/Safari/Firefox、スクリーンリーダーの実利用は未確認。最小画面では融合細部・DNAの色分けは拡大時ほど見えず、主要形状と既存アイコン/Lv/詳細で補完する。16体試験の範囲で重大な描画/入力不具合は未検出。具体配色・座標・形状は暫定デザインで、試遊後に限定調整する。64体通常演出の負荷は将来Phase4前の課題。
