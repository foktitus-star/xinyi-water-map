import { useState } from 'react';
import { Polyline, CircleMarker, Popup, LayerGroup, FeatureGroup, useMap, useMapEvents } from 'react-leaflet';
import { BASE_URL } from '@/data/routeData';
import PopupLightbox from './PopupLightbox';
import RouteFeedbackForm, { FACTORS } from '../forms/RouteFeedbackForm';
import StationPopupContent from './StationPopupContent';

function markerRadius(zoom) {
  if (zoom >= 17) return 9;
  if (zoom >= 15) return 7;
  if (zoom >= 13) return 5;
  return 3;
}

// 舒適度平均分（1-5）→ 8 階紅-綠色階，每 0.5 分一階（與圖層面板圖例對應）
// 色階取自 ColorBrewer RdYlGn，由深紅（最差）至深綠（最佳）
export const COMFORT_SCALE = [
  { min: 4.5, color: '#1a9850' }, // 深綠：極佳
  { min: 4.0, color: '#a6d96a' }, // 淺綠：良好
  { min: 3.5, color: '#d9ef8b' }, // 黃綠：偏好
  { min: 3.0, color: '#fee08b' }, // 淺黃：普通
  { min: 2.5, color: '#fdae61' }, // 淺橙：偏差
  { min: 2.0, color: '#f46d43' }, // 橙紅：欠佳
  { min: 1.5, color: '#d73027' }, // 紅：差
  { min: -Infinity, color: '#a50026' }, // 深紅：極差
];

function comfortColor(overall) {
  return COMFORT_SCALE.find(band => overall >= band.min).color;
}

// popup 內的路段評分統計區塊（舒適度模式時顯示在表單上方）
function ComfortStatsBlock({ stats }) {
  if (!stats || stats.overall == null) {
    return (
      <div className="mb-3 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500">
        本路段尚無評分資料，歡迎成為第一位評分的人！
      </div>
    );
  }
  return (
    <div className="mb-3 px-3 py-2.5 rounded-lg border" style={{ background: '#fafaf9', borderColor: comfortColor(stats.overall) + '55' }}>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-xs font-bold text-slate-700">📊 民眾評分統計</span>
        <span className="text-[10px] text-slate-400">共 {stats.count} 筆</span>
      </div>
      <div className="space-y-1">
        {FACTORS.map(f => {
          const v = stats.avg[f.id];
          if (v == null) return null;
          return (
            <div key={f.id} className="flex items-center gap-2 text-[11px] text-slate-600">
              <span className="w-16 flex-shrink-0">{f.label}</span>
              <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${(v / 5) * 100}%`, background: comfortColor(v) }} />
              </div>
              <span className="w-7 text-right font-mono font-bold" style={{ color: comfortColor(v) }}>{v.toFixed(1)}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 pt-1.5 border-t border-slate-200 flex justify-between text-[11px]">
        <span className="text-slate-500">整體平均</span>
        <span className="font-bold font-mono" style={{ color: comfortColor(stats.overall) }}>{stats.overall.toFixed(1)} / 5.0</span>
      </div>
    </div>
  );
}

function ZoomAwareMarker({ station, route }) {
  const map = useMap();
  const [radius, setRadius] = useState(() => markerRadius(map.getZoom()));

  useMapEvents({
    zoomend: () => setRadius(markerRadius(map.getZoom())),
  });

  return (
    <CircleMarker
      center={[station.lat, station.lng]}
      radius={radius}
      pathOptions={{
        color: 'rgba(255,255,255,0.55)',
        weight: 1.5,
        fillColor: route.color,
        fillOpacity: 1,
      }}
    >
      <Popup maxWidth={420} minWidth={340} className="custom-popup">
        <PopupLightbox />
        <StationPopupContent station={station} routeColor={route.color} />
      </Popup>
    </CircleMarker>
  );
}

// 單一路段：可見線 + 隱形點擊區 + 回饋 popup
// comfortData 為 null 時是一般模式；為物件時進入舒適度檢視（依平均分上色，無資料顯示灰虛線）
function RouteSegment({ route, positions, segmentId, comfortData }) {
  const comfortMode = comfortData != null;
  const segStats = comfortMode ? comfortData[segmentId] : undefined;

  // dashArray 必須在所有分支明確指定：Leaflet setStyle 是合併式更新，
  // 缺少該 key 時不會清除先前設定的虛線樣式
  const visibleOptions = comfortMode
    ? (segStats?.overall != null
        ? { color: comfortColor(segStats.overall), weight: 5, opacity: 0.9, dashArray: null }
        : { color: '#94a3b8', weight: 4, opacity: 0.65, dashArray: '6 8' })
    : { color: route.color, weight: 4, opacity: 0.75, dashArray: null };

  return (
    <FeatureGroup>
      <Polyline
        positions={positions}
        pathOptions={{ ...visibleOptions, interactive: false }}
      />
      <Polyline
        positions={positions}
        pathOptions={{
          color: '#000000',
          weight: 20,
          opacity: 0.001,
          interactive: true
        }}
      >
        <Popup className="feedback-popup" minWidth={300} maxWidth={400}>
          {comfortMode && <ComfortStatsBlock stats={segStats} />}
          <RouteFeedbackForm
            routeId={route.id}
            routeName={route.name || `路線 ${route.id}`}
            segmentId={segmentId}
          />
        </Popup>
      </Polyline>
    </FeatureGroup>
  );
}

export default function RouteLayer({ route, polylines, comfortData = null }) {
  return (
    <LayerGroup>
      {/* Polylines */}
      {Array.isArray(polylines[0])
        ? Array.isArray(polylines[0][0])
          ? polylines.map((seg, si) => (
            <RouteSegment
              key={`${route.id}-seg-${si}`}
              route={route}
              positions={seg}
              segmentId={`seg_${si + 1}`}
              comfortData={comfortData}
            />
          ))
          : (
            <RouteSegment
              route={route}
              positions={polylines}
              segmentId="seg_1"
              comfortData={comfortData}
            />
          )
        : null}

      {/* Station markers — zoom-aware size, soft earth-tone border */}
      {route.stations.map((station) => (
        <ZoomAwareMarker
          key={`${route.id}-${station.id}`}
          station={station}
          route={route}
        />
      ))}
    </LayerGroup>
  );
}
