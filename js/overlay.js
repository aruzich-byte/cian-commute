(function () {
  // Общий контроллер для модалок/шторок (backdrop + панель), которые открываются/
  // закрываются переключением класса .is-open на паре элементов. Используется
  // price-sheet, pin-sheet и filters-modal — раньше каждый дублировал этот код сам.
  function createOverlayController(backdropEl, panelEl) {
    return {
      open() {
        backdropEl.classList.add("is-open");
        panelEl.classList.add("is-open");
      },
      close() {
        backdropEl.classList.remove("is-open");
        panelEl.classList.remove("is-open");
      },
      isOpen() {
        return panelEl.classList.contains("is-open");
      },
    };
  }

  window.App = window.App || {};
  window.App.createOverlayController = createOverlayController;
})();
