import { TileLayer } from 'react-leaflet';

// ── Historical basemap definitions ─────────────────────────
export const HISTORICAL_MAPS = [
  {
    id: 'jm1904',
    label: '1904 臺灣堡圖',
    emoji: '🗺️',
    url: 'https://gis.sinica.edu.tw/tileserver/file-exists.php?img=JM20K_1904-jpg-{z}-{x}-{y}',
    color: '#a16207',
  },
  {
    id: 'jm1921',
    label: '1921 地形圖',
    emoji: '🗺️',
    url: 'https://gis.sinica.edu.tw/tileserver/file-exists.php?img=JM25K_1921-jpg-{z}-{x}-{y}',
    color: '#15803d',
  },
  {
    id: 'liugong1939',
    label: '1939 瑠公水利區域圖',
    emoji: '🗺️',
    url: 'https://gis.sinica.edu.tw/taipei/file-exists.php?img=liugong_1939-jpg-{z}-{x}-{y}',
    color: '#0284c7', // light blue
  },
  {
    id: 'am1945',
    label: '1945 美軍地圖',
    emoji: '🗺️',
    url: 'https://gis.sinica.edu.tw/tileserver/file-exists.php?img=AMCityPlan_1945-png-{z}-{x}-{y}',
    color: '#1d4ed8',
  },
  {
    id: 'tm1989',
    label: '1989 地形圖',
    emoji: '🗺️',
    url: 'https://gis.sinica.edu.tw/tileserver/file-exists.php?img=TM25K_1989-jpg-{z}-{x}-{y}',
    color: '#7c3aed',
  },
];

/**
 * Renders the selected historical raster tile layer.
 * Placed inside MapContainer *after* the base CartoDB tile but *before*
 * all data layers (routes, trees, zoning) so it acts as a historical basemap.
 *
 * @param {{ activeId: string|null }} props
 *   activeId — the id of the chosen historical map, or null for none.
 */
export default function HistoricalLayer({ activeId }) {
  const map = HISTORICAL_MAPS.find((m) => m.id === activeId);
  if (!map) return null;

  return (
    <TileLayer
      key={map.id}          // key forces remount when switching maps
      url={map.url}
      tileSize={256}
      opacity={0.7}
      attribution={`歷史圖資 © <a href="https://gis.sinica.edu.tw" target="_blank">中央研究院</a>`}
    />
  );
}

/**
 * Renders the UI control panel section for historical maps.
 * Intended to be placed in the control panel outside the MapContainer.
 */
export function HistoricalControl({ activeHistory, toggleHistory }) {
  return (
    <div className="space-y-1 mb-4 pt-3 border-t border-slate-200">
      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 mb-2">
        🕰️ 古今地圖
      </p>
      {HISTORICAL_MAPS.map((hm) => (
        <label
          key={hm.id}
          className="flex items-center gap-3 cursor-pointer
                     hover:bg-slate-50 rounded-lg px-2 py-1.5 transition-colors"
        >
          <input
            type="checkbox"
            checked={activeHistory === hm.id}
            onChange={() => toggleHistory(hm.id)}
            className="w-5 h-5 rounded cursor-pointer"
            style={{ accentColor: hm.color }}
          />
          <span
            className="w-3 h-3 rounded-sm flex-shrink-0 border border-white/50"
            style={{ background: hm.color }}
          />
          <span className="text-sm leading-tight text-slate-700">{hm.label}</span>
        </label>
      ))}
    </div>
  );
}

