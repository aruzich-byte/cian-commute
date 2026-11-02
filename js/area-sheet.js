(function () {
  const {
    state,
    formatInt,
    getSeatingType,
    getBaseFilteredExcludingArea,
    applyPriceRange,
    createOverlayController,
    renderResults,
  } = window.App;

  // ---------- Bottom sheet: быстрый фильтр «Площадь» ----------
  // Логика (переключатель Кол-во чел./м², синхронизация полей, расчёт
  // оптимальной площади) повторяет секцию «Площадь» полноэкранной модалки
  // фильтров (см. filters-modal.js) — здесь тот же UX, но в bottom sheet,
  // как и у быстрого фильтра «Цена» (price-sheet.js).
  function setupAreaSheet() {
    const overlay = createOverlayController(document.getElementById("area-sheet-backdrop"), document.getElementById("area-sheet"));
    const sheetEl = document.getElementById("area-sheet");
    const areaModeToggle = document.getElementById("as-area-mode-toggle");
    const areaModeButtons = Array.from(areaModeToggle.querySelectorAll("[data-as-area-mode]"));
    const areaPanels = Array.from(sheetEl.querySelectorAll("[data-as-area-panel]"));
    const areaMinEl = document.getElementById("as-area-min");
    const areaMaxEl = document.getElementById("as-area-max");
    const peopleMinEl = document.getElementById("as-people-min");
    const peopleMaxEl = document.getElementById("as-people-max");
    const seatingSelectEl = document.getElementById("as-seating-select");
    const optimalAreaEl = document.getElementById("as-optimal-area");
    const countEl = document.getElementById("area-sheet-count");

    // Флаг предотвращает обратный пересчёт при программной записи значения в
    // «противоположные» поля (кол-во чел. <-> м²) — см. тот же приём в filters-modal.js.
    let areaSyncing = false;

    function currentSeatingType() {
      return getSeatingType(seatingSelectEl.value);
    }

    function setAreaMode(mode) {
      areaModeButtons.forEach((btn) => btn.classList.toggle("is-active", btn.dataset.asAreaMode === mode));
      areaPanels.forEach((panel) => {
        panel.hidden = panel.dataset.asAreaPanel !== mode;
      });
    }

    function updateOptimalArea() {
      const pMin = peopleMinEl.value ? Number(peopleMinEl.value) : null;
      const pMax = peopleMaxEl.value ? Number(peopleMaxEl.value) : null;
      if (pMin == null && pMax == null) {
        optimalAreaEl.textContent = "0";
        return;
      }
      const type = currentSeatingType();
      const count = pMax ?? pMin;
      const perPerson = (type.perPersonMin + type.perPersonMax) / 2;
      optimalAreaEl.textContent = formatInt(Math.round(count * perPerson));
    }

    function syncAreaFromPeople() {
      if (areaSyncing) return;
      areaSyncing = true;
      const type = currentSeatingType();
      const pMin = peopleMinEl.value ? Number(peopleMinEl.value) : null;
      const pMax = peopleMaxEl.value ? Number(peopleMaxEl.value) : null;
      areaMinEl.value = pMin != null ? Math.round(pMin * type.perPersonMin) : "";
      areaMaxEl.value = pMax != null ? Math.round(pMax * type.perPersonMax) : "";
      areaSyncing = false;
    }

    function syncPeopleFromArea() {
      if (areaSyncing) return;
      areaSyncing = true;
      const type = currentSeatingType();
      const aMin = areaMinEl.value ? Number(areaMinEl.value) : null;
      const aMax = areaMaxEl.value ? Number(areaMaxEl.value) : null;
      peopleMinEl.value = aMin != null ? Math.ceil(aMin / type.perPersonMax) : "";
      peopleMaxEl.value = aMax != null ? Math.floor(aMax / type.perPersonMin) : "";
      areaSyncing = false;
    }

    function updateLiveCount() {
      const min = areaMinEl.value ? Number(areaMinEl.value) : null;
      const max = areaMaxEl.value ? Number(areaMaxEl.value) : null;
      const base = getBaseFilteredExcludingArea().filter((item) => {
        if (min != null && item.area < min) return false;
        if (max != null && item.area > max) return false;
        return true;
      });
      const mode = state.priceMode;
      const { min: priceMin, max: priceMax } = state.price[mode];
      const n = applyPriceRange(base, mode, priceMin, priceMax).length;
      countEl.textContent = n;
    }

    areaModeButtons.forEach((btn) => {
      btn.addEventListener("click", () => setAreaMode(btn.dataset.asAreaMode));
    });

    areaMinEl.addEventListener("input", () => {
      syncPeopleFromArea();
      updateOptimalArea();
      updateLiveCount();
    });
    areaMaxEl.addEventListener("input", () => {
      syncPeopleFromArea();
      updateOptimalArea();
      updateLiveCount();
    });
    peopleMinEl.addEventListener("input", () => {
      syncAreaFromPeople();
      updateOptimalArea();
      updateLiveCount();
    });
    peopleMaxEl.addEventListener("input", () => {
      syncAreaFromPeople();
      updateOptimalArea();
      updateLiveCount();
    });
    seatingSelectEl.addEventListener("change", () => {
      syncAreaFromPeople();
      updateOptimalArea();
      updateLiveCount();
    });

    function open() {
      areaMinEl.value = state.areaMin ?? "";
      areaMaxEl.value = state.areaMax ?? "";
      peopleMinEl.value = "";
      peopleMaxEl.value = "";
      seatingSelectEl.value = "any";
      setAreaMode("people");
      syncPeopleFromArea();
      updateOptimalArea();
      updateLiveCount();
      overlay.open();
    }

    function close() {
      overlay.close();
    }

    function apply() {
      state.areaMin = areaMinEl.value ? Number(areaMinEl.value) : null;
      state.areaMax = areaMaxEl.value ? Number(areaMaxEl.value) : null;
      close();
      renderResults();
    }

    function reset() {
      areaMinEl.value = "";
      areaMaxEl.value = "";
      peopleMinEl.value = "";
      peopleMaxEl.value = "";
      seatingSelectEl.value = "any";
      updateOptimalArea();
      updateLiveCount();
    }

    document.getElementById("area-sheet-reset").addEventListener("click", reset);
    document.getElementById("area-sheet-apply").addEventListener("click", apply);
    document.getElementById("area-sheet-close").addEventListener("click", close);
    document.getElementById("area-sheet-backdrop").addEventListener("click", close);

    return { open, close };
  }

  window.App = window.App || {};
  window.App.setupAreaSheet = setupAreaSheet;
})();
