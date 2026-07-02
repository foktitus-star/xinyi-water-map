import { NextResponse } from 'next/server';

export const preferredRegion = 'hnd1';

const MAX_RECORDS = 100;

/**
 * POST - 產生環境通報彙整摘要（供送交環保局/水利處等機關參考）
 * 受管理員 passcode 保護。接收選定的通報紀錄，交由 Gemini 產生正式格式的彙整報告。
 *
 * Request body: { passcode: string, records: Array<record> }
 * Response: { success: true, summary: string } | { error: string }
 */
export async function POST(request) {
  try {
    const { passcode, records } = await request.json();

    const configuredPasscode = process.env.ADMIN_PASSCODE;
    if (!configuredPasscode) {
      return NextResponse.json({ error: 'Admin access not configured' }, { status: 503 });
    }
    if (passcode !== configuredPasscode) {
      return NextResponse.json({ error: 'Unauthorized: Invalid passcode' }, { status: 401 });
    }

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: '沒有可彙整的通報紀錄。' }, { status: 400 });
    }
    if (records.length > MAX_RECORDS) {
      return NextResponse.json({ error: `一次最多彙整 ${MAX_RECORDS} 筆，請縮小範圍。` }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        error: 'Gemini API 金鑰尚未設定，無法產生 AI 彙整摘要。'
      }, { status: 400 });
    }

    // 伺服器端只擷取必要欄位，避免把照片 base64 等大型內容塞進 prompt
    const sanitized = records.map(r => ({
      時間: r.timestamp || '',
      緯度: r.lat ?? '',
      經度: r.lng ?? '',
      鄰近站點: r.station_id || '（自由標記）',
      類型標籤: r.tags || '',
      描述: (r.description || '').slice(0, 500),
      AI整理摘要: (r.ai_summary || '').slice(0, 300),
    }));

    const systemPrompt = `你是臺北市信義社區大學「信水義河」水文地圖計畫的行政協力人員。
社區大學透過互動地圖收集了民眾對信義區水文環境的觀察通報（如積水、異味、疑似污染排放、缺乏遮蔭、垃圾堆積等），
現在需要將這些通報彙整成一份可供送交臺北市政府環境保護局或水利處參考的正式摘要文件。

以下是民眾通報的原始資料（JSON 格式，共 ${sanitized.length} 筆）：

${JSON.stringify(sanitized, null, 2)}

請依照以下結構撰寫彙整報告，使用台灣繁體中文、客觀中性的行政文書語氣：

【民眾環境觀察通報彙整】

一、彙整概況
（說明通報筆數、涵蓋時間範圍）

二、通報類型統計
（按類型標籤分組統計筆數，由多至少排列）

三、重點通報摘述
（逐項或合併摘述具體通報內容：地點描述、觀察到的現象。地理位置請同時保留原始經緯度座標，格式如「25.0330, 121.5654」，方便機關人員定位。相近地點、相同類型的通報可合併敘述並註明筆數。）

四、建議關注事項
（根據通報內容，客觀歸納建議相關單位優先了解或處理的地點與現象，不要誇大、不要虛構資料中沒有的情節。）

規則：
1. 嚴格根據提供的資料撰寫，不得添加任何虛構的事實或推測性結論。
2. 使用台灣慣用語彙（例如「里」、「巷弄」、「在地」），避免簡體字或大陸用語。
3. 民眾描述若含口語或情緒性字眼，摘述時轉為中性客觀敘述。
4. 直接輸出報告內文，不要加開場白或結尾說明。`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API Error Response:', errText);
      return NextResponse.json({
        error: 'AI 彙整服務暫時無法使用，請稍後再試。'
      }, { status: response.status });
    }

    const result = await response.json();
    const summary = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!summary) {
      console.error('Gemini API response format invalid:', result);
      return NextResponse.json({ error: '無法解析 AI 產生的彙整結果。' }, { status: 500 });
    }

    return NextResponse.json({ success: true, summary: summary.trim() });
  } catch (error) {
    console.error('API /api/admin/report-summary Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
