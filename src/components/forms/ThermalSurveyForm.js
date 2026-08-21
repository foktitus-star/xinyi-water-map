'use client';

import { useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ── Google Form 對接設定 ──
// 表單：信義區「體感溫度」地圖：熱舒適經驗調查
// entry ID 由公開表單 FB_PUBLIC_LOAD_DATA_ 抽取（2026-08-21）。
// 若表單增刪/重排題目，需重新核對 entry ID（並同步 /api/survey-submit 的白名單）。
// 提交經由自家 API 代交（/api/survey-submit），可讀取 Google 真實回應確認已記錄。
const SUBMIT_API = '/api/survey-submit';
const FORM_FALLBACK_URL = 'https://forms.gle/fxRK5CjhrTs3o1dY9';

const ENTRY = {
  relation: 'entry.132730628',
  relationOther: 'entry.132730628.other_option_response',
  comfort: 'entry.1113127977',
  hotPlace: 'entry.1026299941',
  hotWhy: 'entry.2006157600',
  coolPlace: 'entry.1501603056',
  coolWhy: 'entry.1815209056',
  improvePlace: 'entry.606398302',
};

const RELATION_OPTIONS = ['居住', '工作', '就學', '經常經過', '研究場域'];

// 信義區中心
const XINYI_CENTER = [25.033, 121.565];

// ── 地圖點選器 ──

function makePinIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div style="position:relative;width:30px;height:40px;">
      <svg viewBox="0 0 30 40" width="30" height="40" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,0.35));">
        <path d="M15 0C7 0 1 6.3 1 14c0 10.2 12.2 24.6 13.4 25.4a1 1 0 0 0 1.2 0C16.8 38.6 29 24.2 29 14 29 6.3 23 0 15 0z" fill="${color}"/>
        <circle cx="15" cy="14" r="5.5" fill="white"/>
      </svg>
    </div>`,
    iconSize: [30, 40],
    iconAnchor: [15, 40],
  });
}

function ClickCapture({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng);
    },
  });
  return null;
}

// Nominatim 反查地名（zh-TW，街道層級）
async function reverseGeocode(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=17&accept-language=zh-TW`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const data = await res.json();
  const a = data.address || {};
  const parts = [a.road, a.neighbourhood || a.suburb || a.quarter].filter(Boolean);
  if (parts.length) return parts.join('，');
  // 沒有街名時退而求其次：截取 display_name 前兩段
  if (data.display_name) return data.display_name.split(',').slice(0, 2).join('').trim();
  return '';
}

/**
 * 一條「地點題」：小地圖點選 + 可編輯文字欄。
 * 提交值 = 文字 +（若有點選）座標尾註，例如「松高路（25.03981, 121.56712）」。
 */
