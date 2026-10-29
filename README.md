# スライムマージゲーム

PC・スマートフォンで遊ぶ、スライム育成の箱庭型マージゲームです。
同じTierの個体へ重ねてドロップし、3体→上位1体／5体→上位2体へ進化させます。

**Phase 1実装ブランチ `feature/phase01-merge-core-ui`** で盤面・ドラッグ・8方向連結・3/5/大量マージ・組別プレビューを試遊できます。mainはPhase 0の安定版を維持しています。保存はまだありません。
このReact版は、以前の単体HTML Prototypeとは別の正式開発基盤です。
HTMLをダブルクリックする形式ではありません。

## 採用技術

直接依存は完全なバージョン番号で固定し、推移依存も `package-lock.json` で固定します。

| 技術 | バージョン |
|---|---|
| Node.js / npm | 22.23.4 / 10.9.9（検証環境） |
| React / React DOM | 19.3.1 |
| TypeScript | 6.0.3 |
| Vite / React plugin | 8.3.5 / 6.1.2 |
| Vitest | 5.0.5 |
| ESLint / typescript-eslint | 10.13.0 / 8.72.1 |

全直接依存の一覧は `package.json`、Phase 1の検証記録は [PHASE1_HANDOFF.md](docs/PHASE1_HANDOFF.md) を参照してください。
ゲームエンジン、バックエンド、状態管理・UIフレームワークは使用しません。

## Windowsで起動する

