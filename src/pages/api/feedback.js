const SHEETS_URL =
  process.env.NEXT_PUBLIC_SHEETS_API_URL ||
  'https://script.google.com/macros/s/AKfycbyWHtEu9A4hFKHVhfxrmifkNdRdG6NzHOkRhKqSG2QfMxpNVCCzqrlFownXotIfNgpZlg/exec';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({ status: 'ok', message: 'Pages API is running' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = req.body;
    const bodyStr = JSON.stringify(body);

    // Google Apps Script redirect handling
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
    return res.status(200).json({ status: 'success', upstream: text });

  } catch (err) {
    console.error('[/api/feedback] error:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
}
