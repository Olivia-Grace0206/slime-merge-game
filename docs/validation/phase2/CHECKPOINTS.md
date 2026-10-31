# Phase 2 Checkpoints

- A: 独立監査完了。元PR HEAD 43d664f → remote `7172a37d4c7bfc58d197691b1d561d7a44a7c39c`。分類/再現/修正方針はAUDIT.md。
- B: 統合Core・v2 codec・4×4比較シミュレーション。remote `024ec783cf7a893c910b91aad8ea0b852b27c0ae`。既存231＋新安全試験、simulation.json。
- C: 通常4×4、生成・貯蔵・大きい出庫・加速、7×7検証分離、既存カメラ接続。売却/ショップ/保存/金UIも統合済み。56項目のReactブラウザ試験成功。Dで追加の保存競合・legacy primitive対策を固定する。

ローカルsnapshot用commitはリモートの祖先にしない。GitHub接続のGit Data APIで実際の直前remote SHAを親とし、同じ既存Feature Branchだけをexpected SHA付きで更新。main/Private/Pagesは変更しない。
