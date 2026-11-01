# Phase 2 Polish Checkpoints

- A: main `55075e4`とPrivate確認、GitHub App経由で復元。AUDIT.mdに影響範囲と修正計画。
- A remote: `886279f20dcd1a8c95e3e7e560981080d869a374`。
- B: ランダム出庫/金ID+位置停止/schema3移行/49追加安全試験。remote `1a3d0ba75be069f08dd7412f3acb308760ed7224`。
- C: 生成装置/出荷カウンター/長押し/右クリック/keyboard/bar/Tier2・4。remote `b9d18168fcac390337498f95740f2ba022d47322`。
- D: 3分布×5seed、金4式比較、0.90仮採用。remote `139708f3fd49232ed9d06d2e29bfd38e9ec1489c`。
- E: 最終統合検証/金deadline予約/317 Vitest/10画面・native touch・既存回帰/スクリーンショット/保全manifest。
- F: v0.2.8/CURRENT/README/引き継ぎ/新規Draft PR。最終HEAD・CI URLはPR本文へ固定。

ローカルcheckpointは復旧用。remote commitは実mainを祖先にGit Data APIで作り、既存remote SHAをexpected_shaとしてfeatureだけ更新する。旧仕様/画像/証跡はbase treeで保持。main/Pages/Private変更なし。
