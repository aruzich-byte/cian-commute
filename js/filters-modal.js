(function () {
  const {
    scopeListings,
    state,
    ui,
    pluralize,
    computeMixSuggestion,
    buildPriceWidget,
    createOverlayController,
    renderResults,
    commute,
  } = window.App;

// ---------- Полноэкранная модалка «Фильтры» ----------
function setupFiltersModal() {
  const overlay = createOverlayController(document.getElementById("modal-backdrop"), document.getElementById("filters-modal"));
  let draft;
  let priceWidget;
  let variant = "histogram";

  const footerCountEl = document.getElementById("f-footer-count");
  const expandSnackEl = document.getElementById("f-expand-snack");
  const expandSnackTextEl = document.getElementById("f-expand-snack-text");
  const expandSnackBtn = document.getElementById("f-expand-snack-btn");
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

  expandSnackBtn.addEventListener("click", () => {
    if (!pendingExpand) return;
    priceWidget.setRange(pendingExpand.mode, pendingExpand.min, pendingExpand.max);
  });

  // Черновая выборка без учёта цены — на неё накладывается диапазон цены
  // отдельно через computeMixSuggestion, чтобы посчитать заодно и «подмешивание»
  // (сколько объектов добавит расширение диапазона) для снека «Расширить».
  // Площадь в модалке больше не редактируется — учитываем ту, что выбрана
  // в быстром фильтре «Площадь» (state.areaMin/areaMax).
  function computeDraftBase() {
    return scopeListings().filter((item) => {
      if (!commute.inZone(item)) return false;
      if (state.areaMin != null && item.area < state.areaMin) return false;
      if (state.areaMax != null && item.area > state.areaMax) return false;
      return true;
    });
  }

  function computeDraftCount() {
    const base = computeDraftBase();
    const mode = draft.priceMode;
    const { min, max } = draft.price[mode];
    const { strict, extrasTotal, expandedMin, expandedMax } = computeMixSuggestion(base, mode, min, max);
    const n = strict.length;
    footerCountEl.textContent = `${n} ${pluralize(n, "объявление", "объявления", "объявлений")}`;
    if (ui.mixMode === "filter-warning" && extrasTotal > 0) {
      showExpandSnack(extrasTotal, mode, expandedMin, expandedMax);
    } else {
      hideExpandSnack();
    }
  }

  function mountPriceWidget() {
    priceWidget = buildPriceWidget(document.getElementById("f-price-widget"), {
      draft,
      onChange: computeDraftCount,
      priceVariant: variant,
      getAdaptiveBase: computeDraftBase,
    });
  }

  function open(scrollToPrice) {
    draft = { priceMode: state.priceMode, price: { total: { ...state.price.total }, perSqm: { ...state.price.perSqm } } };
    mountPriceWidget();
    computeDraftCount();

    overlay.open();
    if (scrollToPrice) {
      requestAnimationFrame(() => {
        document.getElementById("f-price-section").scrollIntoView({ block: "start" });
      });
    } else {
      document.querySelector(".filters-modal__body").scrollTop = 0;
    }
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

  function resetDraft() {
    priceWidget.reset();
    computeDraftCount();
  }

  document.getElementById("filters-modal-close").addEventListener("click", close);
  document.getElementById("filters-modal-reset").addEventListener("click", resetDraft);
  document.getElementById("filters-modal-apply").addEventListener("click", apply);

  function refreshHistogram() {
    if (priceWidget) priceWidget.updateUI();
  }

  function setVariant(v) {
    variant = v;
    if (overlay.isOpen()) {
      priceWidget = buildPriceWidget(document.getElementById("f-price-widget"), {
        draft,
        onChange: computeDraftCount,
        priceVariant: variant,
        getAdaptiveBase: computeDraftBase,
      });
      computeDraftCount();
    }
  }

  // Места меняются прямо из модалки (строка «Время в пути») — пересчитываем «Смотреть N»
  commute.onChange(() => {
    if (overlay.isOpen()) computeDraftCount();
  });

  return { open, close, refreshHistogram, setVariant };
}

  window.App = window.App || {};
  window.App.setupFiltersModal = setupFiltersModal;
})();
