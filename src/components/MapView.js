'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  useMap,
  useMapEvents,
  Marker,
  Popup,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { routes } from '@/data/routeData';
import ZoningLayer from './layers/ZoningLayer';
import ComfortLayer from './layers/ComfortLayer';
import RouteLayer, { COMFORT_SCALE } from './layers/RouteLayer';
import UserLocationLayer from './layers/UserLocationLayer';
import HistoricalLayer, { HistoricalControl, HISTORICAL_MAPS } from './layers/HistoricalLayer';
import TemperatureLayer, { TemperatureControl, useTemperatureLayer } from './layers/TemperatureLayer';
import DataSourceControl from './layers/DataSourceControl';
import NodeFeedbackForm from './forms/NodeFeedbackForm';
import InfoTooltip from './layers/info-tooltip/InfoTooltip';
import dynamic from 'next/dynamic';
const ShadeMapLayer = dynamic(() => import('./layers/ShadeMapLayer'), { ssr: false });

// Fix default icon issue in leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

import SatelliteLayer, { SatelliteControl, SATELLITE_MAPS } from './layers/SatelliteLayer';
import { CARTO_LIGHT_URL, CARTO_ATTRIBUTION } from '@/lib/basemap';


// ── helpers ────────────────────────────────────────────────
/** Build a full polyline path from station coords + segment waypoints */
function buildPolyline(route) {
  const stationMap = {};
  route.stations.forEach((s) => {
    stationMap[s.id] = [s.lat, s.lng];
  });

  // If no segments data, fall back to station order
  if (!route.segments || route.segments.length === 0) {
    return route.stations.map((s) => [s.lat, s.lng]);
  }

  const lines = [];
  route.segments.forEach((seg) => {
    const from = stationMap[seg.from];
    const to = stationMap[seg.to];
    if (!from || !to) return;
    const pts = [from];
    if (seg.waypoints) {
      seg.waypoints.forEach((wp) => pts.push([wp.lat, wp.lng]));
    }
    pts.push(to);
    lines.push(pts);
  });
  return lines;
}

// ── Route labels for the control panel ─────────────────────
const ROUTE_LABELS = [
  { emoji: '🩵', label: '路線一：瑠公圳水泱泱' },
  { emoji: '🌿', label: '路線二：信義之源 陂水之觀' },
  { emoji: '🟤', label: '路線三：錫口 五分埔支線' },
  { emoji: '🌾', label: '路線四：東西神 三大排水系' },
];

// ── FitBounds helper component ─────────────────────────────
function FitBoundsOnLoad() {
  const map = useMap();
  useEffect(() => {
    // Gather all station coords
    const allCoords = routes.flatMap((r) =>
      r.stations.map((s) => [s.lat, s.lng])
    );
    if (allCoords.length > 0) {
      map.fitBounds(allCoords, { padding: [30, 30] });
    }
  }, [map]);
  return null;
}

// ── Map Click Interaction for Free Marker ────────────────────
function AddMarkerInteraction({ isAddMode, onAddMarker }) {
  useMapEvents({
    click(e) {
      if (isAddMode) {
        onAddMarker(e.latlng);
      }
    }
  });
  return null;
}

