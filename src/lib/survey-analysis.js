/**
 * 熱舒適問卷 — 空間交叉分析核心
 *
 * 這裡只放純函式（不依賴 React、不依賴瀏覽器），
 * 讓 API route 與離線腳本可以共用同一套算法。
 *
 * 資料來源與已知限制（很重要，解讀結果前必讀）：
 *
 *   1. `TaipeiTree_filtered.json` 只涵蓋「行道樹」，不含公園樹木與山林。
 *      信義區最舒適的地點多半在象山、公園、保護區，那裡行道樹資料是 0 棵。
 *      只用行道樹估遮蔭，會系統性低估最舒適的地點，得到方向相反的結論。
 *      因此另外納入 OSM 綠地多邊形（`xinyi_green.json`）作為綠覆蓋指標。
 *
 *   2. 受訪者是在地圖上點一個大概位置，標的是「一段路」的體感而非精確座標。
 *      實測 10 公尺半徑訊號很弱（兩組中位數皆為 0%），
 *      50 公尺尺度差距最大，因此預設同時輸出多個尺度供比對。
 */

export const M_PER_DEG_LAT = 111000;
export const M_PER_DEG_LNG = 100500;

/** 問卷答案內嵌的全形括號座標，例如「松高路，西村里（25.03981, 121.56712）」 */
export const COORD_RE = /[（(]\s*(\d{2}\.\d+)\s*,\s*(\d{3}\.\d+)\s*[）)]/;

/** 多尺度分析半徑（公尺） */
export const RADII = [10, 25, 50, 100];

/** 三道地點題在試算表中的欄位索引與意義 */
export const QUESTIONS = [
  { idx: 3, kind: 'hot', label: '最不舒適', color: '#dc2626' },
  { idx: 5, kind: 'cool', label: '最舒適', color: '#0ea5e9' },
  { idx: 7, kind: 'improve', label: '優先改善', color: '#f59e0b' }
];

// ── CSV ────────────────────────────────────────────────────────

/** 逐字元解析 CSV，需要處理引號內的換行（Google 表單的長題目會有） */
export function parseCSV(text) {
  const rows = [];
  let row = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; } else inQuotes = false;
      } else cur += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else if (c !== '\r') cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

// ── 幾何 ───────────────────────────────────────────────────────

export function distanceM(aLat, aLng, bLat, bLng) {
  const dx = (aLng - bLng) * M_PER_DEG_LNG;
  const dy = (aLat - bLat) * M_PER_DEG_LAT;
  return Math.hypot(dx, dy);
}

