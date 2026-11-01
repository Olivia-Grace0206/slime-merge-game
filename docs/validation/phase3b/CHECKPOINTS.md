# Phase 3B 再開記録

## A — 2026-11-01

- 起点 main: `13f56c0ca3b45b7f947c1e11682e2b11e22da5cd`。PR #10マージ済み。main CI [41287693282](https://github.com/Olivia-Grace0206/slime-merge-game/actions/runs/41287693282)成功。新しいPhase3Bブランチを同SHAから作成。
- mainの460blob一覧とローカルの158ソース・検証スクリプトをGit blob SHAで照合、不一致0。旧仕様・画像等の未取得blobはAPIのbase treeで保全して更新する。
- Node22.23.4/npm10.9.9、npm ci成功、既存Vitest498/498成功。ログを同ディレクトリへ保存。
- v0.3.0全文、CURRENT、Phase3A引継ぎ・監査・検証・バランス、README、Core/UI/保存を確認。

## 独立したコード再監査と変更境界

- planDropの同Tier占有ドロップ・8方向・5優先・3・余り・組と出力位置は維持。applyPlanのsnapshot/canonical照合後に組ごとの属性確率解決のみ追加。
- 位置交換は位置だけを更新。属性・ID・保護保持。GOLD台帳は対象IDと位置の両方を照合して離脱時未払い失効。新しい売却補正はGOLDイベント単価へ転用しない。
- 既存属性継承はmaxLv同率2入力で+1、3属性超過は交換。今回も継承式と組分けを変更しない。変異の追加抽選は既存属性を削除しない。闇だけリスク予告後、組単位で抽選する仮案を比較。
- FIFO生成済みTier/属性は再抽選しない。通常出庫は維持。属性重視は無属性かつH-2以下（最低T1）だけを低Tier順・同TierはFIFOで10体選択する仮案。残存FIFOを保持し、出力Tierは消費最小Tierで格上げしない。
- 監査で判明した移行上の注意: 旧progressMsは旧10秒/.9式で検証する必要がある。新15秒/.95式へ進捗率で移し、盤面支援変化時にも同じ再基準化を使う。
- 自然は盤面配置中だけの集約タイマー、全体供給上限・貯蔵上限を設ける。光は生の光Lvから隣接8方向へ一段のみ。磁力は空き候補の重みだけ。
- 保存schema6候補: generationMode、focusedGenerated、自然progress/updatedAt/total。旧schema1〜5を旧規則で検証し、所有物・属性・GOLD・研究・保護・金イベントの既払い/単価を保持する。
- SessionStoreのWeb Locks・単一queue・原文CAS・保存成功後公開は変更しない。新しい処理はreduceSessionの同じ原子的経路を使用。

## 未決定と仮値

全確率・効果係数・上限・消費選択閾値・生成間隔は技術試作値。ユーザー承認済みの数値に昇格させない。詳細はbalance/phase3bに比較を保存する。Phase3Cの紫/青/覚醒と全体アート改修は対象外。
