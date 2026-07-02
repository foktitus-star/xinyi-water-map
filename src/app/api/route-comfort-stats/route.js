import { NextResponse } from 'next/server';

const SCORE_KEYS = ['shade', 'surface', 'safety', 'comfort'];

/**
 * GET - 路線舒適度統計
 * 從 GAS 讀取所有評分原始列，按 route_id + segment_id 聚合平均分。
 * 回傳格式：
 * {
 *   stats: {
 *     "1": {
 *       "seg_1": { count, avg: { shade, surface, safety, comfort }, overall }
 *     }
 *   },
 *   total: 57
 * }
 */
export async function GET() {
  try {
    const targetUrl = process.env.SHEETS_API_URL;

    if (!targetUrl) {
      return NextResponse.json({ error: 'API URL not configured' }, { status: 503 });
    }

    // GAS 腳本現在是單一部署、多分頁：需明確指定要讀「路線舒適度評分」分頁
    const routeSheetUrl = `${targetUrl}${targetUrl.includes('?') ? '&' : '?'}sheet=route`;

    const response = await fetch(routeSheetUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      redirect: 'follow',
      // 評分資料變動不頻繁，快取 60 秒減少 GAS 負載
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GAS comfort-stats fetch error:', errorText);
      return NextResponse.json({ error: 'Failed to fetch from Google Sheets' }, { status: 502 });
    }

    let records;
    try {
      records = await response.json();
    } catch {
      // 舊版 GAS 腳本沒有 doGet，會回傳 HTML 錯誤頁
      return NextResponse.json(
        { error: 'GAS endpoint does not support GET — please update the deployed script with src/lib/gas-route-template.js' },
        { status: 502 }
      );
    }

    if (!Array.isArray(records)) {
      return NextResponse.json({ stats: {}, total: 0 });
    }

    // 聚合：route_id → segment_id → 累計各項分數
    const acc = {};
    let total = 0;

    for (const row of records) {
      const routeId = String(row.route_id ?? '').trim();
      const segmentId = String(row.segment_id ?? '').trim();
      if (!routeId || !segmentId) continue;

      const scores = {};
      let valid = false;
      for (const key of SCORE_KEYS) {
        const n = parseFloat(row[`score_${key}`]);
        if (!Number.isNaN(n) && n >= 1 && n <= 5) {
          scores[key] = n;
          valid = true;
        }
      }
      if (!valid) continue;

      acc[routeId] ??= {};
      acc[routeId][segmentId] ??= { count: 0, sums: Object.fromEntries(SCORE_KEYS.map(k => [k, 0])), counts: Object.fromEntries(SCORE_KEYS.map(k => [k, 0])) };

      const seg = acc[routeId][segmentId];
      seg.count += 1;
      total += 1;
      for (const key of SCORE_KEYS) {
        if (scores[key] !== undefined) {
          seg.sums[key] += scores[key];
          seg.counts[key] += 1;
        }
      }
    }

    // 轉為平均分輸出
    const stats = {};
    for (const [routeId, segments] of Object.entries(acc)) {
      stats[routeId] = {};
      for (const [segmentId, seg] of Object.entries(segments)) {
        const avg = {};
        const presentAvgs = [];
        for (const key of SCORE_KEYS) {
          if (seg.counts[key] > 0) {
            avg[key] = Math.round((seg.sums[key] / seg.counts[key]) * 10) / 10;
            presentAvgs.push(avg[key]);
          }
        }
        const overall = presentAvgs.length
          ? Math.round((presentAvgs.reduce((a, b) => a + b, 0) / presentAvgs.length) * 10) / 10
          : null;
        stats[routeId][segmentId] = { count: seg.count, avg, overall };
      }
    }

    return NextResponse.json({ stats, total });
  } catch (error) {
    console.error('API route-comfort-stats Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
