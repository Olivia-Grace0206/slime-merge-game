> **履歴資料（2026-11-01追記）**：PR #8はmain `55075e4`へマージ済み。最新の操作・保存schema・イベントルールは[Phase 2 Polish引き継ぎ](PHASE2_POLISH_HANDOFF.md)を参照。以下の「未マージ」「離脱後継続」「配置選択」「全売却確認」は当時の記録。

# Phase 2 引き継ぎ

2026-10-31 JST。**実装・自動検証完了、ユーザー実機試遊待ち**。既存[Draft PR #8](https://github.com/Olivia-Grace0206/slime-merge-game/pull/8)を更新し、mainへはマージしない。Private・Pages設定を維持する。

## 起点と正本

- main `9315898cd3ee24031f9e550a274f9dc6a234efe4`、PR #8監査開始HEAD `43d664ffa18bd4c6fa736a67933d6b0fdc2bb68a`。
- 同じブランチ `feature/phase02-generation-core-simulation` を継続。履歴の破棄・force push・重複PRなし。
- main CURRENT → 完全仕様書v0.2.7全文（1385行）→ 指定3引き継ぎ・README・既存コード/テスト/CIを確認。Projectの古い添付を現行正本扱いしない。
- v0.2.7/旧版仕様書、既存merge/board/domain、camera/gestures/presets、package/lock/CIはGit blob SHAで保全を確認。[保全証跡](validation/phase2/source-preservation.json)。CURRENTの古い状態案内とREADMEだけ現況に合わせた。
- 最終HEADと同SHAのCI URLはPR本文へ記録（文書自身のSHAを書く自己参照を避ける）。[Checkpoint](validation/phase2/CHECKPOINTS.md)。ローカルsnapshotの仮祖先は公開せず、remoteの元HEADを親としたGit Data API commitで反映する。

## 実装したゲームループ

初期4×4・空盤面 → 実時間生成 → 容量付き貯蔵 → 大きい追加ボタン → 空きセル選択 → 既存Coreの3/5体マージ → ドラッグ売却確認 → GOLDショップ → 自動保存/再開。金マスはランダム出現し、対象を固定して10回の報酬を個別に保存する。7×7プリセット/全40Tier外見は別検証モードに維持。

| パス | 責務 |
|---|---|
| core/progression/generation.ts | H履歴基準のGaussian、経過時間、貯蔵・出庫、counter overflow防止 |
| core/progression/economy.ts | safe integer価格・財布・shop・原子的売却。旧APIにもreceipt ledger追加 |
| core/progression/session.ts | 盤面/財布/生成/イベント/保護の単一取引、ID・期待Lv/出庫ID/支給番号、時刻/乱数注入 |
| core/progression/persistence.ts | v2厳密検証、v1明示移行、保存原文照合・単一setItem |
| app/sessionStore.ts | Web Locksでorigin-wide直列化、保存成功後に公開、別タブ/破損/Quotaで停止 |
| components/GameBoard.tsx / GameMenu.tsx | 既存Pointer操作とcameraを保った通常/検証分離、追加・加速・売却・ショップ・個体詳細 |
| styles/global.css | 端rail/スマホ下部、大きい追加、金の各receipt演出、モーション軽減 |

金の既払い回数/受領額は財布と同じセーブへ保存。支給要求にイベントオブジェクトを持たせず、現在ID・期待支給番号を照合。古い要求・終了後・同ID再開始を拒否。次イベントは永続単調sequenceから採番する。完了後はlastEventとeventSequenceを残す。

売却は全件確認。保護は個体タップ詳細から切替、売却のみ防ぐ（マージ対象を勝手に変えない）。GOLD上限でも実受取額と警告を確認した整理ができる。金の上限超過分も別記録し、報酬のpending状態でゲームを止めない。

## 合意と仮仕様

【合意】初期4×4、重ねドロップのみ、8方向、5優先・3・余り、Tier40、H非減少、大きい出庫と加速の分離、売却/GOLD強化/保存、金10回・個体非消費、検証モード保全。

【仮仕様】10秒、容量10、クリック1秒、μ=1+0.92(H−1)、σ=min(1.8,max(1,0.1H))、候補1〜H。売却2^Tier、価格1.7倍、shop最大Lv16、金基本価格×0.05（属性数減額/整数丸め/最低1）を最低700ms間隔×10、cooldown60〜120秒、待機45秒。

金は一度発動した契約を移動/売却/素材化後も継続し、個体の再配置でリセットしない。非表示では停止、復帰直後は最大1回だけ払い以後再開。占有セルにも出現可能。全個体無属性。全売却確認・売却保護・FIFO出庫・GOLD上限で超過分を受け取らないUXも仮方式。[全設定・比較・理由](balance/phase2/RESULTS.md)。低Tierでの報酬同額丸めは未調整項目。通常加速は間隔より強い場合に1タップで複数生成できるが、容量を超えて個体を作らない。

## 独立監査と試験

[監査報告](validation/phase2/AUDIT.md)にPASS/FIX/PROVISIONAL/BLOCKEDを分類。生成counter/時計巻戻り/継承shop key/イベント二重支給/保存不足/ID/検証分離/権限拒否/所持上限での詰みを修正。価格・生成・イベント値はPROVISIONALを維持する。

- Node22.23.4 / npm10.9.9。
- npm ci、Lint警告0、型チェック/Build成功。
- Vitest **267/267、10ファイル、失敗0・skip0**。既存231を全回帰、35安全試験＋1比較シミュレーションを追加。
- Chromium134 / Playwright1.51.1: Phase2 **60**、既存merge **54**、既存viewport/input **120**、合計**234**項目成功。実React本番Buildのマウス/CDP touch/タップで確認。
- 指定10画面で縦横ページスクロールなし、盤面全面表示、主要操作44px以上。PC/モバイルの計測と画像は[検証結果](validation/phase2/RESULTS.md)。
- 新UI: 実時間生成・加速・出庫取消/占有安全・5マージ・売却取消/保護/確定・3ショップ・金10回/途中reload/配置変更/非表示模擬/再開・満杯救済・検証分離・破損原本保全・2タブ・Quota・getter拒否・タブ閉開・GOLD上限。
- Coreは3/5マージ、FPS分割・不正乱数・offline/rollback・ID・二重売却/購入/支給・v1/未知版・高Tier数値安全を確認。仮想240時間で2400生成/売却、240回保存/復旧、重複ID/破損0。[長時間結果](validation/phase2/long-simulation.json)。
- バランス17条件×3seed、opening2policy×3seed、計57本、各最大12時間の仮想プレイ。[データ](balance/phase2/simulation.json)。3体優先の初回22秒、5体優先の初回42秒、初購入中央値72秒はこのbotでの値。

## 実行上の制約・未確認

保存にはHTTPS/localhost、LocalStorage、Web Locksが必要。LAN HTTPは安全な保存を行えないため進行停止。別タブ更新時は古いタブで上書きせず再読み込みを案内する。保存不可時にメモリ上だけ進行させて成功と表示しない。破損セーブの無断削除/上書き、新規開始は行わない。

実Windows Chrome/Edge、実iPhone/iPad Safari、Android、WebKit/Firefox、実safe-area/ブラウザバー/OSジェスチャー、実機長時間FPS、OS/ブラウザプロセスの強制kill後のディスク反映は未確認。模擬visibilityとタブの閉開は、実OS強制終了と区別する。ブラウザストレージのOS書込保証や別端末同期は提供しない。

高Tierではショップが上限へ達して以降のGOLD用途が薄い。容量大はFIFOの古いTierが長く残り、botでは進化が遅くなる場合がある。生成停止割合は操作供給ボトルネックを示し、人の必要クリック数・楽しさを保証しない。金・価格・分布は実機試遊で再調整する。将来の式/スキーマ変更時はversionと既存event単価の移行を必ず設計する。

## 次の作業

1. Desktopから同ブランチを取得し、Windowsで通常ループ/保存を試遊。実スマホはHTTPSで操作感・誤売却確認・片手追加・ピンチを確認。
2. 仮バランスの採否を判断。価格/容量/供給過多/金の比率を記録する。
3. Draft PR #8の差分/CI/画面をレビューしてマージ判断。今回は未マージで止める。
4. Phase3: 属性Lv/保持上限/通常属性コピー/覚醒非増殖/闇判定を合意してから実装。Phase4: 4×4区画購入、コンパクトな土地/エリア、正式発見図鑑。

