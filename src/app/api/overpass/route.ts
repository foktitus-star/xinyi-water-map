import { NextResponse, NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();
    if (!query) {
      return NextResponse.json({ error: 'Missing query' }, { status: 400 });
    }

    // List of Overpass API mirrors
    const mirrors = [
      'https://overpass.nchc.org.tw/api/interpreter',
      'https://overpass-api.de/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter'
    ];

    let lastError: string = 'Unknown error';
    for (const url of mirrors) {
      try {
        console.log(`Trying Overpass mirror: ${url}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout per mirror

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'XinyiWaterMap/1.1 (https://xinyi-water-map.vercel.app; architecture/urban study)'
          },
          body: `data=${encodeURIComponent(query)}`,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          return NextResponse.json(data);
        } else {
          const text = await res.text();
          console.warn(`Mirror ${url} returned status ${res.status}: ${text}`);
          lastError = `Status ${res.status}`;
        }
      } catch (err: any) {
        console.error(`Failed to fetch from Overpass mirror ${url}:`, err);
        lastError = err.message || String(err);
      }
    }

    return NextResponse.json({ error: `All Overpass mirrors failed. Last error: ${lastError}` }, { status: 502 });
  } catch (error: any) {
    console.error('Error in Overpass proxy route:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
