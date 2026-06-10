import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const data = await request.json();
    
    const targetUrl = process.env.NODE_SHEETS_API_URL;

    if (!targetUrl) {
      return NextResponse.json({ error: 'API URL not configured' }, { status: 503 });
    }

    // 伺服器端發送請求，無 CORS 限制
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // 若包含 Base64 照片，這個 JSON payload 可能會很大 (但 Next.js 預設限制約 4MB)
      body: JSON.stringify(data),
      redirect: 'follow',
    });

    if (response.ok) {
      return NextResponse.json({ success: true });
    } else {
      const errorText = await response.text();
      console.error('GAS Error:', errorText);
      return NextResponse.json({ error: 'Failed to write to Google Sheets', details: errorText }, { status: response.status });
    }
  } catch (error) {
    console.error('API Route Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
