# 慢存

React + Vite 打造的個人存錢追蹤 App，可在手機瀏覽器開啟，也能安裝到主畫面當 App 使用（PWA）。

## 手機使用方式

### 方式一：公開網址（推薦）

部署到 GitHub Pages 後，用手機開啟：

**https://zuneway.github.io/save/**

| 系統 | 安裝到主畫面 |
|------|-------------|
| **iPhone (Safari)** | 分享 →「加入主畫面」 |
| **Android (Chrome)** | 選單 →「安裝應用程式」或「加到主畫面」 |

首次開啟後可離線使用（資料存在手機瀏覽器本機）。

### 方式二：同一 Wi‑Fi 本機預覽

電腦執行：

```bash
npm install
npm run dev
```

終端機會顯示 Network 網址（例如 `http://192.168.x.x:5173`），用手機瀏覽器開啟即可。

## 啟用 GitHub Pages

1. 把程式推到 GitHub（`main` 或 `master`）
2. 打開 repo → **Settings → Pages**
3. **Source** 選 **GitHub Actions**
4. 推送後等待 Actions 的 `Deploy to GitHub Pages` 完成
5. 用手機開啟 `https://zuneway.github.io/save/`

本機也可先驗證 Pages 建置：

```bash
npm run build:pages
npm run preview
```

## 功能摘要

- 建立專案、資料夾、拖曳整理
- 每日完成、隨機分配、提早／補存入
- 資料保存在瀏覽器 `localStorage`

## 開發指令

```bash
npm install
npm run dev      # 本機開發（含區網可連）
npm run build    # 一般建置
npm run build:pages  # GitHub Pages 建置（base=/save/）
npm run preview
```
