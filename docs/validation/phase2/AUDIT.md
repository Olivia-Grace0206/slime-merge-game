# PR #8 独立監査 — Checkpoint A

監査日: 2026-10-31 JST。対象 HEAD `43d664ffa18bd4c6fa736a67933d6b0fdc2bb68a`、比較 main `9315898cd3ee24031f9e550a274f9dc6a234efe4`。

指定 CURRENT・v0.2.7全文・Phase1/1.1/Polish引き継ぎ・README・全実装/テスト/CIを照合。過去文書の「未マージ」は当時の記録と扱う。ローカル回収したPolishとGitHubの全blob manifestを照合し、差分5ファイルだけGitHub接続から取得。旧Core/仕様は維持する。

| ID | 初期判定 | 箇所・再現条件・原因 | 修正方針 / 追加試験 |
|---|---|---|---|
| A01 | PASS | generation: H履歴参照、1〜H、離散Gaussian正規化、乱数注入。盤面最高値と別管理 | 全H・統計抽選と境界を再検証 |
| A02 | PASS | advanceGenerator: 実時間差、空き容量上限、満杯時progress=0、出庫失敗で両状態不変 | FPS分割・数日offline・出庫直後を統合検証 |
| A03 | FIX | generation: totalGenerated加算のsafe integer超過、capacity巨大値、interval変更直後progress過剰を未制御 | 上限検証、強化前後timer正規化、異常乱数時全体拒否 |
| A04 | FIX | advance rollbackで未来updatedAtを維持し生成が長時間停止。保存時savedAt<updatedAtになる場合 | 統合時計巻戻りを一度rebasing、経過0で再開。jumpは容量まで |
| A05 | FIX | economy: `key in SHOP_BASE`がtoString等の継承プロパティも受理 | own key検証、不正key試験 |
| A06 | PASS | sellSlime: boardとwalletを一緒に返す、同ID削除、H非減少、safe integerで拒否 | UI単一状態＋保存先行で片側保存禁止 |
| A07 | PROVISIONAL | 2^Tier、shop1.7、10秒、1秒、10容量、μ=.75幅=.22Hは仮値 | 16マス・実Core使用で7軸比較。高HのTier分散/ショップ早期上限を記録 |
| A08 | FIX | payGoldRush(newWallet, oldEvent)でpaid=0を再利用すると何度も支給可。begin同IDも制限なし | 統合state内event ID/sequence/paid/receivedを唯一の正本とする。要求には期待支給番号のみ、古い要求は拒否 |
| A09 | FIX | save v1: event・paid・received・保護・設定が存在しない。nextIdと個体IDの整合なし | v2厳密検証、v1明示移行/不対応判定、原子的storage adapter |
| A10 | FIX | LocalStorage未接続。破損読込→初期状態autosaveで上書きする危険 | 読込失敗時停止・原データ保全、保存失敗でcommit拒否、再試行。Web Locks＋保存原文照合で別タブ上書き拒否 |
| A11 | FIX | UIは7×7検証のみ、通常進行と保存の分離なし | 4×4通常と7×7検証を別state。検証は通常saveに書かない |
| A12 | FIX | withdrawal IDを呼出側へ任せ、連打/再起動で重複し得る | 永続単調ID、出庫要求の期待IDと取消gate、shop期待Lv、売却確認 |
| A13 | PROVISIONAL | gold unit最低1によりTier1/2報酬が同額、属性差も消える | 小額でもTier/属性順を保つ仮報酬へ。発生/保持/支給間隔を比較 |

BLOCKED: 初期段階で実装継続を妨げる仕様上の障害はなし。直接git認証なしのためGit Data APIで元HEADを親として反映する。Node22/npm10を既存の隔離runtimeから使用。外部実機/Safariは利用できる環境と区別する。

各FIXの最終結果・対応テストは後続RESULTS/HANDOFFに追記する。既存231成功は安全性の証明に使用しない。
