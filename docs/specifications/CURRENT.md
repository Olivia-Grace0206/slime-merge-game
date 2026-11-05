# 2026-11-05 現行仕様案内 — Phase4A

[Draft PR #17](https://github.com/Olivia-Grace0206/slime-merge-game/pull/17) — ユーザー試遊・承認待ち、main未マージ。

Phase4Aブランチの正本は[完全仕様書v0.4.0](Slime_Merge_Game_Specification_v0.4.0_2026-11-05.md)。最大4区画64セル、4倍売値、BigInt/schema8を反映。具体的土地価格512/8,192/131,072Gは推奨・暫定。最新節を旧履歴に優先する。

起点main `582b99c1920b4a27a7313dfa22a3926c734e1296`、PR16はマージ済み。main/公開β版の仕様はv0.3.3＋Phase3C Polish＋Phase3D追補。Phase4AはDraft PRでユーザー試遊待ち、承認前にmain/公開Pagesを更新しない。[引き継ぎ](../PHASE4A_HANDOFF.md) / [検証](../validation/phase4a/RESULTS.md) / [価格比較](../validation/phase4a/economy/RESULTS.md)。

---
以下は以前の案内（当時の記録）。現在のPR状態ではない。

# 2026-11-04 現行正本・Phase3D案内

main現行正本は[v0.3.3](Slime_Merge_Game_Specification_v0.3.3_2026-11-02.md)＋[Phase3C Polish追補](Phase3C_Polish_Addendum_2026-11-03.md)。PR13/15はmainへマージ済み。確認HEAD1291226a67a25df254301d1f3e41e0cc46efdc1b、CI/Pages成功。RepositoryはPublic、公開β版はmainを維持。

[Draft PR16](https://github.com/Olivia-Grace0206/slime-merge-game/pull/16)の外見変更は[Phase3D追補](Phase3D_Visual_Addendum_2026-11-04.md)。10属性の通常/覚醒/3複合外見を追加し、Lvは装飾に使わない。ゲーム正本の数値/schema7/特殊マス頻度は不変。未マージ中は公開版へ反映しない。[引き継ぎ](../PHASE3D_HANDOFF.md) / [検証・画像](../validation/phase3d/RESULTS.md)。

---
以下は以前の案内（履歴・現在のPR状態ではない）。

# 最新仕様書への案内

**main現行正本は [v0.3.3](Slime_Merge_Game_Specification_v0.3.3_2026-11-02.md)**。Phase3C PR #13はマージ済み、2026-11-03確認main HEADは `ef7927a35ff5903b5d99b79360d34c52aba302a6`。RepositoryはPublic、[GitHub Pages β版](https://olivia-grace0206.github.io/slime-merge-game/)はmainから公開済み。

[Draft PR #15](https://github.com/Olivia-Grace0206/slime-merge-game/pull/15) のUI限定変更は [Phase3C Polish追補](Phase3C_Polish_Addendum_2026-11-03.md) を参照。覚醒オーラ・青バフ表示・属性紹介を改善し、ゲームルール/schema7/頻度/倍率は変更しない。未マージのため、公開β版への反映はユーザー承認後。[引き継ぎ](../PHASE3C_VISUAL_POLISH_HANDOFF.md) / [検証](../validation/phase3c-polish/RESULTS.md)。

## 以前の案内（履歴・現在の状態ではない）

main現行正本はv0.3.2、PR #12は2026-11-02 JSTにmain836430980f179c7acc15818d9e350c45a33cc390へマージ済み。このPhase3Cブランチの次期正本はv0.3.3、Draft PR #13は試遊後のユーザー承認待ち、main未マージ。Private/Pages設定維持、と案内していた。現在は上記のmain/公開状態を優先する。

旧版/全履歴を保全。過去の未マージ/未実装/復旧中の記録と現行状態を混同しない。集中継承/余剰警告は合意、時間/倍率/確率などは仮値。[Phase3C引き継ぎ](../PHASE3C_HANDOFF.md) / [検証](../validation/phase3c/RESULTS.md) / [比較](../balance/phase3c/RESULTS.md)。
