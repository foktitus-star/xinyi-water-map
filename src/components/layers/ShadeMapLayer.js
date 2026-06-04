'use client';

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';

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

          const layer = new ShadeMap({
            date: date || new Date(),
            color: '#01112f', // Sleek dark navy shade for premium styling
            opacity: opacity,
            apiKey: apiKey || '',
            terrainSource: {
              tileSize: 256,
              maxZoom: 15,
              getSourceUrl: ({ x, y, z }) => {
                return `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;
              },
              getElevation: ({ r, g, b, a }) => {
                return (r * 256 + g + b / 256) - 32768;
              }
            }
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
  }, [show, map, apiKey]); // Re-run setup if layer visibility or map or key changes

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
