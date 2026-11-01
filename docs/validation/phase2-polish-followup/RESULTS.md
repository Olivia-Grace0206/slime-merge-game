# Phase 2 Polish追加修正 — 最終検証結果

2026-11-01 JST。既存Draft PR #9の同ブランチ継続。main55075e4は不変。最終HEADと対応CI URLはPR本文へ固定し、文書内に自己参照SHAを作らない。Private維持・Pages操作なし。

## 自動検証

| 項目 | 結果 | 証跡 |
|---|---|---|
| npm ci | 成功（依存/lock変更なし） | npm-ci.txt |
| Node/npm | 22.23.0 / 10.9.9（CIは既存.nvmrcのNode22.23.4） | runtime.txt |
| Lint | 警告0・成功 | lint.txt |
| Vitest | **394/394、14ファイル、失敗0/skip0** | vitest.txt |
| TypeScript/Build | 成功 | build.txt |
| 既存Phase2 | 60 PASS | regression-phase2/browser-results.json |
| 既存native touch/保存/表示 | 36 PASS | input/results.json |
| 既存merge | 54 PASS | merge/results.json |
| 既存viewport/input | 120 PASS | viewport/browser-results.json |
| 追加研究/価格札/金解放/表記/10画面 | 101 PASS | ui/results.json |
| 同条件前後画像のfixture | 3 PASS | compare/results.json |
| **ブラウザ合計** | **374 PASS、pageerror/console error0** | 各browser-*-run.txt |

既存317件を削除せず全回帰＋新規76安全試験＋1比較。旧セッション試験は研究40/金unlockedの移行済みfixtureを明示し、実新規の研究5/金lockedを別途検証。40行の10k等幅抽選、seeded IID100k×6Hの頻度、H1/H2の正確な境界、研究のみではHが増えない、H1〜40旧セーブ研究ceil移行を確認。

最終本番BuildのJS/CSSはtested-source-manifest.jsonへ記録。ブラウザツールは隔離Playwright1.51.1/Chromium134.0.6998.35、依存追加なし。日本語フォントを実行環境に用意し目視確認。初期のBuild型エラー/同期UI待ちの不備/ヘッダー重なりを修正し、最終コードの試験だけを成功件数に含めた。

## 指定10画面と盤面寸法

| 画面 | 前Polish一辺px | 今回一辺px | 差px | ページ縦横スクロール |
|---|---:|---:|---:|---|
| 1920×1080 | 1010 | 1010 | 0 | なし |
| 1440×900 | 830 | 830 | 0 | なし |
| 1366×768 | 698 | 698 | 0 | なし |
| 1280×720 | 650 | 650 | 0 | なし |
| 1024×768 | 624 | 624 | 0 | なし |
| 768×1024 | 752 | 752 | 0 | なし |
| 390×844 | 374 | 374 | 0 | なし |
| 375×667 | 359 | 359 | 0 | なし |
| 320×568 | 304 | 304 | 0 | なし |
| 844×390 | 334 | 334 | 0 | なし |

中央盤面寸法を全サイズで維持。生成/売却/メニューの主要操作44px以上。ショップは内部だけスクロールし、ページはスクロールなし。最大フル桁GOLDは320pxでも文字scrollWidth/財布境界/ロゴ重複を検査。最大桁時だけ小画面ロゴを省いてGOLDを優先する暫定デザイン。

全16体＋つかんだ個体の17価格札をmouseとnative CDP touchで検査。札は最低11px、セル幅内、正しい個体中心に追従。Tier40の1,099,511,627,776も省略せずカンマで改行。SVG金貨を縁へ浮かせ表情を隠しにくくした。75%＋実パンと300%でセル中心への整合、画面回転で取消を検査。300%では画面外のセル/札は意図どおりviewport外でclipされる。

## 重点安全性

- 研究はplan/apply/sessionで拒否。3/5/8/11/16体の素材/ID/在庫/GOLDを一切減らさず、解放後は通常マージ。研究単独購入でHは上がらない。
- 新規金locked、未解放frequency拒否、購入でGOLDとflagを一括保存、二重購入拒否。金は350ms×10、離脱/売却/素材化で未払い失効。4/10後reload、旧v2単価凍結、旧v3単価/ledger保持、同Tier別ID/別タブ/Quota/非表示を回帰。
- schema4へv1/v2/v3を明示移行。旧Hを覆う研究段階・金解放を無料継承。盤面/FIFO/財布/既払い/保護を保持。貯蔵再抽選/無断初期化なし。
- 保存失敗時、研究とGOLDのどちらも公開しない。研究同期二重click、expectedLevel、ロック中ショップ、キーボードEnter購入、表示形式の保存/復旧を確認。
- 通常時価格なし、sale zone内だけ全個体＋dragへ、out/cancel/pinch/up/rotationで解除。保護表示/売却拒否、GOLD上限時の実受取0、指より上の札を確認。
- 先頭Tier文字/見た目の予告なし。3匹SVG・収納箱・大きい貯蔵数、金袋・full初期/compact保存。バー補間・保存回数・長押し・右クリック・debug7×7/全40Tierを維持。

## 画面

| 内容 | PC | スマホ390 | 小画面320 |
|---|---|---|---|
| 同条件の新UI | [1366](compare/populated-1366.webp) | [390](compare/populated-390.webp) | [320](compare/populated-320.webp) |
| 全16体の価格 | [1920](ui/prices-1920x1080.webp) | [390](ui/prices-390x844.webp) | [320](ui/prices-320x568.webp) |
| 研究 | [1366](ui/research-1366x768.webp) | [390](ui/research-390x844.webp) | [320](ui/research-320x568.webp) |

修正前は既存[Polish1366](../phase2-polish/input/populated-1366.webp) / [390](../phase2-polish/input/populated-390.webp) / [320](../phase2-polish/input/populated-320.webp)。Tier2/4・GOLD0・在庫10の同条件。今回の巨大桁[320](compare/max-gold-320.webp)。全画像hashはscreenshots.json、PNGをWebPへ圧縮して保存。アプリへの画像依存は追加しない。

## 数値比較と残る確認

[4分布・研究3価格・金3価格・購入4方針](../../balance/phase2-polish-followup/RESULTS.md)。36runすべてTier40到達（12h打切り、3seed中心）。研究優先は金を一切購入せず通常売却で到達。中間表/研究×3/金128を仮採用し、合意へ格上げしない。botの到達時間は人の予測ではない。

実Windows Chrome/Edge、実Safari/iOS/Android/Firefox、safe-area/OSジェスチャー、OS強制kill後ディスク耐久性、実機FPSは未確認。Windows/スマホの試遊で進行・価格・低Tier余剰・指での札視認性を評価し、その後PR #9のマージをユーザーが判断。属性/覚醒/紫青/土地/音/正式図鑑ロックは未着手。

補足：研究ボタンへ実フォーカス→ネイティブEnter入力でTier5→10を購入し、96→0 GOLDとH=5保持を確認。374件のrunner集計とは別の補足操作確認。証跡：`keyboard-research.json`。
