'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

// Leaflet needs `window` — load only on client side
const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-dvh bg-[#0f0f1a]">
      <div className="text-center">
        <div className="inline-block w-10 h-10 border-3 border-white/20 border-t-blue-400 rounded-full animate-spin mb-4" />
        <p className="text-white/60 text-sm tracking-widest">
          載入地圖中…
        </p>
      </div>
    </div>
  ),
});

export default function HomePage() {
  const [activeTab, setActiveTab] = useState('map'); // 'usage', 'map', 'layers', 'form', 'history'
  const [fontSize, setFontSize] = useState('medium'); // 'small', 'medium', 'large'

  // Calculate font scale multiplier
  const fontScale = fontSize === 'small' ? 0.875 : fontSize === 'large' ? 1.125 : 1;

  return (
    <main className="relative w-full h-dvh flex overflow-hidden bg-slate-900" style={{
      '--font-scale': fontScale,
    }}>
      {/* ── Left Sidebar ── */}
      <nav className="z-[2000] w-24 md:w-32 bg-slate-900/95 backdrop-blur-md border-r border-white/10 flex flex-col items-center py-6 gap-4 shadow-2xl">
        <div className="text-blue-400 text-xl font-black mb-4">信</div>
        
        <button 
          onClick={() => setActiveTab('usage')}
          className={`group relative p-3 rounded-xl transition-all duration-300 text-sm font-semibold ${activeTab === 'usage' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-white/5'}`}
          title="使用方法 (How to Use)"
        >
          <span>❓ 使用方法</span>
          <span className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">How to Use</span>
        </button>

        <button 
          onClick={() => setActiveTab('map')}
          className={`group relative p-3 rounded-xl transition-all duration-300 text-sm font-semibold ${activeTab === 'map' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-white/5'}`}
          title="地圖 (Map)"
        >
          <span>🗺️ 地圖</span>
          <span className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">Map</span>
        </button>

        <button 
          onClick={() => setActiveTab('layers')}
          className={`group relative p-3 rounded-xl transition-all duration-300 text-sm font-semibold ${activeTab === 'layers' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-white/5'}`}
          title="圖層說明 (Layers)"
        >
          <span>📊 圖層說明</span>
          <span className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">Layers</span>
        </button>

        <button 
          onClick={() => setActiveTab('form')}
          className={`group relative p-3 rounded-xl transition-all duration-300 text-sm font-semibold ${activeTab === 'form' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-white/5'}`}
          title="回饋表單 (Feedback)"
        >
          <span>📝 回饋表單</span>
          <span className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">Feedback</span>
        </button>

        <button 
          onClick={() => setActiveTab('history')}
          className={`group relative p-3 rounded-xl transition-all duration-300 text-sm font-semibold ${activeTab === 'history' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-white/5'}`}
          title="歷史故事 (History)"
        >
          <span>📚 歷史故事</span>
          <span className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">History</span>
        </button>

        <div className="mt-auto opacity-20 text-[10px] font-mono -rotate-90 whitespace-nowrap tracking-[0.3em] text-white">XINYI_MAP</div>

        {/* Font Size Selector */}
        <div className="mt-4 pt-4 border-t border-white/10 flex flex-col gap-2 w-full px-2">
          <p className="text-[10px] text-white/50 text-center font-semibold">字體大小</p>
          <div className="flex gap-1 justify-center">
            <button
              onClick={() => setFontSize('small')}
              className={`px-2 py-1 rounded text-xs font-semibold transition-all ${
                fontSize === 'small'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}
              title="小"
            >
              A
            </button>
            <button
              onClick={() => setFontSize('medium')}
              className={`px-2 py-1 rounded text-sm font-semibold transition-all ${
                fontSize === 'medium'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}
              title="中"
            >
              A
            </button>
            <button
              onClick={() => setFontSize('large')}
              className={`px-2 py-1 rounded text-base font-semibold transition-all ${
                fontSize === 'large'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}
              title="大"
            >
              A
            </button>
          </div>
        </div>
      </nav>

      {/* ── Main Content Area (Map Background) ── */}
      <div className="relative flex-1 h-full overflow-hidden">
        {/* The Map stays here at the bottom layer */}
        <div className="absolute inset-0 z-0">
          <MapView />
        </div>

        {/* ── Overlay: Usage Guide ── */}
        <div 
          className={`absolute inset-0 z-[1000] bg-white transition-all duration-500 ease-in-out ${activeTab === 'usage' ? 'w-1/2' : 'w-0'} overflow-hidden`}
        >
          <div className="h-full overflow-y-auto">
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold text-slate-900 border-l-8 border-blue-600 pl-6">使用方法</h2>
                <button
                  onClick={() => setActiveTab('map')}
                  className="text-2xl text-slate-400 hover:text-slate-600 transition-colors"
                  title="關閉"
                >
                  ✕
                </button>
              </div>
              <p className="text-base text-slate-500 mb-8">了解如何使用信水義河互動地圖</p>
              
              <div className="space-y-6">
                {/* Layer Control Section */}
                <div className="bg-blue-50 p-5 rounded-xl border border-blue-200">
                  <h3 className="text-xl font-bold text-slate-900 mb-4">📍 圖層控制面板</h3>
                  <p className="text-sm text-slate-600 mb-4">地圖右上角有一個圖層控制面板（☰ 按鈕），點擊展開後可以看到所有可用的圖層。</p>
                  
                  <div className="bg-white p-4 rounded-lg mb-4 border border-blue-100">
                    <p className="text-sm font-semibold text-slate-700 mb-3">✓ 如何選擇圖層：</p>
                    <ul className="text-sm text-slate-600 space-y-2 ml-4">
                      <li>• 點擊圖層名稱前的<strong>方形勾選框</strong>來開啟或關閉圖層</li>
                      <li>• 每個圖層都有一個<strong>不透明度滑桿</strong>，可以調整圖層的透明度（0-100%）</li>
                      <li>• 透明度調整可以幫助你比較不同圖層或看到下方的地圖</li>
                    </ul>
                  </div>

                  <div className="bg-white p-4 rounded-lg border border-blue-100">
                    <p className="text-sm font-semibold text-slate-700 mb-3">📂 圖層分類：</p>
                    <ul className="text-sm text-slate-600 space-y-2 ml-4">
                      <li>• <strong>🕰️ 古今地圖</strong> - 歷史地圖（1904-1989）</li>
                      <li>• <strong>🛰️ 衛星影像</strong> - 現代衛星影像與環境指數</li>
                      <li>• <strong>🌳 開放資料</strong> - 台北市政府開放資料</li>
                      <li>• <strong>🌡️ 溫度圖層</strong> - 實時溫度分布</li>
                      <li>• <strong>🚶 路線</strong> - 四條水文導覽路線</li>
                    </ul>
                  </div>
                </div>

                {/* Routes Section */}
                <div className="bg-green-50 p-5 rounded-xl border border-green-200">
                  <h3 className="text-xl font-bold text-slate-900 mb-4">🚶 水文導覽路線</h3>
                  <p className="text-sm text-slate-600 mb-4">地圖上顯示了四條不同顏色的水文導覽路線，每條路線都包含多個站點。</p>
                  
                  <div className="bg-white p-4 rounded-lg mb-4 border border-green-100">
                    <p className="text-sm font-semibold text-slate-700 mb-3">🔵 四條路線：</p>
                    <ul className="text-sm text-slate-600 space-y-2 ml-4">
                      <li>• <span className="text-blue-500 font-bold">●</span> 路線一：瑠公圳水泱泱</li>
                      <li>• <span className="text-green-500 font-bold">●</span> 路線二：信義之源 陂水之觀</li>
                      <li>• <span className="text-orange-500 font-bold">●</span> 路線三：錫口 五分埔支線</li>
                      <li>• <span className="text-purple-500 font-bold">●</span> 路線四：東西神 三大排水系</li>
                    </ul>
                  </div>

                  <div className="bg-white p-4 rounded-lg border border-green-100">
                    <p className="text-sm font-semibold text-slate-700 mb-3">✓ 與路線互動：</p>
                    <ul className="text-sm text-slate-600 space-y-2 ml-4">
                      <li>• 在圖層控制面板中<strong>勾選路線</strong>來顯示或隱藏該路線</li>
                      <li>• <strong>點擊路線上的站點</strong>（圓形標記）可以查看該地點的詳細資訊</li>
                      <li>• 詳細資訊包括站點名稱、位置描述、水文特徵等</li>
                      <li>• 使用<strong>「全選」和「全清」按鈕</strong>快速開啟或關閉所有路線</li>
                    </ul>
                  </div>
                </div>

                {/* Map Navigation Section */}
                <div className="bg-purple-50 p-5 rounded-xl border border-purple-200">
                  <h3 className="text-xl font-bold text-slate-900 mb-4">🗺️ 地圖導航</h3>
                  <p className="text-sm text-slate-600 mb-4">使用以下方式與地圖互動：</p>
                  
                  <div className="bg-white p-4 rounded-lg border border-purple-100">
                    <ul className="text-sm text-slate-600 space-y-2 ml-4">
                      <li>• <strong>滑鼠滾輪</strong> - 放大/縮小地圖</li>
                      <li>• <strong>拖曳地圖</strong> - 移動地圖視角</li>
                      <li>• <strong>📍 定位按鈕</strong> - 點擊右上方的定位按鈕取得你的目前位置</li>
                      <li>• <strong>雙擊地圖</strong> - 快速放大到該位置</li>
                    </ul>
                  </div>
                </div>

                {/* Tips Section */}
                <div className="bg-amber-50 p-5 rounded-xl border border-amber-200">
                  <h3 className="text-xl font-bold text-slate-900 mb-4">💡 使用提示</h3>
                  <ul className="text-sm text-slate-600 space-y-2 ml-4">
                    <li>• 比較不同時期的歷史地圖，觀察水文系統的變遷</li>
                    <li>• 使用衛星影像與植被指數了解現在的環境狀況</li>
                    <li>• 調整圖層透明度可以同時查看多個圖層的資訊</li>
                    <li>• 點擊路線站點了解每個地點的水文故事</li>
                    <li>• 使用溫度圖層觀察都市熱島效應與水體的冷卻作用</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Overlay: Form ── */}
        <div 
          className={`absolute inset-0 z-[1000] bg-slate-50/95 backdrop-blur-sm transition-transform duration-500 ease-in-out ${activeTab === 'form' ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <div className="max-w-3xl mx-auto h-full overflow-y-auto p-8 md:p-12">
            <header className="mb-12 border-b border-slate-200 pb-6">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">水文調查表單</h2>
              <p className="text-slate-500">協助我們記錄信義區的水道現況與環境觀察。</p>
            </header>
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <p className="text-slate-400 italic text-center py-12">表單內容加載中... (Form components will be placed here)</p>
              </div>
            </div>
            <button 
              onClick={() => setActiveTab('map')}
              className="mt-8 px-6 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              返回地圖
            </button>
          </div>
        </div>

        {/* ── Overlay: Layers Info ── */}
        <div 
          className={`absolute inset-0 z-[1000] bg-white transition-transform duration-500 ease-in-out ${activeTab === 'layers' ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <div className="max-w-4xl mx-auto h-full overflow-y-auto">
            <div className="p-8 md:p-16">
              <h2 className="text-4xl font-bold text-slate-900 mb-2 border-l-8 border-blue-600 pl-6">圖層說明</h2>
              <p className="text-slate-500 mb-8">了解地圖上各個圖層的含義與用途</p>
              
              <div className="space-y-8">
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">🕰️ 古今地圖</h3>
                  <p className="text-slate-600 mb-3">展示不同時期的歷史地圖，追蹤信義區水文的變遷：</p>
                  <ul className="text-sm text-slate-600 space-y-2 ml-4 mb-4">
                    <li>• <strong>1904 臺灣堡圖</strong> - 日治初期的地形圖，可見瑠公圳等主要水道</li>
                    <li>• <strong>1921 地形圖</strong> - 日治中期的測量成果，水利設施逐漸完善</li>
                    <li>• <strong>1939 瑠公水利區域圖</strong> - 瑠公圳灌溉區域的詳細記錄，顯示水道分布</li>
                    <li>• <strong>1944 美軍地形圖</strong> - 戰時期的地形測量，記錄當時的水文狀況</li>
                    <li>• <strong>1989 地形圖</strong> - 現代都市化後的地形，許多水道已被覆蓋或改道</li>
                  </ul>
                  <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
                    <p className="text-sm text-slate-700"><strong>水文變遷觀察：</strong></p>
                    <p className="text-sm text-slate-600 mt-2">透過比較不同時期的地圖，可以看出信義區的水文系統如何從自然河道逐漸演變為現代排水系統。早期的蜿蜒水道被改直、許多埤塘被填平，反映了都市化對水文環境的深遠影響。</p>
                  </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">🛰️ 衛星影像</h3>
                  <p className="text-slate-600 mb-4">實時衛星影像與環境指數：</p>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-700 mb-2">• <strong>Esri 衛星影像</strong></p>
                      <p className="text-sm text-slate-600 ml-4">高解析度衛星影像，顯示真實的地表景觀。</p>
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-slate-700 mb-2">• <strong>Sentinel-2 真彩色</strong></p>
                      <p className="text-sm text-slate-600 ml-4">最新的衛星真彩色影像，與肉眼所見相近。</p>
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-slate-700 mb-2">• <strong>Sentinel-2 植被指數 (NDVI)</strong></p>
                      <p className="text-sm text-slate-600 ml-4 mb-2">測量植被的健康度與密度。顏色對應：</p>
                      <div className="ml-4 bg-white p-3 rounded border border-slate-200">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-6 h-6 bg-red-600 rounded"></div>
                          <span className="text-xs text-slate-600"><strong>紅色</strong> - 植被稀疏或無植被（乾旱/建築物）</span>
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-6 h-6 bg-yellow-500 rounded"></div>
                          <span className="text-xs text-slate-600"><strong>黃色</strong> - 植被中等</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-green-600 rounded"></div>
                          <span className="text-xs text-slate-600"><strong>綠色</strong> - 植被茂密（健康/濕潤）</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-slate-700 mb-2">• <strong>Sentinel-2 濕度指數 (MOISTURE-INDEX)</strong></p>
                      <p className="text-sm text-slate-600 ml-4 mb-2">測量土壤與植被的含水量。顏色對應：</p>
                      <div className="ml-4 bg-white p-3 rounded border border-slate-200">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-6 h-6 bg-orange-600 rounded"></div>
                          <span className="text-xs text-slate-600"><strong>橙紅色</strong> - 非常乾燥（缺水）</span>
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-6 h-6 bg-yellow-400 rounded"></div>
                          <span className="text-xs text-slate-600"><strong>黃色</strong> - 中等濕度</span>
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-6 h-6 bg-cyan-400 rounded"></div>
                          <span className="text-xs text-slate-600"><strong>青色</strong> - 濕潤</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-blue-600 rounded"></div>
                          <span className="text-xs text-slate-600"><strong>深藍色</strong> - 非常濕潤（水體/高含水量）</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">🌳 開放資料圖層</h3>
                  <p className="text-slate-600 mb-3">台北市政府開放資料：</p>
                  <ul className="text-sm text-slate-600 space-y-2 ml-4">
                    <li>• <strong>行道樹遮蔭</strong> - 街道樹木覆蓋範圍</li>
                    <li>• <strong>人行道範圍</strong> - 可行走的人行道區域</li>
                    <li>• <strong>都市計畫分區</strong> - 信義區的都市計畫分區</li>
                  </ul>
                </div>

                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">🌡️ 溫度圖層</h3>
                  <p className="text-slate-600">實時溫度分布圖，顯示信義區的熱島效應與溫度變化。</p>
                </div>

                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">🚶 路線與站點</h3>
                  <p className="text-slate-600 mb-3">四條水文導覽路線：</p>
                  <ul className="text-sm text-slate-600 space-y-2 ml-4">
                    <li>• <strong>路線一</strong> - 瑠公圳水泱泱</li>
                    <li>• <strong>路線二</strong> - 信義之源 陂水之觀</li>
                    <li>• <strong>路線三</strong> - 錫口 五分埔支線</li>
                    <li>• <strong>路線四</strong> - 東西神 三大排水系</li>
                  </ul>
                </div>
              </div>

              <button 
                onClick={() => setActiveTab('map')}
                className="mt-12 px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
              >
                返回地圖
              </button>
            </div>
          </div>
        </div>

        {/* ── Overlay: History ── */}
        <div 
          className={`absolute inset-0 z-[1000] bg-white transition-transform duration-500 ease-in-out ${activeTab === 'history' ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <div className="max-w-4xl mx-auto h-full overflow-y-auto">
            <div className="aspect-video bg-slate-100 relative">
              <div className="absolute inset-0 flex items-center justify-center text-slate-300 font-bold text-4xl uppercase tracking-widest">Historical Imagery</div>
            </div>
            <div className="p-8 md:p-16">
              <h2 className="text-4xl font-serif font-bold text-slate-900 mb-8 border-l-8 border-blue-600 pl-6">信水義河：歷史與變遷</h2>
              <div className="prose prose-slate max-w-none">
                <p className="text-xl leading-relaxed text-slate-600 mb-6">
                  信義區的水文歷史悠久，從早期的瑠公圳到現代的排水系統，每一條水道都見證了這座城市的成長。
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-12">
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <h3 className="text-lg font-bold mb-3">1904 臺灣堡圖時期</h3>
                    <p className="text-sm text-slate-500">當時的信義地區多為水田與埤塘，水道呈現自然彎曲的狀態。</p>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <h3 className="text-lg font-bold mb-3">現代都市化影響</h3>
                    <p className="text-sm text-slate-500">隨著都市開發，許多水道被覆蓋成為道路或排水暗渠。</p>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setActiveTab('map')}
                className="mt-8 px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
              >
                探索地圖
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

