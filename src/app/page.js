'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
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

const NodeFeedbackForm = dynamic(() => import('@/components/forms/NodeFeedbackForm'), {
  ssr: false,
  loading: () => <p className="text-center py-6 text-slate-400">載入表單中...</p>
});

// 流光配置 — 光痕順流滑行，確定性偽隨機（不用 Math.random 以確保 SSR/CSR hydration 一致）
const frac = (n) => n - Math.floor(n);
const WATER_STREAKS = Array.from({ length: 18 }, (_, i) => {
  const r1 = frac(Math.sin((i + 1) * 127.1) * 43758.5453);
  const r2 = frac(Math.sin((i + 1) * 269.5) * 28001.8384);
  const r3 = frac(Math.sin((i + 1) * 419.2) * 15731.7431);
  const r4 = frac(Math.sin((i + 1) * 631.9) * 92831.6247);
  // 固定兩位小數：避免 SSR 與 CSR 對浮點數字串的序列化精度不同造成 hydration mismatch
  return {
    top: `${(6 + r1 * 86).toFixed(2)}%`,
    left: `${(r2 * 82).toFixed(2)}%`,
    w: `${(50 + r3 * 75).toFixed(2)}px`,
    h: `${(3 + r4 * 4).toFixed(2)}px`,
    dur: `${(3.2 + r1 * 2.8).toFixed(2)}s`,
    delay: `${(r2 * 4.8).toFixed(2)}s`,
  };
});

// 大面積柔光暈（水面整體的光感底色）
const WATER_GLOWS = [
  { top: '10%', left: '15%', w: '260px', h: '80px', delay: '0s' },
  { top: '36%', left: '62%', w: '300px', h: '95px', delay: '2.2s' },
  { top: '62%', left: '20%', w: '240px', h: '75px', delay: '4.0s' },
  { top: '82%', left: '55%', w: '280px', h: '85px', delay: '1.1s' },
];


