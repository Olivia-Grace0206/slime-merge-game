# Phase 1 — M01〜M35 検証対応表

作業日：2026-10-30（日本時間）。正本：mainの完全仕様書v0.2.4・12.2節。

Vitest：**181件成功・失敗0・スキップ0、5ファイル**。既存座標29件を維持し追加152件。
うち1テストは独立した固定点探索を使って、固定seedの混在Tier盤面250パターンを照合する。250をテスト件数として水増ししていない。
ブラウザ：**54項目成功・失敗0**。各幅1440/390/320pxで18項目。Chromiumのエミュレーションでありユーザー実機ではない。

略号：`merge` = `tests/merge/merge.test.ts`、`state` = `tests/board/state.test.ts`、`input` = `tests/input/coordinates.test.ts`、`slime` = `tests/ui/slime.test.ts`、`browser` = `tests/browser/phase1.cjs`。

| ID | 対象 | 自動検証の場所・実際の確認内容 | 実機・目視の残項目 |
|---|---|---|---|
| M01 | 3→1 | merge: 個数表3 / browser: 全幅3体 | Windows・実タッチ試遊 |
| M02 | 4→1+余り1 | merge: 個数表4、余り個体全値一致 | 実機操作は未実施 |
| M03 | 5→2 | merge: 個数表5 / browser: 全幅5体 | 実機 |
| M04 | 6→2+余り1 | merge: 個数表6、余り保全 | 実機 |
| M05 | 7→2+余り2 | merge: 個数表7、余り保全 | 実機 |
| M06 | 8→3 | merge: 個数表8 / browser: 全幅8体 | 実機 |
| M07 | 10→4 | merge: 個数表10、座標一意 | 実機 |
| M08 | 斜め連結 | merge: 直接隣接より先まで連結 / browser: 斜め配置 | 実機 |
| M09 | 折れ曲がり | merge: bent path、独立oracle250盤面 | 実機 |
| M10 | 異Tierの遮断 | merge: 異Tier橋で探索を止める、oracle | 実機 |
| M11 | 隣接だけ | merge: 計画は状態を変更しない / browser: pointerup前の全配置一致 | 実機 |
| M12 | 空マス移動 | merge: 近接移動でも全ID/Tier保全 / browser: 全幅で移動 | 実機 |
| M13 | 異Tierドロップ | merge: invalid・元参照維持 / browser: 高Tier異種 | 実機 |
| M14 | 2体不足 | merge: too-fewで無消費 | 実機 |
| M15 | 元個体の除外 | merge: 二重計上なし、元セルを橋に使わない | 実機 |
| M16 | 出力安全性 | merge: 3〜49体の47ケース、ID/セルの一意性、原子的適用 | 大盤面の性能は後続 |
| M17 | 自動連鎖なし | merge: 既存上位2体に隣接してもそのまま | 実機 |
| M18 | up/取消/多重入力 | merge: 同じ計画再適用拒否 / browser: 二重up、pointercancel、touchCancel、別pointer、blur、ドラッグ中reset | OSアプリ切替・実機capture |
| M19 | 11→5+5+余り1 | merge: 明示個数、余り全値 / browser: 2色2組、4出力+余り1 | 実機 |
| M20 | 8→5+3 | merge: 個数8 / browser: 出力3、余り0 | 実機 |
| M21 | 組ごと予告 | merge: 組番号・ID重複なし / browser: 11体は各組5個、番号1/2 | 色の好み・実機視認性 |
| M22 | 消費予告一致 | merge: 計画から消失ID集合一致 / browser: 表示groupの全IDが消費、preview中全配置不変 | 実機 |
| M23 | 出力座標 | merge: 第1出力ドロップ先・各組セル / browser: ↑セルと結果セル一致 | 実機 |
| M24 | Tier見た目 | slime: 1〜30の番号/配色が別、1緑2青3赤、縞/発光 / browser: 実際に1→2→3、画像確認 | 全30体の完成アートは対象外 |
| M25 | 指離し前の予告 | browser: 390/320pxのCDP touchStart→touchMove中のgroup/余り/出力を検証、touchEndで初めて確定 | 実スマートフォン・Safari |
| M26 | 必須2体＋近い3体 | merge: 11体の消費IDを明示期待値と比較 | 実機 |
| M27 | 同距離固定順 | merge: Chebyshev→y→xの具体ID、出力座標 | 距離・昇順は暫定 |
| M28 | 再現可能性 | merge: 10反復、入力配列逆転でも同計画 | 実機 |
| M29 | 組・余り一致 | merge: deep freeze計画から適用、余りID / browser: 予告と結果 | 実機 |
| M30 | 11体の組内出力 | merge: 具体4座標・各組素材セル・余り保全 / browser: 全幅で一致 | 実機 |
| M31 | 分割後非連結OK | merge: 第2組が3+2に離れていても5体組で出力2 | 実機 |
| M32 | 出力予告一致 | merge/browser: 計画の座標と結果一対一、セル重複なし | 実機 |
| M33 | 高Tier進化 | merge: Tier1〜29すべてを次Tierへ / browser:29→30 | 実機 |
| M34 | Tier30上限 | merge: 無消費・元参照維持 / browser:30重ねが失敗して全値維持 | 上限UXは暫定 |
| M35 | 最高到達Tier | merge: 新Tierで上昇、低Tier消費/移動で低下なし、プリセット初期値 / browser: Tier3到達 | 保存/復旧はPhase2 |

追加の守り：重複ID・重複セル・不正Tier・履歴より高いTier・不正境界・範囲外座標の拒否、旧ID/新ID衝突・空ID・ID源例外の原子的取消、改変/重複出力や二重消費、revisionを更新しない状態変更でも古いsnapshotの拒否、符号付き座標原点・パン後の座標変換。

アニメーション：ブラウザでCSS `pop-in` と `prefers-reduced-motion: reduce` 時の `none` を確認。映像としての滑らかさや実端末の性能をこの検証だけで証明したとは扱わない。
