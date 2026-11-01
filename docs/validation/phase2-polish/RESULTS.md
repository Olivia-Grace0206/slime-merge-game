# Phase 2 Polish 検証結果

2026-11-01 JST。Node22.23.4 / npm10.9.9 / Chromium134.0.6998.35 / Playwright1.51.1。実Windows・実Safari/Androidは未確認。

## 最終コードの自動検証

| 対象 | 結果 | 証跡 |
|---|---|---|
| npm ci | 成功 | npm-ci.txt |
| Lint | 警告0 | lint.txt |
| Vitest | **317/317、12ファイル、失敗0/skip0** | vitest.txt |
| TypeScript/Build | 成功 | build.txt |
| Phase2更新契約のReactブラウザ | **60成功** | browser-results.json |
| native touch/保存/表示補足 | **36成功** | input/results.json |
| 既存マージ回帰 | **54成功** | regression/results.json |
| 既存viewport/zoom/pinch/pan/取消 | **120成功** | viewport-regression/browser-results.json |
| 合計ブラウザ | **270成功、pageerror/console error 0** | 各*-run.txt |

既存267件を全回帰。旧仕様に依存した期待値だけを最新契約へ変更し、原子的売却/保存/receipt台帳/ID/時計/7×7検証分離の安全試験を保った。追加49件は16等幅抽選bucket、残り1/0、在庫不足、不正乱数、連打、金への追加、350ms×10、4/10後の移動/売却/消費、同時刻順序、同Tier別ID、保存失敗、GOLD上限、v2明示移行、保護とマージを検証。追加1件は3分布×5seedと金4式の比較。

## 10サイズ・盤面比較

| 画面 | Phase2一辺px | Polish一辺px | 変化 | 最小主要ボタン幅×高px | ページ縦横スクロール |
|---|---:|---:|---:|---|---|
| 1920×1080 | 1010 | 1010 | 0 | 96×54 | なし |
| 1440×900 | 830 | 830 | 0 | 96×54 | なし |
| 1366×768 | 698 | 698 | 0 | 96×54 | なし |
| 1280×720 | 650 | 650 | 0 | 96×54 | なし |
| 1024×768 | 624 | 624 | 0 | 96×54 | なし |
| 768×1024 | 752 | 752 | 0 | 94×44 | なし |
| 390×844 | 374 | 374 | 0 | 73×44 | なし |
| 375×667 | 359 | 359 | 0 | 70×44 | なし |
| 320×568 | 304 | 304 | 0 | 59×44 | なし |
| 844×390 | 334 | 334 | 0 | 84×44 | なし |

全サイズで初期全面/中央正方形・主要ボタン到達・各44px以上。盤面サイズを全10サイズで維持。PCの右上生成/右下出荷と左メニュー拡大、スマホの2領域分離・指でのドラッグ・メニュー/ダイアログ到達を実DOM矩形/elementFromPoint/CDP touchで確認。画面はscreen-*.webp、Phase2比較画像はbefore/。

## 代表画像

| サイズ | 修正前 | 修正後 |
|---|---|---|
| 1366×768 | [前](before/populated-1366.webp) | [後](input/populated-1366.webp) |
| 390×844 | [前](before/populated-390.webp) | [後](input/populated-390.webp) |
| 320×568 | [前](before/populated-320.webp) | [後](input/populated-320.webp) |

スクリーンショットは同じTier2/4・貯蔵10のfixture比較と、空盤面の10サイズ。PNG取得後WebPへ圧縮し、アプリへの画像依存は追加しない。日本語フォントを実行環境へ用意し文字の欠けを除いて目視確認。

## 重点検証・独立監査

- 保存前publishなし。Quota時の即売却/出庫/金支給は旧盤面・貯蔵・財布・4/10台帳を保持。再読み込み後の残り支給は計10回を超えない。破損JSON/getter拒否/別タブの原文競合も原本保全。
- 旧v2の低Tierイベントを旧単価で移行し、既払い/ID/保護/貯蔵を保持。新単価への遡及増額なし。4/10でリロード後の離脱/売却/消費で閉じる。現在位置の同Tier別IDへすり替え不可。
- 金のdeadlineを直接予約し、通常pollは250msへ抑制。描画は別rAFで、6回の45ms間隔サンプルが4段階以上進み、同期間の保存は最大1回。満杯/非表示でバー停止、再表示・加速・強化・reloadで同期。FPSに依存する生成は既存Coreの分割時間試験でも回帰。
- 長押しは実時間600msで検証。移動閾値/2本目（盤面外含む）/touchCancelで不発、保護後に動かず二重contextmenuも不発。PC右クリック・価格title/ドラッグpreview・P/I/Enter・売却領域へのkeyboardアクセスも確認。
- 金支給と離脱の順序はCore固定時刻で両方向を検証。ブラウザのネイティブ入力中に正当に先行する支給を誤って不具合扱いしないよう、離脱単独試験は支給deadlineに余裕を設けたfixtureとし、350ms連続支給は別に検証。
- 仮想時計とCDPタップを混在したショップ試験は最初の互換clickが抑止されるため、時計付き統合ではmouse click、別の時計なし試験では実touch tapを3サイズで実施。失敗した試行をPASSに数えない。
- 旧Core/依存/CI/完全仕様書は保全。source-preservation.jsonに元GitHub blob SHA、tested-source-manifest.jsonに最終ソース/テストhashを記録。GitHub反映は実mainを祖先にしたAPI commitで行い、ローカル仮祖先は公開しない。

## 数値比較と限界

[4×4比較](../../balance/phase2-polish/RESULTS.md)。5seedで0.90案を仮採用、0.88の長期停滞を回避。金のTier1〜5は1/2/3/4/5/回、高Tier率は従来どおり。botの金収入比約21%は積極活用方策に依存し、人の体感を保証しない。

実Windows Chrome/Edge・iPhone/iPad Safari・Android・WebKit/Firefox・実safe-area/OSジェスチャー・OS強制kill後のディスク反映・長時間実機FPSは未確認。今回Linux Chromium実行と実機を区別する。GOLD上限、低額属性差の丸め、高Tierショップ上限後の用途は今後の調整対象。main未マージ、Private/Pages設定維持。
