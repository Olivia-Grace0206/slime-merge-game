# Phase4A 独立不変条件監査

同一担当の別観点であり第三者レビューではない。起点main582b99cをclone/PR16メタデータと照合。

| 領域 | 旧実装 | 変更/保全 |
|---|---|---|
| 基本売却 | 2^Tier、number | 2×4^(Tier−1)、BigInt |
| 属性 | 炎ceil→黄金→闇→複合→floor、safe cap | 係数/順序保全。安全域互換丸めと高額整数比 |
| Wallet/Shop/研究 | number・ceil価格 | 通貨のみBigInt、全既存価格同一 |
| 金 | reward1/2、cap台帳、ID＋位置 | 旧単価保全、新reward3、新capなし、旧失効を再支給しない |
| 保存 | schema7、raw期待値、Locks/queue | schema8正規10進文字列。既存保存機構のソース不変 |
| 土地 | 4×4 rectangle | 8×8＋4区画mask。共通Core判定により配置/出庫/出現拒否 |
| 生成/マージ | 重み表/FIFO/3・5/8近傍/交換 | ルール保全、bounds判定だけ拡張 |
| 描画 | Phase3D装飾/3複合 | 同じmarkup/幾何。memoとCSS描画省略 |

Tier40の指定整数、Shop全段階旧式、全Lv/覚醒丸め、土地2順序/二重命令、旧schemaと途中台帳、保存エラー/競合を独立期待値で検査。SessionStore・属性継承・覚醒/特殊の数値設定・Tier重み・package/lock・Actions/Pagesは起点のまま。差分をgitで照合する。[検証](RESULTS.md)。

主な制限：BigIntの完全性は有限係数の整数比に対するもの。log2の実数無限精度や、別ブラウザのlibmの完全な同一性は主張しない。100,000文字の既存保存制限を維持。Web Locks未対応/非secure contextでは従来通り保存操作を停止する。セーブのdowngrade、オンライン同期、実機を含む性能保証は対象外。

旧検証用schema1 portable writerも監査し、安全整数の数値としてのみ旧形式を書き出す。高額の書出しはschema8を使うよう拒否する。安全な数値への変換は旧wire形式の可逆エンコードだけで、通貨演算には使わない。これにより旧writerが数値schema1へ文字列通貨を書き込む不整合を防ぐ。通常ゲームは常にschema8で保存する。
