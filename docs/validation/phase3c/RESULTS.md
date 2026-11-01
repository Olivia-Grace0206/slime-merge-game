# Phase3C 復旧検証（未完成）

前回の作業フォルダー/ログ/画像がこの実行環境に残っていないため、前回755件のブラウザ成功記録を今回の証跡として再使用しない。現行mainを再取得してから再実行した結果だけを掲載する。

- npm ci成功：recovery-npm-ci.txt。
- Lint成功：recovery-lint.txt。
- 関連4ファイル178件成功：recovery-tests.txt。新規の覚醒21件を含む。
- Build/型チェック成功：recovery-build.txt。
- 全回帰はrecovery-full-vitest.txt（実行終了後に件数を確定する）。
- ブラウザ・10サイズ・画像・紫青・schema7は復旧未完了。前回の画像/結果は今回のブランチに存在しない。

32,768配分は同じ実装関数の再計算ではなく、入力属性別個数から独立した上限min(入力数,出力数)と集中条件を照合する。第三者レビューではない。テストの旧未知プロパティcaseはawakened boolean採用に合わせ非boolean拒否へ変更し、削除していない。

詳細な再開順序は[引き継ぎ](../../PHASE3C_HANDOFF.md)。このDraft PRは途中成果。Phase3C完成・試遊可能と報告しない。

復旧最初の単体試験では出力へのフラグ適用が未接続で6ケース失敗した（attempt-before-output-wiring.txt）。withAwakeningsの接続後、同じ6ケースを含む178件を再実行して成功。失敗記録も区別して保全した。
