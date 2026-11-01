# Phase 2 Polish追加修正 — 独立監査（2026-11-01 JST）

実装終了後にデータの流れを逆方向（保存→取引→Core→入力/描画）で再読し、UI表示だけを信用せず検査した。別エージェントの監査ではなく、Work自身による実装後の独立した確認。開始状態・必要全文の読込はCHECKPOINTS.md。

| 観点 | 判定と根拠 |
|---|---|
| 未発見Tier生成 | PASS：sessionRulesは分布overrideを渡さずH別表。全40行にH超のkeyなし、重み合計10000。draw境界/頻度/不正乱数を試験。withdrawにもTier<=H検査があり、出庫でHを上げない |
| 研究だけで発見 | PASS：research commandはwallet/研究段階だけ更新、gameは同一。生成の基準はresearchMaxTierでなくgame.highestTierReached。購入→生成→reloadを試験 |
| 研究Core上限 | PASS：planDropのreasonにresearch-locked、applyPlanは出力上限をID発行前に確認、reduceSessionは必ず実researchMaxTierを渡す。UIから無制限のplanを渡しても拒否。3/5/8/11/16体で全素材/在庫/GOLD/ID保持 |
| 大量マージの不正消費 | PASS：既存組分け/距離/出力セルを再実装せずguardのみ。拒否時に元state、nextId callback呼出0。解放後に同じ8/11体を成立させ、既存全M01〜36を回帰 |
| 30〜40個別解放 | PASS：capsは5/10/15/20/25/29/30/31…40。全段階期待Lv/費用/重複拒否を試験。25→29の接続理由は仕様へ記録。MAX_TIER40は不変 |
| 研究/GOLD原子性 | PASS：単一Session commandに両状態を含め、元のSessionStoreをバイト保全。locks/queue/期待raw/単一setItem後publish維持。Quotaで元財布/上限/raw、同期二重clickで同研究を一度だけ購入 |
| GOLD初期ロック | PASS：新規false、spawn条件にflag、frequencyにもflag。初回購入で次回予約を設定。新規70秒/ロック中frequency/解放後発生/二重購入/保存を試験 |
| 金の既払い/旧単価 | PASS：v2を旧式検証→rewardVersion1、v3のversion1/2を保持。unit/paid/received/capped/ID/next時刻は保全。4/10後reload/移動/売却/素材/古い支給要求、10回上限/別タブ/保存失敗を回帰 |
| 旧セーブと所有物 | PASS：v1/v2/v3を厳密検査後に無料研究ceil(H)＋金unlocked。H1〜40の全境界と保有33/FIFOを試験。研究費遡及請求/個体削除/貯蔵再抽選なし。破損/未知版/7×7は原本保全で停止 |
| 売却札と受取額 | PASS：描画はbaseSaleValueとwallet上限余地のmin、実売却も同じ式。全16＋drag、保護表示、MAX_SAFE余地0、通常非表示/outside/cancel/pinch/up/rotationを検査 |
| UIの将来Tier漏洩 | PASS：生成アイコンはFIFOに依存しないSVG、次Tier文字/絵を撤去。内部のstoredTiersは保持。外見確認全40は開発用として維持 |
| GOLD表示 | PASS：新規full、保存compact、巨大桁を省略しない。目視で320pxの最大桁がロゴへ重なる点を発見し、小画面最大桁時だけロゴを省く修正＋文字scrollWidth/領域重なり検査を追加 |
| UI入力/盤面 | 最終10サイズ結果はRESULTS.mdを参照。既存カメラ/gestures/盤面layout/SessionStoreは元blob保全。価格札はpointer-events:none、ドラッグspriteは指の上へ価格を配置 |
| 数値/楽しさ | PROVISIONAL：40行表/研究×3/金128/頻度は未承認。36条件runは全T40に到達、研究優先は金なしの通常売却だけ。人の到達時間や楽しさは証明しない |

## 監査で発見し修正した事項

1. `Object.freeze`内の仮倍率3を関数引数の既定値へ使うとTypeScriptがliteral3型に推論し、比較の倍率1/8が型チェックで失敗した。引数を明示numberへ修正。途中Checkpoint CIのBuild失敗を最終成功に混ぜない。
2. 絵文字の金貨がLinux日本語フォントで欠けたため独自SVGへ変更。保護札も文字＋SVGで表示し、外部素材は導入しない。
3. 狭いセルで金貨が独立行になり表情を覆う点を目視で発見。金貨を札の縁へ浮かせ、桁の改行幅を広げて札を頭上へ移した。
4. 小画面最大桁GOLDの領域内bboxだけでは実テキストのはみ出しを検出できなかった。ロゴとの重なり/実文字scrollWidthも検査し、最大桁時のヘッダーを修正。
5. 保存後に反映するcontrolled checkboxへPlaywright.checkの同期完了を要求すると早すぎる。実click→永続形式変更→UI確認へ修正。CDP touchの描画更新も条件待ちで確認し、入力処理の直列化は変更しない。
6. 比較botの不要な売却/再配置を修正し全36本再実行。金優先方針は初回解放前に他設備や研究へ支出しないよう定義。失敗草案をゲームの停滞指標として使わない。

## 保全と実施範囲

元の完全仕様書v0.2.8（v0.2.7以下の全文/改版履歴を含む）、既存検証資料/画像、依存lock/CI/SessionStore/board/camera/gestures/presetsは維持。v0.2.9は旧履歴ブロック原文とM36/A14/E20を全継承し、旧Gaussian6.4を履歴資料として残す。Remoteは実HEADをparentにしbase treeから変更pathのみ差替え、無関係blobを比較して保全。ローカル仮祖先は公開しない。

実Windows/実Safari/iOS/Android/Firefox、実safe-area/OSジェスチャー、OS強制kill後のディスク耐久性と実機FPSは未確認。Linux Chromium134/Playwright1.51.1のmouse/CDP touchと区別する。属性/覚醒/紫青/土地/音/正式図鑑ロックは未着手。価格と分布は試遊待ち。最終HEAD/対応CI/Private/main未マージはPR本文と最終検証に固定する。

補足：研究ボタンへ実フォーカス→ネイティブEnter入力でTier5→10を購入し、96→0 GOLDとH=5保持を確認。374件のrunner集計とは別の補足操作確認。証跡：`keyboard-research.json`。
