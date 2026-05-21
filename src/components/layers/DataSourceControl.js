import { useState } from 'react';

export default function DataSourceControl() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div 
      className="absolute bottom-[68px] left-4 z-[1000] flex flex-col items-start"
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {/* 展開的氣泡內容 */}
      <div 
        className={`
          bg-white/95 backdrop-blur-md border border-slate-200/60 shadow-xl rounded-xl overflow-hidden
          transition-all duration-300 ease-out origin-bottom-left
          ${isExpanded ? 'max-h-96 opacity-100 scale-100 mb-2' : 'max-h-0 opacity-0 scale-95 mb-0'}
        `}
      >
        <div className="p-4 text-xs text-slate-600 space-y-3 font-medium min-w-[260px] max-w-[320px]">
          <p className="font-bold text-slate-800 border-b border-slate-200/80 pb-2 mb-2 text-sm">
            資料來源與鳴謝
          </p>
          
          <div>
            <p className="font-bold text-slate-700 mb-1">📖 專案發起與踏查內容</p>
            <p className="pl-4 text-slate-500 leading-relaxed">臺北市信義社區大學 — 「信水義河」專案</p>
          </div>

          <div>
            <p className="font-bold text-slate-700 mb-1">🗺️ 基礎圖資與圖台支援</p>
            <ul className="pl-4 text-slate-500 list-disc list-inside leading-relaxed">
              <li>OpenStreetMap 貢獻者</li>
              <li>CARTO (底圖樣式)</li>
            </ul>
          </div>

          <div>
            <p className="font-bold text-slate-700 mb-1">🏛️ 歷史地圖與航照圖</p>
            <p className="pl-4 text-slate-500 leading-relaxed">中央研究院 人社中心 GIS 專題中心（包含 1904 臺灣堡圖、1921 地形圖、1939 瑠公水利區域圖、1945 美軍地圖、1989 地形圖等）</p>
          </div>

          <div>
            <p className="font-bold text-slate-700 mb-1">📊 政府開放資料 (Open Data)</p>
            <ul className="pl-4 text-slate-500 list-disc list-inside leading-relaxed">
              <li>臺北市政府資料開放平台（行道樹、人行道、都市計畫分區）</li>
              <li>地表溫度感測資料 (2024夏)</li>
            </ul>
          </div>
        </div>
      </div>
      
      {/* 預設顯示的小按鈕 */}
      <div className="bg-white/90 backdrop-blur-md border border-slate-200/60 shadow-md rounded-full px-3.5 py-1.5 text-[11px] font-bold text-slate-700 cursor-pointer hover:bg-slate-50 transition-colors flex items-center gap-1.5">
        <span>資料來源</span>
        <span className="text-sm">ℹ️</span>
      </div>
    </div>
  );
}
