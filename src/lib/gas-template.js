/**
 * 信水義河互動地圖 — Google Apps Script (GAS) 核心後台腳本
 *
 * 說明：
 * 請將此腳本完整複製，並貼入您 Google 試算表中的「擴充功能 > Apps Script」中。
 * 部署方式：
 * 1. 點擊右上角「網頁應用程式 (Web App) > 新增部署」。
 * 2. 部署類型選擇「網網應用程式」。
 * 3. 專案說明填入：v1.6.0-community-flow。
 * 4. 誰可以存取：設定為「任何人 (Anyone)」。
 * 5. 點擊部署，並授權雲端硬碟與試算表讀寫權限。
 * 6. 複製產生的 Web App URL，填入 Next.js 專案的 .env.local 中的 NODE_SHEETS_API_URL。
 */

// 定義主要試算表工作表名稱
var SHEET_NAME = "地景標記回饋";
var DRIVE_FOLDER_NAME = "信水義河地景相片";

/**
 * 處理 GET 請求 — 返回所有資料為 JSON 格式
 */
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME);
    
    // 如果工作表不存在，建立並初始化首列標題
    if (!sheet) {
      sheet = initSheet(ss);
    }
    
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return jsonResponse([]);
    }
    
    var headers = data[0];
    var jsonArray = [];
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var obj = {};
      for (var j = 0; j < headers.length; j++) {
        var headerName = headers[j];
        var val = row[j];
        
        // 格式化日期與特殊型態
        if (val instanceof Date) {
          val = val.toISOString();
        }
        obj[headerName] = val;
      }
      jsonArray.push(obj);
    }
    
    return jsonResponse(jsonArray);
  } catch (error) {
    return jsonResponse({ error: error.toString() }, 500);
  }
}

/**
 * 處理 POST 請求 — 建立新紀錄、上傳相片或變更審核狀態
 */
function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = initSheet(ss);
    }
    
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action || "create"; // create, update_status
    
    if (action === "update_status") {
      return handleUpdateStatus(sheet, payload);
    } else {
      return handleCreateRecord(sheet, payload);
    }
  } catch (error) {
    return jsonResponse({ success: false, error: error.toString() }, 500);
  }
}

/**
 * 處理狀態審批修改（審核通過/拒絕）
 */
function handleUpdateStatus(sheet, payload) {
  var rowId = payload.id;
  var newStatus = payload.status; // approved, rejected, pending
  
  if (!rowId || !newStatus) {
    return jsonResponse({ success: false, error: "Missing id or status parameters" }, 400);
  }
  
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idColIdx = headers.indexOf("id");
  var statusColIdx = headers.indexOf("status");
  
  if (idColIdx === -1 || statusColIdx === -1) {
    return jsonResponse({ success: false, error: "Spreadsheet schema mismatch (missing id or status column)" }, 500);
  }
  
  var foundRowIdx = -1;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idColIdx]).trim() === String(rowId).trim()) {
      foundRowIdx = i + 1; // 轉為試算表以 1 開始的列號
      break;
    }
  }
  
  if (foundRowIdx === -1) {
    return jsonResponse({ success: false, error: "Record not found with ID: " + rowId }, 404);
  }
  
  // 更新狀態單格
  sheet.getRange(foundRowIdx, statusColIdx + 1).setValue(newStatus);
  
  return jsonResponse({ success: true, id: rowId, status: newStatus });
}

/**
 * 處理新增回饋地景紀錄
 */
