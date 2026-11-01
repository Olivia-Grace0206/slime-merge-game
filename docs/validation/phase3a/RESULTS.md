# Phase 3A 最終検証結果 — 2026-11-01 JST

起点main `225449c61671743c45c6c11d25bcae9be4323a9f`、新規Feature Branch。main未マージ・Private/Pages設定維持。最終HEADと同SHA CIはDraft PR本文に記録し、文書自身のSHAを自己参照させない。

| 項目 | 結果 | 証跡 |
|---|---|---|
| Runtime | Node22.23.4 / npm10.9.9 | runtime.txt |
| npm ci | 成功、依存/lock変更なし | npm-ci.txt |
| Lint | 警告0・成功 | lint.txt |
| Vitest | **498/498・17ファイル・失敗0・skip0** | vitest.txt |
| 型チェック/Build | 成功 | build.txt |
| 既存viewport/入力 | 120 PASS | final-viewport/browser-results.json |
| 新規属性/交換/10画面/Quota/GOLD交換 | 74 PASS | final-attributes/results.json |
| 既存研究/価格札/金解放/表記 | 101 PASS | final-ui/results.json |
| 既存native touch/保存/長押し | 36 PASS | final-input/results.json |
| 既存Phase2生成/売却/金/保存 | 60 PASS | final-phase2/browser-results.json |
| 既存merge | 54 PASS | final-merge/results.json |
| 同条件の画像fixture | 3 PASS | final-compare/results.json |
| **ブラウザ合計** | **448 PASS・pageerror/console error0** | final-*-run.txt |

既存394テストを全保持、104追加で498。旧「不成立取消」の期待値をswapへ更新した理由は[AUDIT](AUDIT.md)に記録。属性以外の経済/分布比較は無属性・変異0の明示fixtureとし、属性の本番Coreを別途試験。schema5に合わせたfixture補完のみで既存テストを削除しない。

## 10画面の表示

| 画面 | 盤面一辺px（従来→今回） | ページ縦横スクロール |
|---|---|---|
| 1920×1080 | 1010→1010 | なし |
| 1440×900 | 830→830 | なし |
| 1366×768 | 698→698 | なし |
| 1280×720 | 650→650 | なし |
| 1024×768 | 624→624 | なし |
| 768×1024 | 752→752 | なし |
| 390×844 | 374→374 | なし |
| 375×667 | 359→359 | なし |
| 320×568 | 304→304 | なし |
| 844×390 | 334→334 | なし |

属性メニューを加えても盤面寸法を維持。顔/Tier/属性バッジの矩形非重複、メニュー到達、詳細パネルの属性名/Lvを確認。ドラッグ用の絵は盤面カメラ変換の外にあるため、画面サイズに応じたバッジ文字サイズへ分離し、ドラッグ絵からのはみ出し・顔/Tierとの重なりも全10サイズで検査。日本語フォントNoto CJKを用意して目視確認した。

## 重点試験

- 異Tier・同Tier2体・Tier40・研究未解放・属性上限のswap。3/5/8/11のmerge優先と決定的組分け/出力維持。往復1000swapでもID/属性/保護/個体数/占有数を保持。古い・改竄計画は拒否。
- 10属性ID/Lv、不正ID/重複/不正Lv/疎配列の拒否。3体継承、5体2出力コピー、独立Lv成長、組別入力、余り保全、任意組で3種超過なら全体swap。変異あり/なし/上限見送り、5体固有ボーナスなし。
- 全H1〜40の未発見Tier生成禁止。生成時属性→FIFO→ランダム出庫→保存復旧を保持。失敗時は在庫/属性を保持。旧40行重み表は無変更。
- schema4→5と旧1〜3を明示移行。旧財布/研究/保護/貯蔵/金契約/既払い/H40保持。旧単価の再価格設定なし。壊れた/未知版は原本保持。属性を付けた偽旧形式も拒否。
- 保存成功済み変異結果はreload/古い要求/連打で再抽選なし。Web Locks/queue/raw照合/単一setItem成功後publishを維持。属性merge/swapのQuotaでは原文とUIを保持、別タブ/重複要求も安全。
- GOLD対象をsource/target両方向から同Tierswapして途中4/10で終了。属性数1/単価4を凍結、既払い16保持・未払い失効・別IDへ引継ぎなし・reload後再支給なし。旧350ms×10/空セル/解放/頻度も回帰。
- マウスとCDP native touchで交換/merge/即売却/保護/詳細。Escape/pointercancel/pinch/blur/回転の取消。回転通知とpointerupの競合は開始/確定時寸法の直接照合で修正し、120回帰を再成功。

## 画像と再現

主要画像はWebPへ圧縮し、screenshots.jsonへSHA256/寸法を保存。PNGは再現runnerから取得可能。

| 内容 | PC1366 | スマホ390 | 小画面320 |
|---|---|---|---|
| 属性付き盤面 | [画像](final-attributes/attributes-1366x768.webp) | [画像](final-attributes/attributes-390x844.webp) | [画像](final-attributes/attributes-320x568.webp) |
| 交換予告 | [画像](final-attributes/swap-1366x768.webp) | [画像](final-attributes/swap-390x844.webp) | [画像](final-attributes/swap-320x568.webp) |
| マージ属性予告 | [画像](final-attributes/merge-1366x768.webp) | [画像](final-attributes/merge-390x844.webp) | [画像](final-attributes/merge-320x568.webp) |
| 属性詳細 | [画像](final-attributes/detail-1366x768.webp) | [画像](final-attributes/detail-390x844.webp) | [画像](final-attributes/detail-320x568.webp) |

アプリ依存は追加しない。Playwright1.51.1/Chromium134.0.6998.35を隔離環境から使い、`PLAYWRIGHT_MODULE=/path/to/playwright BROWSER_ARTIFACT_DIR=docs/validation/phase3a/final-attributes node tests/browser/phase3a.cjs`。旧6runnerも同様に出力先を今回配下へ向ける。再開時に失われた検証用ランタイムは復旧し、最終画像/追加矩形検査を再実行。環境復旧時の起動失敗を試験成功へ数えない。

[3/8/18%比較](../../balance/phase3a/RESULTS.md)：4500生成・450保存復旧。3%/1%/上限3種/Lv99/最高Lv2入力で+1は未承認の仮仕様。最終採否は試遊で判断。

## 未確認

**実Windows Chrome/Edge・実iPhone/iPad Safari・Android/Firefoxは未確認**。Linux Chromiumのmouse/CDP touchと区別する。実safe-area/OSジェスチャー/OS強制kill後のディスク耐久性/実機FPSも未確認。Phase3Bの効果/複合/闇消滅、Phase3Cの紫青/覚醒、土地/音/正式発見図鑑は今回のPASS対象にしない。
