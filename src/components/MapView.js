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
import RouteLayer from './layers/RouteLayer';
import UserLocationLayer from './layers/UserLocationLayer';
import HistoricalLayer, { HistoricalControl, HISTORICAL_MAPS } from './layers/HistoricalLayer';
import TemperatureLayer, { TemperatureControl, useTemperatureLayer } from './layers/TemperatureLayer';
import DataSourceControl from './layers/DataSourceControl';
import NodeFeedbackForm from './forms/NodeFeedbackForm';
import InfoTooltip from './layers/info-tooltip/InfoTooltip';
import ShadeMapLayer from './layers/ShadeMapLayer';

// Fix default icon issue in leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

import SatelliteLayer, { SatelliteControl, SATELLITE_MAPS } from './layers/SatelliteLayer';


// ── helpers ────────────────────────────────────────────────
/** Convert minutes since midnight to AM/PM Chinese time string */
function formatMinutesToTimeStr(minutes) {
  const hr = Math.floor(minutes / 60);
  const min = minutes % 60;
  const period = hr >= 12 ? '下午' : '上午';
  const displayHr = hr > 12 ? hr - 12 : (hr === 0 ? 12 : hr);
  const formattedMin = String(min).padStart(2, '0');
  return `${period} ${String(displayHr).padStart(2, '0')}:${formattedMin}`;
}

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
  { emoji: '🔵', label: '路線一：瑠公圳水泱泱' },
  { emoji: '🟢', label: '路線二：信義之源 陂水之觀' },
  { emoji: '🟠', label: '路線三：錫口 五分埔支線' },
  { emoji: '🟣', label: '路線四：東西神 三大排水系' },
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

