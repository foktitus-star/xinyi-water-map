/**
 * 信水義河互動地圖 — Google Apps Script (GAS) 統一後台腳本
 *
 * 說明：
 * 此腳本同時處理兩種回饋來源，寫入同一份 Google 試算表的不同分頁（工作表）：
 *   1. 地景標記回饋（地方記憶 / 環境通報）— 分頁「地景標記回饋」
 *   2. 路線舒適度評分 — 分頁「路線舒適度評分」
 * 前端請求會依 payload 內容自動路由到正確分頁，只需要「一份試算表 + 一個部署」。
 *
 * 部署方式：
 * 1. 開啟該 Google 試算表 →「擴充功能」→「Apps Script」。
 * 2. 將此腳本完整複製並貼入（取代原有內容）。
 * 3. 右上角「部署」→「新增部署」，類型選擇「網頁應用程式」。
 * 4. 「誰可以存取」設定為「任何人」。
 * 5. 點擊部署，並授權雲端硬碟與試算表讀寫權限。
 * 6. 複製產生的 Web App URL，並在 Next.js 專案的 .env.local 中，
 *    將 NODE_SHEETS_API_URL 與 SHEETS_API_URL 都填入這「同一個」網址
 *   （兩個環境變數名稱維持不變，只是現在指向同一個部署，因為資料只有一份試算表）。
 */

// 兩個分頁（工作表）的名稱對照
var SHEET_NAMES = {
  node: "地景標記回饋",
  route: "路線舒適度評分"
};
var DRIVE_FOLDER_NAME = "信水義河地景相片";

/**
 * 處理 GET 請求 — 依 ?sheet= 參數決定回傳哪個分頁的資料
 * ?sheet=route → 路線舒適度評分；省略或其他值 → 地景標記回饋（預設，向下相容既有前端呼叫）
 */
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var type = (e && e.parameter && e.parameter.sheet === "route") ? "route" : "node";
    var sheet = getOrInitSheet(ss, type);

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
        var val = row[j];
        if (val instanceof Date) {
          val = val.toISOString();
        }
        obj[headers[j]] = val;
      }
      jsonArray.push(obj);
    }

    return jsonResponse(jsonArray);
  } catch (error) {
    return jsonResponse({ error: error.toString() }, 500);
  }
}

/**
 * 處理 POST 請求 — 依 payload 內容路由到正確分頁：
 *   action === "update_status"      → 地景標記回饋分頁（審核狀態變更）
 *   formType === "route_comfort"    → 路線舒適度評分分頁（新增評分）
 *   其他（含 formType: node_feedback 或未指定）→ 地景標記回饋分頁（新增標記）
 */
function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var payload = JSON.parse(e.postData.contents);

    if (payload.action === "update_status") {
      var nodeSheetForStatus = getOrInitSheet(ss, "node");
      return handleUpdateStatus(nodeSheetForStatus, payload);
    }

    if (payload.formType === "route_comfort") {
      var routeSheet = getOrInitSheet(ss, "route");
      return handleCreateRouteRecord(routeSheet, payload);
    }

    var nodeSheet = getOrInitSheet(ss, "node");
    return handleCreateNodeRecord(nodeSheet, payload);
  } catch (error) {
    return jsonResponse({ success: false, error: error.toString() }, 500);
  }
}

/**
 * 取得或建立指定分頁（'node' | 'route'）
 */
function getOrInitSheet(ss, type) {
  var name = SHEET_NAMES[type];
  var sheet = ss.getSheetByName(name);
  if (sheet) return sheet;
  return type === "route" ? initRouteSheet(ss) : initNodeSheet(ss);
}

/**
 * 處理狀態審批修改（審核通過/拒絕）— 僅作用於地景標記回饋分頁
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

  sheet.getRange(foundRowIdx, statusColIdx + 1).setValue(newStatus);

  return jsonResponse({ success: true, id: rowId, status: newStatus });
}

/**
 * 處理新增地景標記回饋紀錄（地方記憶 / 環境通報）
 */
