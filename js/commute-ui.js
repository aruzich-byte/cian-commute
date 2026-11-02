(function () {
  const { commute, createOverlayController, pluralize, formatPrice, computeResults, renderResults } = window.App;
  const { KINDS, MODES, LIMITS } = commute;
  const isZone = commute.variant === "zone";
  const MAX_PLACES = isZone ? 3 : 5;
  const track = (event, opts) => window.App.track && window.App.track(event, opts);

  const ICON_CLOSE = '<svg viewBox="0 0 16 16" fill="none"><path d="M14.207 3.20703L9.41406 8L14.207 12.793L12.793 14.207L8 9.41406L3.20703 14.207L1.79297 12.793L6.58594 8L1.79297 3.20703L3.20703 1.79297L8 6.58594L12.793 1.79297L14.207 3.20703Z" fill="currentColor"/></svg>';
  const ICON_CHEVRON = '<svg viewBox="0 0 16 16" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M6.354 3.293L4.939 4.707L8.232 8L4.939 11.293L6.354 12.707L11.061 8L6.354 3.293Z" fill="currentColor"/></svg>';
  const ICON_PLUS = '<svg viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  const ICON_TARGET = '<svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5" stroke="currentColor" stroke-width="1.6"/><circle cx="8" cy="8" r="1.6" fill="currentColor"/><path d="M8 1v2.2M8 12.8V15M1 8h2.2M12.8 8H15" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  const ICON_SEARCH = '<svg viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.6"/><path d="M11 11l3.5 3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';

  // ---------- Шторки «Транспортной доступности» ----------
  // Разметку собираем здесь же: три шторки поверх выдачи и полноэкранных фильтров
  // (z-index выше .filters-modal — строка «Время в пути» открывает их прямо оттуда).
  const screen = document.getElementById("pin-sheet").parentElement;
  // Фокус в поле шторки может прокрутить экран телефона (overflow: hidden) и вытащить
  // наверх спрятанные под ним шторки — экран прокручиваться не должен никогда
  screen.addEventListener("scroll", () => {
    if (screen.scrollTop) screen.scrollTop = 0;
  });

  function createSheet(id, level) {
    const backdrop = document.createElement("div");
    backdrop.className = `overlay-backdrop commute-backdrop commute-backdrop--${level}`;
    const sheet = document.createElement("div");
    sheet.className = `sheet commute-sheet commute-sheet--${level}`;
    sheet.id = id;
    sheet.innerHTML = `
      <button class="sheet__close" type="button" aria-label="Закрыть" data-role="close">${ICON_CLOSE}</button>
      <div class="sheet__header">
        <span class="sheet__title" data-role="title"></span>
        <button class="sheet__reset" type="button" data-role="reset" hidden>Сбросить</button>
      </div>
      <div class="sheet__body" data-role="body"></div>
      <div class="sheet__footer" data-role="footer"></div>
    `;
    screen.appendChild(backdrop);
    screen.appendChild(sheet);
    const overlay = createOverlayController(backdrop, sheet);
    const part = (role) => sheet.querySelector(`[data-role="${role}"]`);
    return { overlay, backdrop, sheet, title: part("title"), reset: part("reset"), body: part("body"), footer: part("footer"), closeBtn: part("close") };
  }

  function limitText(place) {
    return place.limit ? `до ${place.limit} мин` : "время не важно";
  }

  // ---------- Список мест ----------
  const list = createSheet("commute-list-sheet", "list");
  list.title.textContent = isZone ? "Время в пути" : "Мои места";
  list.reset.hidden = !isZone;

  function resultsCount() {
    const { base, strict, priceActive } = computeResults();
    return priceActive ? strict.length : base.length;
  }

  function renderList() {
    const places = commute.getPlaces();
    const intro = isZone
      ? "Покажем только квартиры, откуда вы доберётесь до каждого адреса за указанное время"
      : "Покажем их на карте и в каждом объявлении — сколько до них добираться";
    const rows = places
      .map(
        (p) => `
        <button class="place-row" type="button" data-id="${p.id}">
          <span class="place-row__icon">${KINDS[p.kind].icon}</span>
          <span class="place-row__text">
            <span class="place-row__title">${commute.placeTitle(p)}</span>
            <span class="place-row__address">${p.address}</span>
            <span class="place-row__meta">${MODES[p.mode].icon}${MODES[p.mode].label} · ${limitText(p)}</span>
          </span>
          <span class="place-row__chevron">${ICON_CHEVRON}</span>
        </button>`
      )
      .join("");
    // Пустой список — сразу предлагаем типы мест: один тап, и форма уже знает, что это
    const starter = places.length
      ? ""
      : `<div class="commute-starter">
          <div class="commute-starter__title">${isZone ? "Куда нужно ездить?" : "С чего начнём?"}</div>
          <div class="chipset">${Object.entries(KINDS)
            .map(([key, k]) => `<button type="button" class="pick-chip kind-chip" data-kind="${key}">${k.icon}${k.label}</button>`)
            .join("")}</div>
        </div>`;
    const addBtn =
      places.length && places.length < MAX_PLACES
        ? `<button class="place-add" type="button" data-role="add">${ICON_PLUS}${isZone ? "Добавить ещё адрес" : "Добавить место"}</button>`
        : "";
    list.body.innerHTML = `<p class="commute-intro">${intro}</p>${starter}<div class="place-list">${rows}</div>${addBtn}`;

    if (isZone) {
      const n = resultsCount();
      list.footer.innerHTML = `<button class="btn-primary" type="button" data-role="done">Смотреть ${n} ${pluralize(n, "объявление", "объявления", "объявлений")}</button>`;
    } else {
      list.footer.innerHTML = `<button class="btn-primary" type="button" data-role="done">Готово</button>`;
    }
  }

  list.body.addEventListener("click", (e) => {
    const row = e.target.closest(".place-row");
    if (row) return openEditor(commute.getPlaces().find((p) => p.id === row.dataset.id));
    const kind = e.target.closest(".kind-chip");
    if (kind) return openEditor(null, kind.dataset.kind);
    if (e.target.closest('[data-role="add"]')) openEditor(null);
  });
  list.footer.addEventListener("click", (e) => {
    if (!e.target.closest('[data-role="done"]')) return;
    track(isZone ? "Время в пути: смотреть" : "Мои места: готово", { value: `${commute.getPlaces().length} мест` });
    closeList();
  });
  list.reset.addEventListener("click", () => {
    track("Время в пути: сбросить");
    commute.setPlaces([]);
  });
  list.closeBtn.addEventListener("click", () => closeList());
  list.backdrop.addEventListener("click", () => closeList());

  function openList(source) {
    track(isZone ? "Время в пути: открыл" : "Мои места: открыл", { value: source });
    renderList();
    list.overlay.open();
  }

  function closeList() {
    list.overlay.close();
  }

  // ---------- Форма места ----------
  const editor = createSheet("place-editor-sheet", "editor");
  let draft = null;
  let editingId = null;
  let addressOpen = false;

  function openEditor(place, presetKind) {
    editingId = place ? place.id : null;
    draft = place
      ? { ...place }
      : { kind: presetKind || "work", title: "", address: "", lat: null, lon: null, mode: "transit", limit: isZone ? 30 : null };
    addressOpen = !draft.address;
    editor.title.textContent = place ? commute.placeTitle(place) : isZone ? "Куда ездите" : "Новое место";
    renderEditor();
    editor.overlay.open();
  }

  function closeEditor() {
    editor.overlay.close();
  }

  function suggestionsHtml(query) {
    const q = query.trim().toLowerCase();
    const matches = commute.ADDRESS_SUGGESTIONS.filter((s) => !q || `${s.address} ${s.hint}`.toLowerCase().includes(q)).slice(0, q ? 6 : 5);
    const items = [
      `<button type="button" class="addr-item addr-item--map" data-role="pick-map"><span class="addr-item__icon">${ICON_TARGET}</span><span class="addr-item__text"><span class="addr-item__title">Указать на карте</span></span></button>`,
      ...matches.map(
        (s, i) => `<button type="button" class="addr-item" data-suggest="${commute.ADDRESS_SUGGESTIONS.indexOf(s)}">
          <span class="addr-item__icon">${ICON_SEARCH}</span>
          <span class="addr-item__text"><span class="addr-item__title">${s.address}</span><span class="addr-item__hint">${s.hint}</span></span>
        </button>`
      ),
    ];
    if (q.length >= 3 && matches.length === 0) {
      items.push(`<button type="button" class="addr-item" data-role="geocode"><span class="addr-item__icon">${ICON_SEARCH}</span><span class="addr-item__text"><span class="addr-item__title">Найти «${query.trim()}»</span></span></button>`);
    }
    return items.join("");
  }

  function renderEditor() {
    const limits = isZone ? LIMITS : [null, ...LIMITS];
    editor.body.innerHTML = `
      <div class="editor-section">
        <div class="editor-section__title">Что это за место</div>
        <div class="chipset">${Object.entries(KINDS)
          .map(([key, k]) => `<button type="button" class="pick-chip kind-chip${draft.kind === key ? " is-active" : ""}" data-kind="${key}">${k.icon}${k.label}</button>`)
          .join("")}</div>
        <div class="field editor-name"${draft.kind === "other" ? "" : " hidden"}>
          <input type="text" data-role="title" placeholder="Название, например «Бассейн»" value="${draft.title || ""}" autocomplete="off" />
        </div>
      </div>
      <div class="editor-section">
        <div class="editor-section__title">Адрес</div>
        <div class="field">
          <span class="field__icon">${ICON_SEARCH}</span>
          <input type="text" data-role="address" placeholder="Улица, дом или место" value="${draft.address || ""}" autocomplete="off" />
        </div>
        <div class="addr-list" data-role="addr-list"${addressOpen ? "" : " hidden"}>${suggestionsHtml(addressOpen ? draft.address || "" : "")}</div>
      </div>
      <div class="editor-section">
        <div class="editor-section__title">Как добираетесь</div>
        <div class="mode-switch">${Object.entries(MODES)
          .map(([key, m]) => `<button type="button" class="mode-switch__opt${draft.mode === key ? " is-active" : ""}" data-mode="${key}">${m.icon}${m.label}</button>`)
          .join("")}</div>
      </div>
      <div class="editor-section">
        <div class="editor-section__title">${isZone ? "Сколько готовы ехать" : "Сколько готовы ехать (необязательно)"}</div>
        <div class="chipset">${limits
          .map((l) => `<button type="button" class="pick-chip limit-chip${draft.limit === l ? " is-active" : ""}" data-limit="${l ?? ""}">${l ? `до ${l} мин` : "Не важно"}</button>`)
          .join("")}</div>
      </div>
    `;
    renderEditorFooter();
  }

  function renderEditorFooter() {
    const ready = draft.lat != null && draft.address;
    editor.footer.innerHTML = `
      <button class="btn-primary" type="button" data-role="save"${ready ? "" : " disabled"}>${editingId ? "Сохранить" : "Добавить"}</button>
      ${editingId ? '<button class="btn-link-danger" type="button" data-role="delete">Удалить место</button>' : ""}
    `;
  }

  function setAddress({ address, lat, lon }) {
    Object.assign(draft, { address, lat, lon });
    addressOpen = false;
    renderEditor();
  }

  // Поиск адреса, которого нет в подсказках: пробуем геокодер Яндекса (без ключа может не ответить)
  function geocodeQuery(query) {
    const listEl = editor.body.querySelector('[data-role="addr-list"]');
    if (typeof ymaps === "undefined" || !ymaps.geocode) return;
    listEl.insertAdjacentHTML("beforeend", '<div class="addr-note">Ищем…</div>');
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000));
    Promise.race([ymaps.geocode(`Санкт-Петербург, ${query}`, { results: 1 }), timeout])
      .then((res) => {
        const obj = res.geoObjects.get(0);
        if (!obj) throw new Error("empty");
        const [lat, lon] = obj.geometry.getCoordinates();
        setAddress({ address: obj.properties.get("name") || query, lat, lon });
      })
      .catch(() => {
        const note = listEl.querySelector(".addr-note");
        if (note) note.textContent = "Не нашли такой адрес — укажите место на карте";
      });
  }

  editor.body.addEventListener("click", (e) => {
    const kind = e.target.closest(".kind-chip");
    if (kind) {
      draft.kind = kind.dataset.kind;
      if (!editingId) editor.title.textContent = isZone ? "Куда ездите" : "Новое место";
      editor.body.querySelectorAll(".kind-chip").forEach((c) => c.classList.toggle("is-active", c === kind));
      editor.body.querySelector(".editor-name").hidden = draft.kind !== "other";
      return;
    }
    const mode = e.target.closest(".mode-switch__opt");
    if (mode) {
      draft.mode = mode.dataset.mode;
      editor.body.querySelectorAll(".mode-switch__opt").forEach((c) => c.classList.toggle("is-active", c === mode));
      return;
    }
    const limit = e.target.closest(".limit-chip");
    if (limit) {
      draft.limit = limit.dataset.limit ? Number(limit.dataset.limit) : null;
      editor.body.querySelectorAll(".limit-chip").forEach((c) => c.classList.toggle("is-active", c === limit));
      return;
    }
    const suggest = e.target.closest("[data-suggest]");
    if (suggest) {
      const s = commute.ADDRESS_SUGGESTIONS[Number(suggest.dataset.suggest)];
      setAddress({ address: s.address, lat: s.lat, lon: s.lon });
      return;
    }
    if (e.target.closest('[data-role="geocode"]')) {
      geocodeQuery(editor.body.querySelector('[data-role="address"]').value);
      return;
    }
    if (e.target.closest('[data-role="pick-map"]')) startMapPick();
  });

  editor.body.addEventListener("focusin", (e) => {
    if (e.target.dataset.role !== "address" || addressOpen) return;
    addressOpen = true;
    const listEl = editor.body.querySelector('[data-role="addr-list"]');
    listEl.innerHTML = suggestionsHtml("");
    listEl.hidden = false;
  });

  editor.body.addEventListener("input", (e) => {
    if (e.target.dataset.role === "title") draft.title = e.target.value.trim();
    if (e.target.dataset.role !== "address") return;
    Object.assign(draft, { address: e.target.value, lat: null, lon: null });
    const listEl = editor.body.querySelector('[data-role="addr-list"]');
    listEl.innerHTML = suggestionsHtml(e.target.value);
    listEl.hidden = false;
    renderEditorFooter();
  });

  editor.footer.addEventListener("click", (e) => {
    if (e.target.closest('[data-role="save"]')) {
      const place = { ...draft, title: draft.kind === "other" ? draft.title : "" };
      if (editingId) place.id = editingId;
      track(editingId ? "Изменил место" : "Добавил место", { value: `${KINDS[place.kind].label} · ${MODES[place.mode].label} · ${limitText(place)}` });
      commute.upsertPlace(place);
      closeEditor();
      if (!list.overlay.isOpen()) openList("после добавления");
      return;
    }
    if (e.target.closest('[data-role="delete"]')) {
      track("Удалил место", { value: KINDS[draft.kind].label });
      commute.removePlace(editingId);
      closeEditor();
    }
  });
  editor.closeBtn.addEventListener("click", closeEditor);
  editor.backdrop.addEventListener("click", closeEditor);

  // ---------- Выбор точки на карте ----------
  // Шторки и шапка уезжают, в центре карты — булавка; двигаем карту под неё и жмём «Готово»
  const pick = document.createElement("div");
  pick.className = "map-pick";
  pick.hidden = true;
  pick.innerHTML = `
    <div class="map-pick__pin">${KINDS.other.icon}</div>
    <div class="map-pick__bar">
      <div class="map-pick__hint">Подвиньте карту, чтобы булавка встала на нужное место</div>
      <div class="map-pick__buttons">
        <button class="btn-outline" type="button" data-role="cancel">Отмена</button>
        <button class="btn-primary" type="button" data-role="done">Готово</button>
      </div>
    </div>
  `;
  document.getElementById("map-area").appendChild(pick);
  let pickReturn = null;

  function startMapPick() {
    const map = window.App.getYandexMap && window.App.getYandexMap();
    if (!map) return;
    track("Выбор места на карте");
    pickReturn = { list: list.overlay.isOpen(), filters: document.getElementById("filters-modal").classList.contains("is-open") };
    editor.overlay.close();
    list.overlay.close();
    if (pickReturn.filters) document.getElementById("filters-modal").classList.add("is-hidden-for-pick");
    document.body.classList.add("is-map-picking");
    pick.hidden = false;
  }

  function finishMapPick(point) {
    pick.hidden = true;
    document.body.classList.remove("is-map-picking");
    document.getElementById("filters-modal").classList.remove("is-hidden-for-pick");
    if (pickReturn.list) list.overlay.open();
    editor.overlay.open();
    if (point) setAddress(point);
  }

  pick.addEventListener("click", (e) => {
    if (e.target.closest('[data-role="cancel"]')) return finishMapPick(null);
    if (!e.target.closest('[data-role="done"]')) return;
    const [lat, lon] = window.App.getYandexMap().getCenter();
    const fallback = { address: "Точка на карте", lat, lon };
    const timeout = new Promise((resolve) => setTimeout(() => resolve(null), 2500));
    const lookup = ymaps.geocode([lat, lon], { results: 1 }).then(
      (res) => res.geoObjects.get(0),
      () => null
    );
    Promise.race([lookup, timeout]).then((obj) => {
      finishMapPick(obj ? { address: obj.properties.get("name") || fallback.address, lat, lon } : fallback);
    });
  });

  // ---------- Подробности: дорога от объявления до каждого места ----------
  // Это то, что в продукте жило бы в карточке объекта: все места × все способы добраться
  const details = createSheet("commute-details-sheet", "list");
  details.title.textContent = "Дорога до ваших мест";

  function openCommuteDetails(item) {
    track("Открыл время до мест", { item });
    const blocks = commute
      .getPlaces()
      .map((p) => {
        const current = commute.minutesTo(p, item);
        let verdict = "";
        if (p.limit) {
          verdict =
            current <= p.limit
              ? `<div class="commute-verdict is-ok">Укладываетесь в ${p.limit} мин</div>`
              : `<div class="commute-verdict is-over">Дольше вашего лимита на ${commute.formatMinutes(current - p.limit)}</div>`;
        }
        const modes = Object.entries(MODES)
          .map(([key, m]) => {
            const min = commute.minutesTo(p, item, key);
            return `<div class="commute-mode${key === p.mode ? " is-current" : ""}">
              <span class="commute-mode__icon">${m.icon}</span>
              <span class="commute-mode__label">${m.label}${key === p.mode ? '<span class="commute-mode__tag">ваш способ</span>' : ""}</span>
              <span class="commute-mode__time">${commute.formatMinutes(min)}</span>
            </div>`;
          })
          .join("");
        return `<div class="commute-block">
          <div class="commute-block__head">
            <span class="place-row__icon">${KINDS[p.kind].icon}</span>
            <span class="place-row__text">
              <span class="place-row__title">${commute.placeTitle(p)}</span>
              <span class="place-row__address">${p.address}</span>
            </span>
          </div>
          ${modes}
          ${verdict}
        </div>`;
      })
      .join("");
    const price = `${formatPrice(item.price)}${item.dealType === "rent" ? "/мес." : ""}`;
    details.body.innerHTML = `
      <p class="commute-intro">${price} · ${item.address}</p>
      ${blocks}
      <p class="commute-note">Время примерное, без учёта пробок в час пик</p>
    `;
    details.footer.innerHTML = `
      <button class="btn-primary" type="button" data-role="done">Понятно</button>
      <button class="btn-outline" type="button" data-role="edit">${isZone ? "Изменить адреса" : "Изменить места"}</button>
    `;
    details.overlay.open();
  }

  details.footer.addEventListener("click", (e) => {
    if (e.target.closest('[data-role="edit"]')) {
      details.overlay.close();
      openList("из подробностей");
    } else if (e.target.closest('[data-role="done"]')) details.overlay.close();
  });
  details.closeBtn.addEventListener("click", details.overlay.close);
  details.backdrop.addEventListener("click", details.overlay.close);

  // ---------- Точки входа: быстрый фильтр, строка в «Фильтрах», плашка в выдаче ----------
  const qfChip = document.getElementById("qf-commute");
  const qfLabel = document.getElementById("qf-commute-label");
  qfChip.querySelector(".qf-chip__icon").innerHTML = isZone ? commute.ICON_CLOCK : commute.ICON_PLACES;
  qfChip.addEventListener("click", () => openList("быстрый фильтр"));
  document.getElementById("f-commute-row").addEventListener("click", () => openList("фильтры"));

  function updateLabels() {
    const places = commute.getPlaces();
    qfChip.classList.toggle("is-set", places.length > 0);
    const rowValue = document.getElementById("f-commute-value");
    document.getElementById("f-commute-label").textContent = isZone ? "Время в пути" : "Мои места";
    if (isZone) {
      if (!places.length) qfLabel.textContent = "Время в пути";
      else if (places.length === 1) qfLabel.textContent = `${commute.placeTitle(places[0])} · до ${places[0].limit} мин`;
      else qfLabel.textContent = `Время в пути · ${places.length}`;
      rowValue.textContent = places.length
        ? places.map((p) => `${commute.placeTitle(p)} до ${p.limit} мин ${MODES[p.mode].short}`).join(", ")
        : "Куда нужно ездить и сколько готовы тратить";
    } else {
      qfLabel.textContent = places.length ? `Мои места · ${places.length}` : "Мои места";
      rowValue.textContent = places.length ? places.map(commute.placeTitle).join(", ") : "Работа, родители, школа — покажем время в пути";
    }
  }

  const BANNER_KEY = `commute-banner-dismissed:${commute.variant}`;
  function bannerDismissed() {
    try {
      return localStorage.getItem(BANNER_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function commuteBannerEl() {
    if (commute.getPlaces().length || bannerDismissed()) return null;
    const el = document.createElement("div");
    el.className = "commute-banner";
    el.innerHTML = `
      <div class="commute-banner__top">
        <span class="commute-banner__icon">${isZone ? commute.ICON_CLOCK : commute.ICON_PLACES}</span>
        <div class="commute-banner__text">
          <div class="commute-banner__title">${isZone ? "Ищите по времени в пути" : "Сколько ехать до работы?"}</div>
          <p class="commute-banner__desc">${
            isZone
              ? "Укажите, куда нужно ездить, — покажем квартиры, откуда вы доберётесь за нужное время"
              : "Отметьте важные места — покажем время в пути до них от каждой квартиры"
          }</p>
        </div>
        <button class="commute-banner__close" type="button" aria-label="Скрыть">${ICON_CLOSE}</button>
      </div>
      <button class="commute-banner__btn" type="button">${isZone ? "Указать адрес" : "Отметить места"}</button>
    `;
    el.querySelector(".commute-banner__btn").addEventListener("click", () => {
      track("Плашка: нажал");
      openList("плашка");
    });
    el.querySelector(".commute-banner__close").addEventListener("click", () => {
      track("Плашка: закрыл");
      try {
        localStorage.setItem(BANNER_KEY, "1");
      } catch (e) {
        /* без сохранения плашка вернётся после перезагрузки */
      }
      el.remove();
    });
    return el;
  }

  // Пустая выдача в зоне: подсказываем, сколько вариантов даст лимит побольше
  function renderZoneEmpty(container) {
    const places = commute.getPlaces();
    const el = document.createElement("div");
    el.className = "empty-state";
    el.innerHTML = `
      <div class="empty-state__title">Нет квартир, откуда можно доехать за это время</div>
      <p class="empty-state__hint">Увеличьте время в пути или выберите другой способ добраться</p>
      <button class="commute-banner__btn" type="button">Добавить 15 мин к каждому адресу</button>
    `;
    el.querySelector("button").addEventListener("click", () => {
      track("Пустая зона: +15 мин");
      commute.setPlaces(places.map((p) => ({ ...p, limit: Math.min(p.limit + 15, 90) })));
    });
    container.appendChild(el);
  }

  commute.onChange(() => {
    updateLabels();
    renderResults();
    if (list.overlay.isOpen()) renderList();
  });
  updateLabels();

  window.App = window.App || {};
  Object.assign(window.App, { openCommuteDetails, commuteBannerEl, renderZoneEmpty, openCommuteList: openList });
})();
