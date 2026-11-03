# スライムマージゲーム — GitHub Pages 公開手順

## 公開対象

- 公開リポジトリ: https://github.com/Olivia-Grace0206/slime-merge-game
- 公開URL（有効化・デプロイ成功後）: https://olivia-grace0206.github.io/slime-merge-game/
- ベース: Phase 3C（PR #13がmainへマージ済み）
- 公開形態: 知人向けβテスト版。URLを知る人だけに制限する仕組みはありません。

## 初回設定（GitHub管理者の操作）

1. https://github.com/Olivia-Grace0206/slime-merge-game/settings/pages を開く。
2. **Build and deployment → Source → GitHub Actions** を選択する。
3. 作成済みの `.github/workflows/pages.yml` を使用する。提案された別のワークフローを新たに作る必要はない。
4. https://github.com/Olivia-Grace0206/slime-merge-game/actions/workflows/pages.yml から **Run workflow → Branch: main → Run workflow** を実行する（初回設定後や再公開時）。
5. 最後の **Publish GitHub Pages** が成功し、上記公開URLがHTTPSで表示できることを確認する。

GitHub Pagesの作成・Source設定は管理者権限が必要です。連携ツールから管理設定を操作できない場合、上記の初回設定を手動で行います。

## 自動デプロイ

以後、mainの更新でPagesワークフローが自動実行されます。

1. Node.js 22 / npm ci
2. ESLint
3. Vitest
4. TypeScript型検査とViteの本番ビルド
5. `dist` をPages用artifactにアップロード
6. すべて成功したときだけGitHub Pagesへデプロイ

Viteの `base: '/slime-merge-game/'` は現状維持。ゲームコード・データを変えず、Pages専用の自動配布を追加しています。

## 公開後の確認

- HTTPSでURLが開ける
- 404や白画面にならず、ゲーム盤面とスライムが表示される
- スライム追加・ドラッグ・マージ・位置交換・売却ができる
- 保存→ブラウザ再読み込みで盤面やGOLDが維持される
- PC・スマホそれぞれで操作できる
- 紫・青・GOLDマスが機能する
- ブラウザの開発者ツールのConsoleに致命的なエラーがない

## β版の注意

- まだ覚醒オーラの視認性、青マスのバフ表示、属性紹介UIは調整予定。
- 属性倍率、紫・青の時間、確率は試作用の仮値。
- セーブデータは各ブラウザのLocalStorageに保存し、端末間同期はしない。
- ドメインが変わるとセーブは自動移行されない。
- PublicリポジトリとGitHub Pagesは一般公開。秘密のデータや個人情報を追加しない。
- 現在のPhase 3Cはschema7。旧バージョンへのダウングレードは未対応。
