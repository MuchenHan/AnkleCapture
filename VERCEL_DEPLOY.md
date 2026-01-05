# 🚀 Vercel部署ガイド（無料・簡単！）

## なぜVercel？

- ✅ **完全無料**
- ✅ **プライベートリポジトリ対応**
- ✅ **自動HTTPS**
- ✅ **GitHubと自動連携**
- ✅ **数分でデプロイ完了**

---

## 📋 デプロイ手順（5ステップ）

### 1️⃣ Vercelにアクセス

https://vercel.com にアクセス

### 2️⃣ GitHubでサインアップ

1. 「Sign Up」をクリック
2. 「Continue with GitHub」を選択
3. GitHubアカウントで認証

### 3️⃣ 新規プロジェクトをインポート

1. ダッシュボードで「Add New」→「Project」
2. 「Import Git Repository」セクションで `AnkleCapture` を探す
3. 「Import」をクリック

### 4️⃣ プロジェクト設定

**Configure Project** 画面で:

- **Framework Preset**: `Other` のまま
- **Root Directory**: `webapp` を選択
  - 「Edit」をクリック → `webapp` と入力
- **Build Settings**: そのまま（変更不要）

### 5️⃣ デプロイ

「Deploy」ボタンをクリック！

**1〜2分で完了** 🎉

---

## 📱 デプロイ完了後

デプロイが成功すると、以下のようなURLが表示されます:

```
https://ankle-capture-xxxxx.vercel.app
```

このURLをiPhoneのSafariで開いてください！

---

## ✅ テストチェックリスト

iPhoneで以下を確認:

- [ ] URLにアクセスできる（HTTPS）
- [ ] カメラ権限ダイアログが表示される
- [ ] カメラが起動する
- [ ] グリッドとガイドが表示される
- [ ] 水平仪（モーションセンサー）が動作する
- [ ] 4ステップを完了できる
- [ ] 撮影できる
- [ ] 3点マーキングできる
- [ ] 角度が計算される
- [ ] CSV/JSON/画像をダウンロードできる

---

## 🔄 更新時の自動デプロイ

コードを変更した後:

```bash
git add .
git commit -m "更新内容"
git push
```

**Vercelが自動的に再デプロイします**（数十秒で完了）

---

## 💡 便利な機能

- **プレビュー環境**: プルリクエストごとに自動プレビューURL生成
- **分析**: アクセス数や性能を確認可能
- **カスタムドメイン**: 独自ドメインの設定可（無料）

---

## 🆘 困ったら

### Root Directoryが見つからない

設定画面で「Edit」ボタンを見逃している可能性:
- Framework Presetの下の「Root Directory」の横に小さな「Edit」リンクあり

### デプロイが失敗する

- Build Commandは空でOK
- Install Commandも空でOK
- 単純な静的サイトなので設定不要

### URLにアクセスできない

- 少し待ってから再度アクセス（数分かかる場合あり）
- Vercelダッシュボードで「Deployments」タブを確認

---

## 🎉 完成！

Vercelの方がGitHub Pagesより簡単で高機能です。

次のステップ:
1. Vercelにサインアップ
2. AnkleCaptureをインポート
3. Root Directoryを`webapp`に設定
4. Deploy！
5. iPhoneでテスト

**数分で完了します！** 🚀
