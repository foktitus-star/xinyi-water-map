'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

export default function AdminPage() {
  const [passcode, setPasscode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'approved', 'rejected'
  const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'memory', 'report'
  const [actioningId, setActioningId] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryResult, setSummaryResult] = useState(null); // { text: string } | null
  const [summaryCopied, setSummaryCopied] = useState(false);

  // 嘗試從 SessionStorage 自動登入
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('admin_passcode');
      if (stored) {
        setPasscode(stored);
        verifyAndLoad(stored);
      }
    }
  }, []);

  const verifyAndLoad = async (codeToVerify) => {
    setLoading(true);
    setAuthError('');
    setError('');
    
    try {
      const res = await fetch('/api/admin/feedback', {
        method: 'GET',
        headers: {
          'x-admin-passcode': codeToVerify
        }
      });

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('密碼錯誤，請重新輸入。');
        } else {
          try {
            const errData = await res.json();
            throw new Error(errData.error || errData.details || `伺服器連線失敗 (HTTP ${res.status})`);
          } catch (e) {
            throw new Error(`伺服器連線失敗 (HTTP ${res.status})`);
          }
        }
      }

      const data = await res.json();
      // 成功驗證
      setIsAuthenticated(true);
      setRecords(data);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('admin_passcode', codeToVerify);
      }
    } catch (err) {
      console.error(err);
      setAuthError(err.message);
      setIsAuthenticated(false);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('admin_passcode');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setAuthError('請輸入管理密碼。');
      return;
    }
    verifyAndLoad(passcode.trim());
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPasscode('');
    setRecords([]);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('admin_passcode');
    }
  };

  // 變更標記的審核狀態
  const handleUpdateStatus = async (id, newStatus) => {
    setActioningId(id);
    try {
      const res = await fetch('/api/admin/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id,
          status: newStatus,
          passcode: passcode.trim()
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || '更新狀態失敗');
      }

      // 本地狀態即時更新
      setRecords(prev => 
        prev.map(rec => rec.id === id ? { ...rec, status: newStatus } : rec)
      );
    } catch (err) {
      alert('操作失敗：' + err.message);
    } finally {
      setActioningId(null);
    }
  };

  // 分類統計
  const counts = {
    pending: records.filter(r => r.status === 'pending' || !r.status).length,
    approved: records.filter(r => r.status === 'approved').length,
    rejected: records.filter(r => r.status === 'rejected').length,
  };

  // 舊資料沒有 feedback_type 欄位，缺失或空值一律視為 'memory'
  const getFeedbackType = (r) => r.feedback_type === 'report' ? 'report' : 'memory';

  // 當前標籤 + 類型過濾後的紀錄
  const filteredRecords = records.filter(r => {
    if (activeTab === 'pending') {
      if (r.status !== 'pending' && r.status) return false;
    } else if (r.status !== activeTab) {
      return false;
    }
    if (typeFilter !== 'all' && getFeedbackType(r) !== typeFilter) return false;
    return true;
  }).sort((a, b) => {
    // 待審核分頁：環境通報優先排最前，同類型內維持原本時間排序
    if (activeTab === 'pending') {
      const aIsReport = getFeedbackType(a) === 'report';
      const bIsReport = getFeedbackType(b) === 'report';
      if (aIsReport !== bIsReport) return aIsReport ? -1 : 1;
    }
    return new Date(b.timestamp) - new Date(a.timestamp); // 最新時間排前面
  });

  // CSV 欄位值 escape：含逗號、雙引號或換行則以雙引號包裹，內部雙引號轉為兩個雙引號
  const escapeCsvValue = (value) => {
    const str = value === null || value === undefined ? '' : String(value);
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // 匯出當前篩選結果為 CSV 檔案（純前端）
  const handleExportCsv = () => {
    if (filteredRecords.length === 0) return;

    const columns = ['id', 'timestamp', 'feedback_type', 'status', 'station_id', 'lat', 'lng', 'tags', 'description', 'ai_summary', 'photo_url', 'photo_url_2'];
    const header = columns.join(',');
    const rows = filteredRecords.map(r => {
      const rowValues = {
        id: r.id,
        timestamp: r.timestamp,
        feedback_type: getFeedbackType(r),
        status: r.status || 'pending',
        station_id: r.station_id,
        lat: r.lat,
        lng: r.lng,
        tags: r.tags,
        description: r.description,
        ai_summary: r.ai_summary,
        photo_url: r.photo_url,
        photo_url_2: r.photo_url_2,
      };
      return columns.map(col => escapeCsvValue(rowValues[col])).join(',');
    });

    const csvContent = '﻿' + [header, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const filename = `信水義河回饋_${activeTab}_${typeFilter}_${dateStr}.csv`;

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 送給 AI 彙整的環境通報紀錄（僅取當前篩選結果中的 report 類型）
  const reportRecordsForSummary = filteredRecords.filter(r => getFeedbackType(r) === 'report');

  // 呼叫後端 API 產生環境通報彙整摘要
  const handleGenerateSummary = async () => {
    if (reportRecordsForSummary.length === 0) return;
    if (reportRecordsForSummary.length > 100) {
      alert('目前篩選範圍內的環境通報超過 100 筆，請先縮小篩選範圍再產生彙整摘要。');
      return;
    }

    setSummaryLoading(true);
    try {
      const res = await fetch('/api/admin/report-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          passcode: passcode.trim(),
          records: reportRecordsForSummary
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || '產生彙整摘要失敗');
      }

      setSummaryResult({ text: data.summary });
    } catch (err) {
      alert('彙整失敗：' + err.message);
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleCopySummary = async () => {
    if (!summaryResult) return;
    try {
      await navigator.clipboard.writeText(summaryResult.text);
      setSummaryCopied(true);
      setTimeout(() => setSummaryCopied(false), 2000);
    } catch (err) {
      alert('複製失敗：' + err.message);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="h-screen overflow-y-auto bg-slate-950 flex flex-col items-center justify-center p-4">
        {/* Glassmorphism Card */}
        <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-cyan-400 to-violet-500" />
          
          <div className="text-center mb-8">
            <h1 className="text-2xl font-black bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent tracking-widest mb-2 font-sans">
              信水義河・管理後台
            </h1>
            <p className="text-xs text-white/50 tracking-wider">
              請輸入管理通行密碼以審查社區地景標記
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-300 tracking-wider mb-2">安全認證密碼</label>
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="請輸入後台存取密碼..."
                className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50 transition-all font-mono text-center tracking-widest text-lg"
              />
            </div>

            {authError && (
              <div className="p-3.5 bg-red-950/40 border border-red-500/20 text-red-300 text-xs rounded-xl text-center font-semibold">
                ⚠️ {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-sm transition-all shadow-lg active:scale-98 cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>驗證密碼中…</span>
                </>
              ) : (
                <span>🔑 進入審核大廳</span>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <Link href="/" className="text-xs text-blue-400/80 hover:text-blue-400 transition-colors font-bold">
              ← 返回互動地圖首頁
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="w-full bg-slate-900/80 backdrop-blur-md border-b border-white/10 h-16 px-6 flex items-center justify-between shadow-md flex-shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/" className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-slate-300">
            ← 返回地圖
          </Link>
          <div className="h-4 w-px bg-white/10" />
          <h1 className="text-lg font-black bg-gradient-to-r from-blue-400 via-cyan-400 to-violet-400 bg-clip-text text-transparent tracking-widest font-sans">
            信水義河地景 審核大廳
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs font-semibold px-3 py-1 bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded-full font-mono">
            🔑 ADMIN
          </span>
          <button 
            onClick={handleLogout}
            className="text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            安全登出
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 overflow-y-auto space-y-6">
        
        {/* Statistics Panels */}
        <div className="grid grid-cols-3 gap-4 md:gap-6">
          <div 
            onClick={() => setActiveTab('pending')}
            className={`p-4 md:p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
              activeTab === 'pending'
                ? 'bg-amber-500/10 border-amber-500/30 shadow-lg'
                : 'bg-slate-900/40 border-white/5 hover:bg-slate-900/60'
            }`}
          >
            <div className="text-slate-400 text-xs font-bold tracking-wider">⏳ 待審核紀錄</div>
            <div className="text-3xl md:text-4xl font-black text-amber-400 mt-2 font-mono">{counts.pending}</div>
            <div className="text-[10px] text-slate-500 mt-1">尚未公開於前台地圖</div>
            {activeTab === 'pending' && <div className="absolute right-0 bottom-0 w-2 h-full bg-amber-500" />}
          </div>

          <div 
            onClick={() => setActiveTab('approved')}
            className={`p-4 md:p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
              activeTab === 'approved'
                ? 'bg-green-500/10 border-green-500/30 shadow-lg'
                : 'bg-slate-900/40 border-white/5 hover:bg-slate-900/60'
            }`}
          >
            <div className="text-slate-400 text-xs font-bold tracking-wider">✅ 已核准公開</div>
            <div className="text-3xl md:text-4xl font-black text-green-400 mt-2 font-mono">{counts.approved}</div>
            <div className="text-[10px] text-slate-500 mt-1 font-sans">已即時呈現在地標中</div>
            {activeTab === 'approved' && <div className="absolute right-0 bottom-0 w-2 h-full bg-green-500" />}
          </div>

          <div 
            onClick={() => setActiveTab('rejected')}
            className={`p-4 md:p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
              activeTab === 'rejected'
                ? 'bg-red-500/10 border-red-500/30 shadow-lg'
                : 'bg-slate-900/40 border-white/5 hover:bg-slate-900/60'
            }`}
          >
            <div className="text-slate-400 text-xs font-bold tracking-wider">❌ 已拒絕封存</div>
            <div className="text-3xl md:text-4xl font-black text-red-400 mt-2 font-mono">{counts.rejected}</div>
            <div className="text-[10px] text-slate-500 mt-1">不會顯示於前台</div>
            {activeTab === 'rejected' && <div className="absolute right-0 bottom-0 w-2 h-full bg-red-500" />}
          </div>
        </div>

        {/* Data Cards Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span>📂</span>
              <span>{activeTab === 'pending' ? '待審核清單' : activeTab === 'approved' ? '核准地標清單' : '封存拒絕紀錄'}</span>
              <span className="text-xs font-bold bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono">
                {filteredRecords.length}
              </span>
            </h2>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={handleExportCsv}
                disabled={filteredRecords.length === 0}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-cyan-400"
              >
                📊 匯出 CSV
              </button>

              <button
                onClick={handleGenerateSummary}
                disabled={summaryLoading || reportRecordsForSummary.length === 0}
                title={reportRecordsForSummary.length === 0 ? '目前篩選範圍內沒有環境通報' : undefined}
                className="text-xs text-violet-400 hover:text-violet-300 font-bold flex items-center gap-1 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-violet-400"
              >
                {summaryLoading ? (
                  <>
                    <div className="w-3 h-3 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
                    <span>彙整中...</span>
                  </>
                ) : (
                  <span>📋 產生通報彙整</span>
                )}
              </button>

              <button
                onClick={() => verifyAndLoad(passcode)}
                className="text-xs text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                🔄 重整列表
              </button>
            </div>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold text-slate-500 tracking-wider mr-1">類型篩選：</span>
            <button
              onClick={() => setTypeFilter('all')}
              className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                typeFilter === 'all'
                  ? 'bg-slate-700 border-slate-500 text-white'
                  : 'bg-slate-900/40 border-white/10 text-slate-400 hover:bg-slate-800/60'
              }`}
            >
              全部
            </button>
            <button
              onClick={() => setTypeFilter('memory')}
              className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                typeFilter === 'memory'
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                  : 'bg-slate-900/40 border-white/10 text-slate-400 hover:bg-slate-800/60'
              }`}
            >
              📖 地方記憶
            </button>
            <button
              onClick={() => setTypeFilter('report')}
              className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                typeFilter === 'report'
                  ? 'bg-red-500/10 border-red-500/30 text-red-400'
                  : 'bg-slate-900/40 border-white/10 text-slate-400 hover:bg-slate-800/60'
              }`}
            >
              ⚠️ 環境通報
            </button>
          </div>

          {filteredRecords.length === 0 ? (
            <div className="w-full bg-slate-900/20 border border-white/5 py-16 text-center rounded-2xl">
              <div className="text-4xl mb-3">📭</div>
              <p className="text-sm text-slate-400">目前沒有此類別的地景紀錄。</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredRecords.map((record) => {
                const formattedDate = new Date(record.timestamp).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
                const tagsList = record.tags ? record.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
                const isReport = getFeedbackType(record) === 'report';

                return (
                  <div 
                    key={record.id}
                    className="bg-slate-900/40 border border-white/5 hover:border-white/10 rounded-2xl p-5 md:p-6 transition-all shadow-xl flex flex-col justify-between gap-4 relative overflow-hidden"
                  >
                    <div>
                      {/* Top Meta info */}
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mb-2 font-mono">
                        <span>🆔 {record.id}</span>
                        <span>📅 {formattedDate}</span>
                      </div>

                      {/* Title & Tags */}
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isReport
                              ? 'bg-red-500/10 text-red-400 border-red-500/30'
                              : 'bg-slate-500/10 text-slate-400 border-slate-500/30'
                          }`}
                        >
                          {isReport ? '⚠️ 環境通報' : '📖 地方記憶'}
                        </span>

                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                          📍 {record.station_id || '自由地景標記'}
                        </span>

                        {tagsList.map(tag => (
                          <span key={tag} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            #{tag}
                          </span>
                        ))}

                        {record.is_voice === "TRUE" && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
                            🎙️ 語音輸入
                          </span>
                        )}
                      </div>

                      {/* Main Story Description */}
                      <div className="bg-white/5 border border-white/5 rounded-xl p-4 mb-3">
                        <p className="text-sm text-slate-200 leading-relaxed font-sans whitespace-pre-line">
                          {record.description}
                        </p>
                      </div>

                      {/* AI Summarized block */}
                      {record.ai_summary && (
                        <div className="bg-violet-950/20 border border-violet-500/15 rounded-xl p-3.5 mb-3">
                          <div className="text-[10px] text-violet-400 font-bold mb-1.5 flex items-center gap-1 tracking-wider">
                            <span>✨</span> <span>AI 整理地景摘要：</span>
                          </div>
                          <p className="text-xs text-violet-300 leading-relaxed font-medium">
                            {record.ai_summary}
                          </p>
                        </div>
                      )}

                      {/* Photo & EXIF Section */}
                      {record.photo_url && (
                        <div className="space-y-2 mb-2">
                          <div className="relative rounded-xl overflow-hidden border border-white/10 group aspect-video max-h-44 flex items-center justify-center bg-slate-950">
                            <img
                              src={record.photo_url}
                              alt="Upload feedback preview"
                              className="object-contain w-full h-full"
                              onError={(e) => {
                                e.target.src = 'https://placehold.co/400x300/1e293b/94a3b8?text=Image+Load+Failed';
                              }}
                            />
                          </div>

                          {/* EXIF parameters Inspector (CRITICAL FEATURE) */}
                          <div className="p-3 bg-blue-950/20 border border-blue-500/10 rounded-xl space-y-2">
                            <div className="text-[10px] text-blue-400 font-bold tracking-wider flex items-center gap-1">
                              <span>📸</span> <span>相片 ① EXIF 後設資料分析：</span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                              <div className="bg-slate-950/50 p-1.5 rounded border border-white/5">
                                <span className="text-slate-500 block mb-0.5">裝置 Make/Model</span>
                                <span className="text-slate-300 font-bold truncate block">{record.photo_exif_device || '❌ 無 EXIF 設備資訊'}</span>
                              </div>
                              <div className="bg-slate-950/50 p-1.5 rounded border border-white/5">
                                <span className="text-slate-500 block mb-0.5">拍攝時間 DateTime</span>
                                <span className="text-slate-300 font-bold block">{record.photo_exif_dateTime || '❌ 無 EXIF 拍攝時間'}</span>
                              </div>
                              <div className="bg-slate-950/50 p-1.5 rounded border border-white/5 col-span-2 flex items-center justify-between">
                                <div>
                                  <span className="text-slate-500 block mb-0.5">內置 GPS 座標</span>
                                  <span className="text-slate-300 font-bold block">
                                    {record.photo_exif_latitude && record.photo_exif_longitude
                                      ? `${record.photo_exif_latitude}, ${record.photo_exif_longitude}`
                                      : '❌ 無 GPS 定位資訊'}
                                  </span>
                                </div>
                                {record.photo_exif_latitude && record.photo_exif_longitude && (
                                  <a 
                                    href={`https://www.openstreetmap.org/?mlat=${record.photo_exif_latitude}&mlon=${record.photo_exif_longitude}#map=17/${record.photo_exif_latitude}/${record.photo_exif_longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[9px] bg-blue-600 hover:bg-blue-500 text-white font-bold px-2 py-1 rounded transition-colors"
                                  >
                                    🗺️ 地圖比對
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Photo 2 & EXIF 2 Section */}
                      {record.photo_url_2 && (
                        <div className="space-y-2 mb-2">
                          <div className="relative rounded-xl overflow-hidden border border-white/10 group aspect-video max-h-44 flex items-center justify-center bg-slate-950">
                            <img
                              src={record.photo_url_2}
                              alt="Upload feedback preview 2"
                              className="object-contain w-full h-full"
                              onError={(e) => {
                                e.target.src = 'https://placehold.co/400x300/1e293b/94a3b8?text=Image+Load+Failed';
                              }}
                            />
                          </div>

                          {/* EXIF 2 parameters Inspector */}
                          <div className="p-3 bg-blue-950/20 border border-blue-500/10 rounded-xl space-y-2">
                            <div className="text-[10px] text-blue-400 font-bold tracking-wider flex items-center gap-1">
                              <span>📸</span> <span>相片 ② EXIF 後設資料分析：</span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                              <div className="bg-slate-950/50 p-1.5 rounded border border-white/5">
                                <span className="text-slate-500 block mb-0.5">裝置 Make/Model</span>
                                <span className="text-slate-300 font-bold truncate block">{record.photo_exif_2_device || '❌ 無 EXIF 設備資訊'}</span>
                              </div>
                              <div className="bg-slate-950/50 p-1.5 rounded border border-white/5">
                                <span className="text-slate-500 block mb-0.5">拍攝時間 DateTime</span>
                                <span className="text-slate-300 font-bold block">{record.photo_exif_2_dateTime || '❌ 無 EXIF 拍攝時間'}</span>
                              </div>
                              <div className="bg-slate-950/50 p-1.5 rounded border border-white/5 col-span-2 flex items-center justify-between">
                                <div>
                                  <span className="text-slate-500 block mb-0.5">內置 GPS 座標</span>
                                  <span className="text-slate-300 font-bold block">
                                    {record.photo_exif_2_latitude && record.photo_exif_2_longitude
                                      ? `${record.photo_exif_2_latitude}, ${record.photo_exif_2_longitude}`
                                      : '❌ 無 GPS 定位資訊'}
                                  </span>
                                </div>
                                {record.photo_exif_2_latitude && record.photo_exif_2_longitude && (
                                  <a 
                                    href={`https://www.openstreetmap.org/?mlat=${record.photo_exif_2_latitude}&mlon=${record.photo_exif_2_longitude}#map=17/${record.photo_exif_2_latitude}/${record.photo_exif_2_longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[9px] bg-blue-600 hover:bg-blue-500 text-white font-bold px-2 py-1 rounded transition-colors"
                                  >
                                    🗺️ 地圖比對
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Coordinates details */}
                      <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between mt-2 px-1">
                        <span>提報落點：{Number(record.lat).toFixed(6)}, {Number(record.lng).toFixed(6)}</span>
                        <a 
                          href={`https://www.openstreetmap.org/?mlat=${record.lat}&mlon=${record.lng}#map=18/${record.lat}/${record.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:underline"
                        >
                          🌐 檢視提報位置
                        </a>
                      </div>
                    </div>

                    {/* Moderation Controls (Action Buttons) */}
                    <div className="pt-4 border-t border-white/5 flex gap-3">
                      {actioningId === record.id ? (
                        <div className="w-full flex justify-center py-2">
                          <div className="inline-block w-5 h-5 border-2 border-white/20 border-t-blue-400 rounded-full animate-spin" />
                        </div>
                      ) : (
                        <>
                          {/* 審批通過 / 重新啟用 */}
                          {record.status !== 'approved' && (
                            <button
                              onClick={() => handleUpdateStatus(record.id, 'approved')}
                              className="flex-1 py-2 rounded-xl text-xs font-bold bg-green-600 hover:bg-green-500 text-white transition-all shadow-md active:scale-95 flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <span>✅</span> <span>核准公開</span>
                            </button>
                          )}

                          {/* 審核拒絕 / 封存 */}
                          {record.status !== 'rejected' && (
                            <button
                              onClick={() => handleUpdateStatus(record.id, 'rejected')}
                              className="flex-1 py-2 rounded-xl text-xs font-bold bg-red-950/40 hover:bg-red-900/60 border border-red-500/20 text-red-300 transition-all active:scale-95 flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <span>❌</span> <span>拒絕公開</span>
                            </button>
                          )}

                          {/* 設為待審查 (用於退回已決策項目) */}
                          {record.status !== 'pending' && record.status && (
                            <button
                              onClick={() => handleUpdateStatus(record.id, 'pending')}
                              className="py-2 px-3 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-400 transition-all active:scale-95 flex items-center justify-center gap-1 cursor-pointer"
                              title="退回待審查狀態"
                            >
                              <span>⏳</span> <span>退回</span>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* AI 通報彙整摘要 Modal */}
      {summaryResult && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-violet-500 via-blue-400 to-cyan-500" />

            <div className="p-6 md:p-8">
              <h2 className="text-lg font-black bg-gradient-to-r from-violet-400 to-blue-300 bg-clip-text text-transparent tracking-wider mb-4 flex items-center gap-2">
                <span>📋</span>
                <span>環境通報彙整摘要</span>
              </h2>

              <div className="bg-white/5 border border-white/5 rounded-xl p-4 max-h-[50vh] overflow-y-auto mb-6">
                <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
                  {summaryResult.text}
                </p>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={handleCopySummary}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-500 text-white transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  {summaryCopied ? '已複製 ✓' : '📋 複製全文'}
                </button>
                <button
                  onClick={() => { setSummaryResult(null); setSummaryCopied(false); }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all active:scale-95 cursor-pointer"
                >
                  關閉
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
