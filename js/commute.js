(function () {
  const { ICONS } = window.App;

  // ---------- «Транспортная доступность»: мои места и время в пути ----------
  // Человек отмечает важные места: они видны на карте, а в сниппете — сколько до них ехать.
  // Для места можно задать, сколько готов ехать: тогда на карте рисуется зона досягаемости,
  // а в выдаче остаются только квартиры из неё. Без лимита место ничего не отсекает.
  // Время считаем приблизительно (расстояние × извилистость дорог / скорость + ожидание),
  // без API маршрутов: для UX-теста важна механика, а не точность до минуты.

  const KINDS = {
    work: { label: "Работа", icon: '<svg viewBox="0 0 16 16" fill="none"><rect x="1.8" y="4.8" width="12.4" height="8.6" rx="1.5" stroke="currentColor" stroke-width="1.6"/><path d="M5.5 4.8V3.3c0-.6.4-1 1-1h3c.6 0 1 .4 1 1v1.5M1.8 8.6h12.4" stroke="currentColor" stroke-width="1.6"/></svg>' },
    study: { label: "Учёба", icon: '<svg viewBox="0 0 16 16" fill="none"><path d="M1 6l7-3.5L15 6 8 9.5 1 6Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M4 7.6V11c0 .9 1.8 2.2 4 2.2s4-1.3 4-2.2V7.6" stroke="currentColor" stroke-width="1.6"/></svg>' },
    parents: { label: "Родители", icon: '<svg viewBox="0 0 16 16" fill="none"><path d="M8 13.6S2 10 2 6.1a3 3 0 0 1 6-1.1 3 3 0 0 1 6 1.1c0 3.9-6 7.5-6 7.5Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>' },
    sport: { label: "Спорт", icon: '<svg viewBox="0 0 16 16" fill="none"><path d="M2 8h12M4.5 4.8v6.4M11.5 4.8v6.4M2.3 6.4v3.2M13.7 6.4v3.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>' },
    home: { label: "Дом", icon: '<svg viewBox="0 0 16 16" fill="none"><path d="M2 7.5 8 2.5l6 5V14h-4v-4H6v4H2V7.5Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>' },
    other: { label: "Другое", icon: '<svg viewBox="0 0 16 16" fill="none"><path d="M8 14.5s5-4.3 5-8.3a5 5 0 0 0-10 0c0 4 5 8.3 5 8.3Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="8" cy="6.2" r="1.8" fill="currentColor"/></svg>' },
  };

  // speed — км/ч по прямой с учётом пробок/пересадок, detour — во сколько раз дорога длиннее прямой,
  // overhead — минуты на дорогу до остановки, ожидание или парковку
  const MODES = {
    walk: { label: "Пешком", short: "пешком", icon: ICONS.walk, speed: 4.5, detour: 1.25, overhead: 0 },
    transit: { label: "Транспорт", short: "на транспорте", icon: ICONS.bus, speed: 28, detour: 1.35, overhead: 10 },
    car: { label: "Авто", short: "на машине", icon: ICONS.car, speed: 32, detour: 1.35, overhead: 5 },
  };

  const LIMITS = [15, 30, 45, 60];

  const ICON_PLACES = KINDS.other.icon;

  // Подсказки адресов: Яндекс-саджест без API-ключа не работает, поэтому в прототипе —
  // готовый список популярных точек Петербурга (координаты приблизительные)
  const ADDRESS_SUGGESTIONS = [
    { address: "Невский проспект, 28", hint: "Центральный район", lat: 59.9357, lon: 30.326 },
    { address: "Лахта Центр, Лахтинский проспект, 2", hint: "Приморский район", lat: 59.9871, lon: 30.1776 },
    { address: "Московский проспект, 212", hint: "Московский район", lat: 59.8516, lon: 30.3216 },
    { address: "Каменноостровский проспект, 42", hint: "Петроградский район", lat: 59.9663, lon: 30.3115 },
    { address: "Средний проспект В.О., 30", hint: "Василеостровский район", lat: 59.9405, lon: 30.2723 },
    { address: "Университетская набережная, 7", hint: "Василеостровский район", lat: 59.9415, lon: 30.299 },
    { address: "Политехническая улица, 29", hint: "Калининский район", lat: 60.0074, lon: 30.3727 },
    { address: "Финляндский вокзал, площадь Ленина, 6", hint: "Калининский район", lat: 59.9557, lon: 30.3561 },
    { address: "Московский вокзал, Невский проспект, 85", hint: "Центральный район", lat: 59.9311, lon: 30.3609 },
    { address: "Балканская площадь, 5", hint: "Фрунзенский район", lat: 59.8295, lon: 30.3807 },
    { address: "проспект Просвещения, 87", hint: "Выборгский район", lat: 60.0517, lon: 30.3328 },
    { address: "Приморский проспект, 72", hint: "Приморский район", lat: 59.9877, lon: 30.23 },
    { address: "Пулковское шоссе, 41", hint: "Аэропорт Пулково", lat: 59.8003, lon: 30.2625 },
    { address: "Кудрово, Европейский проспект, 14", hint: "Ленинградская область", lat: 59.9035, lon: 30.5145 },
  ];

  // Пример мест для быстрого показа (кнопка в панели прототипа)
  const SAMPLE_PLACES = [
    { kind: "work", address: "Невский проспект, 28", lat: 59.9357, lon: 30.326, mode: "transit", limit: 40 },
    { kind: "parents", address: "Балканская площадь, 5", lat: 59.8295, lon: 30.3807, mode: "car", limit: 30 },
    { kind: "study", address: "Политехническая улица, 29", lat: 60.0074, lon: 30.3727, mode: "transit", limit: null },
  ];

  // ---------- Геометрия ----------
  // Переводим разницу координат в км на плоскости — для Петербурга этого достаточно
  function offsetKm(from, to) {
    const dx = (to.lon - from.lon) * 111.32 * Math.cos((from.lat * Math.PI) / 180);
    const dy = (to.lat - from.lat) * 110.57;
    return { dx, dy, dist: Math.hypot(dx, dy) };
  }

  function hashSeed(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
    return (Math.abs(h) % 1000) / 1000;
  }

  // Дороги и линии метро идут не во все стороны одинаково — зона досягаемости
  // не круг, а «клякса». Тот же множитель используем и для времени до объявления,
  // поэтому время в сниппете и граница зоны на карте всегда совпадают.
  function reachFactor(place, angle) {
    if (place.mode === "walk") return 1;
    const s = hashSeed(place.id) * Math.PI * 2;
    const amp = place.mode === "transit" ? 1 : 0.6;
    return 1 + amp * (0.16 * Math.sin(3 * angle + s) + 0.08 * Math.sin(5 * angle + 2 * s) + 0.05 * Math.cos(2 * angle - s));
  }

  function minutesTo(place, item, mode = place.mode) {
    const m = MODES[mode];
    const { dx, dy, dist } = offsetKm(place, item);
    const effective = dist / reachFactor({ ...place, mode }, Math.atan2(dy, dx));
    return roundMinutes(Math.max(3, m.overhead + ((effective * m.detour) / m.speed) * 60));
  }

  // Округляем сразу: и в сниппете, и в сравнении с лимитом участвует одно и то же число
  function roundMinutes(min) {
    return min < 10 ? Math.round(min) : Math.round(min / 5) * 5;
  }

  // Граница зоны: на каком расстоянии от места время ровно равно лимиту
  function zonePolygon(place, steps = 72) {
    const m = MODES[place.mode];
    const baseKm = Math.max(0.2, ((place.limit - m.overhead) / 60) * m.speed / m.detour);
    const cosLat = Math.cos((place.lat * Math.PI) / 180);
    const ring = [];
    for (let i = 0; i <= steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      const r = baseKm * reachFactor(place, angle);
      ring.push([place.lat + (r * Math.sin(angle)) / 110.57, place.lon + (r * Math.cos(angle)) / (111.32 * cosLat)]);
    }
    return ring;
  }

  function formatMinutes(min) {
    const rounded = roundMinutes(min);
    if (rounded < 60) return `${rounded} мин`;
    const h = Math.floor(rounded / 60);
    const rest = rounded % 60;
    return rest ? `${h} ч ${rest} мин` : `${h} ч`;
  }

  function placeTitle(place) {
    return place.title || KINDS[place.kind].label;
  }

  // ---------- Хранилище мест ----------
  // Пишем в localStorage: места переживают перезагрузку, как в аккаунте на Циане
  const STORAGE_KEY = "commute-places";
  let places = [];
  try {
    places = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch (e) {
    places = [];
  }
  const listeners = [];

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(places));
    } catch (e) {
      /* приватный режим — живём без сохранения */
    }
    listeners.forEach((fn) => fn());
  }

  function getPlaces() {
    return places;
  }

  function upsertPlace(place) {
    const index = places.findIndex((p) => p.id === place.id);
    if (index >= 0) places[index] = place;
    else places.push({ ...place, id: place.id || `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}` });
    save();
  }

  function removePlace(id) {
    places = places.filter((p) => p.id !== id);
    save();
  }

  function setPlaces(next) {
    places = next.map((p, i) => ({ ...p, id: p.id || `sample${i}` }));
    save();
  }

  function onChange(fn) {
    listeners.push(fn);
  }

  // ---------- Что это значит для выдачи ----------
  // Объявление проходит, если до КАЖДОГО места с лимитом укладывается в него
  function limitedPlaces() {
    return places.filter((p) => p.limit != null);
  }

  function zoneActive() {
    return limitedPlaces().length > 0;
  }

  function inZone(item) {
    return limitedPlaces().every((p) => minutesTo(p, item) <= p.limit);
  }

  // Для сортировки «Ближе к моим местам» — суммарное время до всех мест
  function totalMinutes(item) {
    return places.reduce((sum, p) => sum + minutesTo(p, item), 0);
  }

  // Строка «время до мест» в сниппете — компактно, в стиле строки метро: иконка места и время,
  // без подписей и способа (они — в подробностях по тапу). До трёх мест, остальные — «+N».
  // Превышение лимита подсвечиваем — сразу видно, что вариант не подходит.
  function shortMinutes(min) {
    const rounded = roundMinutes(min);
    if (rounded < 60) return `${rounded} мин`;
    const rest = rounded % 60;
    return rest ? `${Math.floor(rounded / 60)} ч ${rest}` : `${rounded / 60} ч`;
  }

  function snippetHtml(item) {
    if (!places.length || item.lat == null) return "";
    const shown = places.slice(0, 3);
    const parts = shown.map((p) => {
      const min = minutesTo(p, item);
      const over = p.limit != null && min > p.limit;
      return `<span class="commute-item${over ? " is-over" : ""}" title="${placeTitle(p)}">${KINDS[p.kind].icon}${shortMinutes(min)}</span>`;
    });
    if (places.length > shown.length) parts.push(`<span class="commute-item commute-item--more">+${places.length - shown.length}</span>`);
    return `<button class="card__commute" type="button" aria-label="Время в пути до ваших мест">${parts.join("")}</button>`;
  }

  window.App = window.App || {};
  window.App.commute = {
    KINDS,
    MODES,
    LIMITS,
    ICON_PLACES,
    ADDRESS_SUGGESTIONS,
    SAMPLE_PLACES,
    minutesTo,
    zonePolygon,
    formatMinutes,
    placeTitle,
    getPlaces,
    upsertPlace,
    removePlace,
    setPlaces,
    onChange,
    limitedPlaces,
    zoneActive,
    inZone,
    totalMinutes,
    snippetHtml,
  };
})();
