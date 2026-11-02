(function () {
  const { state, setPriceScope, renderResults, setupPriceSheet, setupAreaSheet, setupDealSheet, setupPropertyTypeSheet, setupFiltersModal, setupSort, setupMapSheet, initYandexMap, setupPinSheet, pinSheetRef } = window.App;

  document.addEventListener("DOMContentLoaded", () => {
    // Категория могла прийти из ссылки (?deal=&type=) — шкала цены под неё
    setPriceScope(state.dealType, state.propertyType);
    const priceSheet = setupPriceSheet();
    const areaSheet = setupAreaSheet();
    const dealSheet = setupDealSheet();
    const propertyTypeSheet = setupPropertyTypeSheet();
    const filtersModal = setupFiltersModal();
    setupSort();
    // Без карты (класс no-map на <body>) — список сразу на весь экран, Яндекс.Карты не грузим
    const mapEnabled = !document.body.classList.contains("no-map");
    setupMapSheet(mapEnabled);
    if (mapEnabled) initYandexMap();
    pinSheetRef.current = setupPinSheet();

    document.getElementById("qf-rent").addEventListener("click", () => dealSheet.open());
    document.getElementById("qf-office").addEventListener("click", () => propertyTypeSheet.open());
    document.getElementById("qf-city").addEventListener("click", () => filtersModal.open(false));
    document.getElementById("qf-price").addEventListener("click", () => priceSheet.open());
    document.getElementById("qf-area").addEventListener("click", () => areaSheet.open());
    document.getElementById("filter-icon-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      filtersModal.open(false);
    });
    document.getElementById("search-bar-btn").addEventListener("click", () => filtersModal.open(false));

    // Тройной тап по экрану телефона открывает панель «Настройка прототипа»
    // (на мобильном она по умолчанию скрыта за пределами экрана — см.
    // .prototype-panel в dev-switchers.css). На десктопе панель видна всегда
    // как сайдбар, тап на класс is-open там не влияет.
    const prototypePanel = document.getElementById("prototype-panel");
    const prototypePanelClose = document.getElementById("prototype-panel-close");
    const phoneScreen = document.querySelector(".phone-frame__screen");
    if (prototypePanel && phoneScreen && !window.App.session.task) {
      const TRIPLE_TAP_WINDOW_MS = 600;
      let tapTimestamps = [];
      phoneScreen.addEventListener("click", () => {
        const now = Date.now();
        tapTimestamps = tapTimestamps.filter((t) => now - t < TRIPLE_TAP_WINDOW_MS);
        tapTimestamps.push(now);
        if (tapTimestamps.length >= 3) {
          tapTimestamps = [];
          prototypePanel.classList.add("is-open");
        }
      });
    }
    if (prototypePanelClose && prototypePanel) {
      prototypePanelClose.addEventListener("click", () => prototypePanel.classList.remove("is-open"));
    }

    renderResults();
  });
})();