GitHub DesktopだけではReact/Viteは起動しません。**Node.jsが別途必要**です。
未導入なら [Node.js公式](https://nodejs.org/en/download) からNode.js **22系の22.23.4**（npm同梱）をインストールしてください。
Pythonは不要です。対応範囲はNode.js `>=22.13.0 <23`、npm 10系です。
導入後、開いていたターミナルを開き直してください。

1. GitHub Desktopで `Olivia-Grace0206/slime-merge-game` をClone、または既存Cloneを開く。
2. **Fetch origin** を押し、**Current branch** から **`feature/phase01-merge-core-ui`** を選ぶ。Phase 1は未マージなのでmainでは遊べません。
3. リモート更新があれば **Pull origin**。未コミットの変更がある場合は先に保全し、上書きしない。
4. **Repository → Open in Terminal** でリポジトリ直下を開く。
5. 以下を実行する（Node.js/npmのバージョンを先に確認）。

```sh
node --version
npm --version
npm ci
npm run dev
```

ターミナルに出たURLをブラウザで開きます。通常は
`http://localhost:5173/slime-merge-game/` です。停止は `Ctrl+C`。
左のスライムを中央の同Tier個体へ重ねて離すとマージします。おためし配置から3体・5体・8体・11体・斜め・高Tierを切り替えられます。空きマスからドラッグでパン、Escで取消。キーボードはTab→Enterで個体選択、移動先でEnterです。

【暫定】7×7盤面、チェビシェフ距離・同距離y→x昇順、4px未満はタップ扱い、異Tier／2体不足／Tier30は無消費キャンセル。テスト配置の切替・リセットは新しい試遊セッションです。最高到達Tierは通常1、高Tier試験は30へ初期化されます。実ゲームの生成仕様ではありません。

## 品質確認・ビルド

```sh
npm run lint
npm test -- --run
npm run build
npm run preview
```

`build` は **`tsc -b` による型チェック → Vite本番ビルド**です。
`preview` は先にBuildを実行し、表示されたURL（通常 `http://localhost:4173/slime-merge-game/`）を開きます。
`npm test` のみの場合は監視モードです。`npm ci` はlockfileから依存を再現し、既存の `node_modules` を入れ替えます。

## 構成と責務

```text
src/domain/game.ts        Tier・Slime・GameState・DropPlan（MAX_TIERを集約）
src/domain/grid.ts        既存の符号付き安全整数座標型
src/core/grid/            既存座標ユーティリティ（互換維持）
src/core/board/           状態不変条件・境界・スナップショット
src/core/merge/plan.ts     元個体を除外するBFS・5体優先組分け・出力計画
src/core/merge/apply.ts    表示した計画の原子的適用・ID注入・履歴更新
src/core/input/           画面座標変換・パン（React非依存）
src/app/presets.ts        Phase 1検証用配置
src/components/GameBoard.tsx  入力・状態の接続・組別予告
src/components/Slime.tsx  Tierに応じたCSS製スライム
src/styles/              レスポンシブ・動作軽減・短い進化アニメーション
tests/grid,board,merge,input/  Vitest 181件（既存29＋追加152）
tests/browser/phase1.cjs  隔離Playwrightで再実行できる54項目
.github/workflows/ci.yml  既存のPR/main CI。公開処理なし
docs/PHASE1_HANDOFF.md    引き継ぎ・暫定事項・実機確認待ち
docs/validation/         M01〜M35対応表・ブラウザ結果・画面
```

CoreとdomainへのReact importは禁止のままです。ゲーム状態はCore、カメラ・ジェスチャー・演出はUI側です。計画作成は純粋関数、プレビュー計画をそのまま確定処理へ渡します。属性・生成・経済・保存はまだ追加していません。

## ロードマップ

| Phase | 範囲 | 現在 |
|---|---|---|
| 0 | 開発基盤、初期画面、CI、仕様書・引き継ぎ | 完了・PR #1はmainへマージ済み |
| 1 | 重ねドロップ、8方向連結、5体優先、組別予告・安全な出力 | 開発ブランチで実装・自動検証済み、ユーザー実機確認待ち |
| 2 | 生成・貯蔵・クリック加速、売却・強化、保存 | 未着手 |
| 3 | 属性継承・複合効果・変異、外見合成・○×予告 | 未着手 |
| 4 | 大きな世界、土地解放、牧場→研究所→カオス、図鑑 | 未着手 |
| 5 | 操作・演出・性能・復旧の磨き込み（任意） | 未着手 |

## GitHub DesktopとPRの流れ

今後の開発は承認済みの最新mainからFeature Branchを作成し、変更・検証・Commit・Push・PRの順で進めます。
Desktopの **History** でコミットを確認できます。Workの作業はFetch/Pullしてから受け取ってください。
mainへ直接コミットしません。**Phase 0のPR #1はマージ済み**です。今後の仕様書改訂やPhase 1実装は新しいFeature Branchで別々のPRに分け、マージはユーザーの確認後に行います。

CIはNode.js 22で `npm ci → lint → test -- --run → build` を実行します。
`contents: read` のみを使い、Actionsは公式リポジトリのコミットSHAで固定しています。
CI成功とユーザーPC・スマホでの実機確認は別の記録として扱います。

## Private開発と将来の公開

開発中は **Privateを維持**し、ローカル確認とCIを利用します。Pagesデプロイはありません。
将来ユーザーがPublicへ変更・公開を承認した後、別PRでPages設定とデプロイワークフローを追加します。
その際に `dist/` を公開対象にし、公開URLでPC・スマホの実機確認を行います。
Viteの `base` は将来のプロジェクトサイトに備えて **`/slime-merge-game/`** に設定済みです。
リポジトリ名やカスタムドメインが変わる場合は変更してください。baseの指定だけでは公開されません。

## 仕様書

**正式な正本はGitHubの `main` ブランチにある最新版Markdown**です。WorkやChatGPTは最初に次の固定パスを参照してください。

- [最新版仕様書への固定案内（CURRENT.md）](docs/specifications/CURRENT.md)
- [完全仕様書 v0.2.4（2026-10-30）](docs/specifications/Slime_Merge_Game_Specification_v0.2.4_2026-10-30.md)
- [直前の完全仕様書 v0.2.3（保全済み）](docs/specifications/Slime_Merge_Game_Specification_v0.2.3_2026-10-30.md)
- [旧版の完全仕様書 v0.2.2（保全済み）](docs/specifications/Slime_Merge_Game_Specification_v0.2.2_2026-10-30.md)

v0.2.4で**現行最終Tierを30**に確定しました（将来40への拡張は別途検討）。生成Tierは**過去の最高到達Tier**を基準とし、**中心が進行に応じて右へ移動する正規分布型**の抽選を採用します。平均・標準偏差・生成可能帯域の具体数値は未決定です。抽選の本格実装はPhase 2で行い、Phase 1ではTier 1〜30の安全なマージ処理・最高到達Tierに対応できるデータ構造を優先します。

改版は新しい完全仕様書を追加し、履歴・【合意】【推奨・暫定】【未決定】を維持します。**PRがmainにマージされるまではmain上の旧版が正本**であり、未マージ文書を確定済みとは扱いません。GitHubを参照できない場合、古いProject添付資料を無断で現行正本にしないでください。

参考にした [array-puzzle](https://github.com/Olivia-Grace0206/array-puzzle) は構成・設定・CIの読み取り専用です。
ゲーム固有コードをコピーせず、同リポジトリへの変更・PR・設定変更は行いません。



## ブラウザ回帰の再実行（任意・開発者向け）

本番依存・package-lockは変更していません。通常の試遊にPlaywrightは不要です。
別ディレクトリへ `npm install --prefix ../slime-browser-tools --no-save playwright@1.51.1` を実行し、そのPlaywrightのCLIから `install chromium --only-shell` でブラウザを準備します。
`npm run build` 後、PowerShellでは次のように実行できます。

```powershell
$env:PLAYWRIGHT_MODULE = (Resolve-Path ../slime-browser-tools/node_modules/playwright).Path
$env:BROWSER_ARTIFACT_DIR = "$env:TEMP/slime-phase1-browser"
node tests/browser/phase1.cjs
```

スクリプト自身がlocalhost:5173に本番プレビューを起動して終了時に停止します。すでにサーバーがある場合は `GAME_URL` でURLを指定できます。
検証範囲と実機との差は [ブラウザ結果](docs/validation/phase1-browser-results.md)、M01〜M35は [対応表](docs/validation/phase1-test-matrix.md) を参照してください。
