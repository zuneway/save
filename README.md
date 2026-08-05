# 存錢系統

React + Vite 打造的個人存錢追蹤 App。

## 功能

- **畫面 1**：首頁提供「建立存錢專案」按鈕
- 建立專案時可輸入名稱與目標金額
- 專案列表顯示進度條與完成百分比
- 資料保存在瀏覽器 `localStorage`

## GitHub 遠端

本專案已串接 GitHub 遠端：

```bash
origin  https://github.com/zuneway/save.git
```

首次推送前，請先在本機完成 GitHub 登入，然後執行：

```bash
git add .
git commit -m "初始化存錢系統"
git push -u origin main
```

若遠端已有內容，可先拉取再合併：

```bash
git pull origin main --allow-unrelated-histories
```

## 開始使用

請先安裝 [Node.js](https://nodejs.org/)，然後在專案目錄執行：

```bash
npm install
npm run dev
```

瀏覽器開啟終端機顯示的網址（通常是 `http://localhost:5173`）。

## 專案結構

```
src/
  components/
    HomeScreen.tsx          # 畫面 1：首頁與建立按鈕
    CreateProjectModal.tsx  # 建立專案對話框
  hooks/
    useSavingsProjects.ts   # 專案資料與 localStorage
  types/
    savings.ts
```
