const SHEETS_URL =
  process.env.NEXT_PUBLIC_SHEETS_API_URL ||
  'https://script.google.com/macros/s/AKfycbyWHtEu9A4hFKHVhfxrmifkNdRdG6NzHOkRhKqSG2QfMxpNVCCzqrlFownXotIfNgpZlg/exec';

export async function POST(request) {
  try {
    const body = await request.json();

    // 伺服器端直接 POST 給 Apps Script，不受 CORS 限制
    const res = await fetch(SHEETS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      redirect: 'follow',
    });

    const text = await res.text();

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
