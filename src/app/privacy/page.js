'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

// ── Section data ──────────────────────────────────────────────
const sections = [
  { id: 'intro', icon: '💧', label: '專案簡介' },
  { id: 'collected', icon: '📋', label: '收集範圍' },
  { id: 'not-collected', icon: '🚫', label: '不收集項目' },
  { id: 'ai', icon: '🤖', label: 'AI 使用說明' },
  { id: 'third-party', icon: '🔗', label: '第三方傳輸' },
  { id: 'retention', icon: '🗄️', label: '資料保留' },
  { id: 'moderation', icon: '👁️', label: '內容審核' },
  { id: 'rights', icon: '✊', label: '使用者權利' },
  { id: 'contact', icon: '📬', label: '聯絡方式' },
];

// ── Sensitivity badge component ──────────────────────────────
function Badge({ level }) {
  const config = {
    low: { emoji: '🟢', text: '低', bg: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    mid: { emoji: '🟡', text: '中', bg: 'bg-amber-100 text-amber-700 border-amber-200' },
    high: { emoji: '🔴', text: '高', bg: 'bg-red-100 text-red-700 border-red-200' },
  };
  const c = config[level];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${c.bg}`}>
      {c.emoji} {c.text}
    </span>
  );
}

// ── Fade-in wrapper ──────────────────────────────────────────
function FadeIn({ children, delay = 0 }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.15 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="transition-all duration-700 ease-out"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ── Main privacy page component ──────────────────────────────
export default function PrivacyPage() {
  const [activeSection, setActiveSection] = useState('intro');

  // Set document title for SEO (since 'use client' cannot export metadata)
  useEffect(() => {
    document.title = '隱私權聲明 — 信水義河 · 信義社大水文導覽互動地圖';
  }, []);

  // Override the global overflow:hidden on html/body so this page can scroll
  useEffect(() => {
    document.documentElement.style.overflow = 'auto';
    document.body.style.overflow = 'auto';
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, []);

  // Track active section on scroll via IntersectionObserver
  useEffect(() => {
    const observerOptions = { rootMargin: '-20% 0px -60% 0px', threshold: 0 };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    }, observerOptions);

    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  // Smooth-scroll helper
  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // ── Glass card wrapper ───────────────────────────────────
  const Card = ({ children, className = '' }) => (
    <div className={`relative bg-white/70 backdrop-blur-md border border-white/60 shadow-lg shadow-slate-200/40 rounded-3xl p-6 md:p-8 ${className}`}>
      {children}
    </div>
  );

  return (
    <div
      className="min-h-screen font-sans text-slate-800"
      style={{ background: 'linear-gradient(160deg, #EEF5FA 0%, #FAF8F4 40%, #F5EFE6 100%)' }}
    >
      {/* ── Ambient background decorations ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[5%] left-[15%] w-[35vw] h-[35vw] rounded-full opacity-25 blur-[100px]" style={{ background: 'radial-gradient(circle, #C8E4F8 0%, transparent 70%)' }} />
        <div className="absolute bottom-[10%] right-[10%] w-[40vw] h-[40vw] rounded-full opacity-20 blur-[120px]" style={{ background: 'radial-gradient(circle, #F0DFC4 0%, transparent 70%)' }} />
        <div className="absolute top-[50%] left-[60%] w-[25vw] h-[25vw] rounded-full opacity-15 blur-[80px]" style={{ background: 'radial-gradient(circle, #D6EAF8 0%, transparent 70%)' }} />
      </div>

      {/* ── Sticky top bar ── */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/60 border-b border-slate-200/60 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-bold text-sky-700 hover:text-sky-500 transition-colors"
          >
            <span>←</span>
            <span>返回地圖</span>
          </Link>
          <span className="text-xs text-slate-400 font-medium tracking-wider hidden sm:block">
            信水義河 · 隱私權聲明
          </span>
        </div>
      </header>

      {/* ── Layout: sidebar + content ── */}
      <div className="relative z-10 max-w-6xl mx-auto flex gap-0 md:gap-10 px-4 md:px-8 py-8 md:py-14">

        {/* ── Sidebar nav (desktop only) ── */}
        <aside className="hidden lg:block w-56 flex-shrink-0">
          <nav className="sticky top-24 space-y-1">
            <p className="text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase mb-3 pl-3">
              章節目錄
            </p>
            {sections.map(({ id, icon, label }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2.5 cursor-pointer ${
                  activeSection === id
                    ? 'bg-sky-100/80 text-sky-800 shadow-sm border border-sky-200/50 font-bold'
                    : 'text-slate-500 hover:bg-white/60 hover:text-slate-700'
                }`}
              >
                <span className="text-base">{icon}</span>
                <span>{label}</span>
              </button>
            ))}
            <div className="mt-6 pt-4 border-t border-slate-200/60">
              <p className="text-[10px] text-slate-400 pl-3">最後更新</p>
              <p className="text-xs text-slate-500 font-semibold pl-3 mt-1">2026-06-03</p>
            </div>
          </nav>
        </aside>

        {/* ── Main content ── */}
        <main className="flex-1 min-w-0 space-y-8 md:space-y-10">

          {/* ── Page title ── */}
          <FadeIn>
            <div className="text-center md:text-left mb-2">
              <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-wide leading-snug">
                🛡️ 隱私權聲明與資料使用說明
              </h1>
              <p className="text-slate-500 text-sm md:text-base mt-3 leading-relaxed">
                本頁面說明「信水義河」如何處理您的資料，以及您享有的權利。
              </p>
              <div className="h-1 w-20 bg-gradient-to-r from-sky-400 to-amber-300 rounded-full mt-4 mx-auto md:mx-0" />
            </div>
          </FadeIn>

          {/* ── § 1 專案簡介 ── */}
          <FadeIn delay={50}>
            <Card>
              <section id="intro" className="scroll-mt-24">
                <h2 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-2 mb-4">
                  <span className="text-2xl">💧</span> 專案簡介
                </h2>
                <p className="text-slate-600 leading-relaxed text-sm md:text-base">
                  「<strong className="text-sky-700">信水義河</strong>」是一個由國立臺灣大學建築與城鄉研究所「<strong>智慧城市與數位民主</strong>」課程所開發的互動式水文導覽地圖專案，與<strong>信義社區大學</strong>合作推動。本專案旨在透過數位工具，讓市民能夠探索臺北市信義區的水文歷史與環境變遷，並透過回饋機制促進公眾參與。
                </p>
              </section>
            </Card>
          </FadeIn>

          {/* ── § 2 資料收集範圍 ── */}
          <FadeIn delay={100}>
            <Card>
              <section id="collected" className="scroll-mt-24">
                <h2 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-2 mb-4">
                  <span className="text-2xl">📋</span> 資料收集範圍
                </h2>
                <p className="text-slate-500 text-sm mb-5">
                  以下為本專案可能收集的使用者資料項目：
                </p>

                {/* Responsive table */}
                <div className="overflow-x-auto -mx-2">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-sky-50/80 text-left">
                        <th className="px-4 py-3 font-bold text-slate-700 rounded-tl-xl">資料類型</th>
                        <th className="px-4 py-3 font-bold text-slate-700">收集方式</th>
                        <th className="px-4 py-3 font-bold text-slate-700 rounded-tr-xl text-center">敏感度</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr className="hover:bg-sky-50/40 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-700">回饋文字</td>
                        <td className="px-4 py-3 text-slate-500">使用者主動輸入</td>
                        <td className="px-4 py-3 text-center"><Badge level="low" /></td>
                      </tr>
                      <tr className="hover:bg-sky-50/40 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-700">照片影像</td>
                        <td className="px-4 py-3 text-slate-500">使用者主動上傳（可能含人臉）</td>
                        <td className="px-4 py-3 text-center"><Badge level="high" /></td>
                      </tr>
                      <tr className="hover:bg-sky-50/40 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-700">GPS 座標</td>
                        <td className="px-4 py-3 text-slate-500">EXIF 自動擷取 ＋ 使用者地圖標記</td>
                        <td className="px-4 py-3 text-center"><Badge level="mid" /></td>
                      </tr>
                      <tr className="hover:bg-sky-50/40 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-700">拍攝裝置型號與日期時間</td>
                        <td className="px-4 py-3 text-slate-500">EXIF 自動擷取</td>
                        <td className="px-4 py-3 text-center"><Badge level="low" /></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            </Card>
          </FadeIn>

          {/* ── § 3 明確不收集的資料 ── */}
          <FadeIn delay={100}>
            <Card>
              <section id="not-collected" className="scroll-mt-24">
                <h2 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-2 mb-4">
                  <span className="text-2xl">🚫</span> 明確不收集的資料
                </h2>
                <p className="text-slate-500 text-sm mb-5">
                  為保障您的隱私，以下資料<strong className="text-slate-700">絕不</strong>被本專案收集或儲存：
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { icon: '👤', text: '使用者姓名、電子郵件、電話' },
                    { icon: '🍪', text: '瀏覽器 Cookie 或追蹤碼' },
                    { icon: '🌐', text: 'IP 位址' },
                    { icon: '🎙️', text: '語音錄音檔案' },
                    { icon: '📊', text: '瀏覽歷史或使用行為分析' },
                  ].map(({ icon, text }) => (
                    <div
                      key={text}
                      className="flex items-center gap-3 bg-red-50/60 border border-red-100/80 rounded-xl px-4 py-3"
                    >
                      <span className="text-lg flex-shrink-0">{icon}</span>
                      <span className="text-sm text-slate-700 font-medium">{text}</span>
                    </div>
                  ))}
                </div>
              </section>
            </Card>
          </FadeIn>

          {/* ── § 4 AI 系統使用說明 ── */}
          <FadeIn delay={100}>
            <Card>
              <section id="ai" className="scroll-mt-24">
                <h2 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-2 mb-4">
                  <span className="text-2xl">🤖</span> AI 系統使用說明
                </h2>

                <div className="mb-5 px-4 py-3 rounded-xl bg-amber-50/80 border border-amber-200/60 text-sm text-amber-800">
                  <strong>⚠️ 重要：</strong>所有 AI 功能皆為 <strong>opt-in（主動觸發）</strong>，非自動執行。使用者需手動啟動，且可隨時預覽、編輯或拒絕 AI 產出的結果。
                </div>

                <div className="space-y-4">
                  {[
                    {
                      title: 'Gemini 2.5 Flash — 文字潤飾',
                      desc: '使用者主動觸發後，AI 將協助潤飾回饋文字。使用者可預覽、編輯或拒絕 AI 修改的內容。',
                      tag: '文字處理',
                    },
                    {
                      title: 'Gemini 2.5 Flash — 影像描述',
                      desc: '使用者上傳照片後可主動觸發 AI 生成描述文字。生成結果可由使用者自行編輯。',
                      tag: '影像分析',
                    },
                    {
                      title: 'Web Speech API — 語音辨識',
                      desc: '語音辨識完全在瀏覽器端本地處理，不儲存任何錄音檔案。辨識結果即時顯示供使用者確認。',
                      tag: '語音轉文字',
                    },
                  ].map(({ title, desc, tag }) => (
                    <div key={title} className="bg-slate-50/80 border border-slate-200/60 rounded-2xl p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-700 border border-sky-200">
                          {tag}
                        </span>
                        <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
                      </div>
                      <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
                    </div>
                  ))}
                </div>
              </section>
            </Card>
          </FadeIn>

          {/* ── § 5 第三方資料傳輸 ── */}
          <FadeIn delay={100}>
            <Card>
              <section id="third-party" className="scroll-mt-24">
                <h2 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-2 mb-4">
                  <span className="text-2xl">🔗</span> 第三方資料傳輸
                </h2>
                <p className="text-slate-500 text-sm mb-5">
                  本專案使用以下第三方服務，傳輸的資料範圍與用途如下表所示：
                </p>

                <div className="overflow-x-auto -mx-2">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-indigo-50/80 text-left">
                        <th className="px-4 py-3 font-bold text-slate-700 rounded-tl-xl">第三方服務</th>
                        <th className="px-4 py-3 font-bold text-slate-700">傳送資料</th>
                        <th className="px-4 py-3 font-bold text-slate-700 rounded-tr-xl">用途</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[
                        { service: 'Google Gemini API', data: '文字 / 壓縮照片', purpose: 'AI 推論（文字潤飾、影像描述）' },
                        { service: 'Google Apps Script', data: '表單資料 / 照片', purpose: '資料儲存' },
                        { service: 'Google Drive', data: '壓縮照片', purpose: '檔案儲存' },
                        { service: 'Google Earth Engine', data: '無使用者資料', purpose: '衛星影像運算' },
                        { service: 'Web Speech API', data: '語音串流', purpose: '語音辨識（瀏覽器本地）' },
                      ].map(({ service, data, purpose }) => (
                        <tr key={service} className="hover:bg-indigo-50/40 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-700">{service}</td>
                          <td className="px-4 py-3 text-slate-500">{data}</td>
                          <td className="px-4 py-3 text-slate-500">{purpose}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </Card>
          </FadeIn>

          {/* ── § 6 資料保留與刪除 ── */}
          <FadeIn delay={100}>
            <Card>
              <section id="retention" className="scroll-mt-24">
                <h2 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-2 mb-4">
                  <span className="text-2xl">🗄️</span> 資料保留與刪除
                </h2>
                <div className="space-y-3">
                  {[
                    {
                      item: '回饋文字 / 照片 / EXIF 資訊',
                      policy: '永久保留，直至管理員手動刪除',
                      icon: '💾',
                    },
                    {
                      item: '語音錄音',
                      policy: '不儲存 — 語音辨識僅在瀏覽器本地處理',
                      icon: '🎙️',
                    },
                    {
                      item: 'AI 潤飾前原文',
                      policy: '不儲存 — 僅保留使用者確認後的最終版本',
                      icon: '📝',
                    },
                  ].map(({ item, policy, icon }) => (
                    <div key={item} className="flex items-start gap-3 bg-slate-50/80 border border-slate-200/60 rounded-xl px-4 py-3">
                      <span className="text-xl mt-0.5 flex-shrink-0">{icon}</span>
                      <div>
                        <p className="font-bold text-slate-700 text-sm">{item}</p>
                        <p className="text-slate-500 text-sm mt-0.5">{policy}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </Card>
          </FadeIn>

          {/* ── § 7 內容審核 ── */}
          <FadeIn delay={100}>
            <Card>
              <section id="moderation" className="scroll-mt-24">
                <h2 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-2 mb-4">
                  <span className="text-2xl">👁️</span> 內容審核
                </h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 bg-green-50/60 border border-green-200/60 rounded-xl px-4 py-4">
                    <span className="text-2xl flex-shrink-0">✅</span>
                    <div>
                      <p className="font-bold text-slate-700 text-sm mb-1">人工審核制度</p>
                      <p className="text-slate-600 text-sm leading-relaxed">
                        所有使用者提交的回饋預設為「<strong>待審核</strong>（pending）」狀態，需經管理員人工核准後方可公開顯示於地圖上。
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 bg-sky-50/60 border border-sky-200/60 rounded-xl px-4 py-4">
                    <span className="text-2xl flex-shrink-0">🤖</span>
                    <div>
                      <p className="font-bold text-slate-700 text-sm mb-1">無 AI 自動審核</p>
                      <p className="text-slate-600 text-sm leading-relaxed">
                        本專案<strong>不使用</strong>任何 AI 自動決定是否公開使用者提交的內容。所有公開決策均由人工執行。
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            </Card>
          </FadeIn>

          {/* ── § 8 使用者權利 ── */}
          <FadeIn delay={100}>
            <Card>
              <section id="rights" className="scroll-mt-24">
                <h2 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-2 mb-4">
                  <span className="text-2xl">✊</span> 使用者權利
                </h2>
                <p className="text-slate-500 text-sm mb-5">
                  您在使用本專案時享有以下權利：
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { icon: '🤖', text: '可自由選擇是否使用 AI 功能' },
                    { icon: '📷', text: '可自由選擇是否上傳照片' },
                    { icon: '📍', text: '可自由選擇是否分享 EXIF GPS 資料' },
                    { icon: '👀', text: '上傳前可預覽所有提交內容' },
                  ].map(({ icon, text }) => (
                    <div
                      key={text}
                      className="flex items-center gap-3 bg-emerald-50/60 border border-emerald-100/80 rounded-xl px-4 py-3"
                    >
                      <span className="text-lg flex-shrink-0">{icon}</span>
                      <span className="text-sm text-slate-700 font-medium">{text}</span>
                    </div>
                  ))}
                </div>
              </section>
            </Card>
          </FadeIn>

          {/* ── § 9 聯絡方式 ── */}
          <FadeIn delay={100}>
            <Card>
              <section id="contact" className="scroll-mt-24">
                <h2 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-2 mb-4">
                  <span className="text-2xl">📬</span> 聯絡方式
                </h2>
                <p className="text-slate-600 text-sm leading-relaxed">
                  如果您對本隱私權聲明有任何疑問，或需要行使上述使用者權利，歡迎聯繫：
                </p>
                <div className="mt-4 bg-sky-50/80 border border-sky-200/60 rounded-xl px-5 py-4">
                  <p className="text-sky-800 font-bold text-sm">
                    國立臺灣大學 建築與城鄉研究所
                  </p>
                  <p className="text-sky-700 text-sm mt-1">
                    「智慧城市與數位民主」課程團隊
                  </p>
                </div>
              </section>
            </Card>
          </FadeIn>

          {/* ── Footer ── */}
          <FadeIn delay={100}>
            <div className="text-center pt-6 pb-12 space-y-3">
              <div className="h-px w-24 bg-gradient-to-r from-transparent via-slate-300 to-transparent mx-auto" />
              <p className="text-xs text-slate-400">
                最後更新日期：<strong>2026-06-03</strong>
              </p>
              <p className="text-[11px] text-slate-300">
                © 信水義河 · 信義社區大學 × 臺大城鄉所
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 mt-4 px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-sky-600 hover:bg-sky-500 transition-all shadow-lg shadow-sky-200/50 hover:shadow-sky-300/60 active:scale-95"
              >
                ← 返回地圖
              </Link>
            </div>
          </FadeIn>

        </main>
      </div>
    </div>
  );
}
