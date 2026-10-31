# スライムマージゲーム

時間生成→貯蔵→ランダムに1体追加→3/5体マージ→売却→GOLDで強化するReactブラウザゲーム。

**Phase 2 Polish：`feature/phase02-polish-gameplay-ui`**。mainのPhase 2 PR #8（`55075e4`）を継承。新しいDraft PRでレビューし、main未マージ・Private維持・Pages未公開。対応HEAD/CI/PR URLは[引き継ぎ](docs/PHASE2_POLISH_HANDOFF.md)とPR本文。

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
4. 売却エリア内へドロップで即売却。ドラッグ中にTier/価格/保護拒否を表示。PC右クリック/スマホ長押し（仮500ms）で売却保護ON/OFF。鍵が目印。保護してもマージ素材には使える。
5. ショップで生成間隔・加速・容量を強化。GOLD/Lv/効果/価格を確認できる。
6. 金マスは空きセルに出現。個体を置くと350ms間隔×10報酬。対象を移動/売却/マージ消費すると、既払いを残して終了・未払い失効・金マス消滅。別個体で再開できない。
7. 自動保存。検証の7×7プリセット/全40Tier外見確認は通常セーブと分離。「通常プレイへ戻る」で復帰。

PCホイール/2指ピンチで盤面ズーム、空きセルからパン。2指で素材ドラッグ取消、全指を離して再操作。設定に表示リセット/補助＋−。Tabでセルへ移動、Enter/Spaceで素材選択と移動。Pで保護、Iで詳細、選択後に売却エリアへTab→Enterでも即売却。Escapeで取消。通常クリック/タップだけでは個体モーダルを開かない。

## 保存と互換性

**HTTPSまたはlocalhost**とWeb Locks/LocalStorage対応ブラウザが必要。LANの通常HTTPは安全な保存ロックを利用できず停止する。別端末同期なし。

全操作はWeb Locks＋入力queue＋保存原文照合で直列化。盤面/貯蔵/財布/保護/イベントを一括保存し、成功後にUIへ公開。Quota/権限拒否/破損/不明版/別タブの更新では原本を保持して停止。勝手に新規開始や上書きしない。

保存schema3（キーは従来の `slime-merge-normal-v2` を継続）。旧v2を旧報酬式で厳密検査して移行し、途中金イベント単価/既払い/受領額/IDを固定継承。旧契約の増額・遡及支給なし。旧v1の妥当4×4移行は維持し、7×7検証盤面は切り詰めない。GOLDはMAX_SAFE_INTEGERまで、超過分は受け取らず台帳へ記録。上限時も価格プレビュー0GOLDで盤面整理可能。

ブラウザ強制終了時のOS書込保証はない。実Windows/実iPhone・iPad Safari/Androidでの今回Polish操作は未確認。[試験範囲と画面](docs/validation/phase2-polish/RESULTS.md)を参照。

## 合意と仮設定

ランダム追加・即売却・保護操作・金の空き出現/離脱終了・350ms×10は今回の合意。具体的価格式/生成分布/長押し閾値/最終デザインは仮仕様。

- 生成10秒、容量10、加速1秒、売却2^Tier、既存ショップと発生頻度を維持。
- 仮分布：μ=1+0.90(H−1)、σ=min(1.8,max(1,0.10H))、候補1〜H。Hは最高到達履歴。貯蔵再抽選なし。
- 仮金単価：max(1,floor(max(Tier,0.05×2^Tier)/(1+0.25×属性数)))。Tier1〜5は1/2/3/4/5 GOLD/回。高Tier率は旧式と同じ。

[3案の4×4比較・金4式比較](docs/balance/phase2-polish/RESULTS.md)。botの時間を人の試遊予測に使わない。属性は今回まだ全個体0。

## 開発・検証

```sh
npm ci
npm run lint
npm test -- --run
npm run build
```

React/ReactDOM以外のゲーム依存追加なし。CoreはReact非依存、既存merge/board/domain/camera/gesturesは保全。sessionが単一取引、persistenceがschema/移行、SessionStoreが保存、GeneratorPanelが描画専用補間を担当する。描画frameからLocalStorageへ書かない。

隔離Playwright 1.51.1/Chromiumを準備し、`PLAYWRIGHT_MODULE`に絶対パスを指定。Build後に順番に実行（各runnerがpreviewを起動/停止）。

```sh
node tests/browser/phase2.cjs
node tests/browser/polish-input.cjs
node tests/browser/phase1.cjs
node tests/browser/phase1-1.cjs
```

phase2.cjsは最新Polish契約の回帰へ委譲。native touchと仮想時計の試験を分離。旧runnerの証跡は `BROWSER_ARTIFACT_DIR` を今回のディレクトリへ指定して保持する。Vitestの比較/長時間出力も今回のディレクトリへ分離。

[CURRENT](docs/specifications/CURRENT.md) → [完全仕様書v0.2.8](docs/specifications/Slime_Merge_Game_Specification_v0.2.8_2026-11-01.md)。main採用まではv0.2.7が現行正本。属性/覚醒/紫青/土地/正式図鑑/全Tierリッチ化/効果音は後続。
