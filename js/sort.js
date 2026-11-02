(function () {
  const { state, renderResults } = window.App;

  // ---------- Сортировка ----------
  function setupSort() {
    const btn = document.getElementById("sort-btn");
    const menu = document.getElementById("sort-menu");
    const options = [
      { value: "default", label: "По умолчанию" },
      { value: "price_asc", label: "Сначала дешевле" },
      { value: "price_desc", label: "Сначала дороже" },
      { value: "new", label: "Сначала новые" },
      { value: "area_desc", label: "Сначала большая площадь" },
    ];
    // «Ближе к моим местам» — только в варианте «Мои места» и когда места уже отмечены
    const { commute } = window.App;
    function renderMenu() {
      const all = commute.variant === "places" && commute.getPlaces().length ? [...options, { value: "commute", label: "Ближе к моим местам" }] : options;
      menu.innerHTML = all
        .map((o) => `<button type="button" class="preset-chip${state.sort === o.value ? " is-active" : ""}" data-sort="${o.value}" style="display:block;width:100%;text-align:left;margin-bottom:6px;">${o.label}</button>`)
        .join("");
    }

    function close() {
      menu.hidden = true;
    }

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      renderMenu();
      menu.hidden = !menu.hidden;
    });
    menu.addEventListener("click", (e) => {
      const item = e.target.closest("[data-sort]");
      if (!item) return;
      state.sort = item.dataset.sort;
      if (state.sort === "commute" && window.App.track) window.App.track("Сортировка: ближе к моим местам");
      close();
      renderResults();
    });
    document.addEventListener("click", (e) => {
      if (!menu.hidden && !menu.contains(e.target) && e.target !== btn) close();
    });
  }

  window.App = window.App || {};
  window.App.setupSort = setupSort;
})();
