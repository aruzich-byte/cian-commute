(function () {
  const { state, ui, pluralize, formatInt, formatPriceShort, PRICE_BOUNDS, computeResults, sortItems, createCardEl, createMixCarouselEl, renderEmptyState, renderMapPins, ICONS, getActiveFilters } = window.App;

  // ---------- Постраничная отрисовка карточек ----------
  // При ~1300 объектах в выдаче рендерить все карточки (фото + текст) синхронно
  // за один проход — заметный фриз. Вместо этого в DOM сразу попадает только
  // первый экран, а остальные карточки дорисовываются пачками по мере скролла.
  const RENDER_BATCH_SIZE = 24;
  const RENDER_BATCH_TRIGGER_PX = 1200;
  let renderQueue = [];
  let renderTrailer = null;

  function flushRenderBatch() {
    const list = document.getElementById("results-list");
    if (renderQueue.length === 0) {
      if (renderTrailer) {
        list.appendChild(renderTrailer());
        renderTrailer = null;
      }
      return;
    }
    const batch = renderQueue.splice(0, RENDER_BATCH_SIZE);
    const fragment = document.createDocumentFragment();
    batch.forEach(({ item, mixed }) => fragment.appendChild(createCardEl(item, mixed)));
    list.appendChild(fragment);
    if (renderQueue.length === 0 && renderTrailer) {
      list.appendChild(renderTrailer());
      renderTrailer = null;
    }
  }

  function maybeFlushOnScroll() {
    if (renderQueue.length === 0) return;
    // Скроллится обёртка #results-scroll, а не #results-list (контейнер только
    // карточек) — см. map-sheet.js, где resultsList указывает на неё же.
    const scroller = document.getElementById("results-scroll");
    const remaining = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
    if (remaining < RENDER_BATCH_TRIGGER_PX) flushRenderBatch();
  }

  // ---------- Быстрые фильтры (шапка) ----------
  function updateQuickFilterLabels() {
    const priceChip = document.getElementById("qf-price-label");
    const { min, max } = state.price[state.priceMode];
    const mode = state.priceMode;
    const fmt = (v) => (mode === "perSqm" ? `${formatInt(v)} ₽/м²` : formatPriceShort(v));
    if (min == null && max == null) {
      priceChip.textContent = "Цена";
    } else if (min != null && max != null) {
      priceChip.textContent = `${fmt(min)}–${fmt(max)}`;
    } else if (min != null) {
      priceChip.textContent = `От ${fmt(min)}`;
    } else {
      priceChip.textContent = `До ${fmt(max)}`;
    }
    document.getElementById("qf-price").classList.toggle("is-set", min != null || max != null);

    const areaChip = document.getElementById("qf-area-label");
    const { areaMin, areaMax } = state;
    if (areaMin == null && areaMax == null) {
      areaChip.textContent = "Площадь";
    } else if (areaMin != null && areaMax != null) {
      areaChip.textContent = `${formatInt(areaMin)}–${formatInt(areaMax)} м²`;
    } else if (areaMin != null) {
      areaChip.textContent = `От ${formatInt(areaMin)} м²`;
    } else {
      areaChip.textContent = `До ${formatInt(areaMax)} м²`;
    }
    document.getElementById("qf-area").classList.toggle("is-set", areaMin != null || areaMax != null);

    const anyFunctionalFilterActive =
      min != null ||
      max != null ||
      state.areaMin != null ||
      state.areaMax != null ||
      state.floorMin != null ||
      state.floorMax != null ||
      state.classes.size > 0;
    document.getElementById("filter-icon-btn").classList.toggle("is-active", anyFunctionalFilterActive);
  }

  // ---------- Блок в конце выдачи: применённые фильтры со сбросом ----------
  // Показывается последним элементом списка, когда есть хотя бы один активный
  // фильтр (цена/площадь/этаж/класс) — см. getActiveFilters() в filtering.js.
  // Каждый чип снимает только свой фильтр и перерисовывает выдачу.
  function createFiltersEndBlock() {
    const filters = getActiveFilters();
    if (filters.length === 0) return null;

    const wrap = document.createElement("div");
    wrap.className = "filters-end";
    wrap.innerHTML = `
      <div class="filters-end__image">
        <img src="photos/Illustrations/EmptyScreen/160/SwitchOnEmotional.png" alt="" />
      </div>
      <div class="filters-end__card">
        <div class="filters-end__title">Это все предложения по вашим фильтрам</div>
        <p class="filters-end__text">Чтобы увидеть больше вариантов, снимите часть фильтров</p>
        <div class="filters-end__chips" data-role="chips"></div>
      </div>
    `;
    const chipsEl = wrap.querySelector('[data-role="chips"]');
    filters.forEach((filter) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "filters-end__chip";
      chip.innerHTML = `<span class="filters-end__chip-label">${filter.label}</span>${ICONS.close}`;
      chip.addEventListener("click", () => {
        filter.onRemove();
        renderResults();
      });
      chipsEl.appendChild(chip);
    });
    return wrap;
  }

  function renderResults() {
    const { base, strict, extras, priceActive, expandedMin, expandedMax, mode } = computeResults();
    const sortedStrict = sortItems(strict, state.sort);
    const list = document.getElementById("results-list");
    list.innerHTML = "";
    renderQueue = [];
    renderTrailer = null;

    // Плашка «Транспортной доступности» — первой в списке, пока человек не отметил места
    const commuteBanner = window.App.commuteBannerEl && window.App.commuteBannerEl();
    if (commuteBanner) list.appendChild(commuteBanner);

    const countEl = document.getElementById("results-count");
    if (base.length === 0) {
      countEl.textContent = "Ничего не найдено";
      if (window.App.commute.zoneActive()) window.App.renderZoneEmpty(list);
      else renderEmptyState(list, "По заданным параметрам ничего не нашлось");
      updateQuickFilterLabels();
      renderMapPins([]);
      return;
    }

    const mainCount = priceActive ? sortedStrict.length : base.length;
    countEl.textContent = `Найдено ${mainCount} ${pluralize(mainCount, "предложение", "предложения", "предложений")}`;

    if (sortedStrict.length === 0 && extras.length === 0) {
      renderEmptyState(list, "По точной цене предложений нет");
      updateQuickFilterLabels();
      renderMapPins(base);
      return;
    }

    if (ui.mixMode === "inline") {
      const combined = [...sortedStrict, ...extras];
      if (state.sort !== "default") {
        combined.sort((a, b) => {
          if (state.sort === "price_asc") return a.price - b.price;
          if (state.sort === "price_desc") return b.price - a.price;
          if (state.sort === "new") return a.addedDaysAgo - b.addedDaysAgo;
          if (state.sort === "area_desc") return b.area - a.area;
          return 0;
        });
      }
      const extraIds = new Set(extras.map((i) => i.id));
      renderQueue = combined.map((item) => ({ item, mixed: extraIds.has(item.id) }));
    } else if (ui.mixMode === "carousel") {
      renderQueue = sortedStrict.map((item) => ({ item, mixed: false }));
      if (extras.length > 0) {
        renderTrailer = () => createMixCarouselEl(extras);
      }
    } else if (ui.mixMode === "filter-warning") {
      // Подмешивание сюда не попадает — предложение расширить диапазон
      // показывается снеком в самом фильтре цены (см. filters-modal.js,
      // price-sheet.js), а не подмешиванием в список/карту.
      renderQueue = sortedStrict.map((item) => ({ item, mixed: false }));
    } else {
      renderQueue = sortedStrict.map((item) => ({ item, mixed: false }));
      if (extras.length > 0) {
        renderTrailer = () => {
          const trailerFragment = document.createDocumentFragment();
          const divider = document.createElement("div");
          divider.className = "mix-banner";
          divider.innerHTML = `
            <div class="mix-banner__image">
              <img src="photos/Image Container.png" alt="" />
            </div>
            <div class="mix-banner__card">
              <div class="mix-banner__title">Похожие варианты рядом с вашим бюджетом</div>
              <p class="mix-banner__text">По заданной цене предложений немного, поэтому дополнительно показываем варианты немного дешевле или дороже.</p>
            </div>
          `;
          trailerFragment.appendChild(divider);
          extras.forEach((item) => trailerFragment.appendChild(createCardEl(item, true, false)));
          return trailerFragment;
        };
      }
    }

    const modeTrailer = renderTrailer;
    const filtersEndBlock = createFiltersEndBlock();
    if (filtersEndBlock) {
      renderTrailer = () => {
        const trailerFragment = document.createDocumentFragment();
        if (modeTrailer) trailerFragment.appendChild(modeTrailer());
        trailerFragment.appendChild(filtersEndBlock);
        return trailerFragment;
      };
    }

    flushRenderBatch();
    updateQuickFilterLabels();
    renderMapPins(ui.mixMode === "filter-warning" ? sortedStrict : [...sortedStrict, ...extras]);
  }

  window.App = window.App || {};
  Object.assign(window.App, { maybeFlushOnScroll, updateQuickFilterLabels, renderResults });
})();
