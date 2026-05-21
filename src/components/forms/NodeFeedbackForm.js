import { useState, useRef, useEffect } from 'react';
import { useMap } from 'react-leaflet';

const TAGS = ['歷史', '水源', '生態', '氣味', '地景', '其他'];

export default function NodeFeedbackForm({ lat, lng, stationId, stationName, onClose }) {
  const map = useMap();
  const [description, setDescription] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [photoBase64, setPhotoBase64] = useState(null);
  const [photoFilename, setPhotoFilename] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const fileInputRef = useRef(null);

  // 語音與 AI 相關狀態
  const [isListening, setIsListening] = useState(false);
  const [isVoiceSupported, setIsVoiceSupported] = useState(false);
  const [isVoiceUsed, setIsVoiceUsed] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [showSummaryCard, setShowSummaryCard] = useState(false);
  const [summarizeError, setSummarizeError] = useState('');
  const recognitionRef = useRef(null);

  // 偵測瀏覽器語音支援度
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        setIsVoiceSupported(true);
      }
    }
  }, []);

  // 啟動/停止語音辨識
  const handleToggleListen = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      // 延遲更新狀態，避免 DOM 元素立即被 React 卸載導致 Leaflet 誤認點擊在彈出視窗外而將其關閉
      setTimeout(() => {
        setIsListening(false);
      }, 50);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = false; // 僅取最終結果，避免頻繁觸發 React 狀態更新造成輸入框卡頓
      rec.lang = 'zh-TW';

      rec.onstart = () => {
        setIsListening(true);
        setIsVoiceUsed(true);
      };

      rec.onend = () => {
        // 延遲更新狀態確保 DOM 卸載不會與點擊事件冒泡衝突
        setTimeout(() => {
          setIsListening(false);
        }, 50);
      };

      rec.onerror = (e) => {
        console.error('Speech recognition error:', e.error);
        setIsListening(false);
        if (e.error === 'not-allowed') {
          alert('請允許麥克風權限以進行語音輸入。');
        }
      };

      rec.onresult = (e) => {
        let finalTranscript = '';
        for (let i = e.resultIndex; i < e.results.length; ++i) {
          if (e.results[i].isFinal) {
            finalTranscript += e.results[i][0].transcript;
          }
        }
        
        if (finalTranscript) {
          setDescription(prev => {
            const trimmed = prev.trim();
            return trimmed ? `${trimmed} ${finalTranscript}` : finalTranscript;
          });
        }
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
    }
  };

  // 呼叫 Gemini AI 整理摘要
  const handleAISummarize = async () => {
    if (!description.trim()) {
      alert('請先輸入或用語音說一段話，再進行 AI 整理。');
      return;
    }

    setIsSummarizing(true);
    setSummarizeError('');
    setShowSummaryCard(true);

    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: description })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'AI 整理服務暫時發生錯誤');
      }

      setAiSummary(resData.summary);
    } catch (err) {
      console.error('Summarize error:', err);
      setSummarizeError(err.message);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleToggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setPhotoFilename(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1024;
        const MAX_HEIGHT = 1024;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Compress to JPEG with 0.7 quality
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setPhotoBase64(dataUrl);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!description.trim() && selectedTags.length === 0 && !photoBase64) {
      alert('請至少填寫文字、選擇標籤或上傳照片');
      return;
    }

    setIsSubmitting(true);

    const payload = {
      formType: 'node_feedback',
      timestamp: new Date().toISOString(),
      lat,
      lng,
      station_id: stationId || '',
      description: description.trim(),
      tags: selectedTags,
      photo_base64: photoBase64,
      photo_filename: photoFilename,
      ai_summary: aiSummary.trim(),
      is_voice: isVoiceUsed
    };

    try {
      const response = await fetch('/api/feedback-node', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('伺服器回應錯誤');
      }

      setIsSuccess(true);
      setTimeout(() => {
        if (onClose) onClose();
        else map.closePopup();
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
        <h4 className="text-lg font-bold text-green-700">感謝您的分享！</h4>
        <p className="text-sm text-slate-500 mt-1">資料已成功送出。</p>
      </div>
    );
  }

  return (
    <div className="p-2 min-w-[280px]">
      <h3 className="font-bold text-lg text-blue-900 border-b pb-2 mb-3">
        {stationName || '新增標記'} <span className="text-sm text-slate-500 font-normal ml-1">提供回饋</span>
      </h3>

      <div className="space-y-4 mb-4">
        {/* Tags */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">地景標籤 (可複選)</label>
          <div className="flex flex-wrap gap-2">
            {TAGS.map(tag => (
              <button
                key={tag}
                onClick={() => handleToggleTag(tag)}
                className={`
                  px-3 py-1 rounded-full text-xs font-medium border transition-colors
                  ${selectedTags.includes(tag) 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}
                `}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <div className="flex justify-between items-center mb-1.5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-1.5">
              <label className="block text-sm font-bold text-slate-700">您的記憶與故事</label>
              {aiSummary && (
                <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5 animate-bounce">
                  ✨ AI 已潤飾
                </span>
              )}
            </div>
            
            <div className="flex gap-2">
              {/* Web Speech API Microphone Button */}
              {isVoiceSupported && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleToggleListen(); }}
                  className={`
                    flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm transition-all cursor-pointer
                    ${isListening 
                      ? 'bg-red-500 text-white animate-pulse' 
                      : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'}
                  `}
                  title="用語音說故事"
                >
                  <span className="text-[10px]">🎙️</span>
                  <span>{isListening ? '聆聽中...' : '語音輸入'}</span>
                </button>
              )}

              {/* AI Summarize Button (only show if description has content) */}
              {description.trim() && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleAISummarize(); }}
                  disabled={isSummarizing}
                  className="flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white rounded-full text-[10px] font-bold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                  title="使用 Gemini AI 潤飾並整理故事"
                >
                  <span>✨</span>
                  <span>AI 潤飾</span>
                </button>
              )}
            </div>
          </div>

          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isVoiceSupported ? "這裡有什麼特別的回憶嗎？（可點擊上方「語音輸入」用語音說故事喔！）" : "這裡有什麼特別的回憶嗎？"}
              className="w-full p-2 border border-slate-200 rounded-lg text-sm min-h-[85px] focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />

            {/* Pulsing glowing microphone recording overlay */}
            {isListening && (
              <div 
                className="absolute inset-0 bg-blue-50/90 backdrop-blur-xs rounded-lg flex flex-col items-center justify-center border border-blue-200 z-10 animate-fade-in"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="relative mb-2">
                  <div className="absolute inset-0 bg-red-400 rounded-full animate-ping opacity-70"></div>
                  <div className="relative bg-red-500 text-white rounded-full p-3.5 shadow-md flex items-center justify-center">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 005 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd"/>
                    </svg>
                  </div>
                </div>
                <p className="text-blue-900 font-bold text-xs animate-pulse">語音聆聽中...請對麥克風說話</p>
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleToggleListen(); }}
                  className="mt-2.5 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 font-bold text-[10px] rounded-full border border-red-200 transition-colors shadow-xs cursor-pointer"
                >
                  說完了，點擊停止 ⏹️
                </button>
              </div>
            )}
          </div>

          {/* AI Polished Preview Card */}
          {showSummaryCard && (
            <div 
              className="bg-gradient-to-r from-violet-50/95 to-indigo-50/95 border border-indigo-200 rounded-lg p-3 mt-2 shadow-inner transition-all z-10 relative overflow-hidden animate-fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[11px] font-extrabold text-indigo-900 flex items-center gap-1 animate-pulse">
                  ✨ Gemini AI 智慧地景故事潤飾
                </span>
                <button 
                  type="button"
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    // 延遲更新狀態避免 DOM 卸載導致 Leaflet 關閉彈出視窗
                    setTimeout(() => {
                      setShowSummaryCard(false); 
                      setAiSummary(''); 
                    }, 50);
                  }}
                  className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {isSummarizing ? (
                <div className="space-y-1.5 py-1">
                  <div className="h-3 bg-indigo-200 rounded-full w-full animate-pulse"></div>
                  <div className="h-3 bg-indigo-200 rounded-full w-11/12 animate-pulse"></div>
                  <div className="h-3 bg-indigo-200 rounded-full w-4/5 animate-pulse"></div>
                  <div className="text-[10px] text-indigo-500 animate-pulse text-center mt-1">AI 正在斟酌字句中...</div>
                </div>
              ) : summarizeError ? (
                <div className="text-[11px] text-red-600 font-bold py-1">
                  ⚠️ {summarizeError}
                </div>
              ) : (
                <>
                  <p className="text-xs text-slate-700 leading-relaxed bg-white/80 p-2.5 rounded border border-indigo-100 shadow-2xs max-h-[120px] overflow-y-auto font-normal">
                    {aiSummary}
                  </p>
                  
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDescription(aiSummary);
                        // 延遲更新狀態避免 DOM 卸載導致 Leaflet 關閉彈出視窗
                        setTimeout(() => {
                          setShowSummaryCard(false);
                        }, 50);
                      }}
                      className="flex-1 bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold py-1 rounded transition-colors shadow-2xs cursor-pointer"
                    >
                      套用 (覆蓋原文)
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        // 延遲更新狀態避免 DOM 卸載導致 Leaflet 關閉彈出視窗
                        setTimeout(() => {
                          setShowSummaryCard(false);
                        }, 50);
                      }}
                      className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-[10px] font-bold py-1 rounded transition-colors shadow-xs cursor-pointer"
                    >
                      保留，與原文一同送出
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>


        {/* Photo Upload */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">上傳照片</label>
          <div 
            className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center cursor-pointer hover:bg-slate-50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            {photoBase64 ? (
              <div className="relative">
                <img src={photoBase64} alt="Preview" className="max-h-32 mx-auto rounded" />
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    // 延遲更新狀態避免 DOM 卸載導致 Leaflet 關閉彈出視窗
                    setTimeout(() => {
                      setPhotoBase64(null); 
                      setPhotoFilename(''); 
                    }, 50);
                  }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-md"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="text-slate-500 flex flex-col items-center">
                <span className="text-2xl mb-1">📷</span>
                <span className="text-xs">點擊選擇照片 (自動壓縮)</span>
              </div>
            )}
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileChange}
            />
          </div>
        </div>
      </div>
      
      <button
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg disabled:opacity-50 flex justify-center items-center transition-colors"
        onClick={handleSubmit}
        disabled={isSubmitting || (!description.trim() && selectedTags.length === 0 && !photoBase64)}
      >
        {isSubmitting ? '處理中 (若含照片可能需要較久)...' : '送出回饋'}
      </button>
    </div>
  );
}