// Custom DivIcons for approved community markers
// 🧡 memory (warm cream) / ⚠️ environmental report (alert red)
const makeCommunityIcon = (emoji, borderColor, bgColor) => L.divIcon({
  className: 'community-div-icon',
  html: `<div style="
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background-color: ${bgColor};
    border: 2px solid ${borderColor};
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
    font-size: 14px;
    line-height: 1;
  ">${emoji}</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
});

const communityIcon = typeof window !== 'undefined'
  ? makeCommunityIcon('🧡', '#ea580c', '#fffbeb') : null;
const reportIcon = typeof window !== 'undefined'
  ? makeCommunityIcon('⚠️', '#dc2626', '#fef2f2') : null;

// ── Main map component ─────────────────────────────────────
export default function MapView({ onStartTour }) {
  const [visibility, setVisibility] = useState(
    routes.map(() => true)
  );
  const [expandPanel, setExpandPanel] = useState(false);

  // Open Data layers state (Toggles only)
  const [showTrees, setShowTrees] = useState(false);
  const [showSidewalks, setShowSidewalks] = useState(false);
  const [showZoning, setShowZoning] = useState(false);
  const [zoningOpacity, setZoningOpacity] = useState(0.45);

  // ShadeMap (Sun Shadow) state
  const [showShadeMap, setShowShadeMap] = useState(false);
  const [shadeMapOpacity, setShadeMapOpacity] = useState(0.6);
  const nowMinutes = (() => {
    const n = new Date();
    const m = n.getHours() * 60 + n.getMinutes();
    return Math.max(360, Math.min(1080, m)); // clamp 06:00-18:00
  })();
  const [shadeMapTime, setShadeMapTime] = useState(nowMinutes);
  const shadeMapDate = useMemo(() => {
    const d = new Date();
    d.setHours(Math.floor(shadeMapTime / 60), shadeMapTime % 60, 0, 0);
    return d;
  }, [shadeMapTime]);

  const formatMinutes = (m) => {
    const h = Math.floor(m / 60);
    const min = m % 60;
    const ampm = h < 12 ? '上午' : '下午';
    const hh = h % 12 === 0 ? 12 : h % 12;
    return `${ampm} ${hh}:${String(min).padStart(2, '0')}`;
  };

  // Historical basemap state (null = none active)
  const [activeHistory, setActiveHistory] = useState('liugong1939');
  const [historyOpacities, setHistoryOpacities] = useState(
    HISTORICAL_MAPS.reduce((acc, hm) => ({ ...acc, [hm.id]: hm.id === 'liugong1939' ? 0.55 : 0.7 }), {})
  );

  // Satellite layer state
  const [activeSatellite, setActiveSatellite] = useState(null);
  const [satelliteOpacities, setSatelliteOpacities] = useState(
    SATELLITE_MAPS.reduce((acc, sm) => ({ ...acc, [sm.id]: 0.7 }), {})
  );

  const handleHistoryOpacityChange = (id, value) => {
    setHistoryOpacities(prev => ({ ...prev, [id]: value }));
  };

  const handleSatelliteOpacityChange = (id, value) => {
    setSatelliteOpacities(prev => ({ ...prev, [id]: value }));
  };

  // Temperature Layer State
  const { 
    showTemperature, 
    setShowTemperature, 
    temperatureUrl, 
    temperatureLoading,
    temperatureOpacity,
    setTemperatureOpacity 
  } = useTemperatureLayer();

  const toggleHistory = (id) =>
    setActiveHistory((prev) => (prev === id ? null : id));

  const toggleSatellite = (id) =>
    setActiveSatellite((prev) => (prev === id ? null : id));

  // Geolocation state
  const [userPos, setUserPos] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState(null);

  // Add Free Marker state
  const [isAddMarkerMode, setIsAddMarkerMode] = useState(false);
  const [newMarkerPos, setNewMarkerPos] = useState(null);

  const handleAddMarker = (latlng) => {
    setNewMarkerPos(latlng);
    setIsAddMarkerMode(false); // Disable mode after placing the marker
  };

  // 社群審核通過地景標記狀態
  const [communityMarkers, setCommunityMarkers] = useState([]);
  const [showCommunityMarkers, setShowCommunityMarkers] = useState(true);

  // 路線舒適度檢視模式
  const [showComfort, setShowComfort] = useState(false);
  const [comfortStats, setComfortStats] = useState(null); // null=未載入, {}=載入失敗或無資料
  const [comfortLoading, setComfortLoading] = useState(false);

  const toggleComfortMode = () => {
    const next = !showComfort;
    setShowComfort(next);
    // 首次開啟時才載入統計
    if (next && comfortStats === null && !comfortLoading) {
      setComfortLoading(true);
      fetch('/api/route-comfort-stats')
        .then(res => res.ok ? res.json() : Promise.reject(new Error('stats unavailable')))
        .then(data => setComfortStats(data.stats || {}))
        .catch(err => {
          console.error('Failed to load comfort stats:', err);
          setComfortStats({});
        })
        .finally(() => setComfortLoading(false));
    }
  };

  // 載入審核通過的社群地景
  useEffect(() => {
    async function loadCommunityMarkers() {
      try {
        const res = await fetch('/api/feedback-list');
        if (res.ok) {
          const data = await res.json();
          setCommunityMarkers(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Failed to load community markers:', err);
      }
    }
    loadCommunityMarkers();
  }, [newMarkerPos]);

  const polylines = useMemo(
    () => routes.map((r) => buildPolyline(r)),
    []
  );

  const toggleRoute = (idx) => {
    setVisibility((prev) => {
      const next = [...prev];
      next[idx] = !next[idx];
      return next;
    });
  };

  const allOn = () => setVisibility(routes.map(() => true));
  const allOff = () => setVisibility(routes.map(() => false));

  // Geolocation handler
  const handleLocate = () => {
    setLocateError(null);

    // iOS Safari silently blocks geolocation on HTTP — detect early
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setLocateError('https');
      return;
    }

    if (!navigator.geolocation) {
      setLocateError('unsupported');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setUserPos([latitude, longitude]);
        setAccuracy(accuracy);
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        if (err.code === 1) {
          setLocateError('denied');
        } else {
          setLocateError('failed');
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const locateErrorMessages = {
    https:       '📡 定位需要 HTTPS 連線。請使用正式網址（https://）開啟本網站。',
    denied:      '🔒 位置存取被拒絕。請在 Safari 設定 → 網站 → 位置 中允許本網站存取。',
    unsupported: '⚠️ 您的瀏覽器不支援定位功能。',
    failed:      '⚠️ 無法取得位置，請稍後再試。',
  };

  return (
    <div id="map-container-wrapper" className="relative w-full h-full">
      {/* ── Map ─────────────────────────────────────────── */}
      <MapContainer
        center={[25.033, 121.565]}
        zoom={15}
        className="w-full h-full z-0"
        zoomControl={false}
        preferCanvas={true}
      >
        <TileLayer
          attribution={CARTO_ATTRIBUTION}
          url={CARTO_LIGHT_URL}
          className="map-tiles-tinted"
        />
        <FitBoundsOnLoad />
        <MapFlyTo center={userPos} />
        <AddMarkerInteraction isAddMode={isAddMarkerMode} onAddMarker={handleAddMarker} />

        {/* ── Historical basemap (below all data layers) ── */}
        <HistoricalLayer
          activeId={activeHistory}
          opacity={activeHistory ? historyOpacities[activeHistory] : 0.7}
        />

        {/* ── Satellite layer ── */}
        <SatelliteLayer
          activeId={activeSatellite}
          opacity={activeSatellite ? satelliteOpacities[activeSatellite] : 0.7}
        />

        {/* ── Modular Layers ── */}
        <ZoningLayer showZoning={showZoning} opacity={zoningOpacity} />
        <ComfortLayer showTrees={showTrees} showSidewalks={showSidewalks} />
        <ShadeMapLayer
          show={showShadeMap}
          date={shadeMapDate}
          opacity={shadeMapOpacity}
          showTrees={showTrees}
        />
        <TemperatureLayer show={showTemperature} url={temperatureUrl} opacity={temperatureOpacity} />

        {routes.map((route, ri) =>
          visibility[ri] ? (
            <RouteLayer
              key={route.id}
              route={route}
              polylines={polylines[ri]}
              comfortData={showComfort ? (comfortStats?.[String(route.id)] ?? {}) : null}
            />
          ) : null
        )}

        <UserLocationLayer position={userPos} accuracy={accuracy} />

        {/* Free Marker Form */}
        {newMarkerPos && (
          <Marker position={newMarkerPos}>
            <Popup
              className="feedback-popup"
              minWidth={300}
              maxWidth={400}
              eventHandlers={{
                remove: () => setNewMarkerPos(null) // Clear state when closed
              }}
            >
              <NodeFeedbackForm
                lat={newMarkerPos.lat}
                lng={newMarkerPos.lng}
                onClose={() => setNewMarkerPos(null)}
              />
            </Popup>
          </Marker>
        )}
        {/* ── Approved Community Markers ── */}
        {showCommunityMarkers && communityMarkers.map((marker) => (
          <Marker
            key={marker.id}
            position={[parseFloat(marker.lat), parseFloat(marker.lng)]}
            icon={marker.feedback_type === 'report' ? reportIcon : communityIcon}
          >
            <Popup className="feedback-popup" minWidth={280} maxWidth={340}>
              <div className="p-2 font-sans text-slate-800 animate-fade-in">
                {/* Custom Popup Header */}
                <div className="border-b border-slate-200 pb-2 mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                    {marker.feedback_type === 'report' ? (
                      <span className="text-[10px] bg-red-500/10 text-red-700 border border-red-500/20 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                        ⚠️ 環境通報
                      </span>
                    ) : (
                      <span className="text-[10px] bg-amber-500/10 text-amber-700 border border-amber-500/20 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                        👥 社群走讀地標
                      </span>
                    )}
                    {marker.tags && marker.tags.split(',').map(tag => (
                      <span key={tag} className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
                        #{tag.trim()}
                      </span>
                    ))}
                    {marker.ai_summary && (
                      <span className="text-[9px] bg-violet-100 text-violet-700 border border-violet-200 px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                        ✨ AI 輔助潤飾
                      </span>
                    )}
                  </div>
                  <div className="text-[9px] text-slate-400 font-mono">
                    踏查時間：{new Date(marker.timestamp).toLocaleDateString('zh-TW')}
                  </div>
                </div>

                {/* Photo if present */}
                {marker.photo_url && (
                  <div className="rounded-lg overflow-hidden border border-slate-100 mb-2 max-h-36 flex items-center justify-center bg-slate-50">
                    <img 
                      src={marker.photo_url} 
                      alt="Community geolandscape" 
                      className="object-contain w-full h-full max-h-36"
                      onError={(e) => {
                        e.target.style.display = 'none'; // Hide if failed
                      }}
                    />
                  </div>
                )}

                {/* Photo 2 if present */}
                {marker.photo_url_2 && (
                  <div className="rounded-lg overflow-hidden border border-slate-100 mb-2 max-h-36 flex items-center justify-center bg-slate-50">
                    <img 
                      src={marker.photo_url_2} 
                      alt="Community geolandscape 2" 
                      className="object-contain w-full h-full max-h-36"
                      onError={(e) => {
                        e.target.style.display = 'none'; // Hide if failed
                      }}
                    />
                  </div>
                )}


                {/* User Story Description */}
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap mb-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-sans">
                  {marker.description}
                </p>

                {/* AI Summary card if present */}
                {marker.ai_summary && (
                  <div className="bg-violet-950/5 border border-violet-500/10 rounded-lg p-2.5 text-[10px] text-violet-700">
                    <div className="font-bold flex items-center gap-1 mb-1 text-violet-800">
                      <span>✨</span> <span>AI 輔助潤飾（本段文字經 AI 協助生成）：</span>
                    </div>
                    <p className="leading-relaxed font-medium">
                      {marker.ai_summary}
                    </p>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

      </MapContainer>

      {/* ── Layer control panel (top-right) ─────────────── */}
      <div
        className={`
          absolute top-3 right-3 z-[1000]
          bg-white/95 backdrop-blur-md
          border border-sky-200/60 rounded-2xl
          shadow-md text-slate-800
          transition-all duration-300 ease-in-out
          ${expandPanel ? 'w-[88vw] max-w-72 p-4 md:p-5 flex flex-col max-h-[58dvh] md:max-h-[calc(100dvh-24px)]' : 'w-12 h-12 p-0 overflow-hidden'}
        `}
      >
        {/* Toggle button */}
        <button
          id="layer-panel-toggle"
          onClick={() => setExpandPanel(!expandPanel)}
          className={`
            flex items-center justify-center
            ${expandPanel ? 'w-full mb-3' : 'w-12 h-12'}
            rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800
            transition-colors duration-200
            text-lg cursor-pointer font-bold
          `}
          aria-label="切換圖層面板"
        >
          {expandPanel ? '✕ 關閉' : '☰'}
        </button>

        {expandPanel && (
          <div id="layer-control-panel-content" className="flex flex-col h-full w-full overflow-hidden">
            <h3 className="text-base font-bold mb-3 tracking-wide text-slate-700 shrink-0" style={{ fontFamily: 'var(--font-serif)' }}>
              圖層控制
            </h3>

            {/* Free Marker Toggle */}
            <div className="mb-3 pb-3 border-b border-slate-200 shrink-0">
              <button
                onClick={() => {
                  setIsAddMarkerMode(!isAddMarkerMode);
                  if (newMarkerPos) setNewMarkerPos(null);
                }}
                className={`
                  w-full py-2.5 rounded-lg font-bold text-sm transition-all
                  flex items-center justify-center gap-2
                  ${isAddMarkerMode
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}
                `}
              >
                {isAddMarkerMode ? (
                  <><span>🎯</span> 點擊地圖新增標記 (點此取消)</>
                ) : (
                  <><span>📍</span> 自由新增地景標記</>
                )}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

            {/* Route toggles */}
            <div id="tour-route-toggles" className="w-full">
              <div className="space-y-2 mb-4">
                {routes.map((route, idx) => (
                  <div
                    key={route.id}
                    className="flex items-center justify-between gap-2 hover:bg-slate-50 rounded-lg px-2 py-1.5 transition-colors w-full"
                  >
                    <label
                      className="flex items-center gap-3 cursor-pointer flex-1"
                    >
                      <input
                        type="checkbox"
                        checked={visibility[idx]}
                        onChange={() => toggleRoute(idx)}
                        className="w-5 h-5 rounded accent-current cursor-pointer"
                        style={{ accentColor: route.color }}
                      />
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ background: route.color }}
                      />
                      <span className="text-sm leading-tight text-slate-700">
                        {ROUTE_LABELS[idx].label}
                      </span>
                    </label>
                    <InfoTooltip id={`route-${idx}`} />
                  </div>
                ))}
              </div>

              {/* Quick buttons for routes */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={allOn}
                  className="flex-1 text-xs py-2 rounded-lg font-medium
                             bg-blue-50 hover:bg-blue-100 text-blue-800
                             transition-colors cursor-pointer"
                >
                  全選
                </button>
                <button
                  onClick={allOff}
                  className="flex-1 text-xs py-2 rounded-lg font-medium
                             bg-slate-100 hover:bg-slate-200 text-slate-700
                             transition-colors cursor-pointer"
                >
                  全清
                </button>
              </div>

              {/* 步行舒適度檢視模式 */}
              <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50/60 px-2 py-2">
                <label className="flex items-center justify-between gap-2 cursor-pointer">
                  <span className="flex items-center gap-2 text-sm text-slate-700">
                    <span>🌡️</span> 步行舒適度檢視
                  </span>
                  <input
                    type="checkbox"
                    checked={showComfort}
                    onChange={toggleComfortMode}
                    className="w-5 h-5 rounded cursor-pointer"
                    style={{ accentColor: '#0284c7' }}
                  />
                </label>
                {showComfort && (
                  <div className="mt-2 pt-2 border-t border-slate-200 text-[10px] text-slate-500 leading-relaxed">
                    {comfortLoading ? (
                      <p className="animate-pulse">評分統計載入中...</p>
                    ) : (
                      <>
                        <p className="mb-1">路線依民眾評分平均上色（每 0.5 分一階）：</p>
                        <div className="flex h-2.5 rounded-full overflow-hidden">
                          {COMFORT_SCALE.slice().reverse().map(band => (
                            <span key={band.color} className="flex-1" style={{ background: band.color }} />
                          ))}
                        </div>
                        <div className="flex justify-between mt-0.5 text-slate-400">
                          <span>1.0 差</span>
                          <span>5.0 極佳</span>
                        </div>
                        <div className="flex items-center gap-1 mt-1.5">
                          <span className="w-3 h-1.5 rounded-full inline-block bg-slate-300" /> 無評分
                        </div>
                        <p className="mt-1 text-slate-400">點擊路線可查看各項平均分與評分。</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Open Data toggles */}
            <div id="tour-open-data-toggles" className="w-full">
              <div className="space-y-2 mb-4 pt-3 border-t border-slate-200">
                {/* 民眾走讀回饋圖層 */}
                <div className="flex items-center justify-between gap-2 hover:bg-slate-50 rounded-lg px-2 py-1.5 transition-colors w-full">
                  <label
                    className="flex items-center gap-3 cursor-pointer flex-1"
                  >
                    <input
                      type="checkbox"
                      checked={showCommunityMarkers}
                      onChange={() => setShowCommunityMarkers(!showCommunityMarkers)}
                      className="w-5 h-5 rounded accent-[#ea580c] cursor-pointer"
                    />
                    <span className="text-sm leading-tight text-slate-700 font-semibold text-orange-700">🧡 民眾走讀回饋</span>
                  </label>
                  <InfoTooltip id="community-markers" />
                </div>

                <div className="flex items-center justify-between gap-2 hover:bg-slate-50 rounded-lg px-2 py-1.5 transition-colors w-full">
                  <label
                    className="flex items-center gap-3 cursor-pointer flex-1"
                  >
                    <input
                      type="checkbox"
                      checked={showTrees}
                      onChange={() => setShowTrees(!showTrees)}
                      className="w-5 h-5 rounded accent-[#16a34a] cursor-pointer"
                    />
                    <span className="text-sm leading-tight text-slate-700">🌳 行道樹遮蔭</span>
                  </label>
                  <InfoTooltip id="trees" />
                </div>

                <div className="flex items-center justify-between gap-2 hover:bg-slate-50 rounded-lg px-2 py-1.5 transition-colors w-full">
                  <label
                    className="flex items-center gap-3 cursor-pointer flex-1"
                  >
                    <input
                      type="checkbox"
                      checked={showSidewalks}
                      onChange={() => setShowSidewalks(!showSidewalks)}
                      className="w-5 h-5 rounded accent-[#60a5fa] cursor-pointer"
                    />
                    <span className="text-sm leading-tight text-slate-700">🚶 人行道範圍</span>
                  </label>
                  <InfoTooltip id="sidewalks" />
                </div>

                <div className="flex flex-col mb-1">
                  <div className="flex items-center justify-between gap-2 hover:bg-slate-50 rounded-lg px-2 py-1.5 transition-colors w-full">
                    <label
                      className="flex items-center gap-3 cursor-pointer flex-1"
                    >
                      <input
                        type="checkbox"
                        checked={showZoning}
                        onChange={() => setShowZoning(!showZoning)}
                        className="w-5 h-5 rounded accent-[#fb923c] cursor-pointer"
                      />
                      <span className="text-sm leading-tight text-slate-700">🏘️ 都市計畫分區</span>
                    </label>
                    <InfoTooltip id="zoning" />
                  </div>

                  {/* Opacity Slider */}
                  <div className={`
                    flex items-center gap-2 px-10 transition-all duration-300 ease-in-out
                    ${showZoning ? 'h-6 opacity-100 mt-0.5' : 'h-0 opacity-0 overflow-hidden'}
                  `}>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={zoningOpacity}
                      onChange={(e) => setZoningOpacity(parseFloat(e.target.value))}
                      className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#fb923c]"
                    />
                    <span className="text-[10px] font-mono font-bold text-slate-500 w-8 text-right">
                      {Math.round(zoningOpacity * 100)}%
                    </span>
                  </div>
                </div>

                <TemperatureControl 
                  show={showTemperature} 
                  onChange={setShowTemperature} 
                  loading={temperatureLoading}
                  opacity={temperatureOpacity}
                  onOpacityChange={setTemperatureOpacity}
                />

                {/* ── ShadeMap Sun Shadow ── */}
                <div className="flex flex-col mb-1">
                  <div className="flex items-center justify-between gap-2 hover:bg-slate-50 rounded-lg px-2 py-1.5 transition-colors w-full">
                    <label className="flex items-center gap-3 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={showShadeMap}
                        onChange={() => setShowShadeMap(!showShadeMap)}
                        className="w-5 h-5 rounded accent-[#f59e0b] cursor-pointer"
                      />
                      <span className="text-sm leading-tight text-slate-700">☀️ 即時日照陰影</span>
                    </label>
                    <InfoTooltip id="shademap" />
                  </div>

                  {/* ShadeMap controls — only visible when layer is on */}
                  {showShadeMap && (
                    <div className="mx-2 mb-2 px-3 py-2.5 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
                      {/* Time slider */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[11px] font-semibold text-amber-800">🕒 {formatMinutes(shadeMapTime)}</span>
                          <button
                            onClick={() => setShadeMapTime(nowMinutes)}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200 hover:bg-amber-300 text-amber-900 font-medium transition-colors cursor-pointer"
                          >
                            🔄 目前時間
                          </button>
                        </div>
                        <input
                          type="range"
                          min="360"
                          max="1080"
                          step="15"
                          value={shadeMapTime}
                          onChange={(e) => setShadeMapTime(Number(e.target.value))}
                          className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
                          style={{ background: 'linear-gradient(to right, #93c5fd, #fef08a, #818cf8)' }}
                        />
                        <div className="flex justify-between text-[9px] text-amber-700 mt-0.5">
                          <span>06:00</span><span>12:00</span><span>18:00</span>
                        </div>
                      </div>

                      {/* Opacity slider */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-amber-700 shrink-0">陰影深度</span>
                        <input
                          type="range"
                          min="0.1"
                          max="1"
                          step="0.05"
                          value={shadeMapOpacity}
                          onChange={(e) => setShadeMapOpacity(parseFloat(e.target.value))}
                          className="flex-1 h-1.5 bg-amber-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                        />
                        <span className="text-[10px] font-mono font-bold text-amber-800 w-7 text-right">
                          {Math.round(shadeMapOpacity * 100)}%
                        </span>
                      </div>

                      <p className="text-[9px] text-amber-600 leading-relaxed">
                        🌳 勾選「行道樹遮蔭」可同時顯示樹冠 3D 陰影
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Historical maps selector */}
            <HistoricalControl
              activeHistory={activeHistory}
              toggleHistory={toggleHistory}
              historyOpacities={historyOpacities}
              onOpacityChange={handleHistoryOpacityChange}
            />

            {/* Satellite layers selector */}
            <SatelliteControl
              activeSatellite={activeSatellite}
              toggleSatellite={toggleSatellite}
              satelliteOpacities={satelliteOpacities}
              onOpacityChange={handleSatelliteOpacityChange}
            />

            {/* Legend */}
            <div className="mt-4 pt-3 border-t border-slate-200">
              <p className="text-[11px] text-slate-500 leading-relaxed">
                共 {routes.reduce((s, r) => s + r.stations.length, 0)} 個站點
                ・點擊站點查看詳情
              </p>
            </div>
            </div>

          </div>
        )}
      </div>

      {/* Global overlay cursor hint for add mode */}
      {isAddMarkerMode && (
        <div className="absolute inset-0 z-[999] pointer-events-none cursor-crosshair"></div>
      )}

      {/* ── Locate Button (Below panel toggle or bottom right) ── */}
      <button
        id="locate-button"
        onClick={handleLocate}
        disabled={locating}
        className={`
          absolute top-[72px] right-3 z-[1000]
          w-12 h-12 rounded-2xl
          bg-white/95 backdrop-blur-md
          border border-sky-200/60 shadow-md
          flex items-center justify-center
          text-2xl transition-all duration-200
          hover:bg-sky-50 active:scale-95
          ${locating ? 'animate-pulse text-sky-400' : 'text-sky-700'}
        `}
        title="取得目前位置"
      >
        {locating ? '⏳' : '📍'}
      </button>

      {/* ── Locate error toast ── */}
      {locateError && (
        <div className="absolute top-[132px] right-3 z-[1000] max-w-[240px] bg-white/97 backdrop-blur-md border border-amber-200 rounded-2xl shadow-lg px-4 py-3 text-xs text-slate-700 leading-relaxed">
          <button
            onClick={() => setLocateError(null)}
            className="float-right ml-2 text-slate-400 hover:text-slate-600 text-sm leading-none"
          >✕</button>
          {locateErrorMessages[locateError]}
        </div>
      )}

      {/* ── Usage Guide Button overlay (bottom-left) ── */}
      <div
        className="
          absolute bottom-4 left-4 z-[1000]
        "
      >
        <button
          id="tour-usage-button"
          onClick={onStartTour}
          className="
            flex items-center justify-center gap-2
            px-4 py-3 rounded-2xl text-xs font-bold
            bg-blue-600 hover:bg-blue-700 text-white
            shadow-xl shadow-blue-500/25 border border-blue-500/20
            transition-all duration-300 active:scale-95 cursor-pointer
          "
          title="使用方法 (How to Use)"
        >
          <span>❓ 使用方法</span>
        </button>
      </div>

      {/* ── Data Source Control (bottom-right) ── */}
      <DataSourceControl />
    </div>
  );
}

// ── Internal Helper: MapFlyTo ───────────────────────────────
function MapFlyTo({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 16, { animate: true, duration: 1.5 });
    }
  }, [center, map]);
  return null;
}


