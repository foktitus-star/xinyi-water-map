import { NextResponse } from 'next/server';

const getPasscode = () => process.env.ADMIN_PASSCODE || 'xinyi123';

/**
 * GET - 取得所有回饋地標清單（包含 pending, approved, rejected），供後台審查使用
 */
export async function GET(request) {
  try {
    const passcodeHeader = request.headers.get('x-admin-passcode');
    if (passcodeHeader !== getPasscode()) {
      return NextResponse.json({ error: 'Unauthorized: Invalid passcode' }, { status: 401 });
    }

    const targetUrl = process.env.NODE_SHEETS_API_URL 
      || process.env.NEXT_PUBLIC_NODE_SHEETS_API_URL
      || 'https://script.google.com/macros/s/AKfycbzUFuzNI-RWK8qqOy7GsgVPJwVkAWSAXiZ4dxx4_tnWpUAoVeL78_tSE9qevIlQoiSe/exec';

    if (!targetUrl) {
      return NextResponse.json({ error: 'Database URL not configured' }, { status: 500 });
    }

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 0 } // 不快取，隨時取得最新審核清單
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: 'Failed to fetch from Google Sheets', details: errorText }, { status: response.status });
    }

    const records = await response.json();
    return NextResponse.json(records);
  } catch (error) {
    console.error('Admin API GET Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST - 修改回饋項目的審核狀態（傳送至 GAS 進行 Cell 值寫入）
 */
export async function POST(request) {
  try {
    const payload = await request.json();
    const { id, status, passcode } = payload;

    if (passcode !== getPasscode()) {
      return NextResponse.json({ error: 'Unauthorized: Invalid passcode' }, { status: 401 });
    }

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing required parameters: id, status' }, { status: 400 });
    }

    const targetUrl = process.env.NODE_SHEETS_API_URL 
      || process.env.NEXT_PUBLIC_NODE_SHEETS_API_URL
      || 'https://script.google.com/macros/s/AKfycbzUFuzNI-RWK8qqOy7GsgVPJwVkAWSAXiZ4dxx4_tnWpUAoVeL78_tSE9qevIlQoiSe/exec';

    if (!targetUrl) {
      return NextResponse.json({ error: 'Database URL not configured' }, { status: 500 });
    }

    // 發送 POST 至 Google Apps Script，帶有 update_status 指令與 ID
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'update_status',
        id: id,
        status: status
      }),
      redirect: 'follow',
    });

    if (response.ok) {
      const result = await response.json();
      return NextResponse.json(result);
    } else {
      const errorText = await response.text();
      return NextResponse.json({ error: 'Failed to update Google Sheets', details: errorText }, { status: response.status });
    }
  } catch (error) {
    console.error('Admin API POST Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
