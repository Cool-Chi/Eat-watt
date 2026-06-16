# 🍽️ Eat-watt (呷啥) - 幫你選晚餐

這是一個專為解決「晚餐吃什麼」世紀難題而設計的網頁應用程式 (PWA)。採用了簡約精緻的 Apple iOS 設計美學，並內建深淺色模式切換，讓你在決定晚餐時也能享受極致流暢的互動體驗！

🎉 **目前版本：v1.3 盧昂 (Rouen)** *Rouen 更新帶來了「全域懸浮 Emoji Picker」，允許自由點擊置換資料夾圖標，並將核心 UI 渲染與事件處理器進行了徹底的模組化解耦拆分。*

## ✨ 精選特色 (Features)

* **四大互動遊戲**：內建 老虎機 🎰、擲骰子 🎲、翻撲克牌 🃏、幸運輪盤 🎡 四種隨機決定模式。
* **智慧預算篩選**：支援多選 $（平價）、$$（中價位）、$$$（奢華）標籤，下方即時以精緻標籤 (Badges) 預覽當前抽籤名單。
* **資料夾專屬圖標選單 (v1.3 New!)**：點擊資料夾圖示可直接喚醒具備毛玻璃質感的全域懸浮 Emoji 選擇器，快速切換美食分類標籤，並為下一階段的多維度篩選奠定結構化資料基礎。
* **無限樹狀資料夾收納**：可建立「無限深度的資料夾」將食物分層分類。擁有極度嚴謹的「防黑洞遞迴機制」，確保操作穩定性。並帶有視覺引導輔助線。
* **極致的 UX 互動體驗**：
  * **智慧滑動手勢 (Swipe)**：向左滑動刪除、向右滑動重新命名。具備精準的斜率防誤觸判定與嚴密防冒泡機制。
  * **原生級拖曳排序 (Drag & Drop)**：透過左側 `☰` 手柄即可順滑上下拖曳。支援自動邊緣滾動、實體卡片浮起視覺、懸停自動開門歸檔。
* **資料匯出 / 匯入系統**：支援將精心整理的晚餐名單匯出為 `.json` 檔案或一鍵複製，隨時備份或分享給朋友；並具備防呆校驗的匯入功能。
* **深淺色模式與視覺優化 (v1.3 Update!)**：優化了 Light/Dark Mode 的陰影層次感，卡片邊緣增加銳化微邊框，深淺色切換過渡更加流暢絲滑。
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
├── index.html          # 網頁主結構、Modal 與 PWA 宣告
├── manifest.json       # PWA 應用程式設定檔
├── sw.js               # Service Worker 快取腳本
├── css/                # 模組化樣式
│   ├── base.css        # 全域變數、深淺模式切換與全域過渡
│   ├── layout.css      # Sidebar 與 Main Panel 側邊欄版面佈局
│   ├── components.css  # 主題開關、按鈕、Modal 與 Emoji Picker 樣式
│   ├── list.css        # 清單項目、Swipe 手勢視覺與輔助線
│   └── games.css       # 四款隨機遊戲的專屬動畫與排版
└── js/                 # ES6 模組化腳本
    ├── main.js         # 程式入口、全域掛載與 PWA 註冊
    ├── store.js        # 狀態管理、資料樹維護與 LocalStorage 存取
    ├── games.js        # 四款遊戲的核心邏輯引擎
    └── ui/             # UI 渲染與互動核心模組目錄 (v1.3 Refactor!)
        ├── index.js    # UI 模組總出口（Aggregator）
        ├── core.js     # 過濾邏輯、遊戲池預覽與方法切換調度
        ├── picker.js   # 全域 Emoji 選擇器元件邏輯
        ├── gestures.js # Swipe 側滑手勢辨識引擎
        ├── render.js   # DOM 節點工廠與 SortableJS 綁定
        ├── actions.js  # CRUD 動作觸發與行內編輯處理器
        └── modals.js   # JSON 資料匯入匯出視窗控制器