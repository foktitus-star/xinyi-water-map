import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const targetUrl = process.env.NODE_SHEETS_API_URL 
      || process.env.NEXT_PUBLIC_NODE_SHEETS_API_URL
      || 'https://script.google.com/macros/s/AKfycbzUFuzNI-RWK8qqOy7GsgVPJwVkAWSAXiZ4dxx4_tnWpUAoVeL78_tSE9qevIlQoiSe/exec'; // Fallback

    if (!targetUrl) {
      return NextResponse.json({ error: 'Database URL not configured' }, { status: 500 });
    }

    // 發送 GET 請求取得所有試算表列資料
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      // 確保不被快取影響，利於審批後即時呈現
      next: { revalidate: 0 }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GAS Fetch Error:', errorText);
      return NextResponse.json({ error: 'Failed to fetch from Google Sheets', details: errorText }, { status: response.status });
    }

    const allRecords = await response.json();
    
    // 伺服器端過濾：僅公開返回已審查通過 (status === 'approved') 的標記
    const approvedMarkers = Array.isArray(allRecords) 
      ? allRecords.filter(record => record.status === 'approved')
      : [];

    return NextResponse.json(approvedMarkers);
  } catch (error) {
    console.error('API feedback-list GET Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