function handleCreateRecord(sheet, payload) {
  var headers = sheet.getDataRange().getValues()[0];
  
  // 1. 生成唯一 ID
  var uniqueId = payload.id || "node_" + new Date().getTime() + "_" + Math.random().toString(36).substr(2, 5);
  
  // 2. 處理 Base64 照片並上傳至 Google Drive
  var photoUrl = "";
  if (payload.photo_base64 && payload.photo_filename) {
    photoUrl = uploadPhotoToDrive(payload.photo_base64, payload.photo_filename);
  }
  
  // 3. 解析標籤陣列為字串
  var tagsString = "";
  if (Array.isArray(payload.tags)) {
    tagsString = payload.tags.join(", ");
  } else if (payload.tags) {
    tagsString = String(payload.tags);
  }
  
  // 4. 解析巢狀 EXIF 資料
  var exifLat = "";
  var exifLng = "";
  var exifTime = "";
  var exifDevice = "";
  
  if (payload.photo_exif) {
    var exif = payload.photo_exif;
    if (exif.latitude !== undefined && exif.latitude !== null) exifLat = exif.latitude;
    if (exif.longitude !== undefined && exif.longitude !== null) exifLng = exif.longitude;
    if (exif.dateTime) exifTime = exif.dateTime;
    if (exif.device) exifDevice = exif.device;
  }
  
  // 5. 根據試算表標頭結構動態生成寫入值
  var rowValues = [];
  for (var i = 0; i < headers.length; i++) {
    var h = headers[i];
    switch (h) {
      case "id":
        rowValues.push(uniqueId);
        break;
      case "timestamp":
        rowValues.push(payload.timestamp || new Date().toISOString());
        break;
      case "lat":
        rowValues.push(payload.lat);
        break;
      case "lng":
        rowValues.push(payload.lng);
        break;
      case "station_id":
        rowValues.push(payload.station_id || "");
        break;
      case "description":
        rowValues.push(payload.description || "");
        break;
      case "tags":
        rowValues.push(tagsString);
        break;
      case "photo_url":
        rowValues.push(photoUrl);
        break;
      case "ai_summary":
        rowValues.push(payload.ai_summary || "");
        break;
      case "is_voice":
        rowValues.push(payload.is_voice ? "TRUE" : "FALSE");
        break;
      case "photo_exif_latitude":
        rowValues.push(exifLat);
        break;
      case "photo_exif_longitude":
        rowValues.push(exifLng);
        break;
      case "photo_exif_dateTime":
        rowValues.push(exifTime);
        break;
      case "photo_exif_device":
        rowValues.push(exifDevice);
        break;
      case "status":
        rowValues.push("pending"); // 所有新回饋預設為待審批
        break;
      default:
        rowValues.push("");
    }
  }
  
  sheet.appendRow(rowValues);
  
  return jsonResponse({ success: true, id: uniqueId, status: "pending", photo_url: photoUrl });
}

/**
 * 將 Base64 檔案上傳至雲端硬碟，並設為共用
 */
function uploadPhotoToDrive(base64Data, filename) {
  try {
    // 尋找或建立專屬相簿資料夾
    var folders = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
    var folder;
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(DRIVE_FOLDER_NAME);
    }
    
    // 清除 Base64 前綴，例如 data:image/jpeg;base64,
    var base64Part = base64Data.split(",")[1] || base64Data;
    var decoded = Utilities.base64Decode(base64Part);
    
    // 預設設為 jpeg
    var contentType = "image/jpeg";
    if (filename.toLowerCase().endsWith(".png")) contentType = "image/png";
    if (filename.toLowerCase().endsWith(".heic")) contentType = "image/heic";
    
    var blob = Utilities.newBlob(decoded, contentType, filename);
    var file = folder.createFile(blob);
    
    // 將檔案設定為「網路上知道連結的任何人皆可檢視」，以供前台展示圖片
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    // 生成直接下載或檢視的網址
    return "https://lh3.googleusercontent.com/d/" + file.getId();
  } catch (e) {
    Logger.log("Drive upload failed: " + e.toString());
    return "";
  }
}

/**
 * 試算表初始化 — 建立必要的欄位標頭
 */
function initSheet(ss) {
  var sheet = ss.insertSheet(SHEET_NAME);
  var columns = [
    "id", 
    "timestamp", 
    "lat", 
    "lng", 
    "station_id", 
    "description", 
    "tags", 
    "photo_url", 
    "ai_summary", 
    "is_voice", 
    "photo_exif_latitude", 
    "photo_exif_longitude", 
    "photo_exif_dateTime", 
    "photo_exif_device", 
    "status"
  ];
  
  // 寫入首列標頭並美化
  var range = sheet.getRange(1, 1, 1, columns.length);
  range.setValues([columns]);
  range.setFontWeight("bold");
  range.setBackground("#f1f5f9");
  sheet.setFrozenRows(1);
  
  return sheet;
}

/**
 * 生成 JSON 輸出回應協助函式
 */
function jsonResponse(data, statusCode) {
  var code = statusCode || 200;
  var output = ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}
