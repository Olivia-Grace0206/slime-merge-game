# Phase 3A Checkpoints — 2026-11-01 JST

A: 最新main 225449c61671743c45c6c11d25bcae9be4323a9f、Private確認。CURRENT/v0.2.9全文、指定引き継ぎ・追加監査・比較・Core/UI/保存/テストを調査。CURRENT等に残る旧Draft状態は履歴として読み、今回の指示を優先。
Git clone認証不可のためGitHub App取得、ローカルsnapshotを基準に編集。remoteは本物のmainを親にbase tree差分だけを反映し、仮祖先は公開しない。

設計: DropPlan.swap。マージ優先・不成立のみ交換。不正/保存失敗は交換へfallbackしない。GOLDのID+位置照合を保持。属性はreadonly配列{id,level}、属性数3/Lv99は技術暫定。貯蔵はstoredTiersを保ち同順storedAttributesを追加、FIFOを最小差分で拡張。schema5は属性必須、旧schemaは無属性を明示補完。変異は確定時に組ごと一度、5体固有優遇なし。SessionStoreは変更しない。

B: swap Core/プレビュー実装中。以降のSHAはGit履歴と最終PR本文を参照。

C/D: 10属性、生成時抽選/FIFO属性、組ごと継承/+1（暫定）、組1%新規属性変異（暫定）、3属性超過swap、属性バッジ/一覧/詳細/継承プレビュー、schema5とv1〜4移行を実装。重点414テスト成功、型チェック/Build成功。既存fixtureを無属性へ明示し、旧取消をswap期待へ更新。SessionStoreは原文保全。途中失敗ログは最終成功件数に含めない。

E（再検証中）: 日本語フォントを用意。3/8/18%の4500生成・450保存比較から3%を仮採用。旧回帰101/36/60/54は成功。viewport試験でResizeObserver通知前のpointerup競合を検出し、開始/確定時window寸法とviewport実測のguardを追加。疎属性配列も拒否。最終ビルドの全runnerと498件の再試験を実行中。途中試験と最終証跡を区別する。

E完了: 498/498（17files）、Node22.23.4/npm10.9.9のnpm ci/lint/build成功。既存374＋新規74＝448 browser PASS、10画面一画面/寸法維持。回転guardを入れた120回帰も成功。再開後にドラッグ/詳細のバッジ寸法を修正し、74操作と矩形検査を再成功。保存/金イベントの交換とQuotaも実UIで検証。

F: v0.3.0/CURRENT/README/PHASE3A_HANDOFF/監査/検証/確率比較/主要スクリーンショットを整備。remoteのEはda27e84、最終HEAD/CIはDraft PR本文で固定。main/Private/Pagesは変更せず、ユーザー試遊・マージ判断待ちで停止する。
