# Phase 3C Polish 検証結果 — 2026-11-03

PR #15、`feature/phase03c-visual-feedback-polish`。基準main `ef7927a35ff5903b5d99b79360d34c52aba302a6`、監査開始PR HEAD `459f1141f7f565d95da0aefeb443442a6dfd0f06`。mainはPublicの公開β版、PRはDraftのままユーザー承認待ち。

## 実行結果

| 検査 | 結果 |
|---|---|
| npm ci | 成功（Node22/npm10） |
| 基準Lint / Vitest / Build | 成功、717件 / 29ファイル |
| 最終Lint | 成功 |
| 最終Vitest | **724件 / 29ファイル 成功** |
| 最終Build / tsc -b | 成功 |
| ブラウザ回帰・視覚・操作・負荷 | **772件 成功**、13スイート |
| 画面サイズ | 指定10サイズ全て確認 |
| Core/保存/設定/依存/CI保全 | 33ファイルがmainとGit blobハッシュ一致 |

集計は [final-summary.json](final-summary.json) を正本とし、各生レポートへのパスを保持する。試行回数の加算ではなく、採用した最終スイートだけを数える。ブラウザはChromium134.0.6998.35 / Playwright1.51.1（ヘッドレス）。Windows・iPhone実機、Edge/Safari実ブラウザの成功を意味しない。

## 再実行

通常の依存導入/Lint/Vitest/Buildは依頼の4コマンドを使用した。ブラウザは既存の外部Playwright環境（リポジトリの依存追加なし）で実行。

```sh
# PLAYWRIGHT_MODULE / PLAYWRIGHT_BROWSERS_PATH は環境に応じて指定
BROWSER_DIST=dist node tests/browser/visual-regression.cjs
BROWSER_DIST=dist node tests/browser/visual-stress.cjs
```

同時にBuildでdistを書き換えず、port5173〜5177を空ける。今回の回帰は最終Buildと同一のリポジトリ外コピーをBROWSER_DISTに指定して固定した。テストはローカルのブラウザ隔離コンテキストへfixtureを保存し、公開サイト/ユーザー実セーブへ書き込まない。

## 視覚と操作

1920×1080、1440×900、1366×768、1280×720、1024×768、768×1024、390×844、375×667、320×568、844×390。全10サイズでページスクロールなし。盤面の大きさを維持。

同Tierの0/1/2/3覚醒を4×4上に並べ、Tier5/40/21/30で実描画。通常/軽減/`prefers-reduced-motion`を撮影。公開mainの同じ6つのUIファイル・同じ保存fixture・同じ画面サイズで再描画し比較した。1覚醒から外周輪郭・光輪・星が明確で、高Tier固有の発光とも区別できる。顔/Tier/属性バッジを維持。既存PRのオーラ実装を再利用し、重複実装はしない。

青欄はPCではショップ上、縦小画面では既存ヘッダー内、横小画面では左メニュー内。3属性表示・Lv・Core共有倍率・文字矩形を検査。盤面/各ボタン/GOLDと非重複。移動/交換/売却/マージ/属性解除/期限切れ/リロードで追従。表示は属性power倍率であり、上限後の生成速度倍率と解釈しない。

属性紹介10枚は全サイズでホスト/一覧ともスクロール不要、各カード44px以上、一言説明10px以上、文字/パネル全体が画面内。マウス・キーボード・モバイルtapで全10属性の詳細/戻る/別属性/所持一覧/3複合/個体詳細を操作。モバイル詳細はCDPの実タッチスクロールを使用し、背面盤面と保存ゲームの無変更、Escape終了後の操作復帰を確認。

既存回帰には3/5/大量マージ、覚醒集中/余剰警告、紫チャージ/離脱、青、GOLD、FIFO10/通常FIFO、無料解除、売却保護、ショップ、旧セーブ、保存失敗/別タブ、pointercancel/ピンチ/パン/ズーム等を含む。

## 試験中に見つかった問題と再試験

- 監査開始PRの50視覚検査で、青欄が4縦サイズの重要操作・844横の盤面へ重なる5失敗を検出。修正後60検査全成功。失敗レポート `before/results.json` を保全。
- 旧phase3aは旧「属性」導線を参照していたため、紹介→所持一覧へ変更。検証対象/条件は維持。
- 統合回帰phase3bの末尾2検査は接続先5173が固定されていた。共有preview5176に届かず失敗。最初の修正ではローカル変数スコープも不正で再試行が失敗。3箇所を共通GAME_URL/既定URLへ修正し、独立実行82件全成功。元の失敗レポートは残し、`phase3b-rerun/results.json` を最終集計に採用。
- 負荷用初期保存待ちの競合はlocalStorageの初回保存完了待ちを追加。実測6検査成功。
- 一時build複製をリポジトリ内に置いたためLintが生成済みminifyコードを読んだ。複製をリポジトリ外へ移し、最終Lint成功。ルールを緩めていない。

## 性能・安全性

16体すべてTier40/Lv99/3覚醒、最大GOLD、3共鳴属性、通常/軽減を1366/390/320で検査。60実フレーム間隔平均16.39〜24.03ms、p95 17.9〜37.5ms、ドライバ経由ドラッグ/取消96〜187ms。これはソフトウェア描画の短時間標本で、実機60FPS保証や厳密な性能比較ではない。入力後のゲーム不変/残留ドラッグなしを確認。

[core-preservation.json](core-preservation.json) にCore/domain/app/依存/ワークフロー33ファイル、[tested-source.json](tested-source.json) に全src46ファイルのハッシュを保存。最終Buildとブラウザで使った凍結artifactは [tested-artifact.json](tested-artifact.json) のJS/CSS/indexがバイト一致。schema7・保存キー・旧移行・queue/Locks・頻度/時間/倍率/経済は不変。視覚目的のタイマー/保存処理を追加しない。

## 画像

[screenshots-manifest.json](screenshots-manifest.json) に元PNG、加工内容、寸法、容量、SHA256/Git blobを記録。リポジトリへは実描画の可逆WebP14枚を保存。比較画像は実スクリーンショットの切抜き/連結/ラベルのみ。画像生成は使用していない。

- [低/高Tier・改修前後](screenshots/aura-before-after-390x844.webp)
- [PC比較](screenshots/aura-before-after-1366x768.webp) / [320比較](screenshots/aura-before-after-320x568.webp)
- [1覚醒](screenshots/awake1-390x844.webp) / [3覚醒](screenshots/awake3-390x844.webp) / [軽減](screenshots/aura-reduced-390x844.webp)
- [青PC](screenshots/blue-buffs-1366x768.webp) / [青320](screenshots/blue-buffs-320x568.webp) / [青横](screenshots/blue-buffs-844x390.webp)
- [紹介PC](screenshots/intro-1366x768.webp) / [紹介縦](screenshots/intro-390x844.webp) / [紹介320](screenshots/intro-320x568.webp) / [紹介横](screenshots/intro-844x390.webp)
- [詳細・内部スクロール後](screenshots/detail-390x844.webp)

## 残す確認

Windows/iPhoneの実機視認性・Safari/Edge・指での操作感は未確認。ユーザーが最終試遊し、必要な限定修正とPR #15のマージを判断する。現行main/公開Pagesは維持する。
