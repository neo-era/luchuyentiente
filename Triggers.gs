/**
 * Triggers.gs — Lập lịch cảnh báo hằng ngày. Xem CLAUDE.md §10.
 */

function caiTrigger() {
  goTrigger();
  ScriptApp.newTrigger('canhBaoHangNgay').timeBased().atHour(7).everyDays(1).create();
  SpreadsheetApp.getActiveSpreadsheet().toast('Đã cài trigger 7h sáng hằng ngày.', '💰 Dòng tiền', 4);
}

function goTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'canhBaoHangNgay') ScriptApp.deleteTrigger(t);
  });
}
