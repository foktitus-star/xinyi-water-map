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
  const [activeTab, setActiveTab] = useState('map'); // 'map', 'form', 'history'

  return (
    <main className="relative w-full h-dvh flex overflow-hidden bg-slate-900">
      {/* ── Left Sidebar ── */}
      <nav className="z-[2000] w-16 md:w-20 bg-slate-900/95 backdrop-blur-md border-r border-white/10 flex flex-col items-center py-6 gap-8 shadow-2xl">
        <div className="text-blue-400 text-xl font-black mb-4">信</div>
        
        <button 
          onClick={() => setActiveTab('map')}
          className={`group relative p-3 rounded-xl transition-all duration-300 ${activeTab === 'map' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-white/5'}`}
          title="地圖 (Map)"
        >
          <span className="text-xl">🗺️</span>
          <span className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">地圖 (Map)</span>
        </button>

        <button 
          onClick={() => setActiveTab('form')}
          className={`group relative p-3 rounded-xl transition-all duration-300 ${activeTab === 'form' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-white/5'}`}
          title="表單 (Form)"
        >
          <span className="text-xl">📝</span>
          <span className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">表單 (Form)</span>
        </button>

        <button 
          onClick={() => setActiveTab('history')}
          className={`group relative p-3 rounded-xl transition-all duration-300 ${activeTab === 'history' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-white/5'}`}
          title="歷史介紹 (History)"
        >
          <span className="text-xl">🏛️</span>
          <span className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">歷史介紹 (History)</span>
        </button>

        <div className="mt-auto opacity-20 text-[10px] font-mono -rotate-90 whitespace-nowrap tracking-[0.3em] text-white">XINYI_MAP</div>
      </nav>

      {/* ── Main Content Area (Map Background) ── */}
      <div className="relative flex-1 h-full overflow-hidden">
        {/* The Map stays here at the bottom layer */}
        <div className="absolute inset-0 z-0">
          <MapView />
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

