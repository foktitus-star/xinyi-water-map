import { NextResponse } from 'next/server';
import ee from '@google/earthengine';

const PRIVATE_KEY = process.env.GEE_PRIVATE_KEY ? process.env.GEE_PRIVATE_KEY.replace(/\\n/g, '\n') : '';
const CLIENT_EMAIL = process.env.GEE_CLIENT_EMAIL || '';

export async function GET() {
  if (!PRIVATE_KEY || !CLIENT_EMAIL) {
    return NextResponse.json({ error: 'GEE credentials not configured' }, { status: 500 });
  }

  try {
    // Authenticate and Initialize
    await new Promise((resolve, reject) => {
      ee.data.authenticateViaPrivateKey(
        {
          client_email: CLIENT_EMAIL,
          private_key: PRIVATE_KEY,
        },
        () => {
          ee.initialize(null, null, resolve, reject);
        },
        reject
      );
    });

    // Define ROI (Taipei Region approximately)
    const roi = ee.Geometry.Rectangle([121.4, 24.9, 121.7, 25.2]);

    // Dynamically calculate dates (from today going back 1.5 years to ensure coverage)
    const today = new Date();
    const endDateStr = today.toISOString().split('T')[0];
    const startDate = new Date();
    startDate.setMonth(today.getMonth() - 18); // 1.5 years ago
    const startDateStr = startDate.toISOString().split('T')[0];

    // Get Landsat 8 Collection 2 Tier 1 Level 2
    // Filter by Taipei ROI and date, then select images with cloud cover < 15%
    // Sort descending by time to grab the absolute newest image matching criteria
    const dataset = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
      .filterBounds(roi)
      .filterDate(startDateStr, endDateStr)
      .filter(ee.Filter.lt('CLOUD_COVER', 15)) // Cloud cover less than 15%
      .sort('system:time_start', false);      // Newest first

    // Select the absolute newest image available
    const image = dataset.first();

    // Log the actual date of this dynamically fetched image in the background
    image.get('system:time_start').evaluate((time: any, err: any) => {
      if (err) {
        console.error('Error fetching image date:', err);
      } else {
        const imgDate = new Date(time).toLocaleDateString();
        console.log(`📡 Dynamically fetched Landsat 8 image date: ${imgDate}`);
      }
    });

    // The ST_B10 band is the surface temperature in Kelvin (scaled)
    const stBand = image.select('ST_B10');
    
    // Apply scale factor and convert to Celsius:
    // LST = (ST_B10 * 0.00341802 + 149.0) - 273.15
    const lstCelsius = stBand
      .multiply(0.00341802)
      .add(149.0)
      .subtract(273.15)
      .clip(roi); // Clip specifically to Taipei ROI to focus and optimize

    // Get Map ID with a color palette optimized for summer micro-climate temperature range (27C - 50C)
    // Based on calculated actual percentiles in Taipei: 5% is ~27.4C, 95% is ~50.4C
    const mapParams = {
      min: 27,
      max: 50,
      palette: [
        '0502a3', '0502ce', '0602ff', '307ef3', '32d3ef', // Deep blue, blue, cyan (27C - 31C: water, mountains, large parks like Da'an)
        '3be285', '3ae237', 'b5e22e',                     // Green, light green (31C - 35C: urban street shade, green corridors, small parks)
        'fff705', 'ffd611', 'ff8b13',                     // Yellow, amber, orange (35C - 40C: residential areas, asphalt with partial shade)
        'ff500d', 'ff0000', 'c21301', '911003'            // Red-orange, red, deep red (40C - 50C: commercial concrete roof hot spots, main asphalt corridors)
      ]
    };

    // Calculate and log temperature distribution in background for scientific tuning
    lstCelsius.reduceRegion({
      reducer: ee.Reducer.percentile([5, 95]),
      geometry: roi,
      scale: 100, // larger scale for rapid background calculation
      maxPixels: 1e7
    }).evaluate((result: any, err: any) => {
      if (err) {
        console.error('Percentiles calculation error:', err);
      } else {
        console.log('📊 Real LST Percentiles in Taipei (5% and 95%):', result);
      }
    });

    const mapId: any = await new Promise((resolve, reject) => {
      lstCelsius.getMap(mapParams, (result: any, err: any) => {
        if (err) reject(err);
        else resolve(result);
      });
    });

    // 回傳 Tile URL 模板給前端 Leaflet 使用 (mapId.urlFormat 相當於獲取 Tile URL)
    return NextResponse.json({
      urlFormat: mapId.urlFormat
    });

  } catch (error: any) {
    console.error('GEE API Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to process Earth Engine request' }, { status: 500 });
  }
}
