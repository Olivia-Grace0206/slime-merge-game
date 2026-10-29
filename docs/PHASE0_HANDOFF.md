# Phase 0 引き継ぎ

作業日：2026-10-30（日本時間）。対象はPhase 0のみ。

## リポジトリ・履歴

- Repository: https://github.com/Olivia-Grace0206/slime-merge-game
- Branch: `feature/phase0-bootstrap` → `main`
- 作業開始main: `9a9f2e1db0515212651f5c75a6796c268d3cab46`
- 基盤コミット: `8127dad2665a1e13508c1a0b659ba261526fa6ff`
- 実装HEAD（アプリ・設定・試験の最終変更）: `a2a9bb9af3caa181800019126bcda626215fd60f`
- 本書以降は資料更新コミットが続く。資料自身のSHAは自己参照になるため、**最終ブランチHEADはDraft PRのhead SHAと `git rev-parse HEAD` で確認**する。最終報告・PR本文にも記録する。
- Draft PR: 作成待ち。作成後に番号・URL・CI証跡を本書へ追記する。
- mainへの直接コミット・マージなし。Private維持、Public化・Pages公開なし。

## 正本

`docs/specifications/Slime_Merge_Game_Specification_v0.2.2_2026-10-30.md` を全文読み、原文のまま保存した。

- サイズ：75,196 bytes
- SHA-256：`500a92affd52adb074a138b654d07cbd38628ba6fd5b3fb2310e6c01fa0f269b`
- 元資料とのバイト一致を確認。旧版の書き換えは行っていない。
- 仕様書中の旧版履歴にある「未決定」は、v0.2.2で確定した領域を覆さない。
- リポジトリ名は今回のユーザー指示で確定済み。原文内の旧い「候補」表現は改変していない。

## 実装した構成

| 場所 | 責務 |
|---|---|
| `src/domain/grid.ts` | readonlyのセル座標型 |
| `src/core/grid/coordinates.ts` | 座標の実行時検証、値比較、セルキー。React/DOM/時間/乱数に非依存 |
| `tests/grid/coordinates.test.ts` | 正常値・負値・安全整数端点、不正値、比較、キー衝突を検証する29件 |
| `src/app/App.tsx` | 仮トップ画面。ゲーム状態をまだ持たない |
| `src/components/SlimeIllustration.tsx` | 緑・青・赤の仮SVG。個体データやTierのドメイン型ではない |
| `src/styles/global.css` | 牧場風パステル、丸いカード、PC/スマホ、フォーカス表示・動作軽減配慮 |
| `.github/workflows/ci.yml` | main向けPR/main push/手動でci→lint→test→build |
| `vite.config.ts` | `/slime-merge-game/` のbase。デプロイは含まない |

空ディレクトリ維持のためのファイルは追加していない。Core各機能・data/assets/publicは必要時に追加する。
`core/domain` へのReact importをESLintで禁止。表示座標・カメラ・ドラッグ状態はCore座標型から分離して後続Phaseで設計する。

### Phase 0だけの技術定義

`GridPosition` は符号付き安全整数（負数も許容）。`isGridPosition` は位置の数値形式のみを検証し、土地解放や盤面内判定はしない。
`cellKey` は `x,y` 形式、不正数値ではRangeError。`-0` は `0` と同じセルとして扱う。
これは将来の座標拡張を妨げない最小APIであり、盤面の原点・サイズ・距離方式のゲーム仕様を確定するものではない。

## 使用バージョン

| ライブラリ／ランタイム | バージョン |
|---|---|
| Node.js / npm | 22.23.4 / 10.9.9 |
| react / react-dom | 19.3.1 / 19.3.1 |
| typescript | 6.0.3 |
| vite / @vitejs/plugin-react | 8.3.5 / 6.1.2 |
| vitest | 5.0.5 |
| eslint / @eslint/js | 10.13.0 / 10.0.1 |
| typescript-eslint | 8.72.1 |
| eslint-plugin-react-hooks / react-refresh | 7.1.1 / 0.5.7 |
| globals | 17.13.0 |
| @types/node | 22.20.5 |
| @types/react / @types/react-dom | 19.3.0 / 19.3.0 |

Node.js 22系で統一。ESLintの要件を含め、最低22.13.0とする。`.nvmrc` / `.node-version` では実検証版22.23.4を指定。
Vite 8・Vitest 5の互換要件は公式資料とnpm配布メタデータで確認した。
直接依存はexact、全依存はpackage-lock.jsonに記録。

## 実行した検証

| 区分 | コマンド・確認 | 結果 |
|---|---|---|
| 開発環境 | `node --version` / `npm --version` | 22.23.4 / 10.9.9 |
| 再現インストール | `npm ci` | PASS |
| Lint | `npm run lint` | PASS、Lint警告0 |
| 単体試験 | `npm test -- --run` | PASS、1ファイル・29件、失敗0、skip0 |
| 型・本番ビルド | `npm run build` | PASS、TypeScript→Vite |
| ブラウザ | 本番distをVite previewで配信 | PASS、下記参照 |
| CI | Draft PRのActions | 確認待ち、作成後に追記 |
| ユーザー実機 | Windows Chrome/Edge、iPhone/iPad Safari | 未実施 |
| 公開URL | Pages | 未実施・今回対象外 |

