(function () {
  // ---------- Логирование действий для немодерируемых UX-тестов ----------
  // События копятся в очереди и пачками уходят в Google-таблицу через веб-приложение
  // Apps Script (адрес — LOG_ENDPOINT ниже). Без адреса события только пишутся в консоль.
  // Отправка — text/plain, чтобы браузер не делал CORS-preflight (Apps Script его не умеет).
  // Собираем только обезличенные действия: тапы, листания, время.
  const LOG_ENDPOINT =
    "https://script.google.com/macros/s/AKfycbzpfRvHrAn1Hki__-6fhvJ3m84_d6ewY_kTYK__9JI618Na0qDYm62NCFL156a_85wVJw/exec";

  const { session, state } = window.App;
  const startedAt = Date.now();
  const sessionId = `${startedAt.toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const queue = [];
  const CATEGORY_LABELS = { "rent/flat": "Снять квартиру", "buy/flat": "Купить квартиру", "rent/house": "Снять дом", "buy/house": "Купить дом" };

  function listingLabel(item) {
    if (!item) return "";
    const price = `${Math.round(item.price).toLocaleString("ru-RU")} ₽${item.dealType === "rent" ? "/мес" : ""}`;
    const what = item.propertyType === "house" ? item.houseKind : item.flatType === "studio" ? "студия" : item.rooms ? `${item.rooms}-комн.` : "";
    return `${price} · ${what} · ${item.address || ""}`;
  }

  function track(event, { item = null, value = "" } = {}) {
    const category = `${state.dealType}/${state.propertyType}`;
    const row = {
      ts: new Date().toISOString(),
      sec: Math.round((Date.now() - startedAt) / 100) / 10,
      session: sessionId,
      pid: session.pid,
      task: session.task,
      variant: session.commute,
      category: CATEGORY_LABELS[category] || category,
      event,
      listingId: item ? item.id : "",
      listing: listingLabel(item),
      value: String(value),
    };
    queue.push(row);
    if (!LOG_ENDPOINT) console.debug("[track]", row);
    if (queue.length >= 20) flush();
  }

  function flush(useBeacon) {
    if (!LOG_ENDPOINT || queue.length === 0) return;
    const body = JSON.stringify(queue.splice(0, queue.length));
    if (useBeacon && navigator.sendBeacon) {
      navigator.sendBeacon(LOG_ENDPOINT, new Blob([body], { type: "text/plain" }));
    } else {
      fetch(LOG_ENDPOINT, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain" }, body, keepalive: true }).catch(() => {});
    }
  }

  setInterval(flush, 3000);
  // Вкладку закрыли или свернули — дожимаем очередь через sendBeacon
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush(true);
  });
  window.addEventListener("pagehide", () => flush(true));

  window.App = window.App || {};
  Object.assign(window.App, { track, flushTracking: flush });

  // ---------- Клики: одно делегирование на весь документ ----------
  function itemOf(el) {
    const card = el.closest("[data-listing-id]");
    if (!card) return null;
    return window.App.LISTINGS.find((l) => l.id === card.dataset.listingId) || null;
  }

  const CLICK_EVENTS = [
    [".card__gallery-badge", "Иконка планировки"],
    [".card__btn--call", "Позвонить"],
    [".card__btn--message", "Написать"],
    ['.card__gallery-btn[aria-label="В избранное"]', "Избранное"],
    ['.card__gallery-btn[aria-label="Ещё"]', "Меню «ещё»"],
    ["#qf-rent", "Быстрый фильтр: тип сделки"],
    ["#qf-office", "Быстрый фильтр: тип недвижимости"],
    ["#qf-city", "Быстрый фильтр: город"],
    ["#qf-price", "Быстрый фильтр: цена"],
    ["#qf-area", "Быстрый фильтр: площадь"],
    ["#filter-icon-btn", "Все фильтры"],
    ["#search-bar-btn", "Строка поиска"],
    ["#sort-btn", "Сортировка"],
  ];

  document.addEventListener(
    "click",
    (e) => {
      for (const [selector, name] of CLICK_EVENTS) {
        const el = e.target.closest(selector);
        if (el) {
          track(name, { item: itemOf(el) });
          return;
        }
      }
    },
    true
  );

  // ---------- Какие сниппеты человек реально видел (≥60% на экране дольше 0,8 с) ----------
  const seen = new Set();
  const timers = new Map();
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const id = entry.target.dataset.listingId;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
          if (seen.has(id) || timers.has(id)) return;
          timers.set(
            id,
            setTimeout(() => {
              seen.add(id);
              timers.delete(id);
              track("Увидел сниппет", { item: itemOf(entry.target) });
            }, 800)
          );
        } else if (timers.has(id)) {
          clearTimeout(timers.get(id));
          timers.delete(id);
        }
      });
    },
    { threshold: [0, 0.6] }
  );
  window.App.observeSnippet = (card) => observer.observe(card);

  track("Старт сессии", { value: `${window.innerWidth}×${window.innerHeight}` });
})();
