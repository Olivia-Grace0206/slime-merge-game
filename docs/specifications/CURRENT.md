# スライムマージゲーム — 最新仕様書への案内

**仕様書の正本は、`Olivia-Grace0206/slime-merge-game` の `main` にある最新版の完全仕様書（Markdown）です。**

## 現行の最新版

- **[完全仕様書 v0.2.5（2026-10-30）](./Slime_Merge_Game_Specification_v0.2.5_2026-10-30.md)** — Tier40・金色マスイベントとGOLD強化の方向性・一画面UIとズーム
- [直前の完全仕様書 v0.2.4（2026-10-30）](./Slime_Merge_Game_Specification_v0.2.4_2026-10-30.md) — 旧上限Tier30、最高到達履歴と正規分布型生成Tier
- [直前の完全仕様書 v0.2.3（2026-10-30）](./Slime_Merge_Game_Specification_v0.2.3_2026-10-30.md) — 長期Tier 30〜40構想、進行度依存生成、GitHub正本化
- [旧版の完全仕様書 v0.2.2（2026-10-30）](./Slime_Merge_Game_Specification_v0.2.2_2026-10-30.md) — Phase 1のマージ規則確定

この案内ファイル（`docs/specifications/CURRENT.md`）は、次回以降のWork・ChatGPTから**固定パスで最新版へたどるため**に使用します。実際の詳細ルールはリンク先の完全仕様書に記載します。

## 正本運用ルール

1. 仕様変更ごとに **v0.2.5 → 次版** のように版を増やし、旧版の完全仕様書を削除・上書きしない。
2. **【合意】／【推奨・暫定】／【未決定】**を区別し、変更履歴と影響するテストを記録する。
3. 仕様書は専用Feature BranchとPull Requestで更新し、ユーザー確認後に`main`へマージする。未マージのPR上の文書は次期案であり、`main`の現行正本を上書きしない。
4. 次回Workは**GitHub `main` → この`CURRENT.md` → リンク先の最新版**の順に全文を読み、Projectに置かれた古い資料より優先する。GitHubを参照できない場合、推測で正本を再構成しない。
5. 開発中はPrivate、ユーザーが最後にPublicへ変更する。仕様書の改訂だけでゲーム実装や一般公開は行わない。

**状態（2026-10-30）：** Phase 0 PR #1、仕様書PR #2/#3はmainへマージ済み。Phase 1 PR #4はDraft・未マージで、実装時点のMAX_TIERは30。本v0.2.5への案内はdocs PRがmainへマージされると正式になる。マージ前のmainではv0.2.4が現行正本。Tier40と金色マスは現段階ではゲームコード未反映。
