# Phase 3A Checkpoints — 2026-11-01 JST

A: 最新main 225449c61671743c45c6c11d25bcae9be4323a9f、Private確認。CURRENT/v0.2.9全文、指定引き継ぎ・追加監査・比較・Core/UI/保存/テストを調査。CURRENT等に残る旧Draft状態は履歴として読み、今回の指示を優先。
Git clone認証不可のためGitHub App取得、ローカルsnapshotを基準に編集。remoteは本物のmainを親にbase tree差分だけを反映し、仮祖先は公開しない。

設計: DropPlan.swap。マージ優先・不成立のみ交換。不正/保存失敗は交換へfallbackしない。GOLDのID+位置照合を保持。属性はreadonly配列{id,level}、属性数3/Lv99は技術暫定。貯蔵はstoredTiersを保ち同順storedAttributesを追加、FIFOを最小差分で拡張。schema5は属性必須、旧schemaは無属性を明示補完。変異は確定時に組ごと一度、5体固有優遇なし。SessionStoreは変更しない。

B: swap Core/プレビュー実装中。以降のSHAはGit履歴と最終PR本文を参照。
