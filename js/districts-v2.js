(function () {
  // ---------- Районы, версия 2 — как в отелях Авиасейлс ----------
  // Районы видно сразу, без приближения: еле заметные цветные зоны и подписи на карте (тап — шторка района)
  // и кнопка «Районы» справа сверху со списком всех районов и фильтром по группам.
  // Подписи не накладываются друг на друга: на каждом зуме показываем те, что помещаются.
  // Версия 1 — виджет при приближении (districts-ui.js); переключатель — в панели прототипа.
  if (window.App.ui.districtsVersion !== "2") return;

  const { DISTRICTS, DISTRICT_GROUPS, onMapReady, createCommuteSheet, commute, openDistrict, districtPhotoUrl } = window.App;
  const track = (event, opts) => window.App.track && window.App.track(event, opts);

  const LABELS_MIN_ZOOM = 9;
  const LABELS_KEY = "district-labels";
  const ICON_CHEVRON = '<svg viewBox="0 0 16 16" fill="none"><path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const ICON_DISTRICTS = '<svg viewBox="0 0 16 16" fill="none"><path d="M2 4.5 6 2.5l4 2 4-2v9l-4 2-4-2-4 2v-9Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M6 2.5v9M10 4.5v9" stroke="currentColor" stroke-width="1.5"/></svg>';

  // На карте — короткое имя: «Сенная и Адмиралтейская» → «Сенная», «Васильевский: линии» → «Васильевский»
  const shortName = (d) => d.name.replace(/:.*$/, "").split(" и ")[0];

  let labelsOn = true;
  try {
    labelsOn = localStorage.getItem(LABELS_KEY) !== "off";
  } catch (e) {
    /* без сохранения */
  }

  // ---------- Время в строке списка: до своего места, если оно есть, иначе до центра ----------
  function timeOf(d) {
    const place = commute.getPlaces()[0];
    if (place) {
      const min = commute.minutesTo(place, { lat: d.center[0], lon: d.center[1] });
      return { min, text: commute.formatMinutes(min), label: `до «${commute.placeTitle(place)}»` };
    }
    if (d.toCenter.startsWith("в центре")) return { min: 0, text: "в центре", label: "" };
    const m = d.toCenter.match(/^((?:\d+ ч)?\s?(?:\d+ мин)?)/);
    return { min: 0, text: m ? m[1].trim() : "", label: "до центра" };
  }

  // ---------- Список районов ----------
  const list = createCommuteSheet("districts-list-sheet", "list");
  list.sheet.classList.add("districts-list");
  list.title.textContent = "Районы";
  let group = "all";

  function rowHtml(d) {
    const t = timeOf(d);
    return `<button type="button" class="district-row-item" data-district="${d.id}">
        <img class="district-row-item__photo" src="${districtPhotoUrl(d, 160)}" alt="" loading="lazy" />
        <span class="district-row-item__text">
          <span class="district-row-item__name"><span class="district-dot is-${d.group}"></span>${d.name}</span>
          <span class="district-row-item__tagline">${d.tagline}</span>
        </span>
        <span class="district-row-item__time">${t.text}${t.label ? `<span>${t.label}</span>` : ""}</span>
      </button>`;
  }

  function renderList() {
    const hasPlace = commute.getPlaces().length > 0;
    let items = DISTRICTS.filter((d) => group === "all" || d.group === group);
    // Есть свои места — сверху районы, откуда до них ближе всего
    if (hasPlace) items = items.slice().sort((a, b) => timeOf(a).min - timeOf(b).min);
    const chips = [["all", "Все"], ...Object.entries(DISTRICT_GROUPS)]
      .map(([id, name]) => `<button type="button" class="pick-chip${group === id ? " is-active" : ""}" data-group="${id}">${id !== "all" ? `<span class="district-dot is-${id}"></span>` : ""}${name}</button>`)
      .join("");
    list.body.innerHTML = `
      <div class="chip-scroll districts-list__groups">${chips}</div>
      ${hasPlace ? `<p class="commute-note districts-list__hint">Сначала районы, откуда быстрее до «${commute.placeTitle(commute.getPlaces()[0])}»</p>` : ""}
      <div class="districts-list__items">${items.map(rowHtml).join("")}</div>
    `;
    list.footer.innerHTML = `
      <div class="toggle-row">
        <span class="toggle-row__label">Районы на карте</span>
        <button type="button" class="switch${labelsOn ? " is-on" : ""}" data-role="labels-toggle" aria-label="Районы на карте"><span class="switch__knob"></span></button>
      </div>
    `;
  }

  list.body.addEventListener("click", (e) => {
    const chip = e.target.closest("[data-group]");
    if (chip) {
      group = chip.dataset.group;
      track("Фильтр районов", { value: chip.textContent.trim() });
      const scroll = list.body.querySelector(".districts-list__groups").scrollLeft;
      renderList();
      list.body.querySelector(".districts-list__groups").scrollLeft = scroll;
      return;
    }
    const row = e.target.closest("[data-district]");
    if (!row) return;
    const d = DISTRICTS.find((x) => x.id === row.dataset.district);
    list.overlay.close();
    if (mapRef) centerOnVisible(mapRef, d.center, d.group === "suburb" ? 12 : 13);
    openDistrict(d, "список районов");
  });

  list.footer.addEventListener("click", (e) => {
    if (!e.target.closest('[data-role="labels-toggle"]')) return;
    labelsOn = !labelsOn;
    try {
      localStorage.setItem(LABELS_KEY, labelsOn ? "on" : "off");
    } catch (err) {
      /* без сохранения */
    }
    track(labelsOn ? "Показал районы на карте" : "Скрыл районы на карте");
    renderList();
    if (relayout) relayout();
  });

  list.closeBtn.addEventListener("click", list.overlay.close);
  list.backdrop.addEventListener("click", list.overlay.close);

  // ---------- Кнопка «Районы» справа сверху ----------
  const mapArea = document.getElementById("map-area");
  const header = document.getElementById("header");
  const sheetList = document.getElementById("sheet-list");
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "districts-btn";
  btn.innerHTML = `${ICON_DISTRICTS}Районы`;
  mapArea.appendChild(btn);
  btn.addEventListener("click", () => {
    track("Открыл список районов");
    renderList();
    list.overlay.open();
    list.body.scrollTop = 0;
  });

  commute.onChange(() => {
    if (list.sheet.classList.contains("is-open")) renderList();
  });

  // Поставить точку в середину видимой части карты — между шапкой и верхом списка объявлений,
  // а не в центр всего экрана (там её закрыла бы шторка списка)
  function centerOnVisible(map, coords, zoom) {
    const rect = mapArea.getBoundingClientRect();
    const top = header.getBoundingClientRect().bottom;
    const bottom = Math.min(sheetList.getBoundingClientRect().top, rect.bottom);
    const dy = rect.height / 2 - ((top + bottom) / 2 - rect.top);
    const projection = map.options.get("projection");
    const [x, y] = projection.toGlobalPixels(coords, zoom);
    map.setCenter(projection.fromGlobalPixels([x, y + dy], zoom), zoom, { duration: 300 });
  }

  // ---------- Зоны районов на карте ----------
  // Как у Авиасейлс: полупрозрачные цветные пятна районов, еле заметные под пинами.
  // Контуры — настоящие границы муниципальных округов из OpenStreetMap, собранные в районы,
  // вода не закрашена (см. districts-zones.js). Цвет — по группе района, как у подписи.
  const ZONE_COLORS = {
    center: "#e2572b",
    old: "#c2378a",
    green: "#2f9e4f",
    new: "#7c4ddb",
    panel: "#e0a100",
    suburb: "#3d7cc9",
  };
  const ZONES = window.App.DISTRICT_ZONES || {};

  // ---------- Подписи районов на карте ----------
  let mapRef = null;
  let relayout = null;

  onMapReady((map) => {
    mapRef = map;
    const zones = new ymaps.GeoObjectCollection();
    DISTRICTS.forEach((d) => {
      (ZONES[d.id] || []).forEach((contours) => {
        zones.add(
          new ymaps.Polygon(contours, {}, {
            fillColor: ZONE_COLORS[d.group],
            fillOpacity: 0.13,
            strokeColor: "#ffffff",
            strokeOpacity: 0.7,
            strokeWidth: 1,
            // Зоны не перехватывают тапы: карта двигается, пины и подписи нажимаются
            interactivityModel: "default#transparent",
            zIndex: 10,
          })
        );
      });
    });
    map.geoObjects.add(zones);
    const labels = new ymaps.GeoObjectCollection();
    map.geoObjects.add(labels);
    const layout = ymaps.templateLayoutFactory.createClass(
      `<div class="district-label is-$[properties.group]">$[properties.name]${ICON_CHEVRON}</div>`
    );

    // Ширина подписи на глаз: ~6,8 px на букву плюс поля и стрелка
    const labelWidth = (name) => Math.round(name.length * 6.8 + 30);
    const LABEL_H = 24;
    const GAP = 6;
    let shownZoom = null;

    function layoutLabels() {
      const zoom = map.getZoom();
      if (zoom === shownZoom && labels.getLength()) return;
      shownZoom = zoom;
      labels.removeAll();
      zones.options.set("visible", labelsOn && zoom >= LABELS_MIN_ZOOM);
      if (!labelsOn || zoom < LABELS_MIN_ZOOM) return;
      const projection = map.options.get("projection");
      const placed = [];
      // Жадно: по порядку данных (сначала центр), берём подпись, если она ни с кем не пересекается
      DISTRICTS.forEach((d) => {
        const name = shortName(d);
        const [x, y] = projection.toGlobalPixels(d.center, zoom);
        const w = labelWidth(name);
        const box = [x - w / 2 - GAP, y - LABEL_H / 2 - GAP, x + w / 2 + GAP, y + LABEL_H / 2 + GAP];
        if (placed.some((b) => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1])) return;
        placed.push(box);
        const mark = new ymaps.Placemark(
          d.center,
          { name, group: d.group },
          {
            iconLayout: layout,
            iconShape: { type: "Rectangle", coordinates: [[-w / 2, -LABEL_H / 2], [w / 2, LABEL_H / 2]] },
            zIndex: 100,
            zIndexHover: 100,
            zIndexActive: 100,
          }
        );
        mark.events.add("click", () => openDistrict(d, "подпись на карте"));
        labels.add(mark);
      });
    }

    relayout = () => {
      shownZoom = null;
      layoutLabels();
    };

    function placeButton() {
      btn.style.top = `${header.offsetTop + header.offsetHeight + 8}px`;
      btn.hidden = sheetList.classList.contains("is-full");
    }

    map.events.add(["boundschange", "actionend"], () => {
      layoutLabels();
      placeButton();
    });
    new MutationObserver(placeButton).observe(sheetList, { attributes: true, attributeFilter: ["class", "style"] });
    layoutLabels();
    placeButton();
  });
})();
