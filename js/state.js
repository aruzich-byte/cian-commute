// Классический скрипт (не ES-модуль) — специально, чтобы прототип открывался
// и напрямую двойным кликом по index.html (file://), а не только
// через локальный сервер: ES-модули блокируются CORS на file://.
// Все файлы в js/ делят один глобальный неймспейс window.App и подключаются
// обычными <script> тегами в порядке зависимостей (см. index.html).
(function () {
  const state = {
    dealType: "rent", // 'buy' | 'rent' | 'build' — данные есть для buy/rent
    propertyType: "flat", // 'flat' | 'room' | 'house' | 'garage' | 'commercial' — данные есть для flat/house
    subtypes: new Set(),
    priceMode: "total", // 'total' | 'perSqm'
    price: {
      total: { min: null, max: null },
      perSqm: { min: null, max: null },
    },
    areaMin: null,
    areaMax: null,
    floorMin: null,
    floorMax: null,
    classes: new Set(),
    sort: "default",
  };

  // ---------- Dev-переключатели вариантов прототипа (панель «Настройка прототипа») ----------
  // MIX_MODE задаётся в HTML перед подключением модулей:
  //   'inline'         — подмешанные варианты вливаются в общий список без разделителя
  //   'separate'       — подмешанные варианты выносятся отдельным блоком после основного списка
  //   'carousel'       — подмешанные варианты выносятся в горизонтальную карусель
  //   'filter-warning' — в список/карту ничего не подмешивается; вместо этого в фильтре
  //                      цены (полноэкранная модалка «Фильтры» и bottom sheet «Цена»)
  //                      показывается снек «Расширить» с числом дополнительных объектов
  //
  // mixMode/histogramShape живут как поля объекта (не отдельные примитивы),
  // чтобы чтение через App.ui.mixMode всегда видело актуальное значение —
  // простое присваивание примитива в App при подключении через <script> скопировало
  // бы значение один раз и не отражало бы последующие изменения.
  const ui = {
    mixMode: typeof MIX_MODE !== "undefined" ? MIX_MODE : "inline",
    priceVariant: "histogram", // 'histogram' | 'presets'
    histogramShape: "curve", // 'bars' | 'curve'
    // Если true — гистограмма строится не по всем LISTINGS, а по объектам,
    // которые проходят остальные применённые фильтры (площадь, этаж, класс) —
    // см. getBaseFiltered()/getAdaptiveBase в price-widget.js. Плейсхолдеры
    // цены при этом всегда показывают полный диапазон рынка.
    histogramAdaptive: true,
    // Порог подмешивания и ширина расширения диапазона цены — см.
    // computeMixSuggestion в filtering.js. mixThreshold: если строгих
    // результатов меньше этого числа — подмешиваем соседние по цене.
    // mixExpandPercent: на сколько % расширяется диапазон цены при подмешивании
    // (в него попадают ВСЕ объекты без ограничения по количеству).
    mixThreshold: 6,
    mixExpandPercent: 5,
  };

  window.App = window.App || {};
  // ---------- Параметры ссылки (для UX-тестов) ----------
  // ?deal=rent|buy & type=flat|house — с какой выдачи стартует прототип;
  // ?task=… — номер задания, ?pid=… — id респондента от платформы тестирования
  // (оба уходят в логи, см. tracking.js), ?commute=places|zone — вариант «Транспортной доступности»
  // (places — «Мои места», zone — «Поиск по времени», см. commute.js).
  const params = new URLSearchParams(window.location.search);
  const DEALS = ["rent", "buy", "build"];
  const TYPES = ["flat", "room", "house", "garage", "commercial"];
  if (DEALS.includes(params.get("deal"))) state.dealType = params.get("deal");
  if (TYPES.includes(params.get("type"))) state.propertyType = params.get("type");
  const session = {
    task: params.get("task") || "",
    pid: params.get("pid") || "",
    commute: params.get("commute") === "zone" ? "zone" : "places",
  };

  Object.assign(window.App, { state, ui, session });
})();