export default function HomePage() {
  const [activeTab, setActiveTab] = useState('map'); // 'map', 'layers', 'form', 'history', 'changelog'
  const [fontSize, setFontSize] = useState('medium'); // 'small', 'medium', 'large'
  const [showLanding, setShowLanding] = useState(true);

  // 左側選單收合狀態（預設開啟，使用者可點擊 ☰ 按鈕進行收合）
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // 動態更新日誌狀態
  const [changelog, setChangelog] = useState([]);
  const [loadingChangelog, setLoadingChangelog] = useState(false);
  const [userLocation, setUserLocation] = useState({ lat: 25.033, lng: 121.565 });

  useEffect(() => {
    if (activeTab === 'form' && typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.warn('Geolocation failed, using default coordinates:', error.message);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, [activeTab]);


  useEffect(() => {
    async function loadChangelog() {
      setLoadingChangelog(true);
      try {
        const response = await fetch('/CHANGELOG.md');
        if (!response.ok) throw new Error('Failed to load changelog');
        const text = await response.text();
        
        // 輕量化 Markdown 更新日誌解析器
        const sections = text.split(/##\s+\[/);
        const entries = [];
        
        for (let i = 1; i < sections.length; i++) {
          const section = sections[i];
          const content = '[' + section;
          const lines = content.split('\n');
          const headerLine = lines[0].trim();
          
          // 解析標題格式：[Version] - Date - Emoji - Tag - Title
          // 例如：[v1.5.0] - 2026-05-27 - 📸 - LATEST - AI 圖片轉譯...
          const parts = headerLine.split(/\s+-\s+/);
          
          if (parts.length >= 5) {
            const version = parts[0].replace(/[\[\]]/g, '');
            const date = parts[1];
            const emoji = parts[2];
            const tag = parts[3];
            const title = parts.slice(4).join(' - ');
            
            const descLines = [];
            for (let j = 1; j < lines.length; j++) {
              const line = lines[j].trim();
              if (line) {
                // 去除列表符號 (1. , -, *)
                const cleanedLine = line.replace(/^(?:\d+\.|\-|\*)\s+/, '');
                descLines.push(cleanedLine);
              }
            }
            entries.push({ version, date, emoji, tag, title, descriptions: descLines });
          }
        }
        setChangelog(entries);
      } catch (err) {
        console.error('Error fetching changelog:', err);
      } finally {
        setLoadingChangelog(false);
      }
    }
    loadChangelog();
  }, []);

  const getTagStyles = (tag) => {
    switch (tag.toUpperCase()) {
      case 'LATEST':
        return {
          badgeBg: 'bg-[#0d948833] text-[#99f6e4]',
          borderHover: 'hover:border-teal-400/30',
          dotBorder: 'border-teal-400/40',
          bgGradient: 'linear-gradient(135deg, #0d948833, #115e5933)',
          cardBg: 'rgba(13,148,136,0.07)'
        };
      case 'AESTHETICS':
        return {
          badgeBg: 'bg-[#d9770622] text-[#fde68a]',
          borderHover: 'hover:border-amber-400/30',
          dotBorder: 'border-amber-400/40',
          bgGradient: 'linear-gradient(135deg, #d9770633, #78350f33)',
          cardBg: 'rgba(217,119,6,0.07)'
        };
      case 'UPDATE':
        return {
          badgeBg: 'bg-[#7c3aed11] text-[#c4b5fd]',
          borderHover: 'hover:border-violet-400/20',
          dotBorder: 'border-violet-400/30',
          bgGradient: 'linear-gradient(135deg, #7c3aed22, #4c1d9522)',
          cardBg: 'rgba(124,58,237,0.05)'
        };
      case 'FEATURE':
        return {
          badgeBg: 'bg-[#2563eb22] text-[#93c5fd]',
          borderHover: 'hover:border-blue-400/30',
          dotBorder: 'border-blue-400/40',
          bgGradient: 'linear-gradient(135deg, #2563eb33, #1e3a8a33)',
          cardBg: 'rgba(37,99,235,0.07)'
        };
      case 'UI':
        return {
          badgeBg: 'bg-[#0891b233] text-[#67e8f9]',
          borderHover: 'hover:border-cyan-400/30',
          dotBorder: 'border-cyan-400/40',
          bgGradient: 'linear-gradient(135deg, #0891b233, #06407933)',
          cardBg: 'rgba(8,145,178,0.07)'
        };
      case 'MILESTONE':
        return {
          badgeBg: 'bg-[#05966933] text-[#6ee7b7]',
          borderHover: 'hover:border-emerald-400/30',
          dotBorder: 'border-emerald-400/40',
          bgGradient: 'linear-gradient(135deg, #05966933, #06402433)',
          cardBg: 'rgba(5,150,105,0.07)'
        };
      case 'DATA':
        return {
          badgeBg: 'bg-[#0369a133] text-[#7dd3fc]',
          borderHover: 'hover:border-sky-400/30',
          dotBorder: 'border-sky-400/40',
          bgGradient: 'linear-gradient(135deg, #0369a133, #07527533)',
          cardBg: 'rgba(3,105,161,0.07)'
        };
      default:
        return {
          badgeBg: 'bg-[#64748b33] text-[#cbd5e1]',
          borderHover: 'hover:border-slate-400/20',
          dotBorder: 'border-slate-400/30',
          bgGradient: 'rgba(100,116,139,0.15)',
          cardBg: 'rgba(100,116,139,0.05)'
        };
    }
  };

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
    <div className="flex flex-col w-full h-dvh overflow-hidden bg-sky-50" style={{
      '--font-scale': fontScale,
    }}>
      {/* ── Top Header ── */}
      <header className="z-[3000] w-full h-16 bg-white/92 backdrop-blur-md border-b border-sky-200/60 flex items-center justify-between px-4 md:px-6 shadow-sm flex-shrink-0"
        style={{ background: 'linear-gradient(90deg, #f0f9ff 0%, #e0f2fe 50%, #f0f9ff 100%)' }}
      >
        <div className="flex items-center gap-3">
          {/* 手機版側欄收合切換按鈕 */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="md:hidden p-2 text-slate-500 hover:text-sky-700 bg-sky-50 border border-sky-200 rounded-xl active:scale-95 transition-all cursor-pointer"
            title="切換選單"
          >
            ☰
          </button>
          <div className="flex items-center">
            <h1
              className="text-slate-700 text-sm md:text-xl tracking-widest leading-none flex-shrink-0"
              style={{ fontFamily: 'var(--font-serif)', fontWeight: 700 }}
            >
              信水義河
            </h1>
            <span className="h-4 md:h-5 w-px bg-sky-200 mx-2 md:mx-3 flex-shrink-0" />
            <p className="text-slate-400 text-[10px] md:text-sm tracking-wider font-sans whitespace-nowrap">
              信義社大 水文導覽地圖
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <Link
            href="/privacy"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-slate-500 bg-sky-50/80 border border-sky-200/70 hover:bg-sky-100 hover:text-sky-700 transition-all duration-300 cursor-pointer shadow-sm active:scale-95"
          >
            <span>🛡️</span>
            <span className="hidden xs:inline">隱私聲明</span>
          </Link>
          <button
            onClick={() => setShowLanding(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-slate-500 bg-sky-50/80 border border-sky-200/70 hover:bg-sky-100 hover:text-sky-700 transition-all duration-300 cursor-pointer shadow-sm active:scale-95"
          >
            <span>🏠</span>
            <span className="hidden xs:inline">首頁</span>
          </button>
        </div>
      </header>

      {/* ── Main Body (Sidebar + Map Content) ── */}
      <main className="flex-1 w-full flex overflow-hidden relative">
        {/* ── Left Sidebar ── */}
        <nav
          id="sidebar-navigation"
          className={`
            z-[2000] backdrop-blur-md border-r border-sky-200/50
            flex flex-col items-center shadow-md transition-all duration-300 ease-in-out
            ${isSidebarOpen ? 'w-20 py-4 px-2 gap-3' : 'w-0 p-0 border-r-0 overflow-hidden gap-0'}
            md:w-24 md:py-6 md:px-2 md:gap-3 md:flex
          `}
          style={{ background: 'linear-gradient(180deg, #f0f9ff 0%, #e0f2fe 60%, #f0f9ff 100%)' }}
        >

        <button
          onClick={() => setActiveTab('map')}
          className={`w-full group relative py-2.5 rounded-xl transition-all duration-300 text-xs md:text-sm flex flex-col items-center justify-center gap-1 mt-2 md:mt-0 ${activeTab === 'map' ? 'bg-sky-600 text-white shadow-md shadow-sky-400/30' : 'text-slate-500 hover:bg-sky-100'}`}
          title="地圖 (Map)"
        >
          <span className="text-base md:text-lg">🗺️</span>
          <span className="text-xs md:text-sm font-sans tracking-wide block">地圖</span>
          <span className="absolute left-full ml-4 px-2 py-1 bg-white text-slate-700 text-[10px] rounded border border-sky-100 shadow-sm opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">Map</span>
        </button>

        <button
          onClick={() => setActiveTab('layers')}
          className={`w-full group relative py-2.5 rounded-xl transition-all duration-300 text-xs md:text-sm flex flex-col items-center justify-center gap-1 ${activeTab === 'layers' ? 'bg-sky-600 text-white shadow-md shadow-sky-400/30' : 'text-slate-500 hover:bg-sky-100'}`}
          title="圖層說明 (Layers)"
        >
          <span className="text-base md:text-lg">📊</span>
          <span className="text-xs md:text-sm font-sans tracking-wide block">圖層說明</span>
          <span className="absolute left-full ml-4 px-2 py-1 bg-white text-slate-700 text-[10px] rounded border border-sky-100 shadow-sm opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">Layers</span>
        </button>

        <button
          onClick={() => setActiveTab('form')}
          className={`w-full group relative py-2.5 rounded-xl transition-all duration-300 text-xs md:text-sm flex flex-col items-center justify-center gap-1 ${activeTab === 'form' ? 'bg-sky-600 text-white shadow-md shadow-sky-400/30' : 'text-slate-500 hover:bg-sky-100'}`}
          title="回饋表單 (Feedback)"
        >
          <span className="text-base md:text-lg">📝</span>
          <span className="text-xs md:text-sm font-sans tracking-wide block">回饋表單</span>
          <span className="absolute left-full ml-4 px-2 py-1 bg-white text-slate-700 text-[10px] rounded border border-sky-100 shadow-sm opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">Feedback</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`w-full group relative py-2.5 rounded-xl transition-all duration-300 text-xs md:text-sm flex flex-col items-center justify-center gap-1 ${activeTab === 'history' ? 'bg-sky-600 text-white shadow-md shadow-sky-400/30' : 'text-slate-500 hover:bg-sky-100'}`}
          title="歷史故事 (History)"
        >
          <span className="text-base md:text-lg">📚</span>
          <span className="text-xs md:text-sm font-sans tracking-wide block">歷史故事</span>
          <span className="absolute left-full ml-4 px-2 py-1 bg-white text-slate-700 text-[10px] rounded border border-sky-100 shadow-sm opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">History</span>
        </button>

        <div className="mt-auto opacity-30 text-[10px] font-mono -rotate-90 whitespace-nowrap tracking-[0.3em] text-slate-400 hidden md:block">XINYI_MAP</div>

        {/* Changelog Button */}
        <div className="w-full px-1 pt-3 flex-shrink-0">
          <button
            onClick={() => setActiveTab('changelog')}
            className={`w-full py-1.5 px-0.5 rounded-lg text-[10px] md:text-xs transition-all duration-200 border flex flex-col items-center justify-center gap-0.5 ${
              activeTab === 'changelog'
                ? 'bg-violet-500/90 text-white border-violet-300/60 shadow-md'
                : 'bg-sky-50/80 text-slate-400 border-sky-200/60 hover:bg-sky-100 hover:text-slate-600'
            }`}
            title="查看版本更新日誌"
          >
            <span>📜</span>
            <span className="text-[10px] md:text-xs font-sans block">更新日誌</span>
          </button>
        </div>

        {/* Font Size Selector (僅桌機版顯示) */}
        <div className="pt-3 border-t border-sky-100 flex-col gap-2 w-full px-2 flex-shrink-0 hidden md:flex">
          <p className="text-[10px] text-slate-400 text-center">字體大小</p>
          <div className="flex gap-1 justify-center">
            <button
              onClick={() => setFontSize('small')}
              className={`px-2 py-1 rounded text-xs font-semibold transition-all ${
                fontSize === 'small'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'bg-sky-50 text-slate-500 border border-sky-200 hover:bg-sky-100'
              }`}
              title="小"
            >A</button>
            <button
              onClick={() => setFontSize('medium')}
              className={`px-2 py-1 rounded text-sm font-semibold transition-all ${
                fontSize === 'medium'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'bg-sky-50 text-slate-500 border border-sky-200 hover:bg-sky-100'
              }`}
              title="中"
            >A</button>
            <button
              onClick={() => setFontSize('large')}
              className={`px-2 py-1 rounded text-base font-semibold transition-all ${
                fontSize === 'large'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'bg-sky-50 text-slate-500 border border-sky-200 hover:bg-sky-100'
              }`}
              title="大"
            >A</button>
          </div>
        </div>
      </nav>

      {/* ── Main Content Area (Map Background) ── */}
      <div className="relative flex-1 h-full overflow-hidden">
        {/* The Map stays here at the bottom layer */}
        <div className="absolute inset-0 z-0">
          <MapView onStartTour={startTour} />
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
                <NodeFeedbackForm
                  lat={userLocation.lat}
                  lng={userLocation.lng}
                  stationId=""
                  stationName="水道/地景環境觀測"
                  onClose={() => setActiveTab('map')}
                />
              </div>
            </div>
            <button 
              onClick={() => setActiveTab('map')}
              className="mt-4 px-6 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors"
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
                  {loadingChangelog ? (
                    <div className="text-center py-12">
                      <div className="inline-block w-8 h-8 border-3 border-white/20 border-t-teal-400 rounded-full animate-spin mb-3" />
                      <p className="text-white/40 text-xs tracking-wider">正在加載並解析更新日誌...</p>
                    </div>
                  ) : changelog.length === 0 ? (
                    <div className="text-center py-12 text-white/30 text-sm">
                      📭 目前尚無更新紀錄
                    </div>
                  ) : (
                    changelog.map((entry, idx) => {
                      const styles = getTagStyles(entry.tag);
                      return (
                        <div key={entry.version + idx} className="relative flex gap-5">
                          {/* Left Dot with Emoji */}
                          <div 
                            className={`relative z-10 mt-1 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border ${styles.dotBorder}`} 
                            style={{ background: styles.bgGradient }}
                          >
                            <span className="text-base">{entry.emoji}</span>
                          </div>
                          
                          {/* Right Content Card */}
                          <div 
                            className={`flex-1 rounded-2xl p-5 border border-white/8 ${styles.borderHover} transition-all duration-300`} 
                            style={{ background: styles.cardBg }}
                          >
                            <div className="flex items-center gap-2 flex-wrap mb-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider ${styles.badgeBg}`}>
                                {entry.tag.toUpperCase()}
                              </span>
                              <span className="text-white font-bold text-sm">{entry.version}</span>
                              <span className="text-white/30 text-xs">{entry.date}</span>
                            </div>
                            <h3 className="text-white/90 font-semibold text-sm mb-2">{entry.title}</h3>
                            <div className="text-white/50 text-xs leading-relaxed space-y-1.5">
                              {entry.descriptions.map((desc, dIdx) => (
                                <div key={dIdx}>
                                  {entry.descriptions.length > 1 ? `${dIdx + 1}. ` : '• '}
                                  {desc}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="mt-12 pt-6 border-t border-white/8 flex items-center justify-between">
                <p className="text-white/25 text-[11px]">信水義河 · 臺大城鄉所 × 信義社大</p>
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

      {/* ── Landing Page Welcome Screen Overlay ── */}
      {showLanding && (
        <div
          className="absolute inset-0 z-[4000] overflow-y-auto flex flex-col items-center py-12 px-4 md:px-8 select-none"
          style={{ background: 'linear-gradient(180deg, #dbeafe 0%, #bfdbfe 18%, #c7e9fc 40%, #ddf4fd 65%, #eff9ff 100%)' }}
        >
          {/* ── Water animation layer ── */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">

            {/* 水面流紋：單一方向漂移的流線形光斑——清澈水流的表面紋理 */}
            <div className="caustic-layer-1" />
            <div className="caustic-layer-2" />

            {/* 圳道水脈：蜿蜒穿行的軌跡線，虛線緩緩前行——潛流在城市之下、不曾消失的水路 */}
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 1440 900"
              preserveAspectRatio="none"
            >
              <path
                className="stream-path"
                d="M-20,180 C180,150 320,230 520,205 C720,180 800,120 1000,150 C1180,177 1300,240 1460,215"
                stroke="rgba(56,152,199,0.30)"
                strokeWidth="2.5"
                strokeDasharray="14 12"
              />
              <path
                className="stream-path-slow"
                d="M-20,480 C240,440 380,540 620,510 C860,480 940,400 1160,440 C1310,467 1400,510 1460,495"
                stroke="rgba(56,152,199,0.22)"
                strokeWidth="3.5"
                strokeDasharray="20 16"
              />
              <path
                className="stream-path"
                d="M-20,730 C200,700 360,780 560,755 C760,730 880,670 1080,700 C1260,727 1380,770 1460,750"
                stroke="rgba(125,196,228,0.28)"
                strokeWidth="2"
                strokeDasharray="10 10"
              />
            </svg>

            {/* 大面積柔光暈（底層光感） */}
            {WATER_GLOWS.map((s, i) => (
              <div
                key={`glow-${i}`}
                className="absolute rounded-full"
                style={{
                  top: s.top, left: s.left, width: s.w, height: s.h,
                  background: 'radial-gradient(ellipse, rgba(255,255,255,0.55) 0%, rgba(186,230,253,0.25) 55%, transparent 80%)',
                  filter: 'blur(12px)',
                  animation: 'shimmer-pulse 7s ease-in-out infinite',
                  animationDelay: s.delay,
                }}
              />
            ))}

            {/* 流光：光痕順著水流方向滑行漸隱——有方向的水，有力量的水 */}
            {WATER_STREAKS.map((s, i) => (
              <div
                key={`streak-${i}`}
                className="absolute rounded-full"
                style={{
                  top: s.top, left: s.left, width: s.w, height: s.h,
                  background: 'linear-gradient(90deg, transparent 0%, rgba(224,242,254,0.85) 30%, rgba(255,255,255,0.95) 70%, transparent 100%)',
                  filter: 'blur(0.5px)',
                  animation: `streak-drift ${s.dur} linear infinite`,
                  animationDelay: s.delay,
                }}
              />
            ))}

            {/* Bottom wave band — 平緩流暢的微幅起伏（順著地勢的水），底層帶一筆稻浪的淡黃綠 */}
            <div className="absolute bottom-0 left-0 right-0 overflow-hidden" style={{ height: '200px' }}>
              <div className="wave-bob-1">
                <div className="wave-flow-1" style={{ width: '200%', display: 'flex' }}>
                  {[0, 1].map(k => (
                    <svg key={k} viewBox="0 0 1440 200" style={{ width: '50%', flexShrink: 0 }} preserveAspectRatio="none">
                      <path d="M0,95 C200,78 380,110 600,98 C820,86 940,68 1140,82 C1280,92 1380,100 1440,95 L1440,200 L0,200 Z" fill="rgba(186,230,253,0.32)" />
                      <path d="M0,95 C200,78 380,110 600,98 C820,86 940,68 1140,82 C1280,92 1380,100 1440,95" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="1.4" />
                      <path d="M0,128 C240,112 440,144 700,132 C960,120 1120,104 1300,118 C1380,124 1420,130 1440,128 L1440,200 L0,200 Z" fill="rgba(147,210,244,0.24)" />
                      <path d="M0,162 C280,148 520,176 800,166 C1080,156 1260,146 1440,160 L1440,200 L0,200 Z" fill="rgba(217,240,196,0.30)" />
                      <path d="M0,178 C320,168 640,190 960,180 C1200,172 1360,182 1440,178 L1440,200 L0,200 Z" fill="rgba(219,234,254,0.42)" />
                    </svg>
                  ))}
                </div>
              </div>
            </div>

            {/* Mid subtle wave */}
            <div className="absolute left-0 right-0 overflow-hidden" style={{ top: '38%', height: '100px' }}>
              <div className="wave-bob-2">
                <div className="wave-flow-2" style={{ width: '200%', display: 'flex' }}>
                  {[0, 1].map(k => (
                    <svg key={k} viewBox="0 0 1440 100" style={{ width: '50%', flexShrink: 0 }} preserveAspectRatio="none">
                      <path d="M0,52 C220,40 420,62 660,54 C900,46 1060,36 1260,46 C1360,51 1420,54 1440,52 L1440,100 L0,100 Z" fill="rgba(186,230,253,0.14)" />
                      <path d="M0,52 C220,40 420,62 660,54 C900,46 1060,36 1260,46 C1360,51 1420,54 1440,52" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.1" />
                    </svg>
                  ))}
                </div>
              </div>
            </div>

            {/* Top wave */}
            <div className="absolute top-0 left-0 right-0 overflow-hidden" style={{ height: '130px' }}>
              <div className="wave-bob-3">
                <div className="wave-flow-3" style={{ width: '200%', display: 'flex' }}>
                  {[0, 1].map(k => (
                    <svg key={k} viewBox="0 0 1440 130" style={{ width: '50%', flexShrink: 0 }} preserveAspectRatio="none">
                      <path d="M0,68 C240,54 460,80 720,70 C980,60 1160,48 1340,60 C1400,64 1430,68 1440,68 L1440,0 L0,0 Z" fill="rgba(219,234,254,0.55)" />
                    </svg>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Content ── */}
          <div className="relative z-10 max-w-5xl w-full flex flex-col items-center gap-8">

            {/* Hero Header */}
            <div className="text-center flex flex-col items-center gap-4 max-w-2xl">
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs text-slate-500 bg-white/70 border border-sky-200/80 shadow-sm tracking-widest">
                臺大城鄉所「智慧城市與數位民主」× 信義社區大學
              </span>

              <h2
                className="text-5xl md:text-6xl text-slate-700 tracking-[0.22em] leading-tight mt-3 drop-shadow-sm"
                style={{ fontFamily: 'var(--font-serif)', fontWeight: 700 }}
              >
                信水義河
              </h2>

              <p
                className="text-slate-500 text-base md:text-lg tracking-[0.12em] leading-loose mt-1"
                style={{ fontFamily: 'var(--font-serif)', fontWeight: 400 }}
              >
                以水文地景為經緯，編織信義區的在地記憶
              </p>

              <div className="flex items-center gap-3 mt-1 opacity-50">
                <div className="h-px w-10 bg-gradient-to-r from-transparent to-sky-400" />
                <div className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                <div className="h-px w-10 bg-gradient-to-l from-transparent to-sky-400" />
              </div>
            </div>

            {/* CTA Button */}
            <div className="flex justify-center z-20 mt-1">
              <button
                onClick={() => setShowLanding(false)}
                className="w-full sm:w-auto px-10 py-4 rounded-2xl text-sm font-semibold text-white bg-sky-600 hover:bg-sky-500 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer shadow-lg shadow-sky-300/40 hover:shadow-sky-400/60 active:scale-95 flex items-center justify-center gap-2 border border-sky-400/30 group tracking-widest"
                style={{ fontFamily: 'var(--font-serif)' }}
              >
                <span>展開水文地圖探索</span>
                <span className="group-hover:translate-x-1 transition-transform text-sky-200">→</span>
              </button>
            </div>

            {/* Section title */}
            <div className="w-full text-center mt-4">
              <h3
                className="text-xl md:text-2xl text-slate-600 tracking-[0.18em]"
                style={{ fontFamily: 'var(--font-serif)', fontWeight: 700 }}
              >
                功能介紹
              </h3>
              <p className="text-slate-400 text-xs md:text-sm tracking-widest mt-1.5">了解本網站如何協助您探索社區水文</p>
              <div className="h-px w-12 bg-sky-300/60 mx-auto mt-3" />
            </div>

            {/* Card Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 w-full mt-1">

              {[
                {
                  icon: '🎒', accent: 'sky',
                  title: '導覽學員・溫故知新',
                  body: '曾參與信義社大水文走讀導覽嗎？這個地圖能讓您跨越時空重溫走讀時的感動。您可以隨時回顧四條精心規劃的水文路線與豐富的站點內容，更能將當時的所見、所聞以「語音或文字」記錄下來，讓走讀的學習得以延續，化作永恆的數位記憶。',
                  span: '',
                },
                {
                  icon: '🚶', accent: 'emerald',
                  title: '自主踏查・GPS 實地探索',
                  body: '即使沒有參加實體導覽，您也能依循地圖上的精準標記進行一場「個人專屬的水文微旅行」。在手機上開啟 GPS 實體定位功能，一邊行走，一邊隨時比對周遭的河道遺跡、老樹遮蔭，並在踏查過後分享您的真實感受與新發現，成為都市河流的現代探索者。',
                  span: '',
                },
                {
                  icon: '🕰️', accent: 'indigo',
                  title: '跨越時空・多元圖層對照',
                  body: '無論您是走讀學員或文史愛好者，皆可自由疊加並對照多種圖資——包含日治堡圖、大正地形圖、瑠公圳區域圖等。透過透明度微調拉桿，直觀比對清代埤塘、日治水圳到當代大排水溝的演變，深入剖析水文脈絡與都市發展的共生關係。',
                  span: '',
                },
                {
                  icon: '🏡', accent: 'violet',
                  title: '社區居民・尋找百年的家',
                  body: '住在信義區的朋友，這是一個專屬於您的在地故事館。透過圖層疊合功能，找到您現時居住的街廓。將當前街道對比一百年前的臺灣堡圖，您將驚奇地發現：原來您的家在百年前可能是一片碧綠的水稻田、或是瑠公圳的潺潺支流。',
                  span: '',
                },
                {
                  icon: '💬', accent: 'cyan',
                  title: '數位增磚・社區共創記錄',
                  body: '水文歷史不只存在於書本中，更活在眾人的回憶裡。您可以在地圖上閱覽其他居民與學員留下的點滴回饋、昔日相片與口述故事。以「數位增磚」的方式，共同編織出一張充滿溫度、持續成長的「社區數位水文地景誌」。',
                  span: 'lg:col-span-2',
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className={`group relative rounded-2xl p-6 border bg-white/80 hover:bg-white/95 border-sky-100 hover:border-sky-300/60 transition-all duration-300 shadow-sm hover:shadow-md flex flex-col gap-4 ${card.span}`}
                >
                  <div className={`w-11 h-11 rounded-xl bg-${card.accent}-50/80 border border-${card.accent}-100 flex items-center justify-center text-xl group-hover:scale-105 transition-all duration-300`}>
                    {card.icon}
                  </div>
                  <div>
                    <h3
                      className="text-slate-700 text-base tracking-wider mb-2"
                      style={{ fontFamily: 'var(--font-serif)', fontWeight: 700 }}
                    >
                      {card.title}
                    </h3>
                    <p className="text-slate-500 text-xs md:text-sm leading-relaxed tracking-wide">
                      {card.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <footer className="w-full text-center mt-6 pb-4 flex flex-col items-center gap-3">
              <div className="flex items-center gap-3 opacity-30">
                <div className="h-px w-10 bg-sky-400" />
                <div className="w-1 h-1 rounded-full bg-sky-400" />
                <div className="h-px w-10 bg-sky-400" />
              </div>
              <p className="text-xs text-slate-400 tracking-widest">
                國立臺灣大學建築與城鄉研究所・信義社區大學
              </p>
              <Link href="/privacy" className="text-sky-500 hover:text-sky-400 text-xs tracking-widest transition-colors flex items-center gap-1">
                🛡️ 隱私聲明與資料使用說明
              </Link>
            </footer>

          </div>
        </div>
      )}
    </div>
  );
}

