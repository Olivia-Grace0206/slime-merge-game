# スライムマージゲーム

PC・スマートフォンで遊ぶ、スライム育成の箱庭型マージゲームです。
同じTierの個体へ重ねてドロップし、3体→上位1体／5体→上位2体へ進化させる構想です。

現在は **Phase 0：開発基盤と仮トップ画面**。盤面・移動・マージ・保存は未実装です。
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

全直接依存の一覧は `package.json`、検証記録は [PHASE0_HANDOFF.md](docs/PHASE0_HANDOFF.md) を参照してください。
ゲームエンジン、バックエンド、状態管理・UIフレームワークは使用しません。

## Windowsで起動する

GitHub DesktopだけではReact/Viteは起動しません。**Node.jsが別途必要**です。
未導入なら [Node.js公式](https://nodejs.org/en/download) からNode.js **22系の22.23.4**（npm同梱）をインストールしてください。
Pythonは不要です。対応範囲はNode.js `>=22.13.0 <23`、npm 10系です。
導入後、開いていたターミナルを開き直してください。

1. GitHub Desktopで `Olivia-Grace0206/slime-merge-game` をClone、または既存Cloneを開く。
2. **Fetch origin** を押す。**Current branch** で `feature/phase0-bootstrap` を選ぶ。
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
現在は開発状況へのページ内リンクだけ操作できます。ゲーム操作はまだありません。

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
.github/workflows/ci.yml   PR/main push/手動の検証。公開処理なし
docs/specifications/      原文の仕様書
docs/PHASE0_HANDOFF.md     実行記録・後続Workへの引き継ぎ
src/domain/grid.ts        座標型（React非依存）
src/core/grid/            座標検証・値比較・セルキー（純粋関数）
src/app/App.tsx           仮トップ画面・UIとの接続位置
src/components/           差し替え可能な仮スライムSVG
src/styles/               レスポンシブなCSS
src/main.tsx              React起動
tests/grid/               座標ユーティリティの単体試験
```

将来は `core/merge`、`attributes`、`generation`、`economy`、`world`、`persistence` を機能別に追加します。
`data/`（設定値）、`assets/`（素材）、`public/` は実ファイルが必要になった段階で追加します。
CoreにReactをimportすることはLintで禁止しています。ゲーム状態・カメラ・ドラッグ表示状態は後続Phaseで分離します。
Phase 0の座標検証は「安全な整数か」の判定であり、盤面サイズ・土地解放・購入可否を定義しません。

## ロードマップ

| Phase | 範囲 | 現在 |
|---|---|---|
| 0 | 開発基盤、初期画面、CI、仕様書・引き継ぎ | 本PRの対象 |
| 1 | 重ねドロップ、8方向連結、5体優先、組別予告・安全な出力 | 未着手 |
| 2 | 生成・貯蔵・クリック加速、売却・強化、保存 | 未着手 |
| 3 | 属性継承・複合効果・変異、外見合成・○×予告 | 未着手 |
| 4 | 大きな世界、土地解放、牧場→研究所→カオス、図鑑 | 未着手 |
| 5 | 操作・演出・性能・復旧の磨き込み（任意） | 未着手 |

## GitHub DesktopとPRの流れ

今後の開発は承認済みの最新mainからFeature Branchを作成し、変更・検証・Commit・Push・PRの順で進めます。
Desktopの **History** でコミットを確認できます。Workの作業はFetch/Pullしてから受け取ってください。
mainへ直接コミットしません。今回は `feature/phase0-bootstrap` からmainへの **Draft PR・未マージ**で終了します。
mainへのマージはユーザーの確認後に行います。

CIはNode.js 22で `npm ci → lint → test -- --run → build` を実行します。
`contents: read` のみを使い、Actionsは公式リポジトリのコミットSHAで固定しています。
CI成功とユーザーPC・スマホでの実機確認は別の記録として扱います。

## Private開発と将来の公開

開発中は **Privateを維持**し、ローカル確認とCIを利用します。Phase 0にPagesデプロイはありません。
将来ユーザーがPublicへ変更・公開を承認した後、別PRでPages設定とデプロイワークフローを追加します。
その際に `dist/` を公開対象にし、公開URLでPC・スマホの実機確認を行います。
Viteの `base` は将来のプロジェクトサイトに備えて **`/slime-merge-game/`** に設定済みです。
リポジトリ名やカスタムドメインが変わる場合は変更してください。baseの指定だけでは公開されません。

## 仕様書

現行正本： [完全仕様書 v0.2.2](docs/specifications/Slime_Merge_Game_Specification_v0.2.2_2026-10-30.md)。原文をそのまま保全しています。
旧版はProjectの改訂履歴として維持し、本PRでは変更しません。
仕様書のリポジトリ名「候補」は作成当時の記録です。実際の対象名は今回の直接指示で `slime-merge-game` に確定しています。
【合意】【推奨・暫定】【未決定】を区別し、今回の仮画面や座標APIを本番ゲーム仕様の確定とは扱いません。
距離方式・座標タイブレークなどの暫定技術詳細はPhase 1で明示し、属性計算はPhase 3に引き継ぎます。

参考にした [array-puzzle](https://github.com/Olivia-Grace0206/array-puzzle) は構成・設定・CIの読み取り専用です。
ゲーム固有コードをコピーせず、同リポジトリへの変更・PR・設定変更は行いません。

