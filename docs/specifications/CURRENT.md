# スライムマージゲーム — 最新仕様書への案内

正式正本は `Olivia-Grace0206/slime-merge-game` の **main → 本ファイル → 最新完全仕様書**。

## このブランチの次期完全仕様書

- **[v0.2.8（2026-11-01）](Slime_Merge_Game_Specification_v0.2.8_2026-11-01.md)**：Phase 2 Polish。ランダム空きセル追加・即売却・右クリック/長押し保護・金の空セル出現/途中離脱終了・350ms×10・生成/売却専用UI・バー補間。
- [mainの現行正本 v0.2.7](Slime_Merge_Game_Specification_v0.2.7_2026-10-31.md)：このPRのマージまでは現行正本。旧版は変更しない。
- [v0.2.6](Slime_Merge_Game_Specification_v0.2.6_2026-10-30.md) / [v0.2.5](Slime_Merge_Game_Specification_v0.2.5_2026-10-30.md) / [v0.2.4](Slime_Merge_Game_Specification_v0.2.4_2026-10-30.md) / [v0.2.3](Slime_Merge_Game_Specification_v0.2.3_2026-10-30.md) / [v0.2.2](Slime_Merge_Game_Specification_v0.2.2_2026-10-30.md)

## 状態と運用

2026-11-01 JST。Phase 2 PR #8はmainへマージ済み（`55075e4b752c0084525770047f1e674eb2da23d6`）。今回の作業は同mainから新規 `feature/phase02-polish-gameplay-ui` と新規Draft PRで提案する。PR #8は再利用しない。mainへ直接Push/自動マージ/Public化/Pages公開なし。

改訂時は旧完全仕様書を上書き/削除しない。【合意】【推奨・暫定】【未決定】を区別し、数値・閾値・デザインの仮設定を合意へ格上げしない。後のユーザーの直接指示が旧仕様より優先。Projectの古い添付をGitHub mainの正本より優先しない。

[Polish引き継ぎ](../PHASE2_POLISH_HANDOFF.md) / [監査](../validation/phase2-polish/AUDIT.md) / [検証](../validation/phase2-polish/RESULTS.md) / [バランス](../balance/phase2-polish/RESULTS.md)。旧文書のDraft/未実装は当時の記録として読む。属性/覚醒/紫青/土地/正式図鑑ロック/音は後続段階。
