'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { QUESTIONS, REASON_LABEL, RADII } from '@/lib/survey-analysis';

const SurveyPointsMap = dynamic(() => import('./SurveyPointsMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[460px] rounded-xl bg-slate-800 flex items-center justify-center text-sm text-slate-400">
      地圖載入中…
    </div>
  )
});

const KIND_COLOR = { hot: '#dc2626', cool: '#0ea5e9', improve: '#f59e0b' };
const pct = (v) => `${((v ?? 0) * 100).toFixed(1)}%`;

/** 水平長條圖：不引入圖表套件，用寬度百分比呈現 */
function BarChart({ data, color = '#0ea5e9', unit = '', maxOverride }) {
  const entries = Object.entries(data || {});
  if (!entries.length) return <p className="text-xs text-slate-400">沒有資料</p>;
  const max = maxOverride ?? Math.max(...entries.map(([, v]) => (typeof v === 'object' ? v.mean : v)));
  return (
    <div className="space-y-1.5">
      {entries.map(([k, raw]) => {
        const v = typeof raw === 'object' ? raw.mean : raw;
        const n = typeof raw === 'object' ? raw.n : null;
        return (
          <div key={k} className="flex items-center gap-2 text-xs">
            <span className="w-28 shrink-0 text-slate-400 text-right truncate" title={k}>{k}</span>
            <div className="flex-1 h-4 bg-slate-800 rounded overflow-hidden">
              <div
                className="h-full rounded transition-all"
                style={{ width: `${max ? (v / max) * 100 : 0}%`, background: color }}
              />
            </div>
            <span className="w-16 shrink-0 font-mono text-slate-400">
              {typeof raw === 'object' ? v.toFixed(2) : v}{unit}
              {n != null && <span className="text-slate-600"> ·{n}</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Section({ title, hint, children }) {
  return (
    <section className="bg-slate-900/40 rounded-2xl border border-white/5 p-4 sm:p-5">
      <h3 className="text-sm font-bold text-slate-100 mb-1">{title}</h3>
      {hint && <p className="text-xs text-slate-500 mb-3 leading-relaxed">{hint}</p>}
      {children}
    </section>
  );
}

export default function SurveyAnalysisPanel({ passcode }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [radius, setRadius] = useState(50);
  const [showRadius, setShowRadius] = useState(true);
  const [analysisTime, setAnalysisTime] = useState('2026-08-15T14:00');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const at = `${analysisTime}:00+08:00`;
      const res = await fetch(`/api/admin/survey-points?at=${encodeURIComponent(at)}`, {
        headers: { 'x-admin-passcode': passcode }
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `讀取失敗（${res.status}）`);
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [passcode, analysisTime]);

  useEffect(() => { load(); }, [load]);

  const stats = data?.stats;

  // 空間交叉：各類地點在不同半徑下的綠地覆蓋率
  const spatialRows = useMemo(() => {
    if (!stats) return [];
    return QUESTIONS.map((q) => ({ kind: q.kind, ...stats.spatial[q.kind] }));
  }, [stats]);

  const reasonChart = (obj) =>
    Object.fromEntries(Object.entries(obj || {}).map(([k, v]) => [REASON_LABEL[k] || k, v]));

  return (
    <div className="space-y-4">
      {/* 控制列 */}
      <div className="bg-slate-900/40 rounded-2xl border border-white/5 p-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-[11px] text-slate-500 mb-1">分析時刻（影響樹蔭計算）</label>
          <input
            type="datetime-local"
            value={analysisTime}
            onChange={(e) => setAnalysisTime(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-white/10 bg-slate-800 text-slate-200 text-sm"
          />
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 mb-1">分析半徑</label>
          <div className="flex gap-1">
            {RADII.map((r) => (
              <button
                key={r}
                onClick={() => setRadius(r)}
                className={`px-2.5 py-1.5 rounded-lg text-sm border transition-colors ${
                  radius === r
                    ? 'bg-sky-600 text-white border-sky-600'
                    : 'bg-slate-800 text-slate-300 border-white/10 hover:bg-slate-700'
                }`}
              >
                {r}m
              </button>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
          <input
            type="checkbox"
            checked={showRadius}
            onChange={(e) => setShowRadius(e.target.checked)}
            className="w-4 h-4 rounded"
          />
          在地圖顯示範圍圈
        </label>
        <button
          onClick={load}
          disabled={loading}
          className="ml-auto px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium transition-colors"
        >
          {loading ? '分析中…' : '重新整理'}
        </button>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      {loading && !data && (
        <div className="bg-slate-900/40 rounded-2xl border border-white/5 p-8 text-center text-sm text-slate-400">
          正在讀取試算表並疊圖分析…（首次載入圖層約需十餘秒）
        </div>
      )}

      {data && (
        <>
          {/* 概況 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              ['回覆份數', stats.totalResponses],
              ['地點標記', stats.totalPoints],
              ['其中有座標', stats.locatedPoints],
              ['純文字未定位', stats.totalPoints - stats.locatedPoints]
            ].map(([label, v]) => (
              <div key={label} className="bg-slate-900/40 rounded-xl border border-white/5 px-4 py-3">
                <div className="text-[11px] text-slate-500">{label}</div>
                <div className="text-3xl font-black text-sky-300 font-mono">{v}</div>
              </div>
            ))}
          </div>

          <Section title="問卷地點圖層" hint="紅＝最不舒適、藍＝最舒適、橙＝優先改善。點選圓點可看該點的疊圖分析結果。">
            <SurveyPointsMap points={data.points} radius={radius} showRadius={showRadius} />
          </Section>

          <Section
            title="空間交叉分析：綠地覆蓋率 × 地點類型"
            hint="各類地點周邊的綠地覆蓋率（OpenStreetMap 公園、綠地、樹林等面狀圖徵）。半徑愈大，最舒適與最不舒適的差距愈明顯。"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 border-b border-white/10">
                    <th className="text-left py-2 pr-3 font-medium">地點類型</th>
                    <th className="text-right px-2 font-medium">點數</th>
                    {RADII.map((r) => (
                      <th key={r} className={`text-right px-2 font-medium ${r === radius ? 'text-sky-300' : ''}`}>
                        {r}m
                      </th>
                    ))}
                    <th className="text-right px-2 font-medium">行道樹冠 10m</th>
                    <th className="text-right pl-2 font-medium">10m 內樹數</th>
                  </tr>
                </thead>
                <tbody>
                  {spatialRows.map((row) => (
                    <tr key={row.kind} className="border-b border-white/5">
                      <td className="py-2 pr-3">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="inline-block w-2 h-2 rounded-full"
                            style={{ background: KIND_COLOR[row.kind] }}
                          />
                          {row.label}
                        </span>
                      </td>
                      <td className="text-right px-2 text-slate-500">{row.count}</td>
                      {RADII.map((r) => (
                        <td
                          key={r}
                          className={`text-right px-2 font-mono ${
                            r === radius ? 'font-bold text-slate-100' : 'text-slate-600'
                          }`}
                        >
                          {pct(row.green[r])}
                        </td>
                      ))}
                      <td className="text-right px-2 font-mono text-slate-400">{pct(row.canopy)}</td>
                      <td className="text-right pl-2 font-mono text-slate-400">{row.treesWithin.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {spatialRows.length === 3 && (
              <p className="mt-3 text-xs text-slate-300 bg-slate-800/60 rounded-lg p-3 leading-relaxed">
                在 {radius} 公尺尺度，最舒適地點的綠地覆蓋率為{' '}
                <strong>{pct(spatialRows[1].green[radius])}</strong>，最不舒適為{' '}
                <strong>{pct(spatialRows[0].green[radius])}</strong>
                {spatialRows[0].green[radius] > 0 && (
                  <>（約 {(spatialRows[1].green[radius] / spatialRows[0].green[radius]).toFixed(1)} 倍）</>
                )}
                ，「優先改善」為 <strong>{pct(spatialRows[2].green[radius])}</strong>，落在兩者之間。
              </p>
            )}
          </Section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Section title="整體熱舒適感受分布" hint="1 分＝悶熱難以久待，5 分＝涼爽舒適宜人。">
              <BarChart data={stats.scoreDistribution} color="#f97316" unit=" 人" />
            </Section>

            <Section title="受訪者身分" hint="與信義區的關係。">
              <BarChart data={stats.relationDistribution} color="#8b5cf6" unit=" 人" />
            </Section>

            <Section title="不舒適原因：提到哪些主題" hint="以關鍵詞歸類開放式回答，一則回答可同時屬於多個類別。此處的「遮蔭／樹木」代表受訪者抱怨「缺少」它。">
              <BarChart data={reasonChart(stats.reasonDistribution.hot)} color="#dc2626" unit=" 則" />
            </Section>

            <Section title="舒適原因：提到哪些主題" hint="同一組分類，但這裡的「遮蔭／樹木」代表受訪者稱讚「有」它。">
              <BarChart data={reasonChart(stats.reasonDistribution.cool)} color="#0ea5e9" unit=" 則" />
            </Section>

            <Section title="平均熱舒適分數 × 身分別" hint="數字為平均分數，後方為樣本數。">
              <BarChart data={stats.scoreByRelation} color="#14b8a6" maxOverride={5} />
            </Section>

            <Section title="最不舒適地點的土地使用分區" hint="以都市計畫分區圖套疊點位判定。">
              <BarChart data={stats.spatial.hot.zones} color="#64748b" unit=" 點" />
            </Section>
          </div>

          <Section
            title="改善訴求與痛點是否一致"
            hint="比對同一位受訪者標記的「最不舒適」與「優先改善」兩點的距離。距離近代表居民想優先改善的，就是他自己感到最不舒適的地方。"
          >
            {stats.hotImproveOverlap.pairs > 0 ? (
              <div className="flex flex-wrap gap-6 items-baseline">
                <div>
                  <div className="text-3xl font-black text-emerald-300 font-mono">
                    {stats.hotImproveOverlap.within50m}
                    <span className="text-base text-slate-500">/{stats.hotImproveOverlap.pairs}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">兩點相距 50 公尺內</div>
                </div>
                <div>
                  <div className="text-3xl font-black text-emerald-300/70 font-mono">
                    {stats.hotImproveOverlap.within200m}
                    <span className="text-base text-slate-500">/{stats.hotImproveOverlap.pairs}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">200 公尺內</div>
                </div>
                <div>
                  <div className="text-3xl font-black text-slate-300 font-mono">
                    {stats.hotImproveOverlap.medianDistanceM}
                    <span className="text-base text-slate-500"> m</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">距離中位數</div>
                </div>
                <p className="text-xs text-slate-400 flex-1 min-w-[200px] leading-relaxed">
                  {stats.hotImproveOverlap.within50m / stats.hotImproveOverlap.pairs >= 0.5
                    ? '過半受訪者的改善訴求就落在自己標記的不舒適地點，兩者高度一致。'
                    : '多數受訪者想優先改善的地方，與自己標記的最不舒適地點並非同一處，值得再看是什麼因素。'}
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-400">沒有足夠的成對資料</p>
            )}
          </Section>

          <Section title="最舒適地點的土地使用分區" hint="與上一張對照，可看出兩類地點落在完全不同的分區類型。">
            <BarChart data={stats.spatial.cool.zones} color="#0ea5e9" unit=" 點" />
          </Section>

          {/* 逐點明細 */}
          <Section title="逐點明細" hint={`綠地覆蓋率以 ${radius} 公尺半徑計算；午後樹蔭為所選時刻的行道樹陰影。`}>
            <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-slate-900">
                  <tr className="text-slate-500 border-b border-white/10">
                    <th className="text-left py-2 pr-2 font-medium">類型</th>
                    <th className="text-left px-2 font-medium">地點</th>
                    <th className="text-left px-2 font-medium">分區</th>
                    <th className="text-right px-2 font-medium">綠地 {radius}m</th>
                    <th className="text-right px-2 font-medium">樹冠 10m</th>
                    <th className="text-right px-2 font-medium">樹蔭 10m</th>
                    <th className="text-right pl-2 font-medium">樹數</th>
                  </tr>
                </thead>
                <tbody>
                  {data.points.map((p) => (
                    <tr key={p.id} className="border-b border-white/5">
                      <td className="py-1.5 pr-2">
                        <span
                          className="inline-block w-2 h-2 rounded-full align-middle"
                          style={{ background: KIND_COLOR[p.kind] }}
                        />
                      </td>
                      <td className="px-2 text-slate-300 max-w-[180px] truncate" title={p.raw}>
                        {p.place || p.raw}
                        {!p.located && <span className="ml-1 text-amber-600">（無座標）</span>}
                      </td>
                      <td className="px-2 text-slate-500">{p.zone || '—'}</td>
                      <td className="text-right px-2 font-mono text-slate-400">
                        {p.located ? pct(p.green?.[radius]) : '—'}
                      </td>
                      <td className="text-right px-2 font-mono text-slate-400">
                        {p.located ? pct(p.canopy) : '—'}
                      </td>
                      <td className="text-right px-2 font-mono text-slate-400">
                        {p.located ? (p.shade == null ? '夜間' : pct(p.shade)) : '—'}
                      </td>
                      <td className="text-right pl-2 font-mono text-slate-400">
                        {p.located ? p.treesWithin : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="資料限制" hint="解讀以上分析前請一併考量。">
            <ul className="space-y-1.5 text-xs text-slate-400 leading-relaxed">
              {data.caveats.map((c, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-slate-400 shrink-0">·</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </Section>
        </>
      )}
    </div>
  );
}
