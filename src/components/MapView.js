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
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
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
  const [trees, setTrees] = useState([]);
  const [sidewalks, setSidewalks] = useState(null);

  // Fetch Trees (Layer A)
  useEffect(() => {
    if (!showTrees || trees.length > 0) return;
    fetch('/TaipeiTree_filtered.json')
      .then((res) => res.json())
      .then((data) => {
        setTrees(data);
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
        preferCanvas={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          className="map-tiles-tinted"
        />
        <FitBoundsOnLoad />

        {routes.map((route, ri) =>
          visibility[ri] ? (
            <RouteLayer
              key={route.id}
              route={route}
              polylines={polylines[ri]}
            />
          ) : null
        )}

        {showSidewalks && sidewalks && (
          <GeoJSON
            data={sidewalks}
            style={{ color: '#60a5fa', weight: 3, opacity: 0.5 }}
          />
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

        {showTrees &&
          trees.map((t, i) => (
            <CircleMarker
              key={t.TreeID || `tree-${i}`}
              center={[t.lat, t.lng]}
              radius={3}
              pathOptions={{ stroke: false, fillColor: '#30F243', fillOpacity: 0.25 }}
            >
              <Popup className="custom-popup">
                <div className="p-1 min-w-[120px]">
                  <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-1 mb-2">
                    🌳 {t.TreeType || '未知樹種'}
                  </h3>
                  <div className="text-xs text-slate-600 space-y-1">
                    <p>樹高：<span className="font-medium text-slate-700">{t.TreeHeight ? `${t.TreeHeight} m` : '無資料'}</span></p>
                    <p>胸徑：<span className="font-medium text-slate-700">{t.Diameter ? `${t.Diameter} cm` : '無資料'}</span></p>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
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
