// Приёмник логов прототипа: принимает пачку событий из js/tracking.js
// и дописывает их строками на вкладку «События» Google-таблицы.
//
// Как развернуть:
// 1. В таблице: Расширения → Apps Script, вставить этот код вместо пустого, сохранить.
// 2. «Начать развертывание» → «Новое развертывание» → тип «Веб-приложение».
//    Запуск от имени: «Я». У кого есть доступ: «Все».
// 3. Разрешить доступ к таблице, скопировать адрес веб-приложения (…/exec)
//    и вписать его в LOG_ENDPOINT в js/tracking.js.

const SHEET_NAME = "События";

function doPost(e) {
  const rows = JSON.parse(e.postData.contents);
  if (!Array.isArray(rows) || rows.length === 0) return ContentService.createTextOutput("empty");

  const values = rows.map((r) => [
    new Date(r.ts),
    r.sec,
    r.session,
    r.pid,
    r.task,
    r.variant,
    r.category,
    r.event,
    r.listingId,
    r.listing,
    r.value,
  ]);

  // Несколько респондентов могут прислать события одновременно — пишем по очереди
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAME);
    const firstRow = sheet.getLastRow() + 1;
    sheet.getRange(firstRow, 1, values.length, values[0].length).setValues(values);
    // setValues с датой ставит формат «только дата» — возвращаем дату со временем
    sheet.getRange(firstRow, 1, values.length, 1).setNumberFormat("dd.mm.yyyy hh:mm:ss");
  } finally {
    lock.releaseLock();
  }
  return ContentService.createTextOutput("ok");
}
