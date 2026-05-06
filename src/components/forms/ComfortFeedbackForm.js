import { useState } from 'react';
import { useMap } from 'react-leaflet';

const FACTORS = [
  '氣溫', '濕度', '休憩空間', '人行道品質',
  '樹蔭遮蔽', '飲水補給', '環境整潔', '親水距離'
];

const SCORES = [
  { value: 5, label: '非常舒適', emoji: '😊' },
  { value: 4, label: '還算舒適', emoji: '🙂' },
  { value: 3, label: '普通', emoji: '😐' },
  { value: 2, label: '有些不適', emoji: '😕' },
  { value: 1, label: '非常不適', emoji: '😣' }
];

export default function ComfortFeedbackForm({ routeName, segmentId }) {
  const map = useMap();
  const [top3, setTop3] = useState([]);
  const [scores, setScores] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleToggleFactor = (factor) => {
    if (top3.includes(factor)) {
      setTop3(top3.filter(f => f !== factor));
    } else {
      if (top3.length < 3) {
        setTop3([...top3, factor]);
      } else {
        alert('最多只能選擇 3 項因素喔！');
      }
    }
  };

  const handleScoreChange = (factor, value) => {
    setScores({ ...scores, [factor]: value });
  };

  const handleSubmit = async () => {
    // 檢查是否所有勾選的項目都有給分
    if (top3.some(factor => !scores[factor])) {
      alert('請為您選擇的項目評分');
      return;
    }

    setIsSubmitting(true);

    // 準備 payload
    const payload = {
      timestamp: new Date().toISOString(),
      route_name: routeName,
      segment_id: segmentId,
      top3_factors: top3,
      comfort_scores: FACTORS.reduce((acc, factor) => {
        acc[factor] = scores[factor] || null;
        return acc;
      }, {})
    };

    try {
      // 透過 Next.js API Route 代理送出，避免 CORS / redirect 吃掉 POST body 的問題
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `HTTP ${res.status}`);
      }

      setIsSuccess(true);
      setTimeout(() => {
        map.closePopup();
      }, 2000);
    } catch (error) {
      console.error('Submit error:', error);
      alert('送出失敗，請稍後再試。');
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="p-4 text-center">
        <div className="text-4xl mb-2">🎉</div>
        <h4 className="text-lg font-bold text-green-700">感謝您的回饋！</h4>
        <p className="text-sm text-slate-500 mt-1">視窗將自動關閉...</p>
      </div>
    );
  }

  return (
    <div className="p-2 min-w-[280px]">
      <h3 className="font-bold text-lg text-blue-900 border-b pb-2 mb-3">
        {routeName} <span className="text-sm text-slate-500 font-normal ml-1">舒適度評分</span>
      </h3>

      <div>
        <p className="text-sm font-bold text-slate-700 mb-2">
          在這段路線上，您認為哪 <span className="text-blue-600">1~3</span> 項因素最影響您的行走體驗？
        </p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {FACTORS.map(factor => (
            <label 
              key={factor} 
              className={`
                flex items-center gap-2 p-2 rounded-lg border text-sm cursor-pointer transition-colors
                ${top3.includes(factor) ? 'bg-blue-50 border-blue-400 text-blue-800' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}
                ${!top3.includes(factor) && top3.length >= 3 ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <input
                type="checkbox"
                className="w-4 h-4 accent-blue-600"
                checked={top3.includes(factor)}
                onChange={() => handleToggleFactor(factor)}
                disabled={!top3.includes(factor) && top3.length >= 3}
              />
              {factor}
            </label>
          ))}
        </div>
      </div>

      {top3.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-300">
          <p className="text-sm font-bold text-slate-700 mb-3">
            請針對您選出的項目，評估實際狀況：
          </p>
          <div className="space-y-4 mb-4">
            {top3.map(factor => (
              <div key={factor} className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <h4 className="font-bold text-sm text-blue-800 mb-2">{factor}</h4>
                <div className="flex justify-between gap-1">
                  {SCORES.map(score => (
                    <button
                      key={score.value}
                      onClick={() => handleScoreChange(factor, score.value)}
                      title={score.label}
                      className={`
                        flex flex-col items-center flex-1 py-1 rounded transition-colors
                        ${scores[factor] === score.value ? 'bg-blue-100 shadow-sm ring-1 ring-blue-300' : 'hover:bg-slate-200 opacity-60'}
                      `}
                    >
                      <span className="text-xl leading-none mb-1">{score.emoji}</span>
                      <span className="text-[10px] text-slate-600 leading-tight hidden sm:block">{score.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          <button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg disabled:opacity-50 flex justify-center items-center transition-colors"
            onClick={handleSubmit}
            disabled={isSubmitting || top3.some(f => !scores[f])}
          >
            {isSubmitting ? '送出中...' : '送出回饋'}
          </button>
        </div>
      )}
    </div>
  );
}
