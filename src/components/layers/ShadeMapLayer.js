'use client';

import { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';

// Use the library's official demo API key as a fallback to ensure out-of-the-box functionality
const DEFAULT_API_KEY = "eyJhbGciOiJIUzI1NiJ9.eyJlbWFpbCI6InRwcGlvdHJvd3NraUBzaGFkZW1hcC5hcHAiLCJjcmVhdGVkIjoxNjYyNDkzMDY2Nzk0LCJpYXQiOjE2NjI0OTMwNjZ9.ovCrLTYsdKFTF6TW3DuODxCaAtGQ3qhcmqj3DWcol5g";

export default function ShadeMapLayer({ show, apiKey, date, opacity = 0.6, showTrees = false }) {
  const map = useMap();
  const layerRef = useRef(null);
  const [treeFeatures, setTreeFeatures] = useState([]);

  // Fetch local street tree data and convert to 3D GeoJSON polygons
  useEffect(() => {
    if (!show || !showTrees) {
      setTreeFeatures([]);
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

        // Convert each tree coordinate to a small 4x4 meter square polygon to cast a shadow
        const latOffset = 0.000015; // ~1.5 meters offset north/south
        const lngOffset = 0.000015; // ~1.5 meters offset east/west

        const features = validTrees.map((t) => {
          const lat = parseFloat(t.lat);
          const lng = parseFloat(t.lng);
          const height = parseFloat(t.TreeHeight) || 8.0; // Default tree height of 8 meters if missing

          return {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [[
                [lng - lngOffset, lat - latOffset],
                [lng + lngOffset, lat - latOffset],
                [lng + lngOffset, lat + latOffset],
                [lng - lngOffset, lat + latOffset],
                [lng - lngOffset, lat - latOffset]
              ]]
            },
            properties: {
              height: height,
              name: t.TreeType || 'Street Tree'
            }
          };
        });

        setTreeFeatures(features);
      })
      .catch((err) => console.error('Failed to load trees for ShadeMap shadow rendering:', err));
  }, [show, showTrees]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (show) {
      if (!layerRef.current) {
        try {
          // Dynamically load to prevent SSR errors in Next.js
          const ShadeMapModule = require('leaflet-shadow-simulator');
          const ShadeMap = ShadeMapModule.default || ShadeMapModule;

          const activeApiKey = apiKey || DEFAULT_API_KEY;

          // Simple OSM building parser for realistic urban building shadows
          const fetchOSMBuildings = async () => {
            try {
              if (map.getZoom() < 15) return treeFeatures; // Only return trees if zoom is low
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

              const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
              if (!res.ok) return treeFeatures;
              const data = await res.json();

              const nodes = {};
              data.elements.forEach(el => {
                if (el.type === 'node') {
                  nodes[el.id] = [el.lon, el.lat];
                }
              });

              const buildingFeatures = [];
              data.elements.forEach(el => {
                if (el.type === 'way' && el.nodes) {
                  const coordinates = el.nodes
                    .map(nid => nodes[nid])
                    .filter(coord => coord !== undefined);

                  if (coordinates.length > 2) {
                    if (coordinates[0][0] !== coordinates[coordinates.length - 1][0] ||
                        coordinates[0][1] !== coordinates[coordinates.length - 1][1]) {
                      coordinates.push(coordinates[0]);
                    }

                    const height = el.tags && (el.tags.height || (el.tags['building:levels'] ? parseFloat(el.tags['building:levels']) * 3 : 12));

                    buildingFeatures.push({
                      type: 'Feature',
                      geometry: {
                        type: 'Polygon',
                        coordinates: [coordinates]
                      },
                      properties: {
                        height: parseFloat(height) || 12
                      }
                    });
                  }
                }
              });

              // Merge building shadows with tree shadows
              return [...buildingFeatures, ...treeFeatures];
            } catch (err) {
              console.error('Error fetching buildings:', err);
              return treeFeatures;
            }
          };

          const layer = new ShadeMap({
            date: date || new Date(),
            color: '#01112f', // Sleek dark navy shade for premium styling
            opacity: opacity,
            apiKey: activeApiKey,
            terrainSource: {
              tileSize: 256,
              maxZoom: 15,
              getSourceUrl: ({ x, y, z }) => {
                return `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/{x}/{y}.png`;
              },
              getElevation: ({ r, g, b, a }) => {
                return (r * 256 + g + b / 256) - 32768;
              }
            },
            getFeatures: fetchOSMBuildings
          });

          layer.addTo(map);
          layerRef.current = layer;
        } catch (error) {
          console.error('Failed to initialize ShadeMap layer:', error);
        }
      }
    } else {
      if (layerRef.current) {
        try {
          map.removeLayer(layerRef.current);
        } catch (e) {
          console.error('Error removing ShadeMap layer:', e);
        }
        layerRef.current = null;
      }
    }

    return () => {
      if (layerRef.current) {
        try {
          map.removeLayer(layerRef.current);
        } catch (e) {
          console.error('Error cleaning up ShadeMap layer:', e);
        }
        layerRef.current = null;
      }
    };
  }, [show, map, apiKey, treeFeatures]); // Recreate layer when trees list changes to force recalculation

  // Update date dynamically
  useEffect(() => {
    if (layerRef.current && show && date) {
      try {
        layerRef.current.setDate(date);
      } catch (e) {
        console.error('Error updating ShadeMap date:', e);
      }
    }
  }, [date, show]);

  // Update opacity dynamically
  useEffect(() => {
    if (layerRef.current && show && opacity !== undefined) {
      try {
        layerRef.current.setOpacity(opacity);
      } catch (e) {
        console.error('Error updating ShadeMap opacity:', e);
      }
    }
  }, [opacity, show]);

  return null;
}