// Custom DivIcon for approved community markers (Warm orange/cream theme)
const communityIcon = typeof window !== 'undefined' ? L.divIcon({
  className: 'community-div-icon',
  html: `<div style="
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background-color: #fffbeb;
    border: 2px solid #ea580c;
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
    font-size: 14px;
    line-height: 1;
  ">🧡</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
}) : null;

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

  // ShadeMap layer state
  const [showShade, setShowShade] = useState(false);
  const [shadeOpacity, setShadeOpacity] = useState(0.6);
  const [shadeTimeMinutes, setShadeTimeMinutes] = useState(() => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    return Math.max(360, Math.min(1080, currentMinutes));
  });

  const shadeDate = useMemo(() => {
    const d = new Date();
    const hours = Math.floor(shadeTimeMinutes / 60);
    const minutes = shadeTimeMinutes % 60;
    d.setHours(hours, minutes, 0, 0);
    return d;
  }, [shadeTimeMinutes]);

  // Historical basemap state (null = none active)
  const [activeHistory, setActiveHistory] = useState('liugong1939');
  const [historyOpacities, setHistoryOpacities] = useState(
    HISTORICAL_MAPS.reduce((acc, hm) => ({ ...acc, [hm.id]: hm.id === 'liugong1939' ? 0.5 : 0.7 }), {})
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
  const { showTemperature, setShowTemperature, temperatureUrl, temperatureLoading } = useTemperatureLayer();
  const [temperatureOpacity, setTemperatureOpacity] = useState(0.65);

  const toggleHistory = (id) =>
    setActiveHistory((prev) => (prev === id ? null : id));

  const toggleSatellite = (id) =>
    setActiveSatellite((prev) => (prev === id ? null : id));

  // Geolocation state
  const [userPos, setUserPos] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [locating, setLocating] = useState(false);

  // Add Free Marker state
  const [isAddMarkerMode, setIsAddMarkerMode] = useState(false);
  const [newMarkerPos, setNewMarkerPos] = useState(null);

  // 社群審核通過地景標記狀態
  const [communityMarkers, setCommunityMarkers] = useState([]);
  const [showCommunityMarkers, setShowCommunityMarkers] = useState(true);

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

  const handleAddMarker = (latlng) => {
    setNewMarkerPos(latlng);
    setIsAddMarkerMode(false); // Disable mode after placing the marker
  };

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
    if (!navigator.geolocation) {
      alert('您的瀏覽器不支援定位功能');
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
          alert('請允許瀏覽器存取您的位置');
        } else {
          alert('無法取得您的位置，請稍後再試');
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
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
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
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
        <TemperatureLayer show={showTemperature} url={temperatureUrl} opacity={temperatureOpacity} />
        <ShadeMapLayer
          show={showShade}
          apiKey={process.env.NEXT_PUBLIC_SHADEMAP_API_KEY}
          date={shadeDate}
          opacity={shadeOpacity}
        />

        {routes.map((route, ri) =>
          visibility[ri] ? (
            <RouteLayer
              key={route.id}
              route={route}
              polylines={polylines[ri]}
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
            icon={communityIcon}
          >
            <Popup className="feedback-popup" minWidth={280} maxWidth={340}>
              <div className="p-2 font-sans text-slate-800 animate-fade-in">
                {/* Custom Popup Header */}
                <div className="border-b border-slate-200 pb-2 mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                    <span className="text-[10px] bg-amber-500/10 text-amber-700 border border-amber-500/20 px-2.5 py-0.5 rounded-full font-bold">
                      👥 社群走讀地標
                    </span>
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
          border border-blue-900/10 rounded-2xl
          shadow-xl text-slate-800
          transition-all duration-300 ease-in-out
          ${expandPanel ? 'w-60 md:w-72 h-auto max-h-[65dvh] md:h-[600px] md:max-h-[calc(100dvh-32px)] p-3 md:p-4 flex flex-col' : 'w-10 h-10 md:w-12 md:h-12 p-0 overflow-hidden'}
        `}
      >
        {/* Toggle button */}
        <button
          id="layer-panel-toggle"
          onClick={() => setExpandPanel(!expandPanel)}
          className={`
            flex items-center justify-center
            ${expandPanel ? 'w-full mb-1.5 py-1 text-xs md:text-sm' : 'w-10 h-10 md:w-12 md:h-12'}
            rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900
            transition-colors duration-200
            text-sm md:text-lg cursor-pointer font-bold flex-shrink-0
          `}
          aria-label="切換圖層面板"
        >
          {expandPanel ? '✕ 關閉' : '☰'}
        </button>

        {expandPanel && (
          <>
            <h3 className="text-xs md:text-base font-bold mb-2 md:mb-3 tracking-wide text-blue-900 flex-shrink-0">
              圖層控制
            </h3>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto pr-1 select-none space-y-3 md:space-y-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full text-xs">
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

                  {/* ☀️ 即時日照陰影 */}
                  <div className="flex flex-col mb-1 border-t border-slate-100 pt-2">
                    <div className="flex items-center justify-between gap-2 hover:bg-slate-50 rounded-lg px-2 py-1.5 transition-colors w-full">
                      <label className="flex items-center gap-3 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={showShade}
                          onChange={(e) => setShowShade(e.target.checked)}
                          className="w-5 h-5 rounded accent-[#fbbf24] cursor-pointer"
                        />
                        <span className="text-sm leading-tight text-slate-700">
                          ☀️ 即時日照陰影
                        </span>
                      </label>
                      <InfoTooltip id="shademap" />
                    </div>

                    {/* Controls - visible only when showShade is active */}
                    <div className={`
                      flex flex-col gap-2 px-10 transition-all duration-300 ease-in-out
                      ${showShade ? 'opacity-100 mt-1 mb-2' : 'h-0 opacity-0 overflow-hidden'}
                    `}>
                      {/* Opacity control */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 w-12 flex-shrink-0">不透明度</span>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={shadeOpacity}
                          onChange={(e) => setShadeOpacity(parseFloat(e.target.value))}
                          className="flex-1 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#fbbf24]"
                        />
                        <span className="text-[10px] font-mono font-bold text-slate-500 w-8 text-right">
                          {Math.round(shadeOpacity * 100)}%
                        </span>
                      </div>

                      {/* Time format display & Reset button */}
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1 select-none">
                          🕒 {formatMinutesToTimeStr(shadeTimeMinutes)}
                        </span>
                        <button
                          onClick={() => {
                            const now = new Date();
                            const currentMinutes = now.getHours() * 60 + now.getMinutes();
                            setShadeTimeMinutes(Math.max(360, Math.min(1080, currentMinutes)));
                          }}
                          className="text-[10px] px-2 py-0.5 rounded bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 transition-colors font-semibold cursor-pointer"
                        >
                          🔄 恢復目前時間
                        </button>
                      </div>

                      {/* Time Slider */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-mono select-none">06:00</span>
                        <input
                          type="range"
                          min="360"
                          max="1080"
                          step="5"
                          value={shadeTimeMinutes}
                          onChange={(e) => setShadeTimeMinutes(parseInt(e.target.value, 10))}
                          className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#d97706]"
                          style={{
                            background: 'linear-gradient(to right, #93c5fd, #fef08a, #818cf8)'
                          }}
                        />
                        <span className="text-[10px] text-slate-400 font-mono select-none">18:00</span>
                      </div>
                    </div>
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

            {/* Fixed Footer */}
            <div className="mt-2 pt-2 md:mt-3 md:pt-3 border-t border-slate-200 flex-shrink-0">
              <button
                onClick={() => {
                  setIsAddMarkerMode(!isAddMarkerMode);
                  if (newMarkerPos) setNewMarkerPos(null);
                }}
                className={`
                  w-full py-1.5 md:py-2.5 rounded-lg font-bold text-xs md:text-sm transition-all
                  flex items-center justify-center gap-1.5 md:gap-2
                  ${isAddMarkerMode
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}
                `}
              >
                {isAddMarkerMode ? (
                  <><span>🎯</span> <span className="text-[10px] md:text-xs">點擊地圖新增標記</span></>
                ) : (
                  <><span>📍</span> 自由新增地景標記</>
                )}
              </button>
            </div>
          </>
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
          absolute top-[64px] md:top-[72px] right-3 z-[1000]
          w-10 h-10 md:w-12 md:h-12 rounded-2xl
          bg-white/95 backdrop-blur-md
          border border-blue-900/10 shadow-lg
          flex items-center justify-center
          text-sm md:text-lg transition-all duration-200
          hover:bg-blue-50 active:scale-95
          ${locating ? 'animate-pulse text-blue-400' : 'text-blue-900'}
        `}
        title="取得目前位置"
      >
        {locating ? '⏳' : '📍'}
      </button>

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


