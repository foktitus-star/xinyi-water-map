import './globals.css';

export const metadata = {
  title: '信水義河 — 信義社大水文導覽互動地圖',
  description:
    '四條路線、57個站點，帶你走讀台北信義區的水文故事。瑠公圳、永春陂、五分埔支線、三張犁排水系——兩百年的水路記憶，就藏在你每天走過的街道裡。',
  keywords: '信義社大,水文導覽,瑠公圳,永春陂,五分埔,三張犁,信義區,台北,互動地圖',
  openGraph: {
    title: '信水義河 — 信義社大水文導覽互動地圖',
    description: '四條路線、57個站點，走讀台北信義區的水文故事',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;700&family=Noto+Serif+TC:wght@400;700&display=swap"
          rel="stylesheet"
        />
        {/* Viewer.js for image lightbox */}
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/viewerjs/1.11.6/viewer.min.css" />
        <script src="https://cdnjs.cloudflare.com/ajax/libs/viewerjs/1.11.6/viewer.min.js" async></script>
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
