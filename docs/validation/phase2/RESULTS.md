# Phase 2 検証結果

2026-10-31 JST。Linux Chromium 134.0.6998.35 / Playwright 1.51.1、Node22.23.4 / npm10.9.9。実Windows・実スマホ/Safariは未確認。

## 指定10画面の実測

| 画面 | 盤面一辺px | 面積占有率% | 縦横スクロール | 主要ボタン44px以上/到達 |
|---|---:|---:|---|---|
| 1920×1080 | 1010 | 49.2 | なし | PASS |
| 1440×900 | 830 | 53.2 | なし | PASS |
| 1366×768 | 698 | 46.4 | なし | PASS |
| 1280×720 | 650 | 45.8 | なし | PASS |
| 1024×768 | 624 | 49.5 | なし | PASS |
| 768×1024 | 752 | 71.9 | なし | PASS |
| 390×844 | 374 | 42.5 | なし | PASS |
| 375×667 | 359 | 51.5 | なし | PASS |
| 320×568 | 304 | 50.8 | なし | PASS |
| 844×390 | 334 | 33.9 | なし | PASS |

全画面で盤面正方形・初期全面表示。PC1440/1366/1280はPhase1.1 Polishの盤面寸法を維持。1024では操作rail確保で縮小するが1セルは4×4化により拡大。320/375/390の幅制約盤面を維持。低い横画面も側面操作で高さを確保。機械可読の全寸法/到達性はbrowser-results.json。

## 実行結果

| 検証 | 結果 / 証跡 |
|---|---|
| 再現install | npm ci成功 / npm-ci.txt |
| Lint | 警告0 / lint.txt |
| Vitest | 267件成功（既存231含む）/ vitest.txt |
| TypeScript / Build | 成功 / build.txt |
| Phase2 React UI | 59成功 / browser-results.json・browser-run.txt |
| 既存Core/drag回帰 | 54成功 / regression/results.json |
| 既存10サイズ/zoom/pinch/pan/取消 | 120成功 / viewport-regression/browser-results.json |
| 合計ブラウザ | 233成功、pageerror/console error 0 |
| 長時間 | 仮想240時間・2400生成/売却・240 save round trip、重複ID/破損0 / long-simulation.json |
| バランス | 17条件×3seed＋opening6本 / ../../balance/phase2/simulation.json |

## 画面画像

[通常PC](play-1440x900.webp) / [通常390](play-390x844.webp) / [最小320](play-320x568.webp) / [横画面](play-844x390.webp) / [ショップ320](shop-320x568.webp) / [金マス390](gold-390x844.webp)。全10サイズはscreen-*.webp、既存回帰画像は各サブディレクトリ。PNGで取得後WebPへ圧縮（アプリの画像依存ではない）。

## 異常系と最終監査

破損/不明版/不正ID・座標・Tier・GOLD・receiptを拒否。原本は保存停止で保全。別タブ競合はWeb Locks＋期待保存原文で拒否。Quotaは売却/GOLD両方を旧状態に保つ。getter拒否でも白画面なし。金は10回の途中reload、配置変更、模擬非表示、タブ閉開、古い支給要求/イベントID再利用を確認。GOLD上限でも警告を確認して盤面を整理可能。

試験中に、検証メニューを開いている間の正常なタイマー保存まで固定するassertが不安定だった。通常→検証の切替後に保存を固定し、切替前後の盤面/財布は不変と別途照合するよう修正した。期待する保全条件を弱めず、メニュー待機時間をゲーム進行停止扱いしない。

ソース・旧完全仕様書・依存/CIの保全はsource-preservation.json。最終ソースのSHA-256はtested-source-manifest.json。対応remote HEAD/CIはPR #8本文。

## 未確認

実Windows/実iPhone・iPad Safari/Android、WebKit/Firefox、OS強制終了の書込耐久性、実safe-area・OSジェスチャー・長時間FPS。非表示はDOM visibilityの模擬、タブ閉開は実browser操作だがOS強制killではない。HTTPS/localhostとWeb Locksが実行条件。人によるバランス/楽しさの評価は未実施。
