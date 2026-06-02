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
        error: 'Gemini API 金鑰尚未設定。請在 .env.local 或 Vercel 設定 GEMINI_API_KEY，即可啟用敏感內容偵測功能！' 
      }, { status: 400 });
    }

    // 移除 data URL prefix (e.g. "data:image/jpeg;base64,")
    const base64Data = imageBase64.includes(',') 
      ? imageBase64.split(',')[1] 
      : imageBase64;

    const imageMimeType = mimeType || 'image/jpeg';

    const prompt = `你是一個敏感內容偵測系統。
請分析這張圖片，偵測圖片中是否有人臉（特別是清晰或可能被識別出身份的任何人臉，不論大小）。
你必須且只能以 JSON 格式回應，不能包含任何 markdown 的 \`\`\`json 語法標記。

回應的 JSON 結構必須精確符合以下格式：
{
  "hasFaces": true, 
  "faces": [
    {
      "box_2d": [ymin, xmin, ymax, xmax] 
    }
  ]
}

注意事項：
1. box_2d 中的座標 ymin, xmin, ymax, xmax 必須是 [0, 1000] 區間的整數。對應的坐標比例是 ymin, xmin, ymax, xmax（以圖片高度與寬度為基準）。
2. 若完全沒有偵測到人臉，請回傳：
{
  "hasFaces": false,
  "faces": []
}`;

    // 呼叫 Gemini 2.5 Flash 多模態 API，使用 JSON 輸出模式
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
        ],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini Face Detection API Error Response:', errText);
      return NextResponse.json({ 
        error: '敏感內容偵測服務暫時無法使用。',
        details: errText 
      }, { status: response.status });
    }

    const result = await response.json();
    const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      console.error('Gemini Face Detection API response format invalid:', result);
      return NextResponse.json({ error: '無法解析人臉偵測結果。' }, { status: 500 });
    }

    try {
      const parsedResult = JSON.parse(responseText.trim());
      return NextResponse.json({
        success: true,
        hasFaces: !!parsedResult.hasFaces,
        faces: parsedResult.faces || []
      });
    } catch (parseErr) {
      console.error('Failed to parse Gemini response text:', responseText, parseErr);
      return NextResponse.json({ 
        error: '解析偵測結果失敗。',
        rawText: responseText
      }, { status: 500 });
    }

  } catch (error) {
    console.error('API /api/detect-faces Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
