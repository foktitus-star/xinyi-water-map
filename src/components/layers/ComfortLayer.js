import { useEffect, useState } from 'react';
import { GeoJSON, CircleMarker, Popup } from 'react-leaflet';
import proj4 from 'proj4';

export default function ComfortLayer({ showTrees, showSidewalks }) {
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
  }, [showTrees, trees]);

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
  }, [showSidewalks, sidewalks]);

  return (
    <>
      {showSidewalks && sidewalks && (
        <GeoJSON
          data={sidewalks}
          style={{ color: '#60a5fa', weight: 3, opacity: 0.5 }}
        />
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
    </>
  );
}
