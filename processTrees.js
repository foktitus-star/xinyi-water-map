const fs = require('fs');
const path = require('path');
const proj4 = require('proj4');

proj4.defs(
  'EPSG:3826',
  '+proj=tmerc +lat_0=0 +lon_0=121 +k=0.9999 +x_0=250000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs'
);

// 一次性資料前處理腳本：把臺北市行道樹原始資料（TWD97/EPSG:3826）轉成 WGS84
// 並裁切到信義區範圍，輸出成地圖圖層讀的 public/TaipeiTree_filtered.json。
//
// 用法：node processTrees.js [輸入檔路徑]
//   未給參數時讀專案根目錄的 TaipeiTree.json。
//   原始資料來源：data.taipei 行道樹資料集
//   （亦可由 https://tppkl.blob.core.windows.net/blobfs/TaipeiTree.csv 轉成 JSON）
const inputFile = process.argv[2] || path.join(__dirname, 'TaipeiTree.json');
const outputFile = path.join(__dirname, 'public', 'TaipeiTree_filtered.json');

if (!fs.existsSync(inputFile)) {
  console.error(`找不到輸入檔：${inputFile}`);
  console.error('請下載行道樹原始資料後放到專案根目錄，或用 node processTrees.js <檔案路徑> 指定。');
  process.exit(1);
}

console.log('Reading input file...');
const rawData = fs.readFileSync(inputFile, 'utf-8');
const trees = JSON.parse(rawData);

const filteredTrees = [];

console.log(`Processing ${trees.length} trees...`);

for (const t of trees) {
  const x = parseFloat(t.TWD97X || t.X || t.TWD97_X || t.x);
  const y = parseFloat(t.TWD97Y || t.Y || t.TWD97_Y || t.y);

  if (!isNaN(x) && !isNaN(y)) {
    const [lng, lat] = proj4('EPSG:3826', 'EPSG:4326', [x, y]);
    if (lat >= 25.012777 && lat <= 25.051619 && lng >= 121.549092 && lng <= 121.592334) {
      // Create a clean version of the object with only necessary fields to save space
      filteredTrees.push({
        lat: Number(lat.toFixed(6)),
        lng: Number(lng.toFixed(6)),
        TreeID: t.TreeID,
        TreeType: t.TreeType,
        TreeHeight: t.TreeHeight,
        Diameter: t.Diameter
      });
    }
  }
}

console.log(`Filtered trees: ${filteredTrees.length}`);
fs.writeFileSync(outputFile, JSON.stringify(filteredTrees));
console.log('Saved to', outputFile);
