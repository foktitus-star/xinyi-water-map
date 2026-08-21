// 熱舒適問卷代交 API：伺服器端向 Google Form 提交並讀取真實結果。
// 瀏覽器直接 POST formResponse 只能用 no-cors（opaque 回應），失敗時前端無從得知；
// 由伺服器代交可解析回應 HTML，見到「已記錄回覆」確認頁才回報成功。
const FORM_BASE =
  'https://docs.google.com/forms/d/e/1FAIpQLSe8LxV5dtR5ZwsOOAY9dZfOFE_6E6tbKL_iAjAbO7I4BFcBDw';

// 僅接受本表單已知的 entry 欄位，避免此 API 被當作開放代理
const ALLOWED_KEYS = new Set([
  'entry.132730628',
  'entry.132730628.other_option_response',
  'entry.1113127977',
  'entry.1026299941',
  'entry.2006157600',
  'entry.1501603056',
  'entry.1815209056',
  'entry.606398302',
]);

export async function POST(request) {
  let answers;
  try {
    answers = await request.json();
  } catch {
    return Response.json({ ok: false, error: 'bad json' }, { status: 400 });
  }

  const body = new URLSearchParams();
  let entryCount = 0;
  for (const [k, v] of Object.entries(answers || {})) {
    if (ALLOWED_KEYS.has(k) && typeof v === 'string' && v.length <= 2000) {
      body.set(k, v);
      entryCount++;
    }
  }
  if (entryCount === 0) {
    return Response.json({ ok: false, error: 'no valid entries' }, { status: 400 });
  }

  try {
    // 模擬一般瀏覽器請求：datacenter IP 配上非瀏覽器 UA 時，Google 可能回傳不含 token 的變體頁
    const browserHeaders = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      'Accept-Language': 'zh-TW,zh;q=0.9',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    };
    // 先取 viewform 拿 fbzx 與 tag（新版表單的防濫用 token，缺少會被拒收）
    const viewRes = await fetch(`${FORM_BASE}/viewform`, {
      cache: 'no-store',
      headers: browserHeaders,
    });
    const viewHtml = await viewRes.text();
    const fbzx =
      (viewHtml.match(/name="fbzx"\s+value="([^"]+)"/) || [])[1] ||
      (viewHtml.match(/"fbzx"\s*,\s*"([^"]+)"/) || [])[1];
    const tag = (viewHtml.match(/name="tag"\s+value="([^"]+)"/) || [])[1];
    const cookie = viewRes.headers.get('set-cookie');
    // 供除錯回報（不含任何個資）
    const diag = {
      viewStatus: viewRes.status,
      viewUrl: viewRes.url,
      fbzxFound: !!fbzx,
      tagFound: !!tag,
      htmlLen: viewHtml.length,
    };

    body.set('fvv', '1');
    body.set('pageHistory', '0');
    body.set('submissionTimestamp', String(Date.now()));
    if (fbzx) {
      body.set('fbzx', fbzx);
      body.set('partialResponse', JSON.stringify([null, null, fbzx]));
    }
    if (tag) body.set('tag', tag);

    const postRes = await fetch(`${FORM_BASE}/formResponse`, {
      method: 'POST',
      headers: {
        ...browserHeaders,
        'Content-Type': 'application/x-www-form-urlencoded',
        Referer: `${FORM_BASE}/viewform`,
        Origin: 'https://docs.google.com',
        ...(cookie ? { cookie } : {}),
      },
      body: body.toString(),
      redirect: 'follow',
      cache: 'no-store',
    });
    const resHtml = await postRes.text();
    // 確認頁標記：本表單實測回傳「我們已經收到你回覆的表單」＋「提交其他回應」連結（2026-08-22）
    const recorded =
      postRes.ok &&
      /已經收到|已收到|已記錄|提交其他回應|另提交|has been recorded|Submit another response|ViewResponseConfirmation/.test(
        resHtml
      );

    if (recorded) return Response.json({ ok: true });

    // 401 幾乎必定是表單開了「收集電子郵件（已驗證）」→ 強制登入 Google
    const hint =
      postRes.status === 401
        ? 'form requires Google sign-in (email collection is on)'
        : `google returned ${postRes.status}`;
    console.error('survey-submit failed:', hint, diag);
    return Response.json({ ok: false, error: hint, diag }, { status: 502 });
  } catch (err) {
    console.error('survey-submit error:', err);
    return Response.json({ ok: false, error: 'network error' }, { status: 502 });
  }
}
