'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

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
  const [activeTab, setActiveTab] = useState('map'); // 'usage', 'map', 'layers', 'form', 'history', 'changelog'
  const [fontSize, setFontSize] = useState('medium'); // 'small', 'medium', 'large'

  // Calculate font scale multiplier
  const fontScale = fontSize === 'small' ? 0.875 : fontSize === 'large' ? 1.125 : 1;

  const startTour = () => {
    setActiveTab('map');
    
    setTimeout(() => {
      const driverObj = driver({
        showProgress: true,
        animate: true,
        overlayColor: 'rgba(15, 15, 26, 0.75)',
        nextBtnText: '下一步 →',
        prevBtnText: '← 上一步',
        doneBtnText: '完成 🎉',
        steps: [
          {
            element: '#map-container-wrapper',
            popover: {
              title: '歡迎使用「信水義河」互動地圖！',
              description: '這是一個專為信義社大水文導覽設計的互動地圖。您可以在此處探索信義區的水道軌跡與環境變遷。',
              side: 'center',
              align: 'start'
            }
          },
          {
            element: '#sidebar-navigation',
            popover: {
              title: '左側選單導覽',
              description: '使用左側的面板可以在地圖、圖層說明、水文回饋表單與歷史故事之間自由切換，而地圖將會持續在背景為您保留狀態！',
              side: 'right',
              align: 'start'
            }
          },
          {
            element: '#layer-panel-toggle',
            popover: {
              title: '📍 圖層控制面板',
              description: '地圖右上角有一個圖層控制面板（☰ 按鈕），點擊展開後可以看到所有可用的圖層。引導將自動為您展開面板！',
              side: 'left',
              align: 'start'
            },
            onHighlighted: () => {
              const isExpanded = !!document.getElementById('layer-control-panel-content');
              if (!isExpanded) {
                document.getElementById('layer-panel-toggle')?.click();
              }
            }
          },
          {
            element: '#tour-route-toggles',
            popover: {
              title: '🚶 水文導覽路線',
              description: '包含四條不同顏色的水文導覽路線。您可以勾選來顯示或隱藏路線，或點擊地圖上的站點標記查看詳細的水文與歷史故事！也可利用全選/全清按鈕快速切換。',
              side: 'left',
              align: 'start'
            }
          },
          {
            element: '#tour-open-data-toggles',
            popover: {
              title: '🌳 開放資料與即時溫度',
              description: '包含台北市政府開放資料（行道樹遮蔭、人行道範圍、都市計畫分區）以及即時溫度分布。勾選後可利用不透明度滑桿（0-100%）自由調整，幫助您進行跨圖層對照！',
              side: 'left',
              align: 'start'
            }
          },
          {
            element: '#tour-historical-control',
            popover: {
              title: '🕰️ 古今地圖（歷史圖資）',
              description: '提供 1904 臺灣堡圖、1921 地形圖、1939 瑠公水利區域圖、1944 美軍地形圖、1989 地形圖等珍貴歷史地圖。透過透明度調整，讓您一鍵穿梭時空，看見百年水道的河道變遷！',
              side: 'left',
              align: 'start'
            }
          },
          {
            element: '#tour-satellite-control',
            popover: {
              title: '🛰️ 衛星影像與環境指數',
              description: '提供 Esri 高解析衛星影像，以及 Sentinel-2 的真彩色、植被健康指數（NDVI）與濕度指數，讓您以現代遙測視角觀察生態環境。',
              side: 'left',
              align: 'start'
            }
          },
          {
            element: '#locate-button',
            popover: {
              title: '📍 實地定位功能',
              description: '在戶外踏查時，點擊此按鈕可即時標記您的位置，方便對照當前位置的歷史水道與樹木分布。',
              side: 'left',
              align: 'start'
            }
          },
          {
            element: '#tour-usage-button',
            popover: {
              title: '💡 再次開啟說明',
              description: '如果您日後需要再次閱讀此導覽，隨時可以點擊地圖左下角的「使用方法」按鈕重新啟動！',
              side: 'right',
              align: 'start'
            }
          }
        ]
      });

      driverObj.drive();
    }, 300);
  };

  return (
    <main className="relative w-full h-dvh flex overflow-hidden bg-slate-900" style={{
      '--font-scale': fontScale,
    }}>
      {/* ── Left Sidebar ── */}
      <nav id="sidebar-navigation" className="z-[2000] w-24 md:w-32 bg-slate-900/95 backdrop-blur-md border-r border-white/10 flex flex-col items-center py-6 gap-4 shadow-2xl">
        <div className="flex flex-col items-center text-center px-1 mb-4 gap-1.5">
          <h1 className="text-blue-400 text-sm md:text-base font-black tracking-widest leading-tight">
            信水義河
          </h1>
          <p className="text-slate-500 text-[8px] md:text-[9px] leading-tight font-semibold">
            信義社大<br />水文導覽地圖
          </p>
        </div>
        
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

        {/* Changelog Button */}
        <div className="w-full px-2 pt-3">
          <button
            onClick={() => setActiveTab('changelog')}
            className={`w-full py-1.5 px-1 rounded-lg text-[10px] font-semibold transition-all duration-200 border ${
              activeTab === 'changelog'
                ? 'bg-violet-600/80 text-violet-100 border-violet-400/50 shadow-lg shadow-violet-500/20'
                : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10 hover:text-white/70'
            }`}
            title="查看版本更新日誌"
          >
            📜 更新日誌
          </button>
        </div>

        {/* Font Size Selector */}
        <div className="pt-3 border-t border-white/10 flex flex-col gap-2 w-full px-2">
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
          <MapView onStartTour={startTour} />
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

        {/* ── Overlay: Changelog ── */}
        <div
          className={`absolute inset-0 z-[1000] transition-transform duration-500 ease-in-out ${activeTab === 'changelog' ? 'translate-x-0' : '-translate-x-full'}`}
          style={{ background: 'linear-gradient(135deg, #0b0b18 0%, #0f0f22 60%, #0a0a1a 100%)' }}
        >
          {/* Ambient background glows */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)' }} />
            <div className="absolute bottom-[-10%] right-[10%] w-[35%] h-[35%] rounded-full opacity-8" style={{ background: 'radial-gradient(circle, #2563eb 0%, transparent 70%)' }} />
          </div>

          <div className="relative h-full overflow-y-auto">
            <div className="max-w-3xl mx-auto px-6 md:px-12 py-10">

              {/* Header */}
              <div className="flex items-start justify-between mb-10">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">📜</span>
                    <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">更新日誌</h2>
                  </div>
                  <p className="text-white/40 text-sm">信水義河互動地圖 · 版本歷史紀錄</p>
                </div>
                <button
                  onClick={() => setActiveTab('map')}
                  className="mt-1 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white flex items-center justify-center text-lg transition-all duration-200"
                  title="關閉"
                >
                  ✕
                </button>
              </div>

              {/* Timeline */}
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-[19px] top-0 bottom-0 w-px" style={{ background: 'linear-gradient(to bottom, #7c3aed44, #2563eb44, transparent)' }} />

                <div className="space-y-8">

                  {/* v1.1.2 */}
                  <div className="relative flex gap-5">
                    <div className="relative z-10 mt-1 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border border-violet-400/40" style={{ background: 'linear-gradient(135deg, #7c3aed33, #4c1d9533)' }}>
                      <span className="text-base">🔧</span>
                    </div>
                    <div className="flex-1 rounded-2xl p-5 border border-white/8 hover:border-violet-400/30 transition-all duration-300" style={{ background: 'rgba(124,58,237,0.07)' }}>
                      <div className="flex items-center gap-2 flex-wrap mb-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider" style={{ background: '#7c3aed33', color: '#c4b5fd' }}>LATEST</span>
                        <span className="text-white font-bold text-sm">v1.1.2</span>
                        <span className="text-white/30 text-xs">2026-05-21</span>
                      </div>
                      <h3 className="text-white/90 font-semibold text-sm mb-2">圖層工具提示資訊圖示</h3>
                      <p className="text-white/50 text-xs leading-relaxed">在圖層控制面板中每個圖層的勾選框右側，新增了 ℹ️ 圓形資訊圖示按鈕。點擊後彈出詳細說明彈窗，說明該圖層的來源、時期與用途，讓使用者無需離開地圖即可了解圖層背景。</p>
                    </div>
                  </div>

                  {/* v1.1.0 */}
                  <div className="relative flex gap-5">
                    <div className="relative z-10 mt-1 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border border-blue-400/40" style={{ background: 'linear-gradient(135deg, #2563eb33, #1e3a8a33)' }}>
                      <span className="text-base">🗂️</span>
                    </div>
                    <div className="flex-1 rounded-2xl p-5 border border-white/8 hover:border-blue-400/30 transition-all duration-300" style={{ background: 'rgba(37,99,235,0.07)' }}>
                      <div className="flex items-center gap-2 flex-wrap mb-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider" style={{ background: '#2563eb33', color: '#93c5fd' }}>UI</span>
                        <span className="text-white font-bold text-sm">v1.1.0</span>
                        <span className="text-white/30 text-xs">2026-05-21</span>
                      </div>
                      <h3 className="text-white/90 font-semibold text-sm mb-2">「資料來源」按鈕位置調整</h3>
                      <p className="text-white/50 text-xs leading-relaxed">將「資料來源 ℹ️」控制按鈕從地圖上方移至左下角，位於「使用方法」按鈕正上方，解決了按鈕遮擋圖層下拉式選單的問題。同時調整展開動畫原點，確保彈出方向自然。</p>
                    </div>
                  </div>

                  {/* v1.0.5 */}
                  <div className="relative flex gap-5">
                    <div className="relative z-10 mt-1 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border border-cyan-400/40" style={{ background: 'linear-gradient(135deg, #0891b233, #06407933)' }}>
                      <span className="text-base">🏠</span>
                    </div>
                    <div className="flex-1 rounded-2xl p-5 border border-white/8 hover:border-cyan-400/30 transition-all duration-300" style={{ background: 'rgba(8,145,178,0.07)' }}>
                      <div className="flex items-center gap-2 flex-wrap mb-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider" style={{ background: '#0891b233', color: '#67e8f9' }}>UI</span>
                        <span className="text-white font-bold text-sm">v1.0.5</span>
                        <span className="text-white/30 text-xs">2026-05-21</span>
                      </div>
                      <h3 className="text-white/90 font-semibold text-sm mb-2">側欄標題整合與地圖介面簡化</h3>
                      <p className="text-white/50 text-xs leading-relaxed">將地圖左下角浮動的「信水義河 信義社大 · 水文導覽互動地圖」標題文字，整合至左側側欄頂部作為品牌識別。地圖底部僅保留「❓ 使用方法」單一按鈕，讓地圖畫面更加簡潔開闊。</p>
                    </div>
                  </div>

                  {/* v1.0.0 */}
                  <div className="relative flex gap-5">
                    <div className="relative z-10 mt-1 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border border-emerald-400/40" style={{ background: 'linear-gradient(135deg, #05966933, #06402433)' }}>
                      <span className="text-base">🚀</span>
                    </div>
                    <div className="flex-1 rounded-2xl p-5 border border-white/8 hover:border-emerald-400/30 transition-all duration-300" style={{ background: 'rgba(5,150,105,0.07)' }}>
                      <div className="flex items-center gap-2 flex-wrap mb-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider" style={{ background: '#05966933', color: '#6ee7b7' }}>MILESTONE</span>
                        <span className="text-white font-bold text-sm">v1.0.0</span>
                        <span className="text-white/30 text-xs">2026-04-28</span>
                      </div>
                      <h3 className="text-white/90 font-semibold text-sm mb-2">水文回饋表單 B — 節點與自由標記</h3>
                      <p className="text-white/50 text-xs leading-relaxed">新增自由標記回饋表單（表單 B），使用者可於地圖上任意點擊落點，填寫觀察描述並上傳現場照片。照片自動壓縮為 Base64 後透過 Google Apps Script Proxy 寫入 Google Sheets，並同步上傳至 Google Drive 相簿。</p>
                    </div>
                  </div>

                  {/* v0.9.5 */}
                  <div className="relative flex gap-5">
                    <div className="relative z-10 mt-1 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border border-emerald-400/30" style={{ background: 'linear-gradient(135deg, #05966922, #06402422)' }}>
                      <span className="text-base">📋</span>
                    </div>
                    <div className="flex-1 rounded-2xl p-5 border border-white/8 hover:border-emerald-400/20 transition-all duration-300" style={{ background: 'rgba(5,150,105,0.05)' }}>
                      <div className="flex items-center gap-2 flex-wrap mb-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider" style={{ background: '#05966922', color: '#6ee7b7' }}>FEATURE</span>
                        <span className="text-white font-bold text-sm">v0.9.5</span>
                        <span className="text-white/30 text-xs">2026-04-28</span>
                      </div>
                      <h3 className="text-white/90 font-semibold text-sm mb-2">水文回饋表單 A — 路線舒適度評分</h3>
                      <p className="text-white/50 text-xs leading-relaxed">新增路線舒適度評分表單（表單 A），提供星級評分、文字描述欄位，並整合 Google Apps Script 後端，讓使用者回饋自動同步至 Google Sheets 資料庫。</p>
                    </div>
                  </div>

                  {/* v0.9.0 */}
                  <div className="relative flex gap-5">
                    <div className="relative z-10 mt-1 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border border-amber-400/40" style={{ background: 'linear-gradient(135deg, #d9770633, #92400e33)' }}>
                      <span className="text-base">🎓</span>
                    </div>
                    <div className="flex-1 rounded-2xl p-5 border border-white/8 hover:border-amber-400/30 transition-all duration-300" style={{ background: 'rgba(217,119,6,0.07)' }}>
                      <div className="flex items-center gap-2 flex-wrap mb-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider" style={{ background: '#d9770633', color: '#fde68a' }}>UX</span>
                        <span className="text-white font-bold text-sm">v0.9.0</span>
                        <span className="text-white/30 text-xs">2026-04-15</span>
                      </div>
                      <h3 className="text-white/90 font-semibold text-sm mb-2">Driver.js 互動式新手導覽教學</h3>
                      <p className="text-white/50 text-xs leading-relaxed">整合 Driver.js 套件，實作逐步式的互動導覽教學流程，共九個步驟。導覽自動展開圖層控制面板，引導使用者認識路線圖層、歷史地圖、衛星影像與定位功能，大幅降低新使用者的學習門檻。</p>
                    </div>
                  </div>

                  {/* v0.8.5 */}
                  <div className="relative flex gap-5">
                    <div className="relative z-10 mt-1 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border border-slate-400/30" style={{ background: 'rgba(100,116,139,0.15)' }}>
                      <span className="text-base">🏙️</span>
                    </div>
                    <div className="flex-1 rounded-2xl p-5 border border-white/8 hover:border-slate-400/20 transition-all duration-300" style={{ background: 'rgba(100,116,139,0.05)' }}>
                      <div className="flex items-center gap-2 flex-wrap mb-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider" style={{ background: '#64748b33', color: '#cbd5e1' }}>FEATURE</span>
                        <span className="text-white font-bold text-sm">v0.8.5</span>
                        <span className="text-white/30 text-xs">2026-04-10</span>
                      </div>
                      <h3 className="text-white/90 font-semibold text-sm mb-2">都市計畫分區圖層透明度控制</h3>
                      <p className="text-white/50 text-xs leading-relaxed">為「都市計畫分區」開放資料圖層新增了不透明度調整滑桿（0–100%），讓使用者可自由疊合比對多圖層資訊，與其他圖層的操作體驗統一。</p>
                    </div>
                  </div>

                  {/* v0.8.0 */}
                  <div className="relative flex gap-5">
                    <div className="relative z-10 mt-1 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border border-slate-400/30" style={{ background: 'rgba(100,116,139,0.15)' }}>
                      <span className="text-base">🔠</span>
                    </div>
                    <div className="flex-1 rounded-2xl p-5 border border-white/8 hover:border-slate-400/20 transition-all duration-300" style={{ background: 'rgba(100,116,139,0.05)' }}>
                      <div className="flex items-center gap-2 flex-wrap mb-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider" style={{ background: '#64748b33', color: '#cbd5e1' }}>UI</span>
                        <span className="text-white font-bold text-sm">v0.8.0</span>
                        <span className="text-white/30 text-xs">2026-03-20</span>
                      </div>
                      <h3 className="text-white/90 font-semibold text-sm mb-2">全域字體大小動態調整</h3>
                      <p className="text-white/50 text-xs leading-relaxed">於左側側欄底部新增字體大小選擇器（小 / 中 / 大），透過 CSS 自訂變數 <code className="text-violet-300 text-[10px]">--font-scale</code> 動態縮放全頁字體比例，提升在不同裝置與使用情境下的可讀性。</p>
                    </div>
                  </div>

                  {/* v0.7.0 */}
                  <div className="relative flex gap-5">
                    <div className="relative z-10 mt-1 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border border-slate-400/30" style={{ background: 'rgba(100,116,139,0.15)' }}>
                      <span className="text-base">🛰️</span>
                    </div>
                    <div className="flex-1 rounded-2xl p-5 border border-white/8 hover:border-slate-400/20 transition-all duration-300" style={{ background: 'rgba(100,116,139,0.05)' }}>
                      <div className="flex items-center gap-2 flex-wrap mb-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider" style={{ background: '#64748b33', color: '#cbd5e1' }}>DATA</span>
                        <span className="text-white font-bold text-sm">v0.7.0</span>
                        <span className="text-white/30 text-xs">2026-03-10</span>
                      </div>
                      <h3 className="text-white/90 font-semibold text-sm mb-2">Sentinel-2 多光譜衛星影像整合</h3>
                      <p className="text-white/50 text-xs leading-relaxed">整合 Sentinel-2 衛星影像，提供三種模式：真彩色影像、植被健康指數（NDVI，紅=稀疏、綠=茂密）與濕度指數（MOISTURE-INDEX，橙=乾燥、藍=濕潤），附帶互動式色彩圖例說明，並可透過透明度滑桿疊合對照。</p>
                    </div>
                  </div>

                  {/* v0.6.0 */}
                  <div className="relative flex gap-5">
                    <div className="relative z-10 mt-1 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border border-slate-400/30" style={{ background: 'rgba(100,116,139,0.15)' }}>
                      <span className="text-base">🌡️</span>
                    </div>
                    <div className="flex-1 rounded-2xl p-5 border border-white/8 hover:border-slate-400/20 transition-all duration-300" style={{ background: 'rgba(100,116,139,0.05)' }}>
                      <div className="flex items-center gap-2 flex-wrap mb-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider" style={{ background: '#64748b33', color: '#cbd5e1' }}>DATA</span>
                        <span className="text-white font-bold text-sm">v0.6.0</span>
                        <span className="text-white/30 text-xs">2026-02-28</span>
                      </div>
                      <h3 className="text-white/90 font-semibold text-sm mb-2">GEE 地表溫度圖層整合</h3>
                      <p className="text-white/50 text-xs leading-relaxed">透過 Google Earth Engine（GEE）整合即時地表溫度熱力圖，可視化信義區的都市熱島效應與水體冷卻現象，提供環境教育與研究的重要參考依據。</p>
                    </div>
                  </div>

                  {/* v0.5.0 */}
                  <div className="relative flex gap-5">
                    <div className="relative z-10 mt-1 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border border-slate-400/30" style={{ background: 'rgba(100,116,139,0.15)' }}>
                      <span className="text-base">🕰️</span>
                    </div>
                    <div className="flex-1 rounded-2xl p-5 border border-white/8 hover:border-slate-400/20 transition-all duration-300" style={{ background: 'rgba(100,116,139,0.05)' }}>
                      <div className="flex items-center gap-2 flex-wrap mb-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider" style={{ background: '#64748b33', color: '#cbd5e1' }}>DATA</span>
                        <span className="text-white font-bold text-sm">v0.5.0</span>
                        <span className="text-white/30 text-xs">2026-02-10</span>
                      </div>
                      <h3 className="text-white/90 font-semibold text-sm mb-2">五層歷史地圖整合（1904–1989）</h3>
                      <p className="text-white/50 text-xs leading-relaxed">新增五張珍貴歷史地圖圖層：1904 臺灣堡圖、1921 地形圖、1939 瑠公水利區域圖、1944 美軍地形圖、1989 地形圖，每張均附透明度調整滑桿，讓使用者一鍵穿梭時空，直觀觀察百年水道演變。</p>
                    </div>
                  </div>

                </div>
              </div>

              {/* Footer */}
              <div className="mt-12 pt-6 border-t border-white/8 flex items-center justify-between">
                <p className="text-white/25 text-[11px]">信義社大 水文導覽互動地圖</p>
                <button
                  onClick={() => setActiveTab('map')}
                  className="px-5 py-2 rounded-xl text-sm font-semibold text-white/70 hover:text-white transition-all duration-200 border border-white/10 hover:border-violet-400/40 hover:bg-violet-500/10"
                >
                  返回地圖 →
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

