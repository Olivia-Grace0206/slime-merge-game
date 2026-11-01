# Phase3B 最終検証結果 — 2026-11-01

起点main `13f56c0ca3b45b7f947c1e11682e2b11e22da5cd`、main CI 41287693282成功。新規Phase3Bブランチ。main未マージ・Private/Pages設定不変。最終HEAD/CI URLは新規Draft PR本文に記録し、文書自身のSHA自己参照を避ける。

| 項目 | 結果 | 証跡 |
|---|---|---|
| Runtime | Node22.23.4/npm10.9.9 | runtime.txt |
| npm ci | 成功・依存/lock変更なし | npm-ci.txt |
| Lint | 警告0・成功 | lint.txt |
| Vitest | **562/562・20ファイル・失敗0/skip0** | vitest.txt |
| 型チェック/Build | 成功 | build.txt |
| 独立不変条件監査 | **20,000混在取引・200保存復旧・違反0** | audit/transactions.json |
| 100資源モード比較 | 450ケース | ../../balance/phase3b/generation-modes.json |
| ペース/Lv比較 | 13候補×5Lv、6属性Lv、最大重複 | ../../balance/phase3b/parameters.json |
| 実4×4統合 | 8style×2購入戦略×3seed、8h打切り | ../../balance/phase3b/integrated.json |

## ブラウザ回帰

Production buildをChromium134.0.6998.35 headless shell/Playwright1.51.1で操作。マウスとCDP native touchによるブラウザエミュレーション。実Windows/実Safari/Android/実機スマートフォンの確認ではない。新しいアプリ依存の追加なし。

| Suite | PASS | 証跡 |
|---|---:|---|
| phase1-1 | 120 | [JSON](browser-results/phase1-1.json) |
| phase3a | 74 | [JSON](browser-results/phase3a.json) |
| followup | 101 | [JSON](browser-results/followup.json) |
| polish-input | 36 | [JSON](browser-results/polish-input.json) |
| phase2-polish | 60 | [JSON](browser-results/phase2-polish.json) |
| phase1 | 54 | [JSON](browser-results/phase1.json) |
| followup-compare | 3 | [JSON](browser-results/followup-compare.json) |
| phase3b | 82 | [JSON](browser-results/phase3b.json) |
| **合計（重複再実行を加算しない）** | **530** | [集計](browser-results/summary.json) |

旧448件の範囲を全保持し、新規82件を追加。目視後の闇リスクz順/切れ防止と3体マージの出力説明に対応し、新規82件と交換/属性74件を追加で再実行。変更していない範囲を含めた8suite全体も成功。console/pageerror0。rawログも同ディレクトリへ保存。

## 10画面の表示・操作

| 画面 | 盤面一辺px | 縦横スクロール | 加速/モード |
|---|---:|---|---|
| 1920×1080 | 1010 | なし | 両方44px以上・画面内 |
| 1440×900 | 830 | なし | 両方44px以上・画面内 |
| 1366×768 | 698 | なし | 両方44px以上・画面内 |
| 1280×720 | 650 | なし | 両方44px以上・画面内 |
| 1024×768 | 624 | なし | 両方44px以上・画面内 |
| 768×1024 | 752 | なし | 両方44px以上・画面内 |
| 390×844 | 374 | なし | 両方44px以上・画面内 |
| 375×667 | 359 | なし | 両方44px以上・画面内 |
| 320×568 | 304 | なし | 両方44px以上・画面内 |
| 844×390 | 334 | なし | 両方44px以上・画面内 |

すべてPhase3Aの盤面寸法を維持。属性の顔/Tier/バッジ分離、マージ/交換の別表示、価格札、生成UI/売却エリア、ショップ、ホイール/ピンチ/パン/回転取消を確認。320pxは加速とmodeの間隔を縮め、丸ボタンの属性重視コストを2行にして収めた。闇リスクを先頭・ドラッグ絵の前面に表示し、文字の矩形が切れないこと/プレビューの乱数消費0も検査。