function LocationQuestion({ label, hint, color, value, onChange, coord, onCoordChange }) {
  const [geocoding, setGeocoding] = useState(false);

  const handlePick = useCallback(
    async (latlng) => {
      const lat = +latlng.lat.toFixed(5);
      const lng = +latlng.lng.toFixed(5);
      onCoordChange({ lat, lng });
      setGeocoding(true);
      try {
        const name = await reverseGeocode(lat, lng);
        if (name) onChange(name);
      } catch (err) {
        console.warn('反查地名失敗（座標仍已記錄）:', err);
      } finally {
        setGeocoding(false);
      }
    },
    [onChange, onCoordChange]
  );

  return (
    <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-100">
      <label className="block text-slate-800 font-semibold mb-1 leading-relaxed">
        {label} <span className="text-rose-500">*</span>
      </label>
      {hint && <p className="text-slate-400 text-xs mb-3 leading-relaxed">{hint}</p>}

      <div className="rounded-xl overflow-hidden border border-sky-100 relative" style={{ height: '230px' }}>
        <MapContainer
          center={XINYI_CENTER}
          zoom={14}
          scrollWheelZoom={false}
          attributionControl={false}
          style={{ height: '100%', width: '100%' }}
        >
          {/* 與主地圖一致：CARTO light 底圖＋水文色調 filter（原生 OSM 太雜） */}
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            className="map-tiles-tinted"
          />
          <ClickCapture onPick={handlePick} />
          {coord && <Marker position={[coord.lat, coord.lng]} icon={makePinIcon(color)} />}
        </MapContainer>
        <div className="absolute bottom-0 left-0 right-0 z-[1000] bg-white/85 backdrop-blur-sm text-[11px] text-slate-500 px-3 py-1.5 flex items-center justify-between pointer-events-none">
          <span>👆 點地圖標記位置（會自動帶入地名，可再修改）</span>
          {coord && (
            <span className="font-mono text-slate-400">
              {coord.lat}, {coord.lng}
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={geocoding ? '正在查詢地名…' : '也可以直接輸入街名或地標'}
          className="flex-1 px-4 py-2.5 rounded-xl border border-sky-200 bg-sky-50/40 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-300 placeholder:text-slate-300"
        />
        {coord && (
          <button
            type="button"
            onClick={() => onCoordChange(null)}
            className="px-3 py-2.5 rounded-xl text-xs text-slate-400 bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer flex-shrink-0"
            title="清除地圖標記"
          >
            清除標記
          </button>
        )}
      </div>
    </div>
  );
}

// ── 主表單 ──

export default function ThermalSurveyForm() {
  const [relation, setRelation] = useState('');
  const [relationOther, setRelationOther] = useState('');
  const [comfort, setComfort] = useState('');
  const [hotPlace, setHotPlace] = useState('');
  const [hotCoord, setHotCoord] = useState(null);
  const [hotWhy, setHotWhy] = useState('');
  const [coolPlace, setCoolPlace] = useState('');
  const [coolCoord, setCoolCoord] = useState(null);
  const [coolWhy, setCoolWhy] = useState('');
  const [improvePlace, setImprovePlace] = useState('');
  const [improveCoord, setImproveCoord] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState([]);

  const withCoord = (text, coord) =>
    coord ? `${text.trim()}（${coord.lat}, ${coord.lng}）` : text.trim();

  const validate = () => {
    const errs = [];
    if (!relation) errs.push('請選擇您與信義區的關係');
    if (relation === '__other__' && !relationOther.trim()) errs.push('請填寫「其他」的內容');
    if (!comfort) errs.push('請選擇整體熱舒適感受（1–5）');
    if (!hotPlace.trim()) errs.push('請填寫或在地圖點選「最熱、最不舒適」的地點');
    if (!hotWhy.trim()) errs.push('請填寫那裡讓您不舒適的原因');
    if (!coolPlace.trim()) errs.push('請填寫或在地圖點選「最涼爽、最舒適」的地點');
    if (!coolWhy.trim()) errs.push('請填寫那裡讓您舒適的原因');
    if (!improvePlace.trim()) errs.push('請填寫或在地圖點選「希望優先改善」的地點');
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    setErrors(errs);
    if (errs.length) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const answers = {
      [ENTRY.comfort]: comfort,
      [ENTRY.hotPlace]: withCoord(hotPlace, hotCoord),
      [ENTRY.hotWhy]: hotWhy.trim(),
      [ENTRY.coolPlace]: withCoord(coolPlace, coolCoord),
      [ENTRY.coolWhy]: coolWhy.trim(),
      [ENTRY.improvePlace]: withCoord(improvePlace, improveCoord),
    };
    if (relation === '__other__') {
      answers[ENTRY.relation] = '__other_option__';
      answers[ENTRY.relationOther] = relationOther.trim();
    } else {
      answers[ENTRY.relation] = relation;
    }

    setSubmitting(true);
    try {
      const res = await fetch(SUBMIT_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(answers),
      });
      const result = await res.json().catch(() => ({}));
      if (res.ok && result.ok) {
        setSubmitted(true);
      } else {
        console.error('問卷送出失敗:', res.status, result);
        setErrors([
          '送出失敗，請再試一次；若持續失敗，請點最下方連結改用 Google 表單填寫（您剛才的答案仍保留在此頁）。',
        ]);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('問卷送出失敗:', err);
      setErrors([
        '送出時發生網路問題，請再試一次；若持續失敗，請點最下方連結改用 Google 表單填寫。',
      ]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-slate-100 text-center flex flex-col items-center gap-4">
        <span className="text-5xl">💧</span>
        <h3 className="text-2xl text-slate-700 font-bold tracking-wider" style={{ fontFamily: 'var(--font-serif)' }}>
          感謝您的填答！
        </h3>
        <p className="text-slate-500 text-sm leading-relaxed max-w-md">
          您的熱舒適經驗已成功送出，將協助我們描繪信義區的「體感溫度」地圖，
          作為社區環境改善的重要參考。
        </p>
        <a
          href="/"
          className="mt-2 px-8 py-3 rounded-2xl text-sm font-semibold text-white bg-sky-600 hover:bg-sky-500 transition-all duration-300 shadow-lg shadow-sky-300/40 active:scale-95 tracking-widest"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          回到水文地圖
        </a>
      </div>
    );
  }

  const scaleLabels = { 1: '悶熱＆難以久待', 5: '涼爽＆舒適宜人' };

  return (
    <div className="space-y-5">
      {errors.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-sm text-rose-600">
          <p className="font-semibold mb-1">請先完成以下項目：</p>
          <ul className="list-disc list-inside space-y-0.5">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Q1 關係 */}
      <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-100">
        <label className="block text-slate-800 font-semibold mb-3 leading-relaxed">
          您與信義區的關係？ <span className="text-rose-500">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {RELATION_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setRelation(opt)}
              className={`px-4 py-2 rounded-xl text-sm border transition-all cursor-pointer ${
                relation === opt
                  ? 'bg-sky-600 text-white border-sky-500 shadow-md shadow-sky-300/40'
                  : 'bg-sky-50/60 text-slate-600 border-sky-200 hover:bg-sky-100'
              }`}
            >
              {opt}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setRelation('__other__')}
            className={`px-4 py-2 rounded-xl text-sm border transition-all cursor-pointer ${
              relation === '__other__'
                ? 'bg-sky-600 text-white border-sky-500 shadow-md shadow-sky-300/40'
                : 'bg-sky-50/60 text-slate-600 border-sky-200 hover:bg-sky-100'
            }`}
          >
            其他
          </button>
        </div>
        {relation === '__other__' && (
          <input
            type="text"
            value={relationOther}
            onChange={(e) => setRelationOther(e.target.value)}
            placeholder="請說明"
            className="mt-3 w-full px-4 py-2.5 rounded-xl border border-sky-200 bg-sky-50/40 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 placeholder:text-slate-300"
          />
        )}
      </div>

      {/* Q2 量表 */}
      <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-100">
        <label className="block text-slate-800 font-semibold mb-3 leading-relaxed">
          夏天在信義區戶外活動時，整體的熱舒適感受是？ <span className="text-rose-500">*</span>
        </label>
        <div className="flex flex-col sm:flex-row sm:justify-between gap-1.5 mb-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm md:text-base font-semibold text-rose-600 bg-rose-50 border border-rose-200">
            🥵 1 分＝{scaleLabels[1]}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm md:text-base font-semibold text-sky-700 bg-sky-50 border border-sky-200 sm:justify-end">
            😌 5 分＝{scaleLabels[5]}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          {['1', '2', '3', '4', '5'].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setComfort(v)}
              className={`flex-1 py-3 rounded-xl text-base font-semibold border transition-all cursor-pointer ${
                comfort === v
                  ? 'bg-gradient-to-b from-amber-500 to-orange-500 text-white border-orange-400 shadow-md shadow-orange-200'
                  : 'bg-sky-50/60 text-slate-500 border-sky-200 hover:bg-sky-100'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
        <div
          className="mt-2 h-1.5 rounded-full"
          style={{ background: 'linear-gradient(90deg, #f43f5e 0%, #f59e0b 50%, #0ea5e9 100%)' }}
          aria-hidden="true"
        />
        <div className="flex justify-between mt-1 text-xs md:text-sm text-slate-500 font-medium">
          <span>← 愈悶熱</span>
          <span>愈涼爽 →</span>
        </div>
      </div>

      {/* Q3 最熱地點（地圖） */}
      <LocationQuestion
        label="信義區哪個地點或路段，讓您覺得最熱、最不舒適？"
        hint="請在地圖點選位置，或直接輸入街名、地標，例如「松高路某段」「象山站出口一帶」"
        color="#ef4444"
        value={hotPlace}
        onChange={setHotPlace}
        coord={hotCoord}
        onCoordChange={setHotCoord}
      />

      {/* Q4 原因 */}
      <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-100">
        <label className="block text-slate-800 font-semibold mb-1 leading-relaxed">
          為什麼那裡讓您覺得不舒適？ <span className="text-rose-500">*</span>
        </label>
        <p className="text-slate-400 text-xs mb-3">例如：沒有路樹遮蔭、環境不通風、人潮眾多…</p>
        <input
          type="text"
          value={hotWhy}
          onChange={(e) => setHotWhy(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-sky-200 bg-sky-50/40 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
        />
      </div>

      {/* Q5 最涼爽地點（地圖） */}
      <LocationQuestion
        label="信義區哪個地點，讓您覺得最涼爽、最舒適？"
        hint="請在地圖點選位置，或直接輸入街名、地標或附近位置"
        color="#0ea5e9"
        value={coolPlace}
        onChange={setCoolPlace}
        coord={coolCoord}
        onCoordChange={setCoolCoord}
      />

      {/* Q6 原因 */}
      <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-100">
        <label className="block text-slate-800 font-semibold mb-1 leading-relaxed">
          為什麼那裡讓您覺得舒適？ <span className="text-rose-500">*</span>
        </label>
        <p className="text-slate-400 text-xs mb-3">例如：有公園樹蔭遮蔽、通風涼好、靠近河流圳溝…</p>
        <textarea
          value={coolWhy}
          onChange={(e) => setCoolWhy(e.target.value)}
          rows={3}
          className="w-full px-4 py-2.5 rounded-xl border border-sky-200 bg-sky-50/40 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 resize-y"
        />
      </div>

      {/* Q7 優先改善（地圖） */}
      <LocationQuestion
        label="如果能優先改善一個地方，您希望優先改善哪裡？"
        hint="請在地圖點選位置，或直接輸入街名、地標或附近位置"
        color="#10b981"
        value={improvePlace}
        onChange={setImprovePlace}
        coord={improveCoord}
        onCoordChange={setImproveCoord}
      />

      {/* 送出 */}
      <div className="pt-2 pb-8 flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full md:w-auto px-14 py-4 rounded-2xl text-base font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 transition-all duration-300 cursor-pointer shadow-lg shadow-orange-200 active:scale-95 tracking-widest disabled:opacity-50 disabled:cursor-wait"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          {submitting ? '送出中…' : '🌡️ 送出問卷'}
        </button>
        <p className="text-[11px] text-slate-400 text-center leading-relaxed">
          回覆將直接存入信義社大的調查表單。若送出遇到問題，
          <a href={FORM_FALLBACK_URL} target="_blank" rel="noopener noreferrer" className="text-sky-500 hover:text-sky-400 underline">
            也可以改用 Google 表單填寫
          </a>
          。
        </p>
      </div>
    </div>
  );
}