/** ring 為 [[lng, lat], ...] */
export function pointInRing(lng, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (((yi > lat) !== (yj > lat)) && (lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * 在半徑 radiusM 的圓內以向日葵排列均勻取樣，回傳 [lat, lng] 陣列。
 * 向日葵排列比隨機取樣穩定：同樣點數下覆蓋更平均，且結果可重現。
 */
export function sampleDisc(lat, lng, radiusM, samples) {
  const golden = Math.PI * (3 - Math.sqrt(5));
  const pts = [];
  for (let i = 0; i < samples; i++) {
    const r = radiusM * Math.sqrt((i + 0.5) / samples);
    const th = i * golden;
    pts.push([lat + (r * Math.sin(th)) / M_PER_DEG_LAT, lng + (r * Math.cos(th)) / M_PER_DEG_LNG]);
  }
  return pts;
}

// ── 圖層索引（先建 bbox 索引，避免每個樣本點掃全部多邊形）──────

export function buildPolygonIndex(featureCollection, nameOf) {
  const items = [];
  for (const f of featureCollection.features || []) {
    const g = f.geometry;
    if (!g) continue;
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
    for (const poly of polys) {
      if (!poly.length || poly[0].length < 4) continue;
      let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
      for (const [x, y] of poly[0]) {
        if (x < minLng) minLng = x;
        if (x > maxLng) maxLng = x;
        if (y < minLat) minLat = y;
        if (y > maxLat) maxLat = y;
      }
      items.push({ rings: poly, bbox: [minLng, minLat, maxLng, maxLat], name: nameOf ? nameOf(f) : '' });
    }
  }
  return items;
}

function nearby(index, lat, lng, padDeg) {
  return index.filter(
    (it) =>
      it.bbox[0] - padDeg < lng && lng < it.bbox[2] + padDeg &&
      it.bbox[1] - padDeg < lat && lat < it.bbox[3] + padDeg
  );
}

/** 多邊形（含內環扣除）覆蓋率 */
export function polygonCoverage(index, lat, lng, radiusM, samples = 900) {
  const pad = radiusM / M_PER_DEG_LAT + 0.0005;
  const near = nearby(index, lat, lng, pad);
  if (!near.length) return 0;
  let hit = 0;
  for (const [pLat, pLng] of sampleDisc(lat, lng, radiusM, samples)) {
    for (const it of near) {
      if (!pointInRing(pLng, pLat, it.rings[0])) continue;
      let inHole = false;
      for (let k = 1; k < it.rings.length; k++) {
        if (pointInRing(pLng, pLat, it.rings[k])) { inHole = true; break; }
      }
      if (!inHole) { hit++; break; }
    }
  }
  return hit / samples;
}

/** 點落在哪一個分區 */
export function zoneAt(index, lat, lng) {
  for (const it of nearby(index, lat, lng, 0.0005)) {
    if (!pointInRing(lng, lat, it.rings[0])) continue;
    let inHole = false;
    for (let k = 1; k < it.rings.length; k++) {
      if (pointInRing(lng, lat, it.rings[k])) { inHole = true; break; }
    }
    if (!inHole) return it.name || '(未分類)';
  }
  return '(無分區資料)';
}

// ── 行道樹 ─────────────────────────────────────────────────────

/** 樹冠半徑估算：沿用 ShadeMapLayer 的樹種異速生長方程式，兩處要一致 */
export function crownRadius(type, dbh, height) {
  let w;
  if (/榕|欒|茄苳|樟|楓|大葉桃花心木/.test(type)) w = 0.18 * dbh + 1.0;
  else if (/千層|椰子|柏|杉|竹/.test(type)) w = 0.08 * dbh + 1.0;
  else w = 0.13 * dbh + 1.2;
  w = Math.min(height * 1.2, w);
  w = Math.max(2.0, Math.min(12.0, w));
  return w / 2;
}

export function prepareTrees(rawTrees) {
  return rawTrees
    .filter((t) => t && t.lat != null && t.lng != null)
    .map((t) => {
      const h = parseFloat(t.TreeHeight) || 8.0;
      const dbh = parseFloat(t.Diameter) || 20.0;
      return { lat: +t.lat, lng: +t.lng, h, r: crownRadius(t.TreeType || '', dbh, h) };
    });
}

/** 樹冠正投影覆蓋率（與時刻無關，代表「頭頂有沒有樹」） */
export function canopyCoverage(trees, lat, lng, radiusM, samples = 900) {
  const near = trees.filter((t) => distanceM(lat, lng, t.lat, t.lng) < radiusM + 15);
  if (!near.length) return 0;
  let hit = 0;
  for (const [pLat, pLng] of sampleDisc(lat, lng, radiusM, samples)) {
    for (const t of near) {
      if (distanceM(pLat, pLng, t.lat, t.lng) <= t.r) { hit++; break; }
    }
  }
  return hit / samples;
}

/**
 * 指定時刻的行道樹陰影覆蓋率。
 * 樹冠懸空，陰影是樹冠圓沿太陽方位平移後的位置（與 ShadeMapLayer 同一個模型）。
 * sunPos 需傳入 { altitude, azimuth }（弧度），由呼叫端用 SunCalc 算好。
 */
export function treeShadeCoverage(trees, lat, lng, radiusM, sunPos, samples = 900) {
  if (!sunPos || sunPos.altitude <= 0.05) return null; // 太陽在地平線下，無陰影可言
  const L = 1 / Math.tan(sunPos.altitude);
  const near = trees.filter((t) => distanceM(lat, lng, t.lat, t.lng) < radiusM + 90);
  if (!near.length) return 0;

  const discs = near.map((t) => {
    const len = Math.min(t.h * L, t.h * 15, 120);
    const dx = len * Math.sin(sunPos.azimuth);
    const dy = len * Math.cos(sunPos.azimuth);
    return { lat: t.lat + dy / M_PER_DEG_LAT, lng: t.lng + dx / M_PER_DEG_LNG, r: t.r };
  });

  let hit = 0;
  for (const [pLat, pLng] of sampleDisc(lat, lng, radiusM, samples)) {
    for (const d of discs) {
      if (distanceM(pLat, pLng, d.lat, d.lng) <= d.r) { hit++; break; }
    }
  }
  return hit / samples;
}

// ── 開放式回答分類 ─────────────────────────────────────────────

/**
 * 不舒適／舒適原因的關鍵詞分類。
 * 一則回答可同時落入多個類別（例如「沒有樹蔭、人潮眾多」）。
 * 這組規則是先按實際回答歸納出來的初版，之後可依需要調整。
 */
// 標籤刻意保持中性（只描述主題，不帶正負評價）：
// 同一組規則會同時用在「為什麼不舒適」與「為什麼舒適」，
// 若寫成「缺乏遮蔭」，套到舒適原因上語意就會相反。
// 讀法由所在圖表的脈絡決定：在不舒適原因下讀作「缺少」，在舒適原因下讀作「有」。
export const REASON_RULES = [
  { key: 'shade', label: '遮蔭／樹木', re: /遮[陰蔭蔽]|樹|綠|林|草地|公園/ },
  { key: 'traffic', label: '車流交通', re: /車|交通|馬路|路口/ },
  { key: 'crowd', label: '人潮密度', re: /人潮|人多|擁擠|人車/ },
  { key: 'building', label: '建築量體', re: /高樓|大廈|建築|水泥|叢林/ },
  { key: 'wind', label: '通風條件', re: /通風|悶|不通|風/ },
  { key: 'surface', label: '地表鋪面', re: /地磚|鋪面|不透水|反射|柏油/ },
  { key: 'open', label: '空間開闊度', re: /空曠|寬|無遮|沒有遮|無遮蔽/ },
  { key: 'water', label: '親水／水域', re: /水|河|圳|溪|池/ }
];

export function classifyReason(text) {
  const t = (text || '').trim();
  if (!t) return [];
  const hits = REASON_RULES.filter((r) => r.re.test(t)).map((r) => r.key);
  return hits.length ? hits : ['other'];
}

export const REASON_LABEL = Object.fromEntries(
  REASON_RULES.map((r) => [r.key, r.label]).concat([['other', '其他']])
);

// ── 由試算表列組出點位 ─────────────────────────────────────────

export function extractPoints(rows) {
  const body = rows.slice(1).filter((r) => r.length >= 8 && (r[0] || '').trim());
  const points = [];
  body.forEach((r, ri) => {
    const score = parseInt(r[2], 10) || null;
    const relation = (r[1] || '').trim();
    QUESTIONS.forEach((q) => {
      const raw = (r[q.idx] || '').trim();
      if (!raw) return;
      const m = COORD_RE.exec(raw);
      const reasonText = q.kind === 'hot' ? (r[4] || '').trim() : q.kind === 'cool' ? (r[6] || '').trim() : '';
      points.push({
        id: `${ri}-${q.kind}`,
        respondent: ri,
        kind: q.kind,
        label: q.label,
        raw,
        place: raw.split(/[（(]/)[0].trim(),
        lat: m ? parseFloat(m[1]) : null,
        lng: m ? parseFloat(m[2]) : null,
        located: !!m,
        score,
        relation,
        reasonText,
        reasons: classifyReason(reasonText)
      });
    });
  });
  return points;
}

// ── 統計彙總 ───────────────────────────────────────────────────

const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const median = (a) => {
  if (!a.length) return 0;
  const s = a.slice().sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export function summarise(points) {
  const located = points.filter((p) => p.located);
  const byKind = {};
  for (const p of located) (byKind[p.kind] ||= []).push(p);

  const spatial = {};
  for (const q of QUESTIONS) {
    const arr = byKind[q.kind] || [];
    spatial[q.kind] = {
      label: q.label,
      count: arr.length,
      green: Object.fromEntries(RADII.map((R) => [R, avg(arr.map((p) => p.green?.[R] ?? 0))])),
      greenMedian: Object.fromEntries(RADII.map((R) => [R, median(arr.map((p) => p.green?.[R] ?? 0))])),
      canopy: avg(arr.map((p) => p.canopy ?? 0)),
      shade: avg(arr.map((p) => p.shade ?? 0)),
      treesWithin: avg(arr.map((p) => p.treesWithin ?? 0)),
      zones: countBy(arr.map((p) => p.zone))
    };
  }

  // 同一位受訪者標的「優先改善」是否就是他標的「最不舒適」？
  // 可看出改善訴求與痛點是否一致，或居民另有想優先處理的地方。
  const byRespondent = {};
  for (const p of located) (byRespondent[p.respondent] ||= {})[p.kind] = p;
  const pairs = Object.values(byRespondent).filter((r) => r.hot && r.improve);
  const pairDistances = pairs.map((r) => distanceM(r.hot.lat, r.hot.lng, r.improve.lat, r.improve.lng));

  return {
    hotImproveOverlap: {
      pairs: pairs.length,
      within50m: pairDistances.filter((d) => d <= 50).length,
      within200m: pairDistances.filter((d) => d <= 200).length,
      medianDistanceM: Math.round(median(pairDistances))
    },
    totalResponses: new Set(points.map((p) => p.respondent)).size,
    totalPoints: points.length,
    locatedPoints: located.length,
    scoreDistribution: countBy(points.filter((p) => p.kind === 'hot').map((p) => String(p.score ?? '未填'))),
    relationDistribution: countBy(points.filter((p) => p.kind === 'hot').map((p) => p.relation || '未填')),
    reasonDistribution: {
      hot: countBy(points.filter((p) => p.kind === 'hot').flatMap((p) => p.reasons)),
      cool: countBy(points.filter((p) => p.kind === 'cool').flatMap((p) => p.reasons))
    },
    scoreByRelation: groupMean(
      points.filter((p) => p.kind === 'hot' && p.score),
      (p) => p.relation || '未填',
      (p) => p.score
    ),
    spatial
  };
}

export function countBy(arr) {
  const c = {};
  for (const v of arr) c[v] = (c[v] || 0) + 1;
  return Object.fromEntries(Object.entries(c).sort((a, b) => b[1] - a[1]));
}

function groupMean(arr, keyOf, valOf) {
  const g = {};
  for (const x of arr) (g[keyOf(x)] ||= []).push(valOf(x));
  return Object.fromEntries(
    Object.entries(g).map(([k, v]) => [k, { mean: avg(v), n: v.length }]).sort((a, b) => a[1].mean - b[1].mean)
  );
}
