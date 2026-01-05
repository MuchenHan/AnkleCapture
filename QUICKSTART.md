# 🚀 Quick Start - GitHub Pagesデプロイ

## 1️⃣ GitHubリポジトリ作成

1. https://github.com → 「New repository」
2. Repository name: `ankle-measurement`
3. **Public** を選択
4. 「Create repository」

## 2️⃣ コードをプッシュ

ターミナルで実行:

```bash
# 自分のGitHubユーザー名に変更してください
git remote add origin https://github.com/[ユーザー名]/ankle-measurement.git
git push -u origin main
```

## 3️⃣ GitHub Pagesを有効化

1. リポジトリページ → **Settings** → **Pages**
2. Source: `main` / Folder: `/ (root)`
3. 「Save」をクリック
4. 数分後、URLが表示される

## 4️⃣ iPhoneでアクセス

Safari で開く:
```
https://[ユーザー名].github.io/ankle-measurement/webapp/
```

## ✅ 確認事項

- [ ] HTTPS URLでアクセスできる
- [ ] カメラ権限を許可
- [ ] モーションセンサー権限を許可
- [ ] 撮影できる
- [ ] 角度測定できる
- [ ] データエクスポートできる

---

詳細は [DEPLOYMENT.md](file:///Users/tianyihan/repository/4-BW_image-J/DEPLOYMENT.md) を参照
