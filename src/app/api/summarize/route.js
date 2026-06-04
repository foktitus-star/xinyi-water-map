import { NextResponse } from 'next/server';

export const preferredRegion = 'hnd1';

export async function POST(request) {
  try {
    const { text } = await request.json();

    if (!text || !text.trim()) {
      return NextResponse.json({ error: '請輸入需要整理的文字。' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not configured in environment variables.');
      return NextResponse.json({ 
        error: 'Gemini API 金鑰尚未設定。請在 .env.local 或 Vercel 設定 GEMINI_API_KEY，即可啟用 AI 智慧整理摘要功能！' 
      }, { status: 400 });
    }

    // 建立向 Gemini API 發送的 Prompt
    const systemPrompt = `你是一個台北信義區在地水文與地景導覽專家。
使用者在參與導覽時，使用語音輸入了一段關於特定地點的回憶、故事或觀察。
請幫忙將以下這段口語化、可能含有斷句或語音辨識錯誤的文字，整理成通順、流暢、精煉且保留所有核心細節的繁體中文地景故事摘要。

請遵循以下規則：
1. 請勿添加任何虛構的事實，只根據使用者提供的內容進行整理與潤飾。
2. 使用台灣繁體中文（例如「在地」、「透過」，避免使用簡體字或大陸用語）。
3. 語氣自然、溫暖、生動，符合文史走讀導覽的風格。
4. 整理後的結果字數請控制在 100-200 字以內，並以「單一完整段落」呈現，不要列點。

原始口語文字：
「${text.trim()}」`;

    // 呼叫 Gemini 2.5 Flash 產生內容
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: systemPrompt
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API Error Response:', errText);
      return NextResponse.json({ 
        error: 'AI 整理摘要服務暫時無法使用，請稍後再試。',
        details: errText 
      }, { status: response.status });
    }

    const result = await response.json();
    const polishedText = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!polishedText) {
      console.error('Gemini API response format invalid:', result);
      return NextResponse.json({ error: '無法解析 AI 產生的摘要結果。' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      summary: polishedText.trim() 
    });

  } catch (error) {
    console.error('API /api/summarize Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
