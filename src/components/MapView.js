'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  Polyline,
  GeoJSON,
  useMap,
  Marker,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { routes, BASE_URL } from '@/data/routeData';
import proj4 from 'proj4';

// ── proj4 setup (TWD97 to WGS84) ───────────────────────────
proj4.defs(
  'EPSG:3826',
  '+proj=tmerc +lat_0=0 +lon_0=121 +k=0.9999 +x_0=250000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs'
);

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

// ── Main map component ─────────────────────────────────────
export default function MapView() {
  const [visibility, setVisibility] = useState(
    routes.map(() => true)
  );
  const [expandPanel, setExpandPanel] = useState(false);

  // Open Data layers state
  const [showTrees, setShowTrees] = useState(false);
  const [showSidewalks, setShowSidewalks] = useState(false);
  const [showZoning, setShowZoning] = useState(false);
  const [trees, setTrees] = useState([]);
  const [sidewalks, setSidewalks] = useState(null);
  const [zoning, setZoning] = useState(null);

  // Fetch Trees (Layer A)
  useEffect(() => {
    if (!showTrees || trees.length > 0) return;
    fetch('/api/taipei-trees')
      .then((res) => res.json())
      .then((data) => {
        // API returns pre-processed data with lat/lng
        setTrees(Array.isArray(data) ? data : []);
      })
      .catch((err) => console.error('Failed to load trees:', err));
  }, [showTrees]);

  // Fetch Sidewalks (Layer B)
  useEffect(() => {
    if (!showSidewalks || sidewalks) return;
    fetch('/api/taipei-sidewalks')
      .then((res) => res.json())
      .then((data) => {
        const filteredFeatures = (data.features || []).filter((f) => {
          if (!f.geometry || !f.geometry.coordinates) return false;
          
          const getFirstPt = (arr) => (typeof arr[0] === 'number' ? arr : getFirstPt(arr[0]));
          let firstPt = getFirstPt(f.geometry.coordinates);
          
          if (firstPt[0] > 10000) {
            // TWD97 to WGS84
            const projectPoints = (pts) => {
              if (typeof pts[0] === 'number') {
                return proj4('EPSG:3826', 'EPSG:4326', [pts[0], pts[1]]);
              }
              return pts.map(projectPoints);
            };
            f.geometry.coordinates = projectPoints(f.geometry.coordinates);
            firstPt = getFirstPt(f.geometry.coordinates);
          }
          const lng = firstPt[0];
          const lat = firstPt[1];
          // Relaxed bounds slightly to ensure we capture relevant sidewalks
          return lat >= 25.01 && lat <= 25.06 && lng >= 121.54 && lng <= 121.60;
        });
        setSidewalks({ ...data, features: filteredFeatures });
      })
      .catch((err) => console.error('Failed to load sidewalks:', err));
  }, [showSidewalks]);

  // Fetch Zoning (Layer C)
  useEffect(() => {
    if (!showZoning || zoning) return;
    fetch('/data/xinyi_zoning.json')
      .then((res) => res.json())
      .then((data) => setZoning(data))
      .catch((err) => console.error('Failed to load zoning:', err));
  }, [showZoning]);

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

  return (
    <div className="relative w-full h-full">
      {/* ── Map ─────────────────────────────────────────── */}
      <MapContainer
        center={[25.033, 121.565]}
        zoom={15}
        className="w-full h-full z-0"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          className="map-tiles-tinted"
        />
        <FitBoundsOnLoad />

        {showZoning && zoning && (
          <GeoJSON
            data={zoning}
            style={(feature) => {
              const name = feature.properties.name || '';
              let color = '#bfdbfe'; // Light Blue (Other)
              if (name.includes('住')) color = '#fef08a'; // Yellow (Residential)
              else if (name.includes('商')) color = '#fb923c'; // Orange (Commercial)
              else if (name.includes('工')) color = '#e9d5ff'; // Purple (Industrial)
              else if (name.includes('公園') || name.includes('綠地') || name.includes('保護區')) color = '#4ade80'; // Green (Park)
              else if (name.includes('道') || name.includes('街')) color = '#94a3b8'; // Gray (Road)
              
              return {
                fillColor: color,
                fillOpacity: 0.45,
                color: color,
                weight: 1,
                opacity: 0.6
              };
            }}
            onEachFeature={(feature, layer) => {
              const p = feature.properties;
              
              // 構建補充說明
              let info = '';
              if (p.name.includes('住')) info = '此區主要供住宅使用，旨在保障居住環境的寧靜與安全，對建築高度、建蔽率及容積率有明確限制。';
              else if (p.name.includes('商')) info = '供商業設施及辦公室使用，是都市的經濟活動中心，通常擁有較高的容積率與建蔽率。';
              else if (p.name.includes('工')) info = '供工業生產及相關設施使用。';
              else if (p.name.includes('公園') || p.name.includes('綠地')) info = '都市中的開放空間，提供市民休閒遊憩，並兼具生態保護功能，嚴禁非公共設施之建築。';
              else if (p.name.includes('道') || p.name.includes('街')) info = '都市交通動脈，維持交通運作與行人通行。';
              else if (p.name.includes('學')) info = '供學校設施、教育環境使用。';

              layer.bindTooltip(`<b>${p.name}</b>`, { sticky: true });
              layer.bindPopup(`
                <div class="popup-content min-w-[280px]">
                  <div class="popup-badge mb-2" style="background: #fb923c; color: white; padding: 2px 8px; border-radius: 4px; font-size: 10px; display: inline-block;">
                    ${p.code || '使用分區'}
                  </div>
                  <h3 class="text-lg font-bold text-blue-900 mb-2">${p.name}</h3>
                  <div class="space-y-3 text-sm text-slate-700 leading-relaxed">
                    <p class="bg-blue-50 p-2 rounded-lg border-l-4 border-blue-200">
                      ${info || '都市計畫中設定的特定土地用途區域。'}
                    </p>
                    <div class="grid grid-cols-2 gap-2 text-xs">
                      <div class="bg-slate-50 p-2 rounded">
                        <span class="text-slate-400 block mb-1">分區代碼</span>
                        <span class="font-mono font-bold">${p.code || 'N/A'}</span>
                      </div>
                      <div class="bg-slate-50 p-2 rounded">
                        <span class="text-slate-400 block mb-1">簡稱</span>
                        <span class="font-bold">${p.short || p.name}</span>
                      </div>
                    </div>
                    ${p.full ? `
                      <div>
                        <span class="text-xs text-slate-400 font-bold uppercase tracking-wider">詳細描述</span>
                        <p class="mt-1">${p.full}</p>
                      </div>
                    ` : ''}
                    ${p.original ? `
                      <div class="text-[10px] text-slate-400 italic">
                        原屬分區: ${p.original}
                      </div>
                    ` : ''}
                  </div>
                </div>
              `);
            }}
          />
        )}

        {routes.map((route, ri) =>
          visibility[ri] ? (
            <RouteLayer
              key={route.id}
              route={route}
              polylines={polylines[ri]}
            />
          ) : null
        )}

        {showTrees && trees.length > 0 && (
          <MarkerClusterGroup
            chunkedLoading
            maxClusterRadius={50}
          >
            {trees.map((t, i) => (
              <CircleMarker
                key={`tree-${t.id || i}`}
                center={[t.lat, t.lng]}
                radius={4}
                pathOptions={{ 
                  color: '#16a34a', 
                  fillColor: '#16a34a', 
                  fillOpacity: 0.6, 
                  weight: 1 
                }}
              >
                <Popup>
                  <div className="text-sm font-sans">
                    <h3 className="font-bold text-green-800 mb-1">{t.type || '未知樹種'}</h3>
                    <p className="text-gray-600 mb-1">{t.addr || '未知路段'}</p>
                    <p className="text-xs text-gray-400">編號: {t.id || '-'}</p>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MarkerClusterGroup>
        )}
      </MapContainer>

      {/* ── Layer control panel (top-right) ─────────────── */}
      <div
        className={`
          absolute top-3 right-3 z-[1000]
          bg-white/95 backdrop-blur-md
          border border-blue-900/10 rounded-2xl
          shadow-xl text-slate-800
          transition-all duration-300 ease-in-out
          ${expandPanel ? 'w-72 p-5' : 'w-12 h-12 p-0'}
          max-h-[calc(100dvh-24px)] overflow-y-auto
        `}
      >
        {/* Toggle button */}
        <button
          onClick={() => setExpandPanel(!expandPanel)}
          className={`
            flex items-center justify-center
            ${expandPanel ? 'w-full mb-3' : 'w-12 h-12'}
            rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900
            transition-colors duration-200
            text-lg cursor-pointer font-bold
          `}
          aria-label="切換圖層面板"
        >
          {expandPanel ? '✕ 關閉' : '☰'}
        </button>

        {expandPanel && (
          <>
            <h3 className="text-base font-bold mb-3 tracking-wide text-blue-900">
              圖層控制
            </h3>

            {/* Route toggles */}
            <div className="space-y-2 mb-4">
              {routes.map((route, idx) => (
                <label
                  key={route.id}
                  className="flex items-center gap-3 cursor-pointer
                             hover:bg-slate-50 rounded-lg px-2 py-1.5 transition-colors"
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
                  <span className="text-sm leading-tight">
                    {ROUTE_LABELS[idx].label}
                  </span>
                </label>
              ))}
            </div>

            {/* Open Data toggles */}
            <div className="space-y-2 mb-4 pt-3 border-t border-slate-200">
              <label
                className="flex items-center gap-3 cursor-pointer
                           hover:bg-slate-50 rounded-lg px-2 py-1.5 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={showTrees}
                  onChange={() => setShowTrees(!showTrees)}
                  className="w-5 h-5 rounded accent-[#16a34a] cursor-pointer"
                />
                <span className="text-sm leading-tight text-slate-700">🌳 行道樹遮蔭</span>
              </label>

              <label
                className="flex items-center gap-3 cursor-pointer
                           hover:bg-slate-50 rounded-lg px-2 py-1.5 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={showSidewalks}
                  onChange={() => setShowSidewalks(!showSidewalks)}
                  className="w-5 h-5 rounded accent-[#60a5fa] cursor-pointer"
                />
                <span className="text-sm leading-tight text-slate-700">🚶 人行道範圍</span>
              </label>

              <label
                className="flex items-center gap-3 cursor-pointer
                           hover:bg-slate-50 rounded-lg px-2 py-1.5 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={showZoning}
                  onChange={() => setShowZoning(!showZoning)}
                  className="w-5 h-5 rounded accent-[#fb923c] cursor-pointer"
                />
                <span className="text-sm leading-tight text-slate-700">🏘️ 都市計畫分區</span>
              </label>
            </div>

            {/* Quick buttons */}
            <div className="flex gap-2">
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

            {/* Legend */}
            <div className="mt-4 pt-3 border-t border-slate-200">
              <p className="text-[11px] text-slate-500 leading-relaxed">
                共 {routes.reduce((s, r) => s + r.stations.length, 0)} 個站點
                ・點擊站點查看詳情
              </p>
            </div>
          </>
        )}
      </div>

      {/* ── Title overlay (bottom-left) ─────────────────── */}
      <div
        className="
          absolute bottom-4 left-4 z-[1000]
          bg-white/90 backdrop-blur-md
          border border-blue-900/10 rounded-2xl
          px-5 py-3 shadow-xl
          pointer-events-none
        "
      >
        <h1 className="text-blue-900 text-lg font-bold tracking-widest leading-tight">
          信水義河
        </h1>
        <p className="text-slate-600 text-xs mt-0.5 font-medium">
          信義社大 · 水文導覽互動地圖
        </p>
      </div>
    </div>
  );
}

// ── Individual route layer ─────────────────────────────────
function RouteLayer({ route, polylines }) {
  return (
    <>
      {/* Polylines */}
      {Array.isArray(polylines[0])
        ? Array.isArray(polylines[0][0])
          ? polylines.map((seg, si) => (
              <Polyline
                key={`${route.id}-seg-${si}`}
                positions={seg}
                pathOptions={{
                  color: route.color,
                  weight: 4,
                  opacity: 0.75,
                  dashArray: null,
                }}
              />
            ))
          : (
              <Polyline
                positions={polylines}
                pathOptions={{
                  color: route.color,
                  weight: 4,
                  opacity: 0.75,
                }}
              />
            )
        : null}

      {/* Station markers */}
      {route.stations.map((station) => (
        <CircleMarker
          key={`${route.id}-${station.id}`}
          center={[station.lat, station.lng]}
          radius={8}
          pathOptions={{
            color: '#fff',
            weight: 2,
            fillColor: route.color,
            fillOpacity: 1,
          }}
        >
          <Popup
            maxWidth={420}
            minWidth={340}
            className="custom-popup"
          >
            <div className="popup-content">
              <div
                className="popup-badge"
                style={{ background: route.color }}
              >
                {station.badge || station.id}
              </div>
              <h3 className="popup-title">{station.name}</h3>
              <p className="popup-hook">{station.hook}</p>
              {station.body && (
                <p className="popup-body">{station.body}</p>
              )}
              {station.imgs && station.imgs.length > 0 && (
                <div className="popup-images">
                  {station.imgs.map((img, i) => (
                    <figure key={i} className="popup-figure">
                      <img
                        src={`${BASE_URL}${img.src}`}
                        alt={img.cap || station.name}
                        loading="lazy"
                        className="popup-img"
                      />
                      {img.cap && (
                        <figcaption className="popup-caption">
                          {img.cap}
                        </figcaption>
                      )}
                    </figure>
                  ))}
                </div>
              )}
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </>
  );
}
