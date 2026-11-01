# Phase 2 Polish追加修正 — 最新引き継ぎ（2026-11-01 JST）

既存[Draft PR #9](https://github.com/Olivia-Grace0206/slime-merge-game/pull/9)／`feature/phase02-polish-gameplay-ui`を継続。起点2e8e878、Checkpoint B〜Dを5e543aadへ保存。main55075e4は変更しない。**Draft未マージ・Private維持・Pages操作なし**。最終HEADと同SHAのCIはPR本文を参照。

現行の次期完全仕様書は[**v0.2.9**](specifications/Slime_Merge_Game_Specification_v0.2.9_2026-11-01.md)。v0.2.8は原文保持。mainの正式正本はマージまでv0.2.7。旧文書のGaussian/schema3/金無料は当時の記録。

## 今回の実装

- `tierTable.ts`40行basis-point重み。H1=100%、H2=99/1は確定、H3以降は仮。通常sessionRulesにGaussianなし。比較用profileだけを旧テストへ残す。未発見Tierは0、withdrawToCellもTier>Hを拒否しHを更新しない。初発見はapplyPlanのマージだけ。
- `research.ts`に初期5→10→15→20→25→29→30…40と仮価格。25→29は30から個別購入する接続案。研究はHを増やさず、plan/apply/sessionで出力上限を検査。大量マージでも全拒否/無消費。研究費は現上限売値×3、初回96。旧進行を遡及ロックしない。
- GOLDマスは新規ロック、仮128で解放。旧版は頻度強化未実装だった。今回Lv0〜5、費用128×2^Lv、次回予約から5%ずつ短縮、最大45〜90秒で常時保証なし。旧350ms×10/空セル抽選/ID位置照合/離脱失効を維持。
- 全個体価格札は単指/マウスの売却ゾーン内ドラッグ中のみ。画面座標レイヤーでセル追従、ドラッグ中も指より上。丸い金色札・SVG金貨・保護中・実受取上限を表示。up/cancel/pinch/outside/rotation/blurで消す。
- 生成先頭Tierの見た目/文言を削除。独自3匹SVG＋収納箱＋大きい貯蔵数。GOLD袋SVG＋大きいfull桁、設定compact保存。内部FIFOは維持。

## schema4移行と原子的保存

キー`slime-merge-normal-v2`維持。v1/v2/v3を旧契約で厳密検証して研究境界ceil(H)と金解放trueを無料継承。H6→10、H26→29、H29→29、H30→30、H33→33、H40→40。個体/FIFO/財布/ID/保護/生成途中/イベント単価/既払い/capped/lastEvent/次回予約は変更しない。v2だけrewardVersion1を補完、v3は1/2の元契約を保つ。v1検証7×7は原本保全で停止。新規のみ研究5/金locked/full表示。

SessionStoreは元blobのまま。Web Locks・queue・期待raw照合・単一setItem成功後publish。研究/金解放/頻度/形式も同じcommand経路。期待Lv/解放済みflagで連打拒否。保存失敗では財布と上限の両方が元のまま。

## 検証と試遊

[追加検証](validation/phase2-polish-followup/RESULTS.md) / [独立監査](validation/phase2-polish-followup/AUDIT.md) / [比較](balance/phase2-polish-followup/RESULTS.md) / [Checkpoint](validation/phase2-polish-followup/CHECKPOINTS.md)。既存317件を削除せず回帰し、旧契約試験だけresearch40/gold unlockedの明示fixtureへ変更。旧270 browserを維持し、新規UI/研究/価格/保存試験を追加。詳細件数・hash・画面はRESULTSへ。

比較の全数値は未承認。Windows/実Safari/iOS/Androidで、H3〜5の進行/研究を買うための売却/初回GOLD解放/小画面価格札を試遊し、数値採否→PR #9マージをユーザーが判断。実機試遊・OS強制kill耐久性をLinux Chromium/CDP touchで代替済みとは扱わない。属性/覚醒/紫青/土地/音/全Tier再制作/正式図鑑ロックは未着手。

---

# 以下は前回Polishの引き継ぎ原文（履歴）

# Phase 2 Polish 引き継ぎ

2026-11-01 JST。起点：main/PR #8 merge `55075e4b752c0084525770047f1e674eb2da23d6`。
ブランチ：`feature/phase02-polish-gameplay-ui`。新しいDraft PRを未マージで納品。Private/Pages設定は変更しない。最終HEAD/同SHAのActions URLはPR本文へ記録し、文書の自己参照SHAを避ける。

## 確定ルールと今回の変更

- 4×4通常プレイ・8方向・重ねドロップのみ・5優先/3/余り・Tier40・カメラ/検証モードを維持。
- 追加1回→FIFO先頭1体→解放済み空セルを一様抽選。選択モード廃止。金セルも候補。空き0/在庫0/古いexpectedIdは完全拒否し、出庫/配置を一括保存。
- 売却エリア内へ単指/マウスで確実にドロップ→即売却。モーダル廃止。価格/保護可否をドラッグ中に表示。取消/ピンチ/エリア外では売却なし。
- 右クリック/長押しで保護。長押し500ms・移動許容8pxは仮値。第二接触（盤面外UIも含む）/移動/取消/非表示/blurで保護発動取消。発動後は全指を離すまでdropをブロック。native contextmenuによる二重切替も抑止。
- Pで保護、Iで詳細、Enter/Spaceで素材選択、売却エリアへTab→Enterで即売却。通常タップはモーダルなし。保護はマージ素材として利用可。
- 金は空セルのみ、空き0は安全に通常cooldownへ。対象ID＋座標を操作確定後/各支給直前に確認。移動/売却/消費ならlastEventへ実受取額/既払い数を残して閉じ、未払い失効。同Tier別IDも引継ぎ不可。
- 金は350ms×10。保存済みdeadlineへのタイマー＋通常250msポーリング。各支給は独立保存。非表示で支給/描画停止、復帰時は最大1回から再開。取引の直列化で支給先行ならその1回保持、離脱先行なら支給なし。
- PC右上の丸い生成装置、右下の出荷風カウンター、左メニュー拡大/ロゴSVG整列、Tier4を紫の縦長輪郭/丸口にしてTier2青と区別。
- 生成バーはGeneratorPanel内の表示用rAF。frameからdispatch/storageしない。生成・在庫の正本はSession。満杯/保存エラー/非表示で描画停止、加速/強化/復帰/リロードに再同期。

## 仮値

生成μ=1+0.90(H−1)、σ=min(1.8,max(1,0.10H))。金単価=max(1,floor(max(Tier,.05×2^Tier)/(1+.25×属性数)))。Tier1〜5が1/2/3/4/5 GOLD/回、高Tier率は旧式と同じ。生成10秒/容量10/加速1秒/ショップ/頻度は維持。[比較結果](balance/phase2-polish/RESULTS.md)。数値・長押し閾値・デザインを正式合意へ格上げしない。350ms×10はユーザー指定の初期実装値。

## 保存互換性

schema3、保存キーは旧 `slime-merge-normal-v2` を維持。v2は旧式/台帳/IDを厳密検証後、rewardVersion1として単価固定で移行。新規イベントはversion2の報酬式を持つ。既払いの増額/遡及支給なし。待機中旧イベントも旧式を維持。既に対象不在の旧イベントは次取引で閉じる。v1妥当4×4移行を維持。破損/未知版/7×7は原本保全で停止。

Web Locks＋SessionStore queue＋期待保存原文＋単一setItem成功後publishを維持。別タブ/Quota/getter拒否は停止・再読み込み/再試行。ユーザー確認なくセーブ削除しない。GOLD上限で超過分をcappedGOLDへ記録し、0GOLD売却による整理は可能。

## 検証と証跡

[RESULTS](validation/phase2-polish/RESULTS.md) / [AUDIT](validation/phase2-polish/AUDIT.md) / [CHECKPOINTS](validation/phase2-polish/CHECKPOINTS.md)。最新ソース/テストのhash manifestと対応するremote HEADを照合して再開する。旧267テストからの全回帰＋追加49安全試験＋1比較。ブラウザは最新Polish契約のPhase2、native touch補足、旧マージ、旧viewport/inputの4runner。

依存/lock/CI、merge/board/domain/camera/gestures、旧完全仕様書は保全。旧Phase2証跡は上書きせず、テスト生成出力を今回のディレクトリへ移した。通常clone認証は利用できないためGitHub Appでblob取得/実remote parentを持つGit Data API commit/expected SHA ref更新。ローカルsnapshotの仮祖先は公開しない。

## 残る確認と次の作業

実Windows Chrome/Edge、iPhone/iPad Safari/Androidで今回Polishの操作感、片手追加/長押し閾値/価格視認性を試遊する。今回のLinux Chromium+CDP touchを実Safari成功と扱わない。OS強制kill後のディスク書込保証なし。

0.90分布はbotで旧0.92よりTier40中央値が約22%遅い。金を積極利用するbotでは金が収入約21%。人の到達時間/楽しさの保証はない。高Tierショップ上限後のGOLD用途、低額属性差の整数丸め、正式デザインは後続検討。

Draft PRをレビューしてユーザーがマージ判断。その後、属性Lv/上限/覚醒分配/闇判定単位などの未決定を合意してPhase3へ。全Tierアート/効果音/音量/素材は後続。今回Public化/Pages公開/main直接Pushを行わない。
