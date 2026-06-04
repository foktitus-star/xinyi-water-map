'use client';

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';

// Use the library's official demo API key as a fallback to ensure out-of-the-box functionality
const DEFAULT_API_KEY = "eyJhbGciOiJIUzI1NiJ9.eyJlbWFpbCI6InRwcGlvdHJvd3NraUBzaGFkZW1hcC5hcHAiLCJjcmVhdGVkIjoxNjYyNDkzMDY2Nzk0LCJpYXQiOjE2NjI0OTMwNjZ9.ovCrLTYsdKFTF6TW3DuODxCaAtGQ3qhcmqj3DWcol5g";

export default function ShadeMapLayer({ show, apiKey, date, opacity = 0.6 }) {
  const map = useMap();
  const layerRef = useRef(null);

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
              if (map.getZoom() < 15) return [];
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
              if (!res.ok) return [];
              const data = await res.json();

              const nodes = {};
              data.elements.forEach(el => {
                if (el.type === 'node') {
                  nodes[el.id] = [el.lon, el.lat];
                }
              });

              const features = [];
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

                    features.push({
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
              return features;
            } catch (err) {
              console.error('Error fetching buildings:', err);
              return [];
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
  }, [show, map, apiKey]);

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
