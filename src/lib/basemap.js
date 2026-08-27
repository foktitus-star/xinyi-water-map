// 共用底圖設定（主地圖與問卷小地圖共用，改這裡即可全站生效）
//
// 2026-08 起 CARTO 要求 API key：不帶 key 的圖磚仍會回 HTTP 200，
// 但整張圖會被斜印「API KEY REQUIRED」浮水印，街名幾乎看不清。
// 免費 key（每曆月 500 萬次 tile request，不需註冊帳號，填 email 即發）：
//   https://carto.com/basemaps/apikey
// 取得後：
//   1. 本機 → 在 .env.local 填 NEXT_PUBLIC_CARTO_KEY=你的key，重啟 npm run dev
//   2. 正式站 → Vercel 專案 Settings → Environment Variables 加同名變數後重新部署
// 未設定時會自動 fallback 成不帶 key 的網址（畫面有浮水印，但功能不會壞）。

const CARTO_KEY = process.env.NEXT_PUBLIC_CARTO_KEY;

/** CARTO light 底圖網址（有設 key 就自動帶上） */
export const CARTO_LIGHT_URL =
  `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png${CARTO_KEY ? `?key=${CARTO_KEY}` : ''}`;

/** CARTO 底圖的版權標示（使用條款要求保留） */
export const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>';

/** 目前是否已設定 CARTO key（可用於除錯提示） */
export const HAS_CARTO_KEY = Boolean(CARTO_KEY);
