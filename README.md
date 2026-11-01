# Phase 3B — 属性効果・属性重視生成・ペース調整

Phase3A [PR #10](https://github.com/Olivia-Grace0206/slime-merge-game/pull/10)はmain `13f56c0`へマージ済み。この変更は最新mainから作成した `feature/phase03b-attribute-effects-generation-modes` の新規Draft PRです。mainマージは試遊後のユーザー判断。Private/Pages設定は維持。

- 通常はFIFO1体。生成パネルの「通常/属性」切替で、無属性・低Tierの貯蔵10体を属性率の高い1体へ変換できます。属性付き・発見Tier付近・盤面保護個体は消費しません。出力は素材の最低Tier、属性は保証されません。
- 基本15秒、速度強化×.95/Lv、クリック1秒+200ms/Lvへ減速。属性重視35%/通常3%をはじめ、効果量と上限は**未承認の仮値**です。
- 炎/黄金/闇の売却、氷/雷の生成支援、自然の追加貯蔵、幸運/変異、光の隣接支援、磁力の位置誘引と3複合効果が発動。「属性」→個体でLvごとの効果、合計支援、売値を確認できます。
- 闇はマージ時に闇だけ仮20%で消失。5体は組単位の共通判定。プレビューで予告し、スライム本体・他属性・Tier進化は維持。
- schema6。旧1〜5の個体/属性/GOLD/研究/保護/貯蔵/金報酬台帳を保持し、旧生成進捗を比率で移行。保存成功後にだけ反映。

Node22/npm10で `npm ci` → `npm run lint` → `npm test -- --run` → `npm run build`。試遊はGitHub Desktopで上記ブランチをPull後、`npm ci` / `npm run dev`、通常 `http://localhost:5173/slime-merge-game/`。安全な保存にWeb Locks/LocalStorageが必要です。

[仕様の正本案内](docs/specifications/CURRENT.md) / [完全仕様v0.3.1](docs/specifications/Slime_Merge_Game_Specification_v0.3.1_2026-11-01.md) / [引き継ぎ](docs/PHASE3B_HANDOFF.md) / [検証](docs/validation/phase3b/RESULTS.md) / [比較](docs/balance/phase3b/RESULTS.md)。属性重視専用ではTier進行が遅くなるため、通常との併用を試してください。覚醒/紫青、全体ビジュアル改修/音は後続です。

---

以下はPhase3A以前のREADME（履歴）。未マージ/属性効果未実装/10秒生成等は当時の状態です。

# Phase 3A — スライム入れ替え・属性育成基盤

2026-11-01 JST。main `225449c`（PR #9マージ済み）から `feature/phase03a-swap-attribute-core`。新規Draft PRはユーザー試遊/レビュー待ち、main未マージ。Private/Pages設定は維持。

- マージ可能なら従来の3/5/大量マージを優先。異Tier・2体不足・Tier40・研究上限・暫定属性上限では⇄位置交換（ID/属性/保護を保持）。
- 属性10種を生成時に仮3%で付与。FIFOでTierと属性を保持。通常属性は5体両出力へコピー。最高Lv2体以上で+1、属性3種/Lv99/変異1%/組は**未承認の暫定値**。
- 「属性」メニューで個体一覧→種類/Lv/売値/保護を確認。属性特殊効果・複合効果・闇消滅・紫青/覚醒は後続。今回の属性で売値や生成速度は変化しない。
- schema5。v1〜4を明示移行、旧GOLD/研究/金支給契約/保護/貯蔵を保全。保存成功後に反映。

[最新仕様案内](docs/specifications/CURRENT.md) / [完全仕様v0.3.0](docs/specifications/Slime_Merge_Game_Specification_v0.3.0_2026-11-01.md) / [引き継ぎ](docs/PHASE3A_HANDOFF.md) / [検証](docs/validation/phase3a/RESULTS.md) / [比較](docs/balance/phase3a/RESULTS.md)。最終HEAD・同SHAのCIは新規Draft PR本文に記録。

Node22/npm10で `npm ci` → `npm run lint` → `npm test -- --run` → `npm run build`。`npm run dev` でlocalhost起動（安全な保存にはWeb Locks/LocalStorageが必要）。ブラウザrunnerはアプリ依存を追加せず別環境のPlaywright1.51.1を`PLAYWRIGHT_MODULE`で指定する。

---

以下はPhase2 PolishまでのREADME（履歴）。Draft/属性未実装等は当時の状態。

# スライムマージゲーム

時間生成→貯蔵→ランダムに1体追加→3/5体マージ→売却→GOLDで強化するReactブラウザゲーム。

**Phase 2 Polish：`feature/phase02-polish-gameplay-ui`**。mainのPhase 2 PR #8（`55075e4`）を継承。[既存Draft PR #9](https://github.com/Olivia-Grace0206/slime-merge-game/pull/9)を更新し、main未マージ・Private維持・Pages未公開。対応HEAD/CI/PR URLは[引き継ぎ](docs/PHASE2_POLISH_HANDOFF.md)とPR本文。

## Windowsで試遊

GitHub DesktopでFetch origin → 上記ブランチを選択 → Pull origin。Node.js 22 / npm 10でRepository → Open in Terminal。

```sh
npm ci
npm run dev
```

通常 `http://localhost:5173/slime-merge-game/`。HTMLダブルクリック起動ではない。

1. 初期4×4・空盤面。10秒待つか生成加速で貯蔵を増やす。
2. 丸い「スライム追加」を1回押すと、ランダムな空きマスへFIFO先頭1体を配置。金マスも候補。満杯なら追加不可・貯蔵不変。
3. 同Tierの既存個体へドラッグして離すと8方向連結でマージ。3→1、5→2、5優先・余り保持。隣接/空きセル移動だけでは進化しない。
4. 売却エリア内へドロップで即売却。売却ゾーン内のドラッグ中だけ全16体＋つかんだ個体に丸い価格札を表示。PC右クリック/スマホ長押し（仮500ms）で売却保護ON/OFF。鍵が目印。保護してもマージ素材には使える。
5. ショップで生成間隔・加速・容量を強化。スライム研究で進化上限5→10→15→20→25→29→30…40を解放（30以降は1ずつ）。未研究のマージは無消費で拒否。研究だけでは新Tierを発見しない。
6. GOLDマスは新規ゲームではロック。128 GOLD（仮）で解放すると空きセルに出現。個体を置くと350ms間隔×10報酬。対象を移動/売却/マージ消費すると、既払いを残して終了・未払い失効・金マス消滅。別個体で再開できない。
7. 自動保存。検証の7×7プリセット/全40Tier外見確認は通常セーブと分離。「通常プレイへ戻る」で復帰。

PCホイール/2指ピンチで盤面ズーム、空きセルからパン。2指で素材ドラッグ取消、全指を離して再操作。設定に表示リセット/補助＋−。Tabでセルへ移動、Enter/Spaceで素材選択と移動。Pで保護、Iで詳細、選択後に売却エリアへTab→Enterでも即売却。Escapeで取消。通常クリック/タップだけでは個体モーダルを開かない。

## 保存と互換性

**HTTPSまたはlocalhost**とWeb Locks/LocalStorage対応ブラウザが必要。LANの通常HTTPは安全な保存ロックを利用できず停止する。別端末同期なし。

全操作はWeb Locks＋入力queue＋保存原文照合で直列化。盤面/貯蔵/財布/保護/イベントを一括保存し、成功後にUIへ公開。Quota/権限拒否/破損/不明版/別タブの更新では原本を保持して停止。勝手に新規開始や上書きしない。

保存schema4（キーは従来の `slime-merge-normal-v2` を継続）。旧v1/v2/v3を厳密検査し、到達Tierを覆う研究段階と金解放を無料で継承。旧v2は旧報酬式で移行し、途中金イベント単価/既払い/受領額/IDを固定継承。旧契約の増額・遡及支給なし。旧v1の妥当4×4移行は維持し、7×7検証盤面は切り詰めない。GOLDはMAX_SAFE_INTEGERまで、超過分は受け取らず台帳へ記録。上限時も価格プレビュー0GOLDで盤面整理可能。

ブラウザ強制終了時のOS書込保証はない。実Windows/実iPhone・iPad Safari/Androidでの今回Polish操作は未確認。[試験範囲と画面](docs/validation/phase2-polish-followup/RESULTS.md)を参照。

## 合意と仮設定

ランダム追加・即売却・保護操作・金の空き出現/離脱終了・350ms×10は今回の合意。初回自力マージ発見・H1=100%/H2=99:1・研究/金解放/予告廃止/フル桁GOLDが今回合意。H3以降の表/研究価格/金価格/頻度/長押し閾値/最終デザインは仮仕様。

- 生成10秒、容量10、加速1秒、売却2^Tier、既存ショップと発生頻度を維持。
- 生成は最高到達H別の40行重み表（H3以降は仮）。未発見Tierの生成0、貯蔵再抽選なし。研究費用＝現在研究上限の売値×3（仮）。GOLDマス頻度Lv0〜5、最大25%待ち短縮（仮）、常時保証なし。
- 仮金単価：max(1,floor(max(Tier,0.05×2^Tier)/(1+0.25×属性数)))。Tier1〜5は1/2/3/4/5 GOLD/回。高Tier率は旧式と同じ。

[4分布・3研究価格・3金価格・4購入方針の実Core比較](docs/balance/phase2-polish-followup/RESULTS.md)。botの時間を人の試遊予測に使わない。属性は今回まだ全個体0。

## 開発・検証

```sh
npm ci
npm run lint
npm test -- --run
npm run build
```

React/ReactDOM以外のゲーム依存追加なし。CoreはReact非依存、既存mergeの組分け/出力規則とboard/camera/gesturesは保全。研究上限のガードだけをplan/apply/sessionへ追加。sessionが単一取引、persistenceがschema4/移行、SessionStoreが保存、GeneratorPanelが描画専用補間を担当する。描画frameからLocalStorageへ書かない。

隔離Playwright 1.51.1/Chromiumを準備し、`PLAYWRIGHT_MODULE`に絶対パスを指定。Build後に順番に実行（各runnerがpreviewを起動/停止）。

```sh
node tests/browser/followup.cjs
node tests/browser/phase2.cjs
node tests/browser/polish-input.cjs
node tests/browser/phase1.cjs
node tests/browser/phase1-1.cjs
```

phase2.cjsは最新Polish契約の回帰へ委譲。native touchと仮想時計の試験を分離。旧runnerの証跡は `BROWSER_ARTIFACT_DIR` を今回のディレクトリへ指定して保持する。Vitestの比較/長時間出力も今回のディレクトリへ分離。

[CURRENT](docs/specifications/CURRENT.md) → [完全仕様書v0.2.9](docs/specifications/Slime_Merge_Game_Specification_v0.2.9_2026-11-01.md)。main採用まではv0.2.7が現行正本。属性/覚醒/紫青/土地/正式図鑑/全Tierリッチ化/効果音は後続。

GOLDは初期フル桁（例1,234,567 GOLD）。設定でK/M省略へ切替・保存。生成UIは独自3匹スライムと収納数。次Tier予告なし。セーブを初期化せず既存の到達/所持/イベントを保全する。

