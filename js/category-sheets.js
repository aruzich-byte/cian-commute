(function () {
  const { state, pluralize, scopeListings, setPriceScope, createOverlayController, renderResults } = window.App;

  // ---------- Bottom sheets: быстрые фильтры «Тип сделки» и «Тип недвижимости» ----------
  // Чипсы в шторке — те же, что в полноэкранных фильтрах, и в том же порядке.
  // Выбор — черновик: счётчик «Смотреть N» считается сразу, применяется по кнопке.
  // Смена категории сбрасывает диапазон цены — у аренды и продажи разные шкалы (см. setPriceScope).
  function setupChoiceSheet(key, stateField) {
    const overlay = createOverlayController(document.getElementById(`${key}-sheet-backdrop`), document.getElementById(`${key}-sheet`));
    const chips = Array.from(document.querySelectorAll(`#${key}-sheet-chips .pick-chip`));
    const countEl = document.getElementById(`${key}-sheet-count`);
    let draft = null;

    function draftCategory() {
      return {
        dealType: stateField === "dealType" ? draft : state.dealType,
        propertyType: stateField === "propertyType" ? draft : state.propertyType,
      };
    }

    function update() {
      chips.forEach((chip) => chip.classList.toggle("is-active", chip.dataset.value === draft));
      const { dealType, propertyType } = draftCategory();
      const n = scopeListings(dealType, propertyType).length;
      countEl.textContent = `${n} ${pluralize(n, "объявление", "объявления", "объявлений")}`;
    }

    function open() {
      draft = state[stateField];
      update();
      overlay.open();
    }

    function apply() {
      if (draft !== state[stateField]) {
        state[stateField] = draft;
        if (window.App.track) window.App.track("Сменил категорию", { value: `шторка ${key === "deal" ? "«Тип сделки»" : "«Тип недвижимости»"}` });
        state.price.total = { min: null, max: null };
        state.price.perSqm = { min: null, max: null };
        setPriceScope(state.dealType, state.propertyType);
      }
      overlay.close();
      renderResults();
    }

    chips.forEach((chip) =>
      chip.addEventListener("click", () => {
        draft = chip.dataset.value;
        update();
      })
    );
    document.getElementById(`${key}-sheet-close`).addEventListener("click", overlay.close);
    document.getElementById(`${key}-sheet-backdrop`).addEventListener("click", overlay.close);
    document.getElementById(`${key}-sheet-apply`).addEventListener("click", apply);

    return { open, close: overlay.close };
  }

  window.App = window.App || {};
  Object.assign(window.App, {
    setupDealSheet: () => setupChoiceSheet("deal", "dealType"),
    setupPropertyTypeSheet: () => setupChoiceSheet("ptype", "propertyType"),
  });
})();