## 重点的な安全性

- 10属性の効果/逓減Lv/複合/重複上限、光非再帰、磁力が位置だけ変更、自然の在庫/計数/停止/時計巻戻し/移動/売却、変異の組ごとの確率/3枠上限、darkだけ消失・両出力共有をCore検証。
- 安全10素材、属性付き/高Tier/盤面保護個体の誤消費なし、残存FIFO、最低素材Tier、空きランダム、材料不足/満杯/期待IDとモード/二重要求、切替/保存復旧を検証。
- 旧schema1〜5を旧間隔で検証→schema6へ進捗率移行。旧属性/Lv/Tier40/GOLD/研究/貯蔵/保護/金契約の単価と支払済みを保持。不正ID/Lv/重複/未知版/破損は原文保持。
- Web Locks/queue/CAS/保存成功後publishを維持。Quotaで素材/個体/属性/財布/モードを中途更新せず、別タブ競合・連打を拒否。保存済みdark/変異結果を再抽選しない。
- 3/5/8/11マージ、swap優先条件、GOLD対象のID+位置と離脱失効、旧350ms×10回/売却保護/価格札/ピンチ取消を回帰。価格札と実売却は共通関数。

監査で自然+tapの最終貯蔵枠の時計不整合を発見・修正。原因/修正/回帰は[AUDIT](AUDIT.md)。旧期待値の変更はペース/スキーマ/実売値に合わせたもの、試験の削除なし。旧10秒安全性fixtureは明示legacy rulesを注入。旧証跡や旧仕様を上書きしない。

## スクリーンショット

Noto CJKで日本語を表示し、実際に目視確認。25画像をWebP保存、[寸法/SHA256/元PNG対応](screenshots/manifest.json)。元PNGはrunnerで再生成可能。

| 内容 | PC1366 | スマホ390 | 最小320 |
|---|---|---|---|
| 属性重視 | [画像](screenshots/mode-1366x768.webp) | [画像](screenshots/mode-390x844.webp) | [画像](screenshots/mode-320x568.webp) |
| 闇リスク | [画像](screenshots/dark-risk-1366x768.webp) | [画像](screenshots/dark-risk-390x844.webp) | [画像](screenshots/dark-risk-320x568.webp) |
| 補正売値 | [画像](screenshots/sale-1366x768.webp) | [画像](screenshots/sale-390x844.webp) | [画像](screenshots/sale-320x568.webp) |
| 属性実効果 | [画像](screenshots/effects-1366x768.webp) | [画像](screenshots/effects-390x844.webp) | [画像](screenshots/effects-320x568.webp) |
| 交換予告 | [画像](screenshots/swap-1366x768.webp) | [画像](screenshots/swap-390x844.webp) | [画像](screenshots/swap-320x568.webp) |
| 属性継承 | [画像](screenshots/merge-1366x768.webp) | [画像](screenshots/merge-390x844.webp) | [画像](screenshots/merge-320x568.webp) |

mode画面は指定10サイズすべて保存。全面的なアート再制作/外部アセットは追加しない。

## 再現と未確認

`npm ci` → `npm run lint` → `npm test -- --run` → `npm run build`。ブラウザは `PLAYWRIGHT_MODULE=/path/to/playwright BROWSER_ARTIFACT_DIR=/output node tests/browser/phase3b-regression.cjs`。外部のheadless shellキャッシュはPLAYWRIGHT_BROWSERS_PATHで指定。各runnerが同じprocess環境でpreviewを開始し終了する。

数値は未承認の仮仕様。focus専用はTier進行が遅い（8h T40未到達6/6）ので通常との併用を試遊評価。消費選択/外れの損失感/全体速度、正式属性上限/Lv成長/闇率/全効果量はユーザー判断。実機/実ブラウザは未確認、監査は第三者レビューではない。紫/青/覚醒/全体外見/音/土地/正式図鑑ロックは今回未実装。
