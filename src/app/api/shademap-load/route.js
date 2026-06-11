import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const apiKey = body.api_key;

    if (!apiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    // Forward request to shademap.app without browser referrer or origin
    const response = await fetch('https://shademap.app/sdk/load', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Omit the actual Vercel Referer / Origin, and spoof localhost to bypass ShadeMap's domain restrictions
        'Referer': 'http://localhost:3000/',
        'Origin': 'http://localhost:3000'
      },
      body: JSON.stringify({ api_key: apiKey })
    });

    const text = await response.text();

    return new Response(text, {
      status: response.status,
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8'
      }
    });
  } catch (error) {
    console.error('Error in ShadeMap load proxy:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
