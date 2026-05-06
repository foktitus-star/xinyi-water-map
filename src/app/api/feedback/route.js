import { NextResponse } from 'next/server';

const SHEETS_URL =
  process.env.NEXT_PUBLIC_SHEETS_API_URL ||
  'https://script.google.com/macros/s/AKfycbyWHtEu9A4hFKHVhfxrmifkNdRdG6NzHOkRhKqSG2QfMxpNVCCzqrlFownXotIfNgpZlg/exec';

// GET: 用來確認 API route 有正確部署
export async function GET() {
  return NextResponse.json({ status: 'ok', message: 'feedback API is running' });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const bodyStr = JSON.stringify(body);

    // Google Apps Script exec URL 會回傳 302 redirect
    // redirect: 'follow' 時 Node fetch 會把 POST 改成 GET，doPost 不會被呼叫
    // 解法：redirect: 'manual' 取得 Location，再手動 POST 到目標 URL
    const firstRes = await fetch(SHEETS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: bodyStr,
      redirect: 'manual',
    });

    let finalRes;

    if (
      (firstRes.status === 301 || firstRes.status === 302) &&
      firstRes.headers.get('location')
    ) {
      const redirectUrl = firstRes.headers.get('location');
      finalRes = await fetch(redirectUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: bodyStr,
      });
    } else {
      finalRes = firstRes;
    }

    const text = await finalRes.text().catch(() => '');
    return NextResponse.json({ status: 'success', upstream: text });

  } catch (err) {
    console.error('[/api/feedback] error:', err);
    return NextResponse.json(
      { status: 'error', message: err.message },
      { status: 500 }
    );
  }
}

