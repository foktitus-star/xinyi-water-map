'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useMap, Polygon, Pane } from 'react-leaflet';
import SunCalc from 'suncalc';

// 公尺 → 經緯度的換算（台北信義區緯度約 25.03）
const M_PER_DEG_LAT = 111000;
const M_PER_DEG_LNG = 100500;

// Overpass 請求的節流、重試與快取設定
const FETCH_DEBOUNCE_MS = 500;
const RETRY_DELAY_MS = 2000;
const BBOX_CACHE_LIMIT = 24;

export default function ShadeMapLayer({
  show,
  date,
  opacity = 0.6,
  showTrees = false,
  onStatusChange
}) {
  const map = useMap();
  const [buildings, setBuildings] = useState([]);
  const [trees, setTrees] = useState([]);

  const bboxCacheRef = useRef(new Map());
  const debounceRef = useRef(null);
  const retryRef = useRef(null);
  const requestIdRef = useRef(0);

  // 用 ref 保存 callback，令 reportStatus 本身維持穩定，
  // 避免外層每次 render 傳入新函式時觸發無窮的 effect 迴圈
  const statusCbRef = useRef(onStatusChange);
  useEffect(() => {
    statusCbRef.current = onStatusChange;
  }, [onStatusChange]);
  const reportStatus = useCallback((status) => {
    if (statusCbRef.current) statusCbRef.current(status);
  }, []);

  // 1. Fetch Taipei Tree footprints (octagons) and cache them
  useEffect(() => {
    if (!show || !showTrees) {
      setTrees([]);
      return;
    }

    fetch('/TaipeiTree_filtered.json')
      .then((res) => res.json())
      .then((data) => {
        // Filter trees to the active study area boundary
        const validTrees = data.filter(
          (t) =>
            t &&
            t.lat != null && t.lng != null &&
            t.lat >= 25.005927 && t.lat <= 25.052146 &&
            t.lng >= 121.532936 && t.lng <= 121.610527
        );

        const parsedTrees = validTrees.map((t, idx) => {
          const lat = parseFloat(t.lat);
          const lng = parseFloat(t.lng);
          const height = parseFloat(t.TreeHeight) || 8.0; // Default tree height of 8 meters
          const dbh = parseFloat(t.Diameter) || 20.0; // Default DBH of 20cm
          const type = t.TreeType || '';

          // 🌲 Forestry Allometric Equations to estimate Crown Width (in meters)
          let crownWidth = 3.0; // Default 3 meters
          if (
            type.includes('榕') ||
            type.includes('欒') ||
            type.includes('茄苳') ||
            type.includes('樟') ||
            type.includes('楓') ||
            type.includes('大葉桃花心木')
          ) {
            // Spreading broadleaf trees (wide crown)
            crownWidth = 0.18 * dbh + 1.0;
          } else if (
            type.includes('千層') ||
            type.includes('椰子') ||
            type.includes('柏') ||
            type.includes('杉') ||
            type.includes('竹')
          ) {
            // Columnar/Coniferous trees (narrow crown)
            crownWidth = 0.08 * dbh + 1.0;
          } else {
            // General urban trees
            crownWidth = 0.13 * dbh + 1.2;
          }

          // Bound tree crown width between 2m and 12m, ensuring it does not exceed 1.2x tree height
          crownWidth = Math.min(height * 1.2, crownWidth);
          crownWidth = Math.max(2.0, Math.min(12.0, crownWidth));
          const crownRadius = crownWidth / 2;

          // Generate an 8-sided regular polygon (octagon) to simulate a rounded tree crown
          const numSides = 8;
          const coordinates = [];
          for (let i = 0; i <= numSides; i++) {
            const angle = (i * 2 * Math.PI) / numSides;
            // Calculate offsets in meters
            const dx = Math.cos(angle) * crownRadius; // east-west
            const dy = Math.sin(angle) * crownRadius; // north-south

            // Convert meters to lat/lng offsets around Taipei (Latitude ~25.033)
            const treeLng = lng + (dx / M_PER_DEG_LNG);
            const treeLat = lat + (dy / M_PER_DEG_LAT);
            coordinates.push([treeLng, treeLat]);
          }

          return {
            id: `tree-${idx}`,
            coordinates: coordinates,
            height: height
          };
        });

        setTrees(parsedTrees);
      })
      .catch((err) => console.error('Failed to load trees for shadow calculations:', err));
  }, [show, showTrees]);

  // 2. Fetch OSM Building footprints in current viewport
  //    以視野 bbox 做快取鍵，避免小幅移動重複打 Overpass；失敗時自動重試一次。
  const fetchBuildings = useCallback(
    async (isRetry = false) => {
      if (!show) {
        setBuildings([]);
        reportStatus('idle');
        return;
      }

      if (map.getZoom() < 15) {
        setBuildings([]);
        reportStatus('zoom');
        return;
      }

      const bounds = map.getBounds();
      const south = bounds.getSouth();
      const west = bounds.getWest();
      const north = bounds.getNorth();
      const east = bounds.getEast();

      // 地圖容器尚未完成佈局時 getBounds() 會退化成一個點，
      // 這種 bbox 查詢一定回空，直接略過等下次事件即可。
      if (!(north > south) || !(east > west)) {
        reportStatus('idle');
        return;
      }

      const cacheKey = [south, west, north, east].map((v) => v.toFixed(3)).join(',');
      const cached = bboxCacheRef.current.get(cacheKey);
      if (cached) {
        setBuildings(cached);
        reportStatus('ready');
        return;
      }

      const requestId = ++requestIdRef.current;
      reportStatus('loading');

      try {
        const query = `[out:json][timeout:15];
        (
          way["building"](${south},${west},${north},${east});
          relation["building"](${south},${west},${north},${east});
        );
        out body;
        >;
        out skel qt;`;

        const res = await fetch('/api/overpass', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ query })
        });
        if (!res.ok) throw new Error(`Overpass proxy returned ${res.status}`);
        const data = await res.json();

        // 期間若已有更新的請求發出，這次結果作廢
        if (requestId !== requestIdRef.current) return;

        const nodes = {};
        data.elements.forEach((el) => {
          if (el.type === 'node') {
            nodes[el.id] = [el.lon, el.lat];
          }
        });

        const seenIds = new Set();
        const parsedBuildings = [];
        data.elements.forEach((el) => {
          if (el.type === 'way' && el.nodes) {
            const buildingId = `building-${el.id}`;
            if (seenIds.has(buildingId)) return;

            const coordinates = el.nodes
              .map((nid) => nodes[nid])
              .filter((coord) => coord !== undefined);

            if (coordinates.length > 2) {
              // Ensure polygon is closed
              if (
                coordinates[0][0] !== coordinates[coordinates.length - 1][0] ||
                coordinates[0][1] !== coordinates[coordinates.length - 1][1]
              ) {
                coordinates.push(coordinates[0]);
              }

              const height =
                el.tags &&
                (el.tags.height ||
                  (el.tags['building:levels']
                    ? parseFloat(el.tags['building:levels']) * 3
                    : 12));

              seenIds.add(buildingId);
              parsedBuildings.push({
                id: buildingId,
                coordinates: coordinates,
                height: parseFloat(height) || 12
              });
            }
          }
        });

        bboxCacheRef.current.set(cacheKey, parsedBuildings);
        if (bboxCacheRef.current.size > BBOX_CACHE_LIMIT) {
          bboxCacheRef.current.delete(bboxCacheRef.current.keys().next().value);
        }

        setBuildings(parsedBuildings);
        reportStatus('ready');
      } catch (err) {
        console.error('Error fetching building data from OSM:', err);
        if (requestId !== requestIdRef.current) return;

        if (!isRetry) {
          reportStatus('retrying');
          clearTimeout(retryRef.current);
          retryRef.current = setTimeout(() => fetchBuildings(true), RETRY_DELAY_MS);
        } else {
          reportStatus('error');
        }
      }
    },
    [show, map, reportStatus]
  );

  // 3. Listen to map changes to fetch new building footprints（debounce 後才發請求）
  useEffect(() => {
    if (!show) {
      setBuildings([]);
      reportStatus('idle');
      return;
    }

    fetchBuildings();

    const scheduleFetch = () => {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => fetchBuildings(), FETCH_DEBOUNCE_MS);
    };

    // zoomend／resize 一併監聽：縮放回到 15 級以上、
    // 或容器尺寸改變（例如由隱藏變為顯示）之後都要重新取資料
    map.on('moveend', scheduleFetch);
    map.on('zoomend', scheduleFetch);
    map.on('resize', scheduleFetch);

    return () => {
      map.off('moveend', scheduleFetch);
      map.off('zoomend', scheduleFetch);
      map.off('resize', scheduleFetch);
      clearTimeout(debounceRef.current);
      clearTimeout(retryRef.current);
    };
  }, [show, map, fetchBuildings, reportStatus]);

  // 4. Calculate Sun position and project shadow polygons using SunCalc
  const shadows = useMemo(() => {
    if (!show) return [];

    // Taipei coordinates
    const sunPos = SunCalc.getPosition(date || new Date(), 25.033, 121.56);
    const altitude = sunPos.altitude; // radians
    const azimuth = sunPos.azimuth;   // radians, 0 is South, positive is West, negative is East

    // If sun is below the horizon, return empty list (no shadows)
    if (altitude <= 0.05) return [];

    const allShadows = [];

    // Shadow length multiplier: shadow length = height / tan(altitude)
    const L = 1 / Math.tan(altitude);

    // elevated = true 代表物件本體懸在半空（樹冠），
    // 陰影只有它自己平移過去那一塊，不該連地面一起算。
    const projectFeature = (item, elevated) => {
      const H = item.height;
      // Cap maximum shadow length to prevent infinitely long shadows at sunrise/sunset
      const shadowLength = Math.min(H * L, H * 15, 120);

      // Sun coordinates from SunCalc: 0 is South, positive is West.
      // Shadow direction is opposite to the sun:
      // dx (East/West displacement in meters) = shadowLength * sin(azimuth)
      // dy (North/South displacement in meters) = shadowLength * cos(azimuth)
      const dx = shadowLength * Math.sin(azimuth);
      const dy = shadowLength * Math.cos(azimuth);

      // Convert meter displacements to latitude/longitude offsets
      const dlng = dx / M_PER_DEG_LNG;
      const dlat = dy / M_PER_DEG_LAT;

      const footprint = item.coordinates;
      const roof = footprint.map((pt) => [pt[0] + dlng, pt[1] + dlat]);
      // 內部以 [lng, lat] 運算，Leaflet 需要 [lat, lng]
      const toLatLng = (ring) => ring.map((pt) => [pt[1], pt[0]]);

      // 樹冠懸空：只投影樹冠本身
      if (elevated) {
        return { id: item.id, rings: [toLatLng(roof)] };
      }

      // 建築：地面輪廓 ＋ 屋頂輪廓 ＋ 每條邊掃出來的四邊形。
      // 三者疊在一起就是正確的陰影範圍，L 形、口字形天井等凹角不會被填實
      // （原本取凸包會把凹處補滿）。這裡不需要真的做多邊形聯集——
      // 外層 Pane 以 fillOpacity 1.0 繪製，重疊部分在視覺上會自動平坦合併。
      const rings = [toLatLng(footprint), toLatLng(roof)];
      for (let i = 0; i < footprint.length - 1; i++) {
        const a = footprint[i];
        const b = footprint[i + 1];
        rings.push([
          [a[1], a[0]],
          [b[1], b[0]],
          [b[1] + dlat, b[0] + dlng],
          [a[1] + dlat, a[0] + dlng]
        ]);
      }

      return { id: item.id, rings };
    };

    buildings.forEach((b) => {
      const sh = projectFeature(b, false);
      if (sh) allShadows.push(sh);
    });

    trees.forEach((t) => {
      const sh = projectFeature(t, true);
      if (sh) allShadows.push(sh);
    });

    return allShadows;
  }, [show, date, buildings, trees]);

  if (!show || shadows.length === 0) return null;

  // Use a custom Leaflet Pane with styling to flat-merge overlapping shadow paths seamlessly
  return (
    <Pane name="shademap-shadows" style={{ opacity: opacity, zIndex: 350 }}>
      {shadows.map((sh) => (
        <Polygon
          key={sh.id}
          // 每個 ring 包成獨立多邊形（MultiPolygon），而不是同一個多邊形的內環，
          // 否則 Leaflet 會把它們當成「洞」挖掉
          positions={sh.rings.map((ring) => [ring])}
          pathOptions={{
            fillColor: '#01112f',
            fillOpacity: 1.0, // Draw with full opacity inside the pane to flatten overlaps
            stroke: false,
            // 預設的 evenodd 會令重疊處被挖空，改用 nonzero 讓重疊維持實心
            fillRule: 'nonzero'
          }}
        />
      ))}
    </Pane>
  );
}
