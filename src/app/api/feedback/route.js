const SHEETS_URL =
  process.env.NEXT_PUBLIC_SHEETS_API_URL ||
  'https://script.google.com/macros/s/AKfycbyWHtEu9A4hFKHVhfxrmifkNdRdG6NzHOkRhKqSG2QfMxpNVCCzqrlFownXotIfNgpZlg/exec';

export async function POST(request) {
  try {
    const body = await request.json();
    const bodyStr = JSON.stringify(body);

    // Google Apps Script exec URL 會回傳 302 redirect
    // 若直接 redirect: 'follow'，Node fetch 會把 POST 轉成 GET，doPost 就不會被呼叫
    // 解法：先用 redirect: 'manual' 取得 Location header，再手動 POST 到目標 URL

    const firstRes = await fetch(SHEETS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: bodyStr,
      redirect: 'manual',
    });

    let finalRes;

    if ((firstRes.status === 301 || firstRes.status === 302) && firstRes.headers.get('location')) {
      const redirectUrl = firstRes.headers.get('location');
      // 手動跟隨 redirect，維持 POST 方法與 body
      finalRes = await fetch(redirectUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: bodyStr,
      });
    } else {
      finalRes = firstRes;
    }

    const text = await finalRes.text().catch(() => '');

    return new Response(JSON.stringify({ status: 'success', upstream: text }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[/api/feedback] error:', err);
    return new Response(JSON.stringify({ status: 'error', message: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

