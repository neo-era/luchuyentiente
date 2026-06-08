/**
 * OneDrive.gs — Tích hợp OneDrive qua Microsoft Graph API.
 *
 * CHUẨN BỊ (chỉ làm 1 lần):
 *  1. Đăng ký app tại https://portal.azure.com > App registrations > New registration.
 *     - Supported account types: phù hợp (single tenant nếu dùng OneDrive for Business công ty).
 *     - Redirect URI (Web): lấy từ hàm redirectUri() bên dưới (chạy hàm đó, xem Log).
 *  2. Certificates & secrets > New client secret -> copy giá trị.
 *  3. API permissions > Microsoft Graph > Delegated: Files.ReadWrite, User.Read, offline_access.
 *  4. Vào Project Settings > Script Properties, thêm:
 *     MS_CLIENT_ID, MS_CLIENT_SECRET, (tùy chọn) MS_TENANT = Tenant ID công ty.
 *  5. Menu 💰 Dòng tiền > Kết nối OneDrive -> mở link -> đăng nhập Microsoft -> cấp quyền.
 *
 * Cần thư viện OAuth2 (đã khai báo trong appsscript.json).
 * Lưu ý: với OneDrive for Business / SharePoint dùng thư viện tài liệu chung, đổi đường dẫn
 * '/me/drive/...' thành '/sites/{site-id}/drive/...' hoặc '/drives/{drive-id}/...'.
 */

function _tenant_() { return getScriptProp_('MS_TENANT') || CONFIG.ONEDRIVE.TENANT; }

function getOneDriveService_() {
  const t = _tenant_();
  return OAuth2.createService('onedrive')
    .setAuthorizationBaseUrl('https://login.microsoftonline.com/' + t + '/oauth2/v2.0/authorize')
    .setTokenUrl('https://login.microsoftonline.com/' + t + '/oauth2/v2.0/token')
    .setClientId(getScriptProp_('MS_CLIENT_ID'))
    .setClientSecret(getScriptProp_('MS_CLIENT_SECRET'))
    .setCallbackFunction('authCallback')
    .setPropertyStore(PropertiesService.getUserProperties())
    .setScope(CONFIG.ONEDRIVE.SCOPE)
    .setParam('response_type', 'code')
    .setParam('prompt', 'consent');
}

function authCallback(request) {
  const ok = getOneDriveService_().handleCallback(request);
  return HtmlService.createHtmlOutput(ok
    ? '✅ Đã kết nối OneDrive. Đóng tab này và quay lại Google Sheets.'
    : '❌ Kết nối thất bại. Kiểm tra Client ID/Secret và Redirect URI.');
}

/** In Redirect URI cần khai báo trên Azure (xem Executions/Log sau khi chạy). */
function redirectUri() {
  const uri = getOneDriveService_().getRedirectUri();
  Logger.log(uri);
  return uri;
}

function ketNoiOneDrive() {
  const s = getOneDriveService_();
  if (!getScriptProp_('MS_CLIENT_ID')) {
    SpreadsheetApp.getUi().alert('Chưa cấu hình MS_CLIENT_ID / MS_CLIENT_SECRET trong Script Properties. Xem hướng dẫn đầu file OneDrive.gs.');
    return;
  }
  if (s.hasAccess()) {
    SpreadsheetApp.getActiveSpreadsheet().toast('OneDrive đã kết nối.', '💰 Dòng tiền', 4);
    return;
  }
  const url = s.getAuthorizationUrl();
  const html = HtmlService.createHtmlOutput(
    '<p style="font-family:Arial">Nhấn để kết nối OneDrive:</p>' +
    '<p><a href="' + url + '" target="_blank" style="font-size:16px">👉 Đăng nhập Microsoft &amp; cấp quyền</a></p>' +
    '<p style="color:#666;font-size:12px">Sau khi cấp quyền, đóng tab và quay lại đây.</p>'
  ).setWidth(420).setHeight(180);
  SpreadsheetApp.getUi().showModalDialog(html, 'Kết nối OneDrive');
}

function trangThaiOneDrive() {
  try { return getOneDriveService_().hasAccess(); } catch (e) { return false; }
}

/** ---- Graph helpers ---- */

