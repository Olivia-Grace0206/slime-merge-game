# Phase 1 引き継ぎ — React版マージゲーム

作業日：**2026-10-30（日本時間）**。Phase 1実装は完了、ユーザー実機確認待ち。mainへのマージはユーザー判断。

## リポジトリと照合先

- Repository: https://github.com/Olivia-Grace0206/slime-merge-game
- 開始main: **`470dab1326761acc2162993cfcd694a1146f2d6d`**。開始時はPR #1/#2/#3がマージ済み。指定されたSHAと一致。
- 最終Feature Branch: **`feature/phase01-merge-core-ui`**
- Draft PR: **[#4](https://github.com/Olivia-Grace0206/slime-merge-game/pull/4)**（base main、未マージ）
- Core実装checkpoint: `bcb6d9bfb35f9ce6e9c8d915db055687ab21d0ee`
- 最終コード・テスト変更HEAD: **`ebb781e43ee8a3549c9fe2fd02e03ed281359bf8`**。以降は本書・検証対応表・証跡だけのコミット。
- **資料自身のコミットSHAを本書へ書くと自己参照になるため、全資料込みの最終HEADと同SHAの最終CI URLはPR #4本文に記録する。** ローカルでは `git rev-parse HEAD` と照合する。コードHEADを全資料込みの最終HEADと取り違えない。
- Private維持。mainの直接コミット・マージ・Public変更・Pages公開は行っていない。既存CI workflow以外の公開処理は追加していない。

通常のgit cloneにはこの環境の認証が渡らなかったため、GitHub接続から開始mainの全ファイルを取得して実装・ローカル検証した。反映にはGitHub Git Data APIを使い、開始mainを親とするCore→UI→資料のコミットを作り、expected SHA付きで開発ブランチだけを更新した。ローカル作業用snapshotの仮コミットをGitHubの履歴に混ぜていない。Desktopでは通常のリモートブランチとしてFetch/Pullできる。

## 正本の読み込みと保全

GitHub mainの `docs/specifications/CURRENT.md` → 完全仕様書 **v0.2.4全文（1008行）** → `docs/PHASE0_HANDOFF.md` の順に確認。添付の古いv0.2.2を正本扱いしていない。
Phase 0引き継ぎの「Draft/未マージ」「Phase1未着手」は作成時点の記録として保全し、開始mainのPR #1/#2/#3マージ済みを優先した。仕様書自体は一切変更していない。
`array-puzzle` はpackage/構成の読み取りのみ。ゲーム固有コードのコピー・同Repoへの変更なし。

## Core Logicの構成

| ファイル | 責務 |
|---|---|
| `src/domain/game.ts` | `MAX_TIER`、readonlyのSlime/GameState/DropPlan/MergeGroup。属性など未決定フィールドを前倒ししない |
| `src/domain/grid.ts` / `src/core/grid/coordinates.ts` | 既存の座標型・関数を無変更で再利用 |
| `src/core/board/state.ts` | ID一意・セル一意・Tier範囲・境界・最高Tier履歴・revisionの不変条件、値snapshot |
| `src/core/merge/plan.ts` | 入力検証→元個体除外BFS→5組優先→3組→余り→組内出力座標を純粋計算 |
| `src/core/merge/apply.ts` | 表示した同一計画を適用。盤面snapshot一致、消費/出力検証、一意ID注入、最終状態検証、失敗時は元のstate参照を返す |
| `src/core/input/coordinates.ts` | 画面→セル変換、パン計算。DOM/Reactに依存しない |
| `src/components/GameBoard.tsx` | UI側の単一ゲーム状態と即時参照、Pointer Eventsの1ジェスチャー制御、組別枠・出力↑・余り点線、keyboard |
| `src/components/Slime.tsx` / `src/styles/global.css` | CSS製スライム・顔、Tier色/番号/柄/発光、短い進化演出と動作軽減 |
| `src/app/presets.ts` | 3/5/8/11・斜め・高Tierの開発検証用配置 |

UIは盤面の計画を描画する。プレビューと確定で別の対象選択アルゴリズムを作っていない。同じセルのpointerupでは保持した計画を確定する。pointerupが別セルに到達した場合のみその入力先の計画を作る。古い盤面snapshotの計画は再適用不可。

出力ID源は適用時に注入可能。UIではセッション内の単調増加IDを使う。既存ID（消費済み入力も含む）・同一操作の新ID重複・空ID・ID源例外なら全体を中止する。ID源自身の呼出回数はロールバックしないが、ゲーム状態は部分更新しない。

## 確定仕様と暫定実装

【合意】同Tier占有セルへの重ねドロップ時だけ判定、元個体を除外した8方向の推移的探索、5体優先→3体→余り保持、第1組にドラッグ/ドロップ先の別ID、近い順、各組独立の連結条件なし、最初はドロップ先・後続は同じ組の消費セル、組別色枠/番号、Tier1緑2青3赤、MAX_TIER=30、29→30、履歴最高Tierの非減少。

【暫定・実装済み】

- 7×7盤面（座標原点0,0）。Coreは符号付き原点・任意の有効な矩形境界を扱える。
- チェビシェフ距離、同距離はy昇順→x昇順。
- 異Tier・不足2体・Tier30の重ねドロップは無消費取消。
- 4px未満はタップ扱い。空セルからパン、パンはviewport幅の±30%まで、視点リセットあり。ピンチ/ズームなし。
- 第1組オレンジ、第2組水色、第3組紫。第4組以降も配色と組番号で識別。色のみへ依存しない。
- Tier4以降の色/柄/光は仮デザイン。各Tierは番号と別の配色を持つ。全30体の完成イラストではない。
- リセット・配置切替は新しい検証セッション。highestTierReachedは通常配置=1、高Tier試験=30（29と30を同時配置するため）。通常操作中は低下しない。

これらの技術具体値をゲームデザイン上の新しい合意へ格上げしていない。

## 検証結果

| 区分 | 実行と結果 |
|---|---|
| ランタイム | Node **22.23.4**、npm **10.9.9**を確認して使用 |
| 再現インストール | `npm ci` 成功。依存追加/メジャー更新なし、package.json/package-lock無変更 |
| Lint | `npm run lint` 成功、警告0。ブラウザrunnerにもLintを適用 |
| Vitest | `npm test -- --run` **181成功 / 失敗0 / skip0、5ファイル**。既存29＋追加152 |
| 追加の盤面照合 | 上記181件に含まれる1件で固定seedの250混在Tier盤面を独立oracleと比較 |
| 型・本番Build | `npm run build` 成功（tsc -b→Vite） |
| 本番成果物 | CSS 9.95kB、JS 236.43kB（gzip74.98kB）。エンジン・画像生成・外部フォント読込なし |
| ブラウザ | Playwright **54成功 / 失敗0**、JS例外・console error・request failure全て0 |
| GitHub Actions | 既存CIの最終PR HEADに対する結果・run URLをPR本文へ記録。最後にPR head SHAとrun head SHAを照合 |
| ユーザー実機 | **Windows PC・実スマートフォン・Safariすべて確認待ち** |
| 公開 | Pagesなし。公開URL検証は実施していない |

詳細： [M01〜M35対応表](validation/phase1-test-matrix.md)、[ブラウザ検証](validation/phase1-browser-results.md)、[機械可読結果](validation/phase1-browser-results.json)。

マージ数は3〜49体の47ケース、重点の4/6/7/8/9/10/11/13体を明示確認。元セル橋渡し防止、分割後非連結、余りの全値保全、出力座標、ID不正、snapshot不一致、重複up、取消・focus loss・reset・別pointerも検証した。無消費の不成立は元state参照を返す。

【限界】ブラウザはChromium Headless Shell134.0.6998.35・Playwright1.51.1、1440×1100のマウスと390/320×950のタッチエミュレーション。CSSアニメーション名/動作軽減を検証したが、実機での滑らかさや指の隠れ方までは確認していない。Windows/Safariの動作を成功と報告しない。

## CIの実測証跡

コードHEAD `ebb781e43ee8a3549c9fe2fd02e03ed281359bf8` の [CI run #8](https://github.com/Olivia-Grace0206/slime-merge-game/actions/runs/40921026136) は `completed / success` を確認した。資料追加後の最終HEADでもCIを再確認し、最新PR本文へ最終HEAD・run URL・結果を記録する。この過去runだけで最終HEADを成功扱いしない。

## Windowsの試遊手順

1. DesktopでFetch origin → Current branchから `feature/phase01-merge-core-ui` を選択 → 更新があればPull origin。mainはまだPhase0。
2. Repository → Open in Terminal。Node22系/npm10系を確認。
3. `npm ci` → `npm run dev`。
4. `http://localhost:5173/slime-merge-game/`（別ポートのときはターミナル表示）を開く。
5. 初期の5体配置で左の1体を中央へドラッグし、オレンジ枠と2体の出力予告を見て離す。
6. 11体配置で2組の枠＋余り1体、斜め配置、高Tier試験を確認する。空マスをドラッグでパン、視点リセットで復帰。
7. PCで正常なら実スマホでも確認し、M25の指の隠れ方やパン競合を記録。LAN公開は環境とファイアウォール設定が必要なので本Workで行っていない。

試遊中のリロードで状態が初期化されるのは保存未実装のため。生成がないので配置プリセットを使って繰り返し遊ぶ。

## 既知の問題・次のPhase

実施した範囲で残存する機能不具合は検出されていない。実機の見た目・OSジェスチャー・操作感は未確認。7×7以外の大盤面UI/仮想描画はPhase4で実装する。Coreは境界と座標を分離済みだが大盤面性能を保証する試験は今回していない。

未実装：属性、時間生成、貯蔵、クリック加速、売却・通貨・強化、土地解放、保存、図鑑、音、ズーム/ピンチ。

Phase2で必要な順序：

1. ユーザー試遊→Phase1 PRの採否。自動マージしない。
2. 生成・貯蔵の最小仕様を合意：容量、取出し位置、任意停止、時間補填範囲。
3. **highestTierReached**を生成進行指標として継続し、中心が右へ動く正規分布型抽選を純粋関数＋乱数注入で実装。μ(H)、σ(H)、抽選Tier上下端、H=1/30の境界・確率正規化を先に決める。μ(H)=Hを勝手に固定しない。
4. 売却額・強化項目/費用・クリック短縮を必要範囲で合意する。
5. 保存形式version・検証・履歴の復旧・破損時の安全策を設計。セーブに最高到達Tierを含める。盤面スナップショットは操作の整合性用であり保存形式としては未確定。
6. 既存M01〜M35を回帰し、生成/売却後にも履歴が下がらないことを確認。

属性の継承・上限・5体2出力への分配・変異、Tier40化は未決定のまま保留する。
