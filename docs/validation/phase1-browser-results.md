# Phase 1 ブラウザ検証

検証日：2026-10-30（日本時間）。ローカル本番distをVite previewで配信。

| 項目 | 実測・結果 |
|---|---|
| 実行 | `tests/browser/phase1.cjs`（隔離Playwright） |
| Playwright | 1.51.1。アプリ依存/package-lockには追加していない |
| ブラウザ | Chromium Headless Shell 134.0.6998.35 |
| PC | 1440×1100、マウスのmove/down/up |
| モバイル幅 | 390×950、320×950、isMobile/hasTouch=true |
| タッチ入力 | CDP Input.dispatchTouchEventのtouchStart/Move/End/Cancel。ブラウザがPointer Eventsへ変換する入力 |
| 結果 | 18項目×3幅 = 54成功、失敗0 |
| JS例外 / console error / request failure | 全て0 |
| 横はみ出し | 3幅でdocument幅≦viewport幅 |
| デザイン | PC全体・390pxの11体プレビューを画像で目視。日本語が描画されることを再確認 |

全ケースの名称は [phase1-browser-results.json](phase1-browser-results.json) に記録。
以下を全幅で確認：3/5/8/11体・斜め・29→30、30上限、異Tierキャンセル、空セル移動、自動マージなし、pointercancel/touchCancel、盤面外、パン後の座標変換、keyboard/Escape、別pointer取消/up無視、blur、ドラッグ中reset、1緑→2青→3赤と最高到達Tier上昇、CSSアニメーションと動作軽減、リセット。

マージ検証ではpointerup前に全配置が不変であること、DOMへ描画された組番号/消費ID/余りID/出力セルを取得し、pointerup後に完全一致することを照合。二重pointerupでも状態が変わらないことを確認。

## 画像

- [PC画面](phase1-desktop.webp)
- [11体マージ・PCプレビュー](phase1-desktop-preview.webp)
- [11体マージ・スマホ幅プレビュー](phase1-mobile-preview.webp)

## 環境の制約と未確認

初回のPlaywright最新Chromium取得はアーカイブ不完全で失敗。取得可能だった上記版を使用した。
実行環境はコマンドごとにlocalhostが分離されるため、検証スクリプト自身が同じプロセス環境でpreviewを起動し終了時に停止する。
日本語フォントのないホストで一度画像が豆腐文字になった。ホストにZen Maru Gothicを導入して再実行した。アプリは外部フォントをダウンロードせずOSフォントを使用する。ホストのフォントはリポジトリへ追加していない。絵文字やフォントの外見はOS差がある。

**未確認**：ユーザーWindowsのChrome/Edge、実iPhone/Android/iPadのSafari/Chrome、実端末での指の隠れ方・OSジェスチャー・画面回転・アプリ切替・長時間操作・描画性能。モバイル幅の自動検証を実スマートフォン確認済みとは扱わない。

操作感の好み、アニメーションの滑らかさ、色枠の実端末での見やすさはユーザー試遊待ち。公開URL・Pagesの試験は未実施、今回は公開していない。
