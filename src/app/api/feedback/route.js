import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const data = await request.json();
    
    // 優先讀取私有環境變數，若無則讀取公開環境變數，最後使用 fallback
    const targetUrl = process.env.SHEETS_API_URL 
      || process.env.NEXT_PUBLIC_SHEETS_API_URL
      || 'https://script.google.com/macros/s/AKfycbyWHtEu9A4hFKHVhfxrmifkNdRdG6NzHOkRhKqSG2QfMxpNVCCzqrlFownXotIfNgpZlg/exec';

    if (!targetUrl) {
      return NextResponse.json({ error: 'API URL not configured' }, { status: 500 });
    }

    // 在伺服器端發送請求給 Google Apps Script
    // 伺服器端不受 CORS 限制，可以直接使用 JSON
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      redirect: 'follow', // 重要：處理 GAS 的重新導向
    });

    // 雖然 GAS 成功通常會回傳 200，但我們還是檢查一下
    if (response.ok) {
      return NextResponse.json({ success: true });
    } else {
      const errorText = await response.text();
      console.error('GAS Error:', errorText);
      return NextResponse.json({ error: 'Failed to write to Google Sheets' }, { status: response.status });
    }
  } catch (error) {
    console.error('API Route Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