function encPath_(segments) {
  return segments.map(function (s) { return encodeURIComponent(s); }).join('/');
}

function graph_(method, pathOrUrl, payload, kind) {
  const s = getOneDriveService_();
  if (!s.hasAccess()) throw new Error('Chưa kết nối OneDrive. Vào menu 💰 Dòng tiền > Kết nối OneDrive.');
  const url = pathOrUrl.indexOf('http') === 0 ? pathOrUrl : ('https://graph.microsoft.com/v1.0' + pathOrUrl);
  const opt = { method: method, muteHttpExceptions: true, headers: { Authorization: 'Bearer ' + s.getAccessToken() } };
  if (payload != null && kind === 'json') { opt.contentType = 'application/json'; opt.payload = JSON.stringify(payload); }
  const res = UrlFetchApp.fetch(url, opt);
  const code = res.getResponseCode();
  const txt = res.getContentText();
  if (code >= 400) throw new Error('Graph ' + code + ': ' + txt);
  return txt ? JSON.parse(txt) : {};
}

function sanitizeName_(s) {
  return String(s || '').replace(/[\\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim().slice(0, 120) || 'KhongTen';
}

function odGetItemByPath_(segments) {
  try { return graph_('get', '/me/drive/root:/' + encPath_(segments)); }
  catch (e) { if (String(e).indexOf('404') >= 0) return null; throw e; }
}

function odEnsureFolder_(segments) {
  const existing = odGetItemByPath_(segments);
  if (existing) return existing;
  const parent = segments.slice(0, -1);
  const name = segments[segments.length - 1];
  const parentPath = parent.length ? ('/me/drive/root:/' + encPath_(parent) + ':') : '/me/drive/root';
  return graph_('post', parentPath + '/children',
    { name: name, folder: {}, '@microsoft.graph.conflictBehavior': 'fail' }, 'json');
}

function _folderSegments_(maDuAn) {
  const da = findById_(CONFIG.SHEETS.DM_DUAN, 'MaDuAn', maDuAn);
  const ten = sanitizeName_(da ? da.TenDuAn : ('DuAn-' + maDuAn));
  return [CONFIG.ONEDRIVE.ROOT_FOLDER, ten];
}

/** Upload 1 file (PUT content). Graph hỗ trợ tới 250MB; giới hạn thực tế là dung lượng
 *  truyền qua trình duyệt -> file rất lớn nên dùng Đồng bộ thay vì upload qua form. */
function odUpload_(segments, fileName, blob, mime) {
  const s = getOneDriveService_();
  const url = 'https://graph.microsoft.com/v1.0/me/drive/root:/' +
    encPath_(segments.concat([fileName])) + ':/content';
  const res = UrlFetchApp.fetch(url, {
    method: 'put',
    contentType: mime || 'application/octet-stream',
    payload: blob,
    headers: { Authorization: 'Bearer ' + s.getAccessToken() },
    muteHttpExceptions: true
  });
  const code = res.getResponseCode();
  if (code >= 400) throw new Error('Upload lỗi ' + code + ': ' + res.getContentText());
  return JSON.parse(res.getContentText());
}

function ensureFoldersAndUpload_(maDuAn, fileName, bytes, mime) {
  const segs = _folderSegments_(maDuAn);
  odEnsureFolder_([segs[0]]);
  odEnsureFolder_(segs);
  const blob = Utilities.newBlob(bytes, mime || 'application/octet-stream', fileName);
  const item = odUpload_(segs, fileName, blob, mime);
  return { itemId: item.id, link: item.webUrl, sizeKB: Math.round((Number(item.size) || bytes.length) / 1024) };
}

function odListProjectFiles_(maDuAn) {
  const segs = _folderSegments_(maDuAn);
  if (!odGetItemByPath_(segs)) return [];
  const res = graph_('get', '/me/drive/root:/' + encPath_(segs) + ':/children?$top=200');
  return (res.value || []).filter(function (x) { return x.file; }).map(function (x) {
    return { id: x.id, name: x.name, size: x.size, webUrl: x.webUrl };
  });
}

function odFolderLink_(maDuAn) {
  const segs = _folderSegments_(maDuAn);
  odEnsureFolder_([segs[0]]);
  const f = odEnsureFolder_(segs);
  return f.webUrl;
}
