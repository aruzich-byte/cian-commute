(function () {
  const {
    scopeListings,
    setPriceScope,
    state,
    ui,
    pluralize,
    computeMixSuggestion,
    buildPriceWidget,
    createOverlayController,
    wireSingleSelectChips,
    wireMultiToggleChips,
    activeChip,
    activeChips,
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

  const dealChips = Array.from(document.querySelectorAll(".f-deal-chip"));
  const propertyTypeChips = Array.from(document.querySelectorAll(".f-ptype-chip"));
  const subtypeChips = Array.from(document.querySelectorAll(".f-subtype-chip"));
  const commercialBlock = document.getElementById("f-commercial-block");

  // Категория, выбранная в чипсах модалки (ещё не применённая)
  function draftDeal() {
    return activeChip(dealChips)?.dataset.deal ?? null;
  }

  function draftPropertyType() {
    return activeChip(propertyTypeChips)?.dataset.ptype ?? null;
  }

  // Черновая выборка без учёта цены — на неё накладывается диапазон цены
  // отдельно через computeMixSuggestion, чтобы посчитать заодно и «подмешивание»
  // (сколько объектов добавит расширение диапазона) для снека «Расширить».
  // Площадь в модалке больше не редактируется — учитываем ту, что выбрана
  // в быстром фильтре «Площадь» (state.areaMin/areaMax).
  function computeDraftBase() {
    return scopeListings(draftDeal(), draftPropertyType()).filter((item) => {
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

  // Смена категории (снять/купить × квартира/дом) меняет шкалу цены — у аренды
  // и продажи разные порядки цен. Черновой диапазон цены сбрасываем, виджет
  // пересобираем под новую шкалу. Если модалку закроют без «Показать», шкала
  // вернётся к применённой категории (см. close).
  function onCategoryChange() {
    setPriceScope(draftDeal(), draftPropertyType());
    draft.price = { total: { min: null, max: null }, perSqm: { min: null, max: null } };
    mountPriceWidget();
    computeDraftCount();
  }

  wireSingleSelectChips(dealChips, onCategoryChange);
  wireMultiToggleChips(subtypeChips, computeDraftCount);
  wireSingleSelectChips(propertyTypeChips, () => {
    commercialBlock.style.display = draftPropertyType() === "commercial" ? "" : "none";
    onCategoryChange();
  });

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
    dealChips.forEach((chip) => chip.classList.toggle("is-active", chip.dataset.deal === state.dealType));
    propertyTypeChips.forEach((chip) => chip.classList.toggle("is-active", chip.dataset.ptype === state.propertyType));
    subtypeChips.forEach((chip) => chip.classList.toggle("is-active", state.subtypes.has(chip.dataset.subtype)));
    commercialBlock.style.display = state.propertyType === "commercial" ? "" : "none";

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
    setPriceScope(state.dealType, state.propertyType);
  }

  function apply() {
    state.priceMode = draft.priceMode;
    state.price.total = { ...draft.price.total };
    state.price.perSqm = { ...draft.price.perSqm };
    const prevCategory = `${state.dealType}/${state.propertyType}`;
    state.dealType = activeChip(dealChips)?.dataset.deal ?? null;
    state.propertyType = activeChip(propertyTypeChips)?.dataset.ptype ?? null;
    if (window.App.track && prevCategory !== `${state.dealType}/${state.propertyType}`) {
      window.App.track("Сменил категорию", { value: "общие фильтры" });
    }
    state.subtypes = new Set(activeChips(subtypeChips).map((c) => c.dataset.subtype));
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
