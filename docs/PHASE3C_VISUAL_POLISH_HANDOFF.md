# Phase 3C visual feedback polish — 2026-11-03

## 目的と基準

知人向け公開済みのPhase 3C（main `ef7927a35ff5903b5d99b79360d34c52aba302a6`）に対する、ユーザー実機試遊フィードバックの限定改善。

### 今回の合意

- 1・2・3覚醒のオーラがほとんど見えない問題を解消。段階ごとに明確な輪郭・光輪・星数を表示する。
- 青マスに支援属性付き個体を置いた場合、現在有効な属性と倍率をショップの上に表示する。移動・交換・期限切れ・対象外属性では表示しない。
- 属性紹介の専用メニューで10属性を1画面の簡易パネルとして表示し、選択すると詳細が見られる。個体一覧/盤面効果は専用サブ画面へ分ける。
- **紫・青マスの出現頻度は変更しない**。覚醒倍率・闇リスク・GOLD・schema7・生成・マージCoreも変更しない。

## 変更箇所

- `src/components/Slime.tsx` / `src/styles/global.css` — 常時可視の輪郭、外側光輪、1〜3個の星、静的reduced-motion対応。スライムの表情・Tier・属性バッジは維持。
- `src/components/BlueBuffStatus.tsx` — 実際に青セル上に存在する個体の支援属性を列挙し、現行のBLUE_MULTIPLIERSから倍率を表示。これは**最終上限前の属性power倍率**であり、最終生成秒数を誤表示しない。
- `src/components/AttributePanel.tsx` / `GameMenu.tsx` / `GameBoard.tsx` — 10パネル概要、詳細、所持スライム/盤面効果の3層構造。デスクトップ5×2、縦長モバイル2×5を基本とする。
- `src/components/attributeGuide.ts` — 磁力の古い「紫・青未実装」という説明を現行挙動へ修正。
- `tests/ui/visual-polish.test.ts` — DOM描画テキスト/覚醒数/共鳴の有無を検証。
- `tests/browser/phase3b.cjs`, `phase3b1.cjs`, `phase3c.cjs` — 属性紹介UIの新しい操作経路へ調整、青バフの表示/交換後解除を確認する。

## 初回実装時の検証計画（履歴）

```sh
npm ci
npm run lint
npm test -- --run
npm run build
```

- 特に320×568 / 390×844 / 844×390で全10パネルがスクロール不要で見えること。
- 1覚醒から発光が認識でき、3段階で違いが明瞭なこと。
- 覚醒輪郭が表情・Tier・属性バッジを遮らないこと。
- 青バフが配置・交換・撤去・期限切れで即時に追従すること。
- reduced-effects / prefers-reduced-motionでも「静的な発光輪郭」が見えること。
- 旧セーブ・マージ・GOLD・紫青発生間隔が変化していないこと。

## 公開との関係

自動Pages公開済みのmainは本PR作成中は変更しない。β版公開URLは維持。

修正はFeature Branch `feature/phase03c-visual-feedback-polish` で試験し、Draft PRに保存する。**ユーザー承認まではmainへマージしない**。実機・他ブラウザの試遊による最終判断は別途行う。


## 正式Work完了時の引き継ぎ — 2026-11-03

PR #15の13変更ファイル全文とCoreを再監査。元717単体成功でも実描画で青表示の5重なりを検出した。オーラ/10紹介の既存実装を再利用し、BlueBuffStatusのLv/意味と縦ヘッダー・横メニュー配置、AttributePanelの既存説明補完だけを限定修正。

最終 **Lint / 724 Vitest / Build・型チェック / 772ブラウザ** 成功。10画面サイズ、Tier5/21/30/40の覚醒0〜3、通常/軽減/動作軽減、実タッチ/キーボード、16高Tier覚醒同時表示を確認。[結果/制約/再試験](validation/phase3c-polish/RESULTS.md) と [追補](specifications/Phase3C_Polish_Addendum_2026-11-03.md) を参照。Windows/iPhone実機とSafari/Edgeは未確認。

ブラウザは本番ビルドを凍結し実行。`tests/browser/visual-regression.cjs` は既存12スイート、`visual-stress.cjs` は追加6実時間検査。PLAYWRIGHT_MODULE/BROWSERS_PATHで導入済みPlaywright/Chromiumを指定できる。`BROWSER_DIST` を設定すれば凍結ビルドを使う。実行例はRESULTS/各CJS先頭を参照。

main `ef7927a35ff5903b5d99b79360d34c52aba302a6`、Public/Pagesを維持。最終HEAD/CI URLはPR本文に記載し、コミット内の自己参照を避ける。Draftを解除/マージ/公開しない。

### ユーザー試遊

1. PR15のブランチを取得し `npm ci` → `npm run dev -- --host`。公開β版URLは現在のmainのままなので、変更確認にはブランチを使う。
2. 同じTierで覚醒0〜3を比較。高Tier/軽減設定/ドラッグも確認。
3. 支援属性の個体を青へ配置し、Lv/power倍率と離脱/交換後の表示を確認。
4. 属性紹介で10枚を確認し、詳細/戻る/別属性/現在の効果・所持スライムへ移動。
5. WindowsとiPhoneで文字/星/指との重なりを評価し、必要な限定修正後にPR15のマージ可否を判断。
