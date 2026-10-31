# Phase 2 Checkpoints

- A: 独立監査完了。元PR HEAD 43d664f → remote `7172a37d4c7bfc58d197691b1d561d7a44a7c39c`。分類/再現/修正方針はAUDIT.md。
- B: 統合Core・v2 codec・4×4比較シミュレーション。remote `024ec783cf7a893c910b91aad8ea0b852b27c0ae`。既存231＋新安全試験、simulation.json。
- C: 通常4×4、生成・貯蔵・大きい出庫・加速、7×7検証分離、既存カメラ接続。売却/ショップ/保存/金UIも統合済み。56項目のReactブラウザ試験成功。Dで追加の保存競合・legacy primitive対策を固定する。

ローカルsnapshot用commitはリモートの祖先にしない。GitHub接続のGit Data APIで実際の直前remote SHAを親とし、同じ既存Feature Branchだけをexpected SHA付きで更新。main/Private/Pagesは変更しない。

- C remote: `c7b668c68b1377c29329c8d547ffc50e26cacee1`。
- D remote: `b721307498ba153718c11121c4b39f37d6b9b90a`。旧APIのreceipt ledgerを購入後も維持。
- E remote: `fa393a5fed880bf9b68a982f19b0ce3f933e77ea`。統合安全性・金10回・GOLD上限救済・267 Vitest・指定10サイズと既存操作回帰。画面39点、監査/比較/ログ/長時間/保全manifestを保存。
- F: README/CURRENT/PHASE2_HANDOFFを現況へ更新、金セル上のマージ枠を最終確認。最終HEAD/同SHAのCI URLはPR #8本文に固定する。main未マージ・Private維持・Pages未変更。

再開時はGitHub PR #8の最新HEADを取得し、本書の当時のcheckpointと最終HEADを区別する。各checkpointへの巻戻しは破棄ではなくレビュー用参照とする。ローカル未同期変更を消さずgit statusを確認してから作業する。
