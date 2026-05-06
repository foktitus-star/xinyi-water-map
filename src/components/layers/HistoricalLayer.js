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
    id: 'us1945',
    label: '1945 美軍地圖',
    emoji: '🗺️',
    url: 'https://gis.sinica.edu.tw/tileserver/file-exists.php?img=USCity_1945_Taipei-jpg-{z}-{x}-{y}',
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
