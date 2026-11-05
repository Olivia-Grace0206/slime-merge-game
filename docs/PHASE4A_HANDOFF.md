# Phase4A 引き継ぎ — 2026-11-05 JST

[Draft PR #17](https://github.com/Olivia-Grace0206/slime-merge-game/pull/17) — ユーザー試遊・承認待ち、main未マージ。

起点main582b99c（PR16マージ済み）。feature/phase04a-land-expansion-bigint-economy。Draft PRの最終HEAD/同一SHA CIをPR本文で照合。ユーザー承認前にmainへマージしない。公開β版はmainのまま。

## 実装と正本

[完全仕様v0.4.0](specifications/Slime_Merge_Game_Specification_v0.4.0_2026-11-05.md)、[検証/画像](validation/phase4a/RESULTS.md)、[経済](validation/phase4a/economy/RESULTS.md)。16→32→48→64、B/C自由順、D両前提。価格512/8192/131072Gは推奨・暫定。4倍売値とBigInt通貨は合意済み。Shop価格/効果据置き。

schema8は通貨の10進文字列、同じSAVE_KEY。旧1〜7検証/移行とWeb Locks/queue/CAS・保存後公開を維持。旧金reward1/2単価とcapped台帳保持、新規reward3は新基本値の5%。旧失効を再請求しない。7×7検証を通常へcropしない。通常セル175、world1400、初期A中心。購入でfitしない。

## 試遊

1. ブランチ取得、Node22/npm10で `npm ci`、`npm run dev -- --host`。Windowsはlocalhost。iPhoneは安全なHTTPSのブランチ試遊環境を利用する。LAN内HTTP IPだけでは既存Web Locksが使えない場合がある。
2. 既存セーブをバックアップしてから起動。所持GOLD、全個体/属性Lv/覚醒/保護、貯蔵順、研究、金紫青を確認。旧版へ戻すとschema8を読めない。
3. 土地メニューでBまたはCを購入。セルサイズ/カメラ不変、Dは片方だけでは不可。残り側→Dで64。全体表示、Aへの表示リセット、空き地パンとピンチを試す。
4. 区画をまたいだ3/5/大量マージ、交換、売却/無料解除/保護/FIFO/金から離脱を試す。大きな売却値と残高のtitle/詳細/短縮を比較。
5. 64体で発光通常/軽減、ドラッグ/パン/ズームを比較。PC/スマホ画像と違う見え方/操作感を報告し、価格や限定UI修正を判断する。

ローカル単体1016件/32ファイル、本番ブラウザ1059検査/17スイート。実機試遊は未実施。価格・Shopの長期バランス、Safari等の実機性能が承認待ち。Phase4Bには牧場/研究所/カオス背景、正式図鑑、必要なら経済再調整を引き継ぐ。新属性/音/オンライン同期/サーバー保存は追加していない。

## 再現・復旧

`npm ci` → `npm run lint` → `npm test -- --run` → `npm run build`。ブラウザにはPlaywrightを別途用意し `PLAYWRIGHT_MODULE=/path/to/playwright node tests/browser/phase4a.cjs`、性能はphase4a-performance.cjs。既存全サイズの回帰もtests/browserに維持。外見比較はPhase3D main Buildを用意し、phase3d-compare.cjsへD_PHASE4A=1/D_MAIN_DIST/D_DIRを渡す。既定の旧Phase3Dモードは従来のピクセル一致検査。

作業中間コミットとCHECKPOINTを保持。最終提出では最終source/tree SHAを照合する。初回失敗や中間の未完成表記は履歴でありRESULTSの最終採用分と混同しない。
