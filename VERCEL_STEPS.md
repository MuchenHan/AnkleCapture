# 🚀 Vercel部署步骤 - 跟着做

## 当前页面：Vercel新建项目

![Vercel部署页面](/Users/tianyihan/.gemini/antigravity/brain/c772506f-392b-4644-ae56-96b2ad743c6b/vercel_new_project_page_1767606848801.png)

---

## 📋 步骤1：登录并授权GitHub

在上面的页面中，点击 **"Continue with GitHub"** 按钮

这将：
1. 跳转到GitHub登录页面（如果还未登录）
2. 让GitHub授权Vercel访问您的仓库
3. 选择授权范围（建议选择"All repositories"或只选择"AnkleCapture"）

---

## 📋 步骤2：选择仓库

授权后，您会看到您的GitHub仓库列表：

1. 找到 **`MuchenHan/AnkleCapture`**
2. 点击旁边的 **"Import"** 按钮

---

## 📋 步骤3：配置项目（关键步骤！）

在"Configure Project"页面：

### ⚠️ 重要配置

1. **Framework Preset**: 保持 `Other` 即可

2. **Root Directory** ← **这是关键！**
   - 点击"Root Directory"旁边的 **"Edit"** 按钮
   - 在弹出的输入框中输入：`webapp`
   - 勾选确认框

3. **Build and Output Settings**: 保持默认（不需要修改）

4. **Environment Variables**: 留空（不需要）

---

## 📋 步骤4：部署

配置完成后：

1. 点击页面底部的蓝色 **"Deploy"** 按钮
2. 等待1-2分钟（会显示部署进度）
3. 部署成功后会显示：
   ```
   🎉 Congratulations!
   Your project has been deployed to:
   https://ankle-capture-xxxxx.vercel.app
   ```

---

## 📋 步骤5：获取URL并测试

1. **复制部署URL**（以 `https://` 开头）
2. **用iPhone Safari打开这个URL**
3. 开始测试应用！

---

## ✅ 检查清单

部署过程中确认：
- [ ] 已用GitHub账户登录Vercel
- [ ] 已授权Vercel访问GitHub仓库
- [ ] 选择了 `AnkleCapture` 仓库
- [ ] **Root Directory 设置为 `webapp`** ← 最重要！
- [ ] 点击了Deploy按钮
- [ ] 看到部署成功的庆祝页面
- [ ] 获得了HTTPS URL

---

## 🎯 常见问题

**Q: 找不到"Edit"按钮？**
A: 在"Root Directory"那一行的右侧，有一个小的"Edit"链接

**Q: 部署失败？**
A: 检查Root Directory是否正确设置为 `webapp`

**Q: 部署成功但访问404？**
A: URL后面加上 `/` ，确保访问的是根目录

---

现在请按照步骤操作！遇到任何问题随时告诉我。
