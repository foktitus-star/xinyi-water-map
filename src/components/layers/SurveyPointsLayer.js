'use client';

import { CircleMarker, Circle, Popup, LayerGroup } from 'react-leaflet';
import { QUESTIONS, REASON_LABEL } from '@/lib/survey-analysis';

/**
 * 熱舒適問卷的地點圖層 —— 只在後台使用。
 *
 * 這是一個純圖層元件，掛在主地圖（MapView）的 MapContainer 之內，
 * 讓後台看到的地圖與公開頁完全一致，只是多出這一層。
 * 公開頁不會傳入 points，因此不會渲染，也不會載入任何問卷資料。
 */

export const SURVEY_KIND_STYLE = {
  hot: { color: '#dc2626', label: '最不舒適' },
  cool: { color: '#0ea5e9', label: '最舒適' },
  improve: { color: '#f59e0b', label: '優先改善' }
};

export default function SurveyPointsLayer({ points, radius = 50, showRadius = true, visible }) {
  if (!points || !points.length) return null;

  const located = points.filter((p) => p.located);
  const shown = visible || { hot: true, cool: true, improve: true };

  return (
    <LayerGroup>
      {QUESTIONS.map((q) =>
        shown[q.kind] ? (
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
                        color: SURVEY_KIND_STYLE[q.kind].color,
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
                      fillColor: SURVEY_KIND_STYLE[q.kind].color,
                      fillOpacity: 0.9
                    }}
                  >
                    <Popup>
                      <div className="text-[13px] leading-relaxed min-w-[220px]">
                        <div
                          className="font-semibold mb-1"
                          style={{ color: SURVEY_KIND_STYLE[q.kind].color }}
                        >
                          {SURVEY_KIND_STYLE[q.kind].label}
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
                              <td>
                                {((p.canopy ?? 0) * 100).toFixed(1)}%（{p.treesWithin ?? 0} 棵）
                              </td>
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
    </LayerGroup>
  );
}