function handleCreateNodeRecord(sheet, payload) {
  var headers = sheet.getDataRange().getValues()[0];

  var uniqueId = payload.id || "node_" + new Date().getTime() + "_" + Math.random().toString(36).substr(2, 5);

  var photoUrl = "";
  if (payload.photo_base64 && payload.photo_filename) {
    photoUrl = uploadPhotoToDrive(payload.photo_base64, payload.photo_filename);
  }

  var tagsString = "";
  if (Array.isArray(payload.tags)) {
    tagsString = payload.tags.join(", ");
  } else if (payload.tags) {
    tagsString = String(payload.tags);
  }

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
      case "feedback_type":
        // 'memory' (地方記憶) 或 'report' (環境通報)，舊版前端未傳送時預設為 memory
        rowValues.push(payload.feedback_type || "memory");
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
 * 處理新增路線舒適度評分紀錄
 */
function handleCreateRouteRecord(sheet, payload) {
  var headers = sheet.getDataRange().getValues()[0];

  var scores = payload.scores || {};
  var scoreShade = "";
  var scoreSurface = "";
  var scoreSafety = "";
  var scoreComfort = "";

  if (scores.shade !== undefined && scores.shade !== null) scoreShade = scores.shade;
  if (scores.surface !== undefined && scores.surface !== null) scoreSurface = scores.surface;
  if (scores.safety !== undefined && scores.safety !== null) scoreSafety = scores.safety;
  if (scores.comfort !== undefined && scores.comfort !== null) scoreComfort = scores.comfort;

  var rowValues = [];
  for (var i = 0; i < headers.length; i++) {
    var h = headers[i];
    switch (h) {
      case "timestamp":
        rowValues.push(payload.timestamp || new Date().toISOString());
        break;
      case "route_id":
        rowValues.push(payload.route_id !== undefined && payload.route_id !== null ? payload.route_id : "");
        break;
      case "route_name":
        rowValues.push(payload.route_name || "");
        break;
      case "segment_id":
        rowValues.push(payload.segment_id || "");
        break;
      case "score_shade":
        rowValues.push(scoreShade);
        break;
      case "score_surface":
        rowValues.push(scoreSurface);
        break;
      case "score_safety":
        rowValues.push(scoreSafety);
        break;
      case "score_comfort":
        rowValues.push(scoreComfort);
        break;
      default:
        rowValues.push("");
    }
  }

  sheet.appendRow(rowValues);

  return jsonResponse({ success: true });
}

/**
 * 將 Base64 檔案上傳至雲端硬碟，並設為共用
 */
function uploadPhotoToDrive(base64Data, filename) {
  try {
    var folders = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
    var folder;
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(DRIVE_FOLDER_NAME);
    }

    var base64Part = base64Data.split(",")[1] || base64Data;
    var decoded = Utilities.base64Decode(base64Part);

    var contentType = "image/jpeg";
    if (filename.toLowerCase().endsWith(".png")) contentType = "image/png";
    if (filename.toLowerCase().endsWith(".heic")) contentType = "image/heic";

    var blob = Utilities.newBlob(decoded, contentType, filename);
    var file = folder.createFile(blob);

    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return "https://lh3.googleusercontent.com/d/" + file.getId();
  } catch (e) {
    Logger.log("Drive upload failed: " + e.toString());
    return "";
  }
}

/**
 * 分頁初始化 — 地景標記回饋
 */
function initNodeSheet(ss) {
  var sheet = ss.insertSheet(SHEET_NAMES.node);
  var columns = [
    "id",
    "timestamp",
    "lat",
    "lng",
    "station_id",
    "feedback_type",
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

  var range = sheet.getRange(1, 1, 1, columns.length);
  range.setValues([columns]);
  range.setFontWeight("bold");
  range.setBackground("#f1f5f9");
  sheet.setFrozenRows(1);

  return sheet;
}

/**
 * 分頁初始化 — 路線舒適度評分
 */
function initRouteSheet(ss) {
  var sheet = ss.insertSheet(SHEET_NAMES.route);
  var columns = [
    "timestamp",
    "route_id",
    "route_name",
    "segment_id",
    "score_shade",
    "score_surface",
    "score_safety",
    "score_comfort"
  ];

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
