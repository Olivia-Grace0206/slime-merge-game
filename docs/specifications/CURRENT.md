# 現行正本とPhase3Cの復旧状態（2026-11-02 JST）

main現行正本は[v0.3.2](Slime_Merge_Game_Specification_v0.3.2_2026-11-01.md)。PR #12はmain `836430980f179c7acc15818d9e350c45a33cc390`へマージ済み。

Phase3C専用ブランチは復旧中・未完成。集中型覚醒継承Coreのみ復旧し、紫/青/警告UI/schema7と再検証が残る。[復旧用引き継ぎ](../PHASE3C_HANDOFF.md)を参照。v0.3.3は統合後に全文改訂する。旧版/履歴は保全する。

---

以下はPhase3B.1時点の案内原文（当時のPR #12未マージ記述は現状により更新）。

# スライムマージゲーム — 最新仕様書への案内

正式正本はGitHub **main → CURRENT.md → 最新完全仕様書**。

- main現行正本は **[v0.3.1](Slime_Merge_Game_Specification_v0.3.1_2026-11-01.md)**。Phase3B [PR #11](https://github.com/Olivia-Grace0206/slime-merge-game/pull/11)は2026-11-01にmain `e3096b8c23caad7e17067700f6e9e9c74dc255c0`へマージ済み。main CI [41302209242](https://github.com/Olivia-Grace0206/slime-merge-game/actions/runs/41302209242)成功・HEAD一致を確認。
- このPhase3B.1ブランチの次期正本は **[v0.3.2](Slime_Merge_Game_Specification_v0.3.2_2026-11-01.md)**。FIFO先頭10体・無料属性解除・貯蔵最大160体（仮）・10SVGアイコン・属性効果一覧。新規Draft PRがmainへマージされた後はこちらを現行正本とする。
- 全旧版/改版履歴を原文保全。v0.3.1の「PR #11 Draft」/安全素材や過去の未マージ・未実装表現は当時の履歴。現在の状態は本案内とv0.3.2先頭の改訂節を優先。

新規 `feature/phase03b1-attribute-management-polish`。main未マージ、Private/Pages設定維持。FIFO10体/無料一括解除/属性UIは合意、容量・価格などの具体値は仮仕様。schema6維持。

[Phase3B.1引き継ぎ](../PHASE3B1_HANDOFF.md) / [検証](../validation/phase3b1/RESULTS.md) / [監査](../validation/phase3b1/AUDIT.md) / [容量・価格・性能比較](../balance/phase3b1/RESULTS.md)。Phase3C紫青/覚醒、全体アート/音は未実装。