### ブラウザ確認の実際の範囲

隔離したPlaywright 1.51.1 + Chromium Headless Shell 134.0.6998.35で、1440×1000、390×844、320×740の3条件を確認。
HTTP 200、Reactの見出しとPhase 0表示、開発状況へのアンカー移動、横はみ出しなし、JS例外・console error・request failure各0。
デスクトップ・390pxの全画面画像を目視確認。スマホ幅はエミュレーションであり、実スマホ・Safari確認ではない。
Playwrightは検証環境だけに導入し、ゲームの依存には追加していない。テキスト結果を `docs/validation/phase0-browser-results.json` に保管。

環境対応：Workでの全インターフェース指定の起動は `uv_interface_addresses` エラーとなったため、`127.0.0.1` バインドのVite previewで確認した。
検証ホストに日本語フォントがなかったため、ホストにNoto Sans JPを導入して日本語の描画も再確認した。アプリは外部フォントの読込をせず、OSフォントを使う。
検証用ブラウザの最新配布取得が失敗したため取得可能な上記版を使用した。これらはWork側の制約で、ユーザーのNode導入手順に追加作業は不要。

## CIの設計

- 起動：`pull_request` のbase main、`push` のmain、`workflow_dispatch`。
- `npm ci → npm run lint → npm test -- --run → npm run build`。タイムアウト10分。
- 権限 `contents: read` のみ、checkoutの認証情報保持なし。
- 公式ActionsのSHA固定：checkout v7 `3d3c42e5aac5ba805825da76410c181273ba90b1`、setup-node v7 `949feb2413d6458794dcd2491c4babbbce0c15c1`。
- Pages用workflow・upload・deployは存在しない。
- PR作成前のfeature pushだけでは起動しない。Draft PRを作成してからCIを観測する。

## 既知の問題・未実装

アプリコードの残存エラーは検出されていない。実機確認は未実施。
未実装：盤面、ドラッグ、8方向探索、3/5/大量マージ、組別枠・出力予告、生成、売却、ショップ、属性、土地、保存、図鑑、音、公開。
仮トップ画面のイラスト・配色・文言・レイアウトは本番UIの確定仕様ではない。
ホスト由来のUNDICI experimental warningは記録されたが、Lint警告やアプリエラーとは異なる。

## Phase 1開始時の順序

1. ユーザーのPhase 0確認・mainへのマージ判断後、採用された最新mainから新ブランチを作る。Phase 0を自動マージしない。
2. 正本v0.2.2・本書・PRの最新HEAD/CIを再確認する。属性なしで開始し、未決定の属性計算を前倒ししない。
3. 個体ID/Tier/盤面型と不変条件、元位置のドラッグ個体を除いた8方向候補探索を純粋関数で実装・試験する。
4. 5体優先→3体→余り、必須のドラッグ個体＋ドロップ先、距離順・固定座標順での選出を実装する。各組に追加連結は要求しない。
5. 同じ組の消費セル優先・最初はドロップ先で出力座標を計画。二重消費・上書き・重複配置なしを検証し、全体を原子的に適用する。
6. 同じ計画から組別枠・出力予告と確定処理を作り、ID・座標の一致を試験する。隣接だけ・空きセル移動・生成後の自動連鎖を禁止する。
7. Pointer Events、キャンセル、パン、PC/タッチ、Tier1緑/2青/3赤を接続し、仕様書M01〜M32を段階的に検証する。

実装前に明示する技術的な仮置き：チェビシェフ距離・同距離はy昇順→x昇順、異Tier/2体のみのドロップは元へ戻す案、初期盤面サイズ・最大Tier・タップとドラッグのしきい値。
これらを合意済みと誤記しない。距離等は正本に従い暫定と明記して進められる。試作範囲や上限挙動の必要項目のみ相談する。
属性の継承・上限・分配はPhase 3前、生成経済はPhase 2前に必要な分だけ決める。

## 参考リポジトリと保全

array-puzzleではpackage・Vite/ESLint・workflowの構成のみ読み取り。ゲーム固有コードをコピーせず、書き込みツールの対象にもしていない。
開始時の既存3ファイルは削除なし。.gitattributes/.gitignoreは原文を維持。READMEのみ本開発の案内へ拡充。
`node_modules/`・`dist/` は既存.gitignoreで除外される。秘密情報・検証用ランタイム・ブラウザ・フォントはコミット対象外。

## 参照した一次情報

- https://vite.dev/guide/ （Node互換要件）
- https://vitest.dev/guide/ （Node互換要件）
- 各パッケージのnpm配布メタデータ（exactバージョンとengines/peerDependencies）
- https://github.com/actions/checkout/tree/v7
- https://github.com/actions/setup-node/tree/v7
