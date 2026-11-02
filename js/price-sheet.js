(function () {
  const { state, ui, buildPriceWidget, createOverlayController, renderResults, getBaseFiltered, computeMixSuggestion, pluralize } = window.App;

  // ---------- Bottom sheet: быстрый фильтр «Цена» ----------
  function setupPriceSheet() {
    const overlay = createOverlayController(document.getElementById("sheet-backdrop"), document.getElementById("price-sheet"));
    const widgetContainer = document.getElementById("price-sheet-widget");
    const liveCountEl = document.getElementById("price-sheet-count");
    const expandSnackEl = document.getElementById("price-sheet-expand-snack");
    const expandSnackTextEl = document.getElementById("price-sheet-expand-snack-text");
    const expandSnackBtn = document.getElementById("price-sheet-expand-snack-btn");
    let draft;
    let widget;
    let variant = "histogram";
    let pendingExpand = null;

    function showExpandSnack(n, mode, expandedMin, expandedMax) {
      pendingExpand = { mode, min: expandedMin, max: expandedMax };
      expandSnackTextEl.textContent = `Давайте немного расширим диапазон цены, в выдачу добавится ещё ${n} ${pluralize(n, "объект", "объекта", "объектов")}`;
      expandSnackEl.hidden = false;
    }
    function hideExpandSnack() {
      pendingExpand = null;
      expandSnackEl.hidden = true;
    }

    // Прочие фильтры (площадь, этаж, класс) здесь не редактируются — только
    // цена, поэтому базой берём уже применённые state-фильтры без цены.
    function onPriceChange() {
      const mode = draft.priceMode;
      const { min, max } = draft.price[mode];
      const { extrasTotal, expandedMin, expandedMax } = computeMixSuggestion(getBaseFiltered(), mode, min, max);
      if (ui.mixMode === "filter-warning" && extrasTotal > 0) {
        showExpandSnack(extrasTotal, mode, expandedMin, expandedMax);
      } else {
        hideExpandSnack();
      }
    }

    function render() {
      widget = buildPriceWidget(widgetContainer, { draft, liveCountEl, showModeToggle: false, priceVariant: variant, onChange: onPriceChange });
    }

    function open() {
      draft = { priceMode: state.priceMode, price: { total: { ...state.price.total }, perSqm: { ...state.price.perSqm } } };
      render();
      overlay.open();
    }
    function close() {
      overlay.close();
      hideExpandSnack();
    }
    function apply() {
      state.priceMode = draft.priceMode;
      state.price.total = { ...draft.price.total };
      state.price.perSqm = { ...draft.price.perSqm };
      close();
      renderResults();
    }
    function setVariant(v) {
      variant = v;
      if (overlay.isOpen()) render();
    }
    function refreshHistogram() {
      if (widget) widget.updateUI();
    }

    expandSnackBtn.addEventListener("click", () => {
      if (!pendingExpand) return;
      widget.setRange(pendingExpand.mode, pendingExpand.min, pendingExpand.max);
    });

    document.getElementById("price-sheet-reset").addEventListener("click", () => widget.reset());
    document.getElementById("price-sheet-apply").addEventListener("click", apply);
    document.getElementById("price-sheet-close").addEventListener("click", close);
    document.getElementById("sheet-backdrop").addEventListener("click", close);

    return { open, close, setVariant, refreshHistogram };
  }

  window.App = window.App || {};
  window.App.setupPriceSheet = setupPriceSheet;
})();
