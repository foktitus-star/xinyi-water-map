'use client';
import { useState, useEffect } from 'react';
import { TileLayer } from 'react-leaflet';

export function useTemperatureLayer() {
  const [showTemperature, setShowTemperature] = useState(false);
  const [temperatureUrl, setTemperatureUrl] = useState('');
  const [temperatureLoading, setTemperatureLoading] = useState(false);

  useEffect(() => {
    if (showTemperature && !temperatureUrl && !temperatureLoading) {
      setTemperatureLoading(true);
      fetch('/api/temperature')
        .then(res => res.json())
        .then(data => {
          if (data.urlFormat) {
            setTemperatureUrl(data.urlFormat);
          } else {
            console.error('GEE Error:', data.error);
            alert('地表溫度載入失敗，可能未設定 GEE 金鑰。');
            setShowTemperature(false);
          }
        })
        .catch(err => {
          console.error(err);
          alert('地表溫度載入失敗。');
          setShowTemperature(false);
        })
        .finally(() => {
          setTemperatureLoading(false);
        });
    }
  }, [showTemperature, temperatureUrl, temperatureLoading]);

  return {
    showTemperature,
    setShowTemperature,
    temperatureUrl,
    temperatureLoading
  };
}

export default function TemperatureLayer({ show, url, opacity = 0.65 }) {
  if (!show || !url) return null;

  return (
    <TileLayer
      url={url}
      opacity={opacity}
      zIndex={200}
      attribution="Google Earth Engine &amp; Landsat 8"
    />
  );
}

import InfoTooltip from './info-tooltip/InfoTooltip';

export function TemperatureControl({ show, onChange, loading, opacity, onOpacityChange }) {
  return (
    <div className="flex flex-col mb-1">
      <div className="flex items-center justify-between gap-2 hover:bg-slate-50 rounded-lg px-2 py-1.5 transition-colors w-full">
        <label
          className="flex items-center gap-3 cursor-pointer flex-1"
        >
          <input
            type="checkbox"
            checked={show}
            onChange={(e) => onChange(e.target.checked)}
            className="w-5 h-5 rounded accent-[#ef4444] cursor-pointer"
          />
          <span className="text-sm leading-tight text-slate-700">
            🌡️ 地表溫度 (Landsat 8) {loading && <span className="text-xs text-slate-400">載入中...</span>}
          </span>
        </label>
        <InfoTooltip id="temperature" />
      </div>

      {/* Opacity Slider — visible only when layer is on */}
      <div className={`
        flex items-center gap-2 px-10 transition-all duration-300 ease-in-out
        ${show ? 'h-6 opacity-100 mt-0.5' : 'h-0 opacity-0 overflow-hidden'}
      `}>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={opacity}
          onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
          className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#ef4444]"
        />
        <span className="text-[10px] font-mono font-bold text-slate-500 w-8 text-right">
          {Math.round(opacity * 100)}%
        </span>
      </div>
    </div>
  );
}

