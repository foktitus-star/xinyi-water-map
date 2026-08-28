import { NextResponse } from 'next/server';
import SunCalc from 'suncalc';
import {
  parseCSV,
  extractPoints,
  buildPolygonIndex,
  polygonCoverage,
  zoneAt,
  prepareTrees,
  canopyCoverage,
  treeShadeCoverage,
  distanceM,
  summarise,
  RADII
} from '@/lib/survey-analysis';

// 熱舒適經驗調查的回覆試算表（公開分享連結，以 CSV 形式匯出）
const SHEET_ID =
  process.env.SURVEY_SHEET_ID || '1z79y1UoKXO-RNJ5F0pTgOlRLISbXcg5pUOtwB616Bf8';

// 分析預設時刻：夏季午後最熱的時段
const DEFAULT_ANALYSIS_TIME = '2026-08-15T14:00:00+08:00';

// 同一個 serverless 實例重複使用時，避免每次都重抓、重解析幾 MB 的圖層
let layerCache = null;

async function loadLayers(origin) {
  if (layerCache) return layerCache;
  const get = async (p) => {
    const res = await fetch(`${origin}${p}`, { cache: 'force-cache' });
    if (!res.ok) throw new Error(`載入 ${p} 失敗（${res.status}）`);
    return res.json();
  };
  const [rawTrees, green, zoning] = await Promise.all([
    get('/TaipeiTree_filtered.json'),
    get('/data/xinyi_green.json'),
    get('/data/xinyi_zoning.json')
  ]);
  layerCache = {
    trees: prepareTrees(rawTrees),
    greenIndex: buildPolygonIndex(green, (f) => f.properties?.kind || 'green'),
    zoneIndex: buildPolygonIndex(zoning, (f) => f.properties?.name || '(未分類)')
  };
  return layerCache;
}

export async function GET(request) {
  try {
    const configured = process.env.ADMIN_PASSCODE;
    if (!configured) {
      return NextResponse.json({ error: 'Admin access not configured' }, { status: 503 });
    }
    if (request.headers.get('x-admin-passcode') !== configured) {
      return NextResponse.json({ error: 'Unauthorized: Invalid passcode' }, { status: 401 });
    }

    const url = new URL(request.url);
    const timeParam = url.searchParams.get('at') || DEFAULT_ANALYSIS_TIME;
    const analysisDate = new Date(timeParam);
    if (Number.isNaN(analysisDate.getTime())) {
      return NextResponse.json({ error: '時間參數無法解析' }, { status: 400 });
    }

    // 1. 取回覆
    const csvRes = await fetch(
      `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`,
      { cache: 'no-store', redirect: 'follow' }
    );
    if (!csvRes.ok) {
      return NextResponse.json(
        { error: `無法讀取試算表（${csvRes.status}）。請確認分享設定仍為「知道連結的人可檢視」。` },
        { status: 502 }
      );
    }
    const csv = await csvRes.text();
    if (!csv.includes('時間戳記') && !csv.includes(',')) {
      return NextResponse.json({ error: '試算表內容不是預期的 CSV 格式' }, { status: 502 });
    }

    const points = extractPoints(parseCSV(csv));

    // 2. 疊圖分析
    const { trees, greenIndex, zoneIndex } = await loadLayers(url.origin);
    const located = points.filter((p) => p.located);

    for (const p of located) {
      const sun = SunCalc.getPosition(analysisDate, p.lat, p.lng);
      p.green = Object.fromEntries(RADII.map((R) => [R, polygonCoverage(greenIndex, p.lat, p.lng, R)]));
      p.canopy = canopyCoverage(trees, p.lat, p.lng, 10);
      p.canopy50 = canopyCoverage(trees, p.lat, p.lng, 50);
      p.shade = treeShadeCoverage(trees, p.lat, p.lng, 10, sun);
      p.shade50 = treeShadeCoverage(trees, p.lat, p.lng, 50, sun);
      p.treesWithin = trees.filter((t) => distanceM(p.lat, p.lng, t.lat, t.lng) <= 10).length;
      p.treesWithin50 = trees.filter((t) => distanceM(p.lat, p.lng, t.lat, t.lng) <= 50).length;
      p.zone = zoneAt(zoneIndex, p.lat, p.lng);
      p.sunAltitudeDeg = (sun.altitude * 180) / Math.PI;
    }

    return NextResponse.json({
      analysedAt: analysisDate.toISOString(),
      analysisTimeLabel: timeParam,
      radii: RADII,
      points,
      stats: summarise(points),
      caveats: [
        '行道樹資料（TaipeiTree）只涵蓋道路兩旁的行道樹，不含公園樹木與山林；象山、各公園一帶的行道樹筆數為零，僅以行道樹判讀遮蔭會低估這些地點。',
        '綠地覆蓋率取自 OpenStreetMap 的公園、綠地、樹林等面狀圖徵，補足上述缺口，但屬於「綠地範圍」而非實際樹冠。',
        '受訪者是在地圖上點選大致位置，代表的是一段路的體感；實測 10 公尺半徑訊號微弱，50 公尺尺度差異最明顯。',
        '建築高度與陰影長度沿用 OpenStreetMap 標註，未標註者以 12 公尺估算。'
      ]
    });
  } catch (error) {
    console.error('survey-points 分析失敗:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
