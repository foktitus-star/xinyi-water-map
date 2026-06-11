'use client';

import { useEffect, useState, useMemo } from 'react';
import { useMap, Polygon, Pane } from 'react-leaflet';
import SunCalc from 'suncalc';

// Andrew's Monotone Chain algorithm to calculate convex hull of a set of 2D points [lng, lat]
function getConvexHull(points) {
  if (points.length <= 1) return points;
  
  // Sort points lexicographically by longitude (x), then latitude (y)
  const sorted = [...points].sort((a, b) => a[0] !== b[0] ? a[0] - b[0] : a[1] - b[1]);
  
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  
  const lower = [];
  for (let i = 0; i < sorted.length; i++) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], sorted[i]) <= 0) {
      lower.pop();
    }
    lower.push(sorted[i]);
  }
  
  const upper = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], sorted[i]) <= 0) {
      upper.pop();
    }
    upper.push(sorted[i]);
  }
  
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

export default function ShadeMapLayer({ show, date, opacity = 0.6, showTrees = false }) {
  const map = useMap();
  const [buildings, setBuildings] = useState([]);
  const [trees, setTrees] = useState([]);

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
            const treeLng = lng + (dx / 100500);
            const treeLat = lat + (dy / 111000);
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
  const updateBuildings = async () => {
    if (!show || map.getZoom() < 15) {
      setBuildings([]);
      return;
    }

    try {
      const bounds = map.getBounds();
      const south = bounds.getSouth();
      const west = bounds.getWest();
      const north = bounds.getNorth();
      const east = bounds.getEast();

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
      if (!res.ok) return;
      const data = await res.json();

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

      setBuildings(parsedBuildings);
    } catch (err) {
      console.error('Error fetching building data from OSM:', err);
    }
  };

  // 3. Listen to map bounds changes to fetch new building footprints
  useEffect(() => {
    if (!show) {
      setBuildings([]);
      return;
    }

    updateBuildings();

    const handleMoveEnd = () => {
      updateBuildings();
    };

    map.on('moveend', handleMoveEnd);
    return () => {
      map.off('moveend', handleMoveEnd);
    };
  }, [show, map]);

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

    const projectFeature = (item) => {
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
      const dlng = dx / 100500;
      const dlat = dy / 111000;

      const footprint = item.coordinates;
      const roof = footprint.map((pt) => [pt[0] + dlng, pt[1] + dlat]);

      // Combine footprint and roof coordinates to find the shadow boundary via convex hull
      const combinedPoints = [...footprint, ...roof];
      const hull = getConvexHull(combinedPoints);

      // Convert back to Leaflet [lat, lng] format
      const positions = hull.map((pt) => [pt[1], pt[0]]);

      return {
        id: item.id,
        positions: positions
      };
    };

    buildings.forEach((b) => {
      const sh = projectFeature(b);
      if (sh) allShadows.push(sh);
    });

    trees.forEach((t) => {
      const sh = projectFeature(t);
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
          positions={sh.positions}
          pathOptions={{
            fillColor: '#01112f',
            fillOpacity: 1.0, // Draw with full opacity inside the pane to flatten overlaps
            stroke: false
          }}
        />
      ))}
    </Pane>
  );
}
