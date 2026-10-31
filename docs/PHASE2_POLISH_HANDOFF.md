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
