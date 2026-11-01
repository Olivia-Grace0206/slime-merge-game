# Phase3B.1 引き継ぎ — 2026-11-01

起点はmain e3096b8c23caad7e17067700f6e9e9c74dc255c0（PR #11マージ済み、main CI41302209242成功）。新規feature/phase03b1-attribute-management-polish、別Draft PR・main未マージ・Private/Pages維持。GitHub最終HEAD/同SHA CIは新規Draft PR本文。再開記録はvalidation/phase3b1/CHECKPOINTS.md。

## 実装

- focus.ts/session.ts/GeneratorPanel：安全素材選抜を完全撤廃。属性/高Tierを含むFIFO先頭10体→最低Tierの1体、35%+既存幸運・無保証、残存Tier/属性の並び不変。
- attributes/strip.ts/input/dropZones.ts：純粋な全属性解除/共通hit判定。session strip-attributes、無料/元セル/ID/Tier/財布/保護保持。無属性は保存もしない。GOLD契約保持、効果/複合再計算、既存の通常/自然進捗率の引継ぎ。
- GameBoard/CSS：売却直上の水色解除域、無料/解除属性/個体保持の予告、44px以上・非重複。keyboard、pointercancel/ピンチ/blur/回転の取消。即売却/価格札/長押し保護/ズームは維持。
- economy/persistence/save：貯蔵だけ+5/Lv・Lv30・160、ceil(20×1.35^Lv)は仮値。速度/tap16。isLegacyWalletで旧Lv16を固定し、旧容量/速度で検証後既存移行。schema6継続、旧6のLv/個体/財布/金台帳を保全。
- AttributeIcon/Badges/Tokens/Panel/attributeGuide：独自共通SVG10、名前/Lv/アクセシブル説明、全属性の条件/式/上限と3複合をCore設定から表示。未所持も可・ダイアログ内部スクロール。画像生成なし。Slime本体/全体アート改修なし。

## 検証と再現

Node22/npm10でnpm ci、lint、全659テスト/25ファイル、build/型チェック成功。既存562削除なし。独立不変条件の4seed20k取引違反0。同じ担当による別観点監査で第三者レビューではない。

ブラウザ626成功=既存530+追加操作92+実時計性能4。10サイズ・盤面寸法不変/全体スクロールなし。実機ではなくChromiumエミュレーション。外部Playwright1.51.1をPLAYWRIGHT_MODULE、ブラウザキャッシュをPLAYWRIGHT_BROWSERS_PATHで指定し、本番build後にtests/browser/phase3b-regression.cjs、phase3b1.cjs、phase3b1-performance.cjs。各runnerは自分でpreviewを起動する。別のserver起動は不要。

容量/価格はbalance/phase3b1/RESULTS.md/comparison.json。36在庫ケースは出力を外へ処理する純粋貯蔵モデルで、実4×4自動プレイと同一視しない。Node保存最悪16,559bytes、実ブラウザ時刻付き16,602bytes。性能は環境依存・同一値hot-I/Oでディスクflush保証ではない。操作試験の制御時計下0msは速度根拠に使わず、別実時計で測り直した。

検証詳細/21枚のlossless画像/manifestはvalidation/phase3b1/RESULTS.md。旧仕様/資料を原文保全し、v0.3.2先頭の改訂節が旧安全素材/旧容量/旧Draft説明に優先。mainではv0.3.1、今回マージ後にv0.3.2を現行とする案内。

## 試遊と後続

GitHub DesktopでこのブランチFetch/Pull→npm ci→npm run dev。通常/重視のFIFO10体、属性付き/高Tierの意図的消費、無料解除と売却の使い分け、容量の購入感、アイコンと一覧を試遊し、Draft PRのマージ可否を判断する。容量/価格/既存属性Lv式と効果量は正式承認待ち。実機/他ブラウザ/スクリーンリーダー試用も未確認。

Phase3Cの紫マス/覚醒/非複製継承/青マス共鳴は今回未実装。最後の自然がいなくなった際は既存仕様で自然時計停止0、ほかの自然が残れば進捗率を保持。将来の覚醒を属性データに結び付けるならstripで属性とともに外す。全40Tierアート/音/土地/図鑑は後続。新Lv30保存を旧アプリへ戻すdowngradeをしない（旧アプリは拒否/原文保全）。
