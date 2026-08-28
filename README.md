# 信水義河 — 信義社大水文導覽互動地圖

四條路線、57 個站點，帶你走讀台北信義區兩百年的水文故事。

## 路線總覽

| 路線 | 名稱 | 站數 | 起點 | 顏色 |
|------|------|------|------|------|
| 路線一 | 瑠公圳水泱泱 三犁農田綠昂揚 | 17 站 | 六張犁捷運站 | 🔵 藍色 |
| 路線二 | 信義之源 陂水之觀 | 12 站 | 永春捷運站 | 🟢 綠色 |
| 路線三 | 錫口 五分埔支線 | 12 站 | 象山站周邊 | 🟠 橙色 |
| 路線四 | 東西神 三大排水系 | 16 站 | 象山公園 | 🟣 紫色 |

## 技術架構

- **Framework**: Next.js 16 (App Router)
- **地圖**: react-leaflet + Leaflet.js
- **底圖**: OpenStreetMap (免費，無需 API Key)
- **樣式**: Tailwind CSS v4
- **部署**: Vercel

## 本地開發

```bash
# 安裝依賴
npm install

# 開發模式
npm run dev
# → http://localhost:3000

# 正式建置
npm run build
npm start
```

## 部署到 Vercel

```bash
# 方法一：Vercel CLI
npm i -g vercel
vercel

# 方法二：GitHub 連動
# 推送至 GitHub，在 Vercel Dashboard 匯入 repo 即可
```

## 資料來源

站點資料來自 [xycc.pages.dev](https://xycc.pages.dev)（信義社大水文化脈絡特展）

## 專案結構

```
xinyi-water-map/
├── src/
│   ├── app/
│   │   ├── page.js           # 首頁（landing + 地圖 + 側欄分頁）
│   │   ├── layout.js         # Root layout + 字型 + SEO
│   │   ├── globals.css       # 全域樣式（注意：為全螢幕地圖鎖住 html/body 捲動）
│   │   ├── survey/           # 熱舒適經驗調查問卷（居民活動用）
│   │   ├── admin/            # 管理後台（審核回饋、匯出）
│   │   ├── privacy/          # 隱私權說明
│   │   └── api/              # survey-submit、feedback-node、temperature、
│   │                         #  summarize、describe-image、detect-faces…
│   ├── components/
│   │   ├── MapView.js        # 核心地圖元件
│   │   ├── forms/            # 問卷與回饋表單（含地圖點選）
│   │   └── layers/           # 歷史地圖、衛星、日照、溫度、分區等圖層
│   ├── lib/
│   │   ├── basemap.js        # 底圖網址與版權標示（CARTO API Key 由此帶入）
│   │   └── gas-template.js   # Google Apps Script 範本
│   └── data/routeData.js     # 四條路線完整站點資料
├── public/
│   ├── CHANGELOG.md          # 更新日誌（網站 UI 會動態讀取，每次改動都要更新）
│   └── TaipeiTree_filtered.json  # 行道樹資料（由 processTrees.js 產生）
├── processTrees.js           # 行道樹原始資料前處理腳本
├── vercel.json               # Vercel 部署設定
└── .env.local                # 金鑰（不在 git，需手動放置）
```

## 環境變數

| 變數 | 用途 |
|------|------|
| `NODE_SHEETS_API_URL` / `SHEETS_API_URL` | Google Apps Script webhook（回饋寫入試算表） |
| `GEMINI_API_KEY` | AI 語音整理與圖片轉譯 |
| `NEXT_PUBLIC_CARTO_KEY` | CARTO 底圖金鑰（未設定時圖磚會被印上浮水印） |
| `ADMIN_PASSCODE` | 管理後台 `/admin` 密碼 |
| `GEE_PRIVATE_KEY` / `GEE_CLIENT_EMAIL` | 地表溫度圖層的 Google Earth Engine 服務帳號憑證 |
