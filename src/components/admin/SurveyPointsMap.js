'use client';

import { useMemo, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Circle, Popup, LayerGroup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { CARTO_LIGHT_URL, CARTO_ATTRIBUTION } from '@/lib/basemap';
import { QUESTIONS, REASON_LABEL } from '@/lib/survey-analysis';

const KIND_STYLE = {
  hot: { color: '#dc2626', label: '最不舒適' },
  cool: { color: '#0ea5e9', label: '最舒適' },
  improve: { color: '#f59e0b', label: '優先改善' }
};

export default function SurveyPointsMap({ points, radius, showRadius }) {
  const [visible, setVisible] = useState({ hot: true, cool: true, improve: true });

  const located = useMemo(() => points.filter((p) => p.located), [points]);
  const center = useMemo(() => {
    if (!located.length) return [25.033, 121.565];
    const lat = located.reduce((s, p) => s + p.lat, 0) / located.length;
    const lng = located.reduce((s, p) => s + p.lng, 0) / located.length;
    return [lat, lng];
  }, [located]);

  const toggle = (k) => setVisible((v) => ({ ...v, [k]: !v[k] }));

  return (
    <div className="relative">
      {/* 圖層開關 */}
      <div className="flex flex-wrap gap-2 mb-2">
        {QUESTIONS.map((q) => {
          const st = KIND_STYLE[q.kind];
          const n = located.filter((p) => p.kind === q.kind).length;
          const on = visible[q.kind];
          return (
            <button
              key={q.kind}
              onClick={() => toggle(q.kind)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                on ? 'bg-slate-800 border-white/15 text-slate-200' : 'bg-slate-900/60 border-white/5 text-slate-500'
              }`}
            >
              <span
                className="inline-block w-2.5 h-2.5 rounded-full"
                style={{ background: on ? st.color : '#cbd5e1' }}
              />
              {st.label}
              <span className="text-slate-500">{n}</span>
            </button>
          );
        })}
      </div>

      <div className="h-[460px] rounded-xl overflow-hidden border border-white/10">
        <MapContainer center={center} zoom={14} className="w-full h-full" preferCanvas>
          <TileLayer url={CARTO_LIGHT_URL} attribution={CARTO_ATTRIBUTION} className="map-tiles-tinted" />

          {QUESTIONS.map((q) =>
            visible[q.kind] ? (
              <LayerGroup key={q.kind}>
                {located
                  .filter((p) => p.kind === q.kind)
                  .map((p) => (
                    <LayerGroup key={p.id}>
                      {showRadius && (
                        <Circle
                          center={[p.lat, p.lng]}
                          radius={radius}
                          pathOptions={{
                            color: KIND_STYLE[q.kind].color,
                            weight: 1,
                            opacity: 0.35,
                            fillOpacity: 0.05
                          }}
                        />
                      )}
                      <CircleMarker
                        center={[p.lat, p.lng]}
                        radius={7}
                        pathOptions={{
                          color: '#fff',
                          weight: 1.5,
                          fillColor: KIND_STYLE[q.kind].color,
                          fillOpacity: 0.9
                        }}
                      >
                        <Popup>
                          <div className="text-[13px] leading-relaxed min-w-[220px]">
                            <div className="font-semibold mb-1" style={{ color: KIND_STYLE[q.kind].color }}>
                              {KIND_STYLE[q.kind].label}
                            </div>
                            <div className="text-slate-700 mb-1.5">{p.place}</div>
                            {p.reasonText && (
                              <div className="text-slate-600 mb-1.5 pl-2 border-l-2 border-slate-200">
                                {p.reasonText}
                              </div>
                            )}
                            <table className="w-full text-[12px] text-slate-600">
                              <tbody>
                                <tr>
                                  <td className="pr-2 text-slate-400">分區</td>
                                  <td>{p.zone}</td>
                                </tr>
                                <tr>
                                  <td className="pr-2 text-slate-400">綠地 {radius}m</td>
                                  <td>{((p.green?.[radius] ?? 0) * 100).toFixed(1)}%</td>
                                </tr>
                                <tr>
                                  <td className="pr-2 text-slate-400">行道樹冠 10m</td>
                                  <td>{((p.canopy ?? 0) * 100).toFixed(1)}%（{p.treesWithin ?? 0} 棵）</td>
                                </tr>
                                <tr>
                                  <td className="pr-2 text-slate-400">午後樹蔭 10m</td>
                                  <td>{p.shade == null ? '—' : `${(p.shade * 100).toFixed(1)}%`}</td>
                                </tr>
                                {p.score && (
                                  <tr>
                                    <td className="pr-2 text-slate-400">整體感受</td>
                                    <td>{p.score} 分</td>
                                  </tr>
                                )}
                                {p.reasons?.length > 0 && (
                                  <tr>
                                    <td className="pr-2 text-slate-400 align-top">分類</td>
                                    <td>{p.reasons.map((r) => REASON_LABEL[r] || r).join('、')}</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </Popup>
                      </CircleMarker>
                    </LayerGroup>
                  ))}
              </LayerGroup>
            ) : null
          )}
        </MapContainer>
      </div>
    </div>
  );
}
