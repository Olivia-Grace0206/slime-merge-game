# Phase 2 Polish 独立監査

2026-11-01 JST。起点 main/PR #8 merge `55075e4b752c0084525770047f1e674eb2da23d6`。
GitHub Appで権限/PrivateとGit treeを確認、112 text blobsを取得。旧画像blobはremote base treeに保持し変更しない。ローカルsnapshotの仮祖先は公開しない。
CURRENT/v0.2.7/Phase2 HANDOFF/AUDIT/RESULTS/balance/CHECKPOINTS/README、Core・UI・保存・入力・テストを照合。

| ID | 現行所見 | 修正/検証方針 |
|---|---|---|
| P01 | withdrawはtarget指定、UIは配置選択。expectedIdで重複を防止 | 空セル列挙/一様抽選/出庫を単一Core commandへ。expectedId維持、満杯/空queueで乱数未消費 |
| P02 | 売却Coreは原子的。UIは毎回確認 | 即売却、領域内pointerupのみ、既存pinch/cancel gate維持。保護は右クリック/長押し/keyboard |
| P03 | eventsは16セルから抽選し占有で即発動 | 空セルのみ。空き0ならcooldown再設定。空き金セルへのランダム出庫は許可 |
| P04 | payにsourceId/位置確認なし、移動/消費後も支給 | 変更確定後と支給直前の両方でID+座標確認。離脱はeventを閉じてlastEventに実受取を保持 |
| P05 | 700ms＋250ms pollで実支給は約750ms | 350msの保存済みdeadlineをsetTimeoutで予約＋通常250ms poll。支給は各1回保存、catch-up一括支給なし |
| P06 | goldPayment変更でv2 event単価検証が失敗する | schema3へ明示移行、旧v2は旧式で厳密検証後旧単価を固定継承。破損原本上書き禁止 |
| P07 | バーはCoreの1秒保存pulseの値を直接描画 | 表示専用rAF補間、満杯/非表示/検証モードで停止、frameからdispatchしない |
| P08 | .92分布は高Tier供給が速い | .92/.90/.88を同じ4×4ランダム配置botで比較、数値は仮仕様 |
| P09 | Tier1〜5の金は1Gで同額 | 複数式の低Tier刻み/高Tier比率を比較、仮式と旧契約の互換性を記録 |
| P10 | Web Locks＋保存原文照合＋setItem後publish | 全操作で継続。Quota/別タブ/reload/二重入力を実ブラウザで回帰 |

最終判定と証跡はRESULTS.mdへ追記。未実施をPASSにしない。実Windows/Safari/Androidの操作検証はユーザー試遊へ残す。

## 最終独立監査（Checkpoint E）

P01〜P07/P10：修正完了、317 Vitest＋270 browser assertionsでPASS（実施範囲）。P08/P09：PROVISIONAL、比較と仮採用値をbalance/phase2-polishへ記録。未実装属性の数値/実機評価をPASS扱いしない。

- 実運用Sessionのwithdrawはランダムcommandだけ。座標を受ける低水準primitiveは占有/範囲/ID/状態検査を維持し、通常UIからは使用しない。
- 売却はCoreで個体/財布を同時変更し、SessionStoreの保存成功後にUI更新。保護拒否・二重要求・失敗時原本保持を回帰。確認モーダルの代替として毎回の確認は作らない。
- 金は空セル列挙→一様抽選。対象ID＋現在座標を離脱取引と支給直前に検証。途中終了/完了とも永続sequence/lastEventを残し、同ID再利用/旧要求の再支給を防ぐ。
- schema3移行は旧v2単価を固定し、4/10契約の再評価を避ける。破損単価/台帳を安易に受け入れず旧式で検査する。別タブ/Quota/非表示/再読込も実ブラウザで確認。
- 金deadlineを直接予約し、通常pollは250ms/通常保存は約1秒を維持。表示rAFからdispatch/保存なし。末尾LFまで元GitHub blobと照合して旧Core/依存/旧仕様のバイト列を保全し、最終npm ci/Lint/317件/Buildを再実行。生成されたJS/CSS assetsは同一。
- 10画面は縦横スクロール0・盤面寸法不変・主要領域44px以上。PC/モバイルの代表画像と全10画面を目視確認。native touchとvirtual-clock試験を分け、ブラウザ試験側の入力時刻条件を修正して再実行した。失敗/中断した試行を成功件数に含めない。

実Windows/実Safari/AndroidとOS強制終了耐久性は未確認。新たなBLOCKEDなし。最終remote HEAD/CI/Private/main未マージ確認はPR本文へ固定。
