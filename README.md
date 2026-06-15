# 🍽️ Eat-watt (呷啥) - 幫你選晚餐 v1.0

這是一個專為解決「晚餐吃什麼」世紀難題而設計的網頁應用程式 (PWA)。採用了簡約精緻的 Apple iOS 設計美學，並內建深淺色模式切換，讓你在決定晚餐時也能享受極致流暢的互動體驗！

🎉 **v1.0 正式版發布！** 經歷了全面的架構重構與 UX 升級，現在擁有更順滑的手勢操作與更強大的自訂功能。

## ✨ 精選特色 (Features)

* **四大互動遊戲**：內建 老虎機 🎰、擲骰子 🎲、翻撲克牌 🃏、幸運輪盤 🎡 四種隨機決定模式。
* **智慧預算篩選**：支援多選 $（平價）、$$（中價位）、$$$（奢華）標籤，下方即時以精緻標籤 (Badges) 預覽當前抽籤名單。
* **原生級手勢操作 (New!)**：
  * **滑動手勢 (Swipe)**：參考 Telegram 風格，向左滑動刪除、向右滑動重新命名，支援展開與點擊確認，防誤觸體驗極佳。
  * **拖曳排序 (Drag & Drop)**：按住左側 `☰` 手柄即可順滑上下拖曳排序卡片。
* **資料夾收納系統 (New!)**：可建立「菜單」資料夾，將食物分類收納，並支援跨層級的拖曳歸檔。
* **深淺色模式**：精緻的動態切換開關，隨系統或心情自由切換亮色與暗色主題。
* **PWA 離線支援**：支援安裝至手機主畫面，即使在無網路狀態下也能正常開啟並抽取晚餐。

## 🛠️ 開發技術與架構 (Tech Stack)

全面採用模組化架構開發，確保專案的高效能與可維護性：

* **前端架構**：HTML5, CSS3, 原生 JavaScript (ES6 Modules)
* **樣式架構 (SMACSS/ITCSS)**：將 CSS 拆分為 Base, Layout, Components, List, Games 等獨立模組。
* **核心依賴**：
  * `SortableJS`：提供極致流暢的硬體加速拖曳體驗。
  * `HTML5 Canvas`：用於高效繪製幸運輪盤。
* **本地儲存**：使用 `LocalStorage` 儲存樹狀資料夾結構與深淺色偏好設定。
* **PWA**：透過 `Service Worker` (`sw.js`) 實作靜態資源快取。

## 📂 檔案結構 (Project Structure)

```text
Eat-watt/
├── index.html          # 網頁主結構與 PWA 宣告
├── manifest.json       # PWA 應用程式設定檔
├── sw.js               # Service Worker 快取腳本
├── css/                # 模組化樣式
│   ├── base.css
│   ├── layout.css
│   ├── components.css
│   ├── list.css
│   └── games.css
└── js/                 # ES6 模組化腳本
    ├── main.js         # 程式入口、全域掛載與 PWA 註冊
    ├── store.js        # 狀態管理與 LocalStorage 存取
    ├── ui.js           # DOM 操作、手勢綁定與渲染邏輯
    └── games.js        # 四款遊戲的核心邏輯引擎