import { NextResponse } from 'next/server';

export const preferredRegion = 'hnd1';

export async function POST(request) {
  try {
    const { imageBase64, mimeType } = await request.json();

    if (!imageBase64) {
      return NextResponse.json({ error: '請提供圖片資料。' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not configured in environment variables.');
      return NextResponse.json({ 
        error: 'Gemini API 金鑰尚未設定。請在 .env.local 或 Vercel 設定 GEMINI_API_KEY，即可啟用 AI 圖片轉譯功能！' 
      }, { status: 400 });
    }

    // 移除 data URL prefix (e.g. "data:image/jpeg;base64,")
    const base64Data = imageBase64.includes(',') 
      ? imageBase64.split(',')[1] 
      : imageBase64;

    const imageMimeType = mimeType || 'image/jpeg';

    // 建立向 Gemini API 發送的多模態 Prompt
    const prompt = `你是一個台北信義區在地水文與地景導覽專家。
使用者在參與水文走讀導覽時拍攝了這張照片。
請仔細觀察照片內容，完成以下任務：

1. 如果照片中有可辨識的文字（如碑文、告示牌、路牌、標誌），請優先逐字轉錄出來。
2. 描述照片中的環境與地景特徵（如水道、老樹、建築物、植被、街道景觀等）。
3. 如果能辨識出具體地點或歷史意義，請加以補充。

請遵循以下規則：
1. 使用台灣繁體中文。
2. 語氣自然、溫暖、生動，符合文史走讀導覽的風格。
3. 輸出請控制在 50-150 字以內，以「單一完整段落」呈現，不要列點。
4. 如果照片模糊或無法辨識，請誠實說明。`;

    // 呼叫 Gemini 2.5 Flash 多模態 API
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
                inlineData: {
                  mimeType: imageMimeType,
                  data: base64Data
                }
              },
              {
                text: prompt
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini Vision API Error Response:', errText);
      return NextResponse.json({ 
        error: 'AI 圖片轉譯服務暫時無法使用，請稍後再試。',
        details: errText 
      }, { status: response.status });
    }

    const result = await response.json();
    const descriptionText = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!descriptionText) {
      console.error('Gemini Vision API response format invalid:', result);
      return NextResponse.json({ error: '無法解析 AI 產生的圖片描述結果。' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      description: descriptionText.trim() 
    });

  } catch (error) {
    console.error('API /api/describe-image Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
