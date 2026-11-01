# Phase 3A 引き継ぎ — 2026-11-01 JST

起点：main `225449c61671743c45c6c11d25bcae9be4323a9f`（PR #9マージ済み）。ブランチ `feature/phase03a-swap-attribute-core`。**新規Draft PR・main未マージ・Private/Pages設定維持**。最終HEAD・同SHAのCIはPR本文を参照。

正本：mainのv0.2.9を全文確認し、新しい[v0.3.0](specifications/Slime_Merge_Game_Specification_v0.3.0_2026-11-01.md)へ全文継承。過去の変更履歴は原文保持、CURRENT/READMEを更新。古い引き継ぎの未実装/Draftは当時の記録。今回の直接指示を優先する。

## 実装と境界

- `game.ts`/merge plan/apply：SwapPlanを追加。マージ優先、占有先で不成立なら位置交換。異Tier/2体/T40、研究上限/属性3種超過（後二者は暫定）。元/先ID・元座標・先座標・snapshot・理由を保持し、適用直前にcanonical planを完全照合。不正データでswapへ逃がさない。
- `attributes.ts`/`inheritance.ts`：10ID、readonly配列{id,level}。無属性=[]。最高Lv入力2体以上で+1、上限99。複数属性を独立継承、各組だけを入力、5体両出力へ通常属性をコピー、余りは全保持。上限超過なら大量merge全体をswapにし選抜/破棄なし。
- 生成：現行40行表を変更せず、生成時に仮3%で1属性Lv1を10IDから均等付与。Tierと同時にFIFOへ保存。storedTiersを保全し、同長/同順storedAttributesを追加。出庫では2配列の先頭を同時に消費し、失敗なら両方保持。Hは増やさない。
- 変異：仮1%/組、空き枠のみ、未所有から1ID/Lv1を均等追加。既存属性は削除しない。5体2出力に同じ組の1回の結果を共有し、5体限定の確率ボーナスなし。全乱数は外部注入。旧snapshot/消費IDの再要求で再抽選なし。保存失敗は未確定としてエラー停止する。
- UI：⇄点線2枠と交換理由、既存merge組枠と組別属性Lv、変異の可能性表示。顔/Tier/価格と分離した文字記号＋Lv。属性メニューの個体一覧→詳細はタッチ/キーボード対応、通常タップでモーダルなし。特殊効果は次段階と明示。
- GOLD：開始時の実属性種類数/Lvとは別の数と単価を凍結。swapでも対象ID+位置の離脱判定で閉じる。未払い失効、既払いとID/ledgerを保持、別ID引継ぎなし。既存イベントの単価を再計算しない。
- schema5：全保存個体attributes/FIFO storedAttributesを必須検査。v4は研究/GOLD/頻度/表示/保護/貯蔵/イベント契約/Tier40を保全して無属性を補完。v1〜3の従来移行も維持。不正ID/Lv/重複/属性付きに偽装した旧版/欠損/破損/未知版は原本保持で停止。
- `SessionStore`は無変更。Web Locks、単一queue、期待保存原文、単一setItem成功後publish。swapと属性mergeも同じ取引経路。失敗/別タブで元位置/素材/属性/財布を保持。

## 数値の確定度

3%付与、1%変異、通常属性3種、Lv99、最高Lv入力2体以上で+1、変異の組単位共有はすべて**未承認の試作値/技術暫定**。[3/8/18%比較](balance/phase3a/RESULTS.md)。旧Tier表/経済/研究/金の仮値を今回再承認扱いしない。

## 検証・復旧

[検証結果](validation/phase3a/RESULTS.md) / [実装後監査](validation/phase3a/AUDIT.md) / [Checkpoint](validation/phase3a/CHECKPOINTS.md)。ローカル実装履歴とremoteのcheckpoint A/B `f824d51`、C/D `b835a45`を保存。通常Git clone認証不可のためGitHub App取得/本物のremote parent＋base treeのpath差分で反映。ローカル仮祖先をremoteへ公開しない。最終treeで無関係blob・旧仕様・依存lock/CI/SessionStore保全を照合する。

既存394テストを削除せず、旧M13/M14/M34/研究上限取消の期待値だけ交換へ更新。経済/分布回帰は明示的に無属性・変異0で旧モデルを維持し、属性の本番経路は新テストで比較。旧schema fixturesは無属性配列を明示、旧ブラウザfixtureは属性省略と[]を意味上同一として比較し、移行先versionを5へ更新。旧検証資料を上書きせず今回ディレクトリへ出力する。

再現：Node22/npm10、npm ci/lint/test -- --run/build。Playwrightは隔離導入し、`PLAYWRIGHT_MODULE=/path/to/playwright node tests/browser/phase3a.cjs`。旧5runnerも`BROWSER_ARTIFACT_DIR`を今回配下へ向ける。日本語フォント（Noto CJK）を検証環境へ用意。PNGを配布用WebPへ圧縮しmanifestでhashを記録する。

## 未実装・ユーザー試遊

Phase3B：10属性実効果、複合効果、闇の消滅。Phase3C：紫/青/覚醒/分配/非複製/モヤ。Phase3D：完成装飾/詳細○×。属性上限・正式Lv式・変異率・覚醒分配/時間・闇率は未決定。土地/エリア/音/正式発見図鑑は別段階。

実Windows/実iPhone・iPad Safari/Android/Firefox、safe-area/OSジェスチャー、OSプロセス強制killとディスク耐久性、実機FPSは未確認。Linux Chromium+CDP touchを実機と混同しない。3種上限のため多属性個体が増えるとmergeしにくくなる制限は試作上の既知の点。自由な入替え/属性整理/保存/誤売却/小画面のLvを試遊してDraft PRのマージを判断。その後3Bの数値設計へ。
