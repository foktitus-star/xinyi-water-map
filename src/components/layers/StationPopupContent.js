import { useState } from 'react';
import { useMap } from 'react-leaflet';
import { BASE_URL } from '@/data/routeData';
import NodeFeedbackForm from '../forms/NodeFeedbackForm';

export default function StationPopupContent({ station, routeColor }) {
  const [showFeedback, setShowFeedback] = useState(false);
  const map = useMap();

  if (showFeedback) {
    return (
      <NodeFeedbackForm
        lat={station.lat}
        lng={station.lng}
        stationId={station.id}
        stationName={station.name}
        onClose={() => setShowFeedback(false)}
      />
    );
  }

  return (
    <div className="popup-content">
      <div className="flex items-center justify-between mb-2 gap-2">
        <div
          className="popup-badge"
          style={{ background: routeColor, margin: 0 }}
        >
          {station.badge || station.id}
        </div>
        <button
          onClick={() => map.closePopup()}
          aria-label="關閉"
          style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            border: '1px solid rgba(0,0,0,0.12)',
            background: 'rgba(0,0,0,0.06)',
            color: '#64748b',
            fontSize: 13,
            lineHeight: 1,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          ✕
        </button>
      </div>
      <h3 className="popup-title">{station.name}</h3>
      <p className="popup-hook">{station.hook}</p>
      {station.body && (
        <p className="popup-body">{station.body}</p>
      )}
      {station.imgs && station.imgs.length > 0 && (
        <div className="popup-images">
          {station.imgs.map((img, i) => (
            <figure key={i} className="popup-figure">
              <img
                src={`${BASE_URL}${img.src}`}
                alt={img.cap || station.name}
                loading="lazy"
                className="popup-img cursor-pointer hover:opacity-90 transition-opacity"
              />
              {img.cap && (
                <figcaption className="popup-caption">
                  {img.cap}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-slate-200">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowFeedback(true);
          }}
          className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-bold rounded transition-colors flex items-center justify-center gap-2"
        >
          <span>✍️</span> 在這裡留下回憶與照片
        </button>
      </div>
    </div>
  );
}
