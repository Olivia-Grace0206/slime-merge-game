# Phase3B 引き継ぎ — 2026-11-01

## 起点・ブランチ

Phase3A PR #10はmain `13f56c0ca3b45b7f947c1e11682e2b11e22da5cd`へマージ済み。main CI [41287693282](https://github.com/Olivia-Grace0206/slime-merge-game/actions/runs/41287693282)成功確認。最新mainだけを起点に、新規 `feature/phase03b-attribute-effects-generation-modes`。PR #10/Phase3Aブランチへ追加しない。新規Draft PRは未マージで試遊待ち。最終HEAD/CI URL/PR番号はDraft PR本文へ記録する（文書自身のSHA自己参照を避ける）。Private/Pages設定不変。

## 試遊

Node22/npm10、GitHub Desktopで上記ブランチをPull、`npm ci` / `npm run dev`。localhostのWeb Locks/LocalStorageを使う。既存セーブは消さずschema6へ明示移行し、次の保存成功後に反映。未知/破損では原文保持で停止する。

1. 通常はFIFO先頭1体を大きい丸ボタンからランダム空きマスへ。生成は仮15秒、加速は別ボタン。
2. 「通常/属性」切替で属性重視へ。無属性・H−2以下（最低Tier1）の貯蔵だけから低Tier優先/FIFOで10体を選び、最低素材Tierの1体へ。属性付き/高Tier/盤面個体/保護個体は消費しない。安全数<10/盤面満杯は無効。単なる切替は消費なし。
3. 属性重視は仮35%（保証なし）。属性を狙う/余剰整理用で、通常との併用を推奨。専用8h botはT40到達0/6、進行に大きな機会費用がある。
4. 「属性」→個体でLvと実効果量/複合/売値を確認。炎/黄金/闇は売却、氷/雷/自然/幸運/光/磁力は盤面配置、変異はマージ参加で発動。
5. 闇はマージ予告で仮20%/組の消失リスク。5体2出力は共通結果、失うのは闇だけ。個体/Tier/他属性は維持。素材超過3属性は従来の安全swap。
6. 既存の即売却/保護/交換/3・5・大量マージ/研究/金350ms×10/ズーム/パン/ピンチ取消を試す。

## 実装と暫定値

- `core/attributes/effects.ts`: 10属性・Lv逓減p=1+.3log2(L)・上限・3複合・光非再帰・磁力重み・共通売却quote・組ごとの遺伝確率。全係数は仮値。
- `core/progression/focus.ts`: 安全10体の選択/残存FIFO/原子的変換。
- `economy.ts`/`generation.ts`: 15秒、速度.95、クリック+200ms、旧式の独立移行ヘルパー。既存40行Tier重みは無変更。
- `session.ts`: モード/期待IDとモード/自然集約時計/進捗比率/全取引終端の満杯時計停止。自然は普通生成後に空き容量だけ、全体最短40秒。
- `merge/apply.ts`: canonical検査後に組の変異と継承闇消失を1回解決。plan/group/outputを変更しない。
- `persistence.ts`/`save.ts`: schema6、旧1〜5を旧ルールで検証→進捗率移行。金の既払い/単価/所有物は維持。
- `GameBoard`/`GeneratorPanel`/`effectLabels`/CSS: モードと消費数、共通価格、Lv効果/複合、配置支援と自然総数、闇リスク。全面アート改修/依存追加なし。
- SessionStore、planDrop、tierTable、research、属性ID、package/lock/CIは無変更。A/B-C/D/E/Fの復旧コミットとCHECKPOINTSを参照。

## 検証・監査

[RESULTS](validation/phase3b/RESULTS.md) / [AUDIT](validation/phase3b/AUDIT.md) / [CHECKPOINTS](validation/phase3b/CHECKPOINTS.md) / [balance](balance/phase3b/RESULTS.md)。562件（既存498+64）、20,000混在取引/200保存復旧、10サイズのブラウザ回帰、旧1〜5・Quota・競合・闇の再抽選防止を検証。監査で自然+tap最終枠の時計停止漏れを発見・修正し専用回帰を追加した。

ブラウザ再現: ビルド後、別環境のPlaywright1.51.1/Chromium134 headless shellを指定して `PLAYWRIGHT_MODULE=/path/to/playwright BROWSER_ARTIFACT_DIR=/output node tests/browser/phase3b-regression.cjs`。runnerは自分でpreviewを起動。既存7suite+新規Phase3Bを保持。公開/デプロイ不要。リロードfixtureはフォント/初期フィットの安定を待つ。画像はscreenshotsへWebP保存、元PNGはrunnerで再生成可能。

## 正本と後続

main現行v0.3.0、本ブランチは[v0.3.1完全仕様案](specifications/Slime_Merge_Game_Specification_v0.3.1_2026-11-01.md)。旧版全履歴は原文保全。CURRENTのPR #10未マージ時の案内を訂正。数値を実装しただけで合意に昇格しない。

未決定: 正式属性数/Lv上限/成長式、消費選択、付与率/変異率/闇消失率・判定単位、属性係数/複合/経済の最終値。実Windows/実Safari/Android/実機タッチは未確認。監査は同エージェントの別観点・独立不変条件で、第三者レビューと混同しない。

次はユーザー試遊で生成ペース/クリック/属性重視の損失感/属性ビルドを評価し、Draft PRのマージ判断。その後に別依頼でPhase3C（紫/覚醒/非増殖継承/青/光モヤ）。全体アート/音/土地/正式発見図鑑ロックは後続。mainへの直接Push/force/自動マージ/公開/Pages変更をしない。
