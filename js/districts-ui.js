(function () {
  const { findDistrict, onMapReady, createCommuteSheet, pluralize } = window.App;
  const track = (event, opts) => window.App.track && window.App.track(event, opts);

  // ---------- Карточка района на карте ----------
  // На карте ничего не рисуем. Когда человек приблизился к району, справа сверху появляется
  // маленький виджет «О районе» — фото примечательной архитектуры района, который сейчас
  // в середине видимой карты, и его оценка; тап — шторка района (как районы в отелях Авиасейлс).
  // На обзорном зуме виджета нет.
  const MIN_ZOOM = 12;

  // Фото — с Викисклада по имени файла (см. PHOTOS в districts.js); width — ширина превью
  function photoUrl(d, width) {
    return d.photo ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(d.photo.file)}?width=${width}` : "";
  }
  const formatScore = (n) => n.toFixed(1).replace(".", ",");

  // ---------- Шторка района ----------
  const sheet = createCommuteSheet("district-sheet", "list");
  sheet.sheet.classList.add("district-sheet");
  sheet.footer.remove();

  // Пробки вечером — средний балл со значком пробок Яндекс Карт; цвет «светофора» — по баллу
  const ICON_TRAFFIC = '<svg viewBox="0 0 24 24" fill="none"><path fill="currentColor" fill-rule="evenodd" d="M2.25 12c0 5.523 4.477 10 10 10s10-4.477 10-10-4.477-10-10-10-10 4.477-10 10" clip-rule="evenodd"/><path fill="#4d4d4d" fill-rule="evenodd" d="M2.25 12c0 5.523 4.477 10 10 10s10-4.477 10-10-4.477-10-10-10-10 4.477-10 10m18.333 0a8.333 8.333 0 1 1-16.666 0 8.333 8.333 0 0 1 16.666 0" clip-rule="evenodd"/><path fill="#4d4d4d" d="M9.75 2h2.5c5.514 0 10 4.486 10 10a5.6 5.6 0 0 1-3.976-1.65c-1.018-1.018-1.68-2.104-3.22-3.906C13.694 4.858 11.818 3.25 9.75 3.25c-4.136 0-7.5 3.926-7.5 8.75C1.456 11.059 1 10.005 1 8.875 1 5.085 3.547 2 9.75 2"/></svg>';

  function trafficTone(level) {
    if (level >= 7) return "bad";
    if (level >= 4) return "mid";
    return "good";
  }

  // Плитка «До центра утром»: от двери до Невского в час пик; время крупно, способ мелко — «35 мин» и «на метро».
  // Район сам в центре — пишем, что он в центре, и сколько до Невского пешком.
  function centerTileHtml(d) {
    let label = "До центра утром";
    let time;
    let how;
    if (d.toCenter.startsWith("в центре")) {
      label = "Район в центре";
      const walk = d.toCenter.split(" · ")[1];
      const m = walk && walk.match(/^(\d+ мин) (.*)$/);
      time = m ? m[1] : "Невский";
      how = m ? m[2] : "в двух шагах";
    } else {
      const m = d.toCenter.match(/^((?:\d+ ч)?\s?(?:\d+ мин)?)[:\s]*(.*)$/);
      time = m[1].trim();
      how = m[2];
    }
    return `<div class="district-tile">
        <span class="district-tile__label">${label}</span>
        <span class="district-tile__value">${time}</span>
        ${how ? `<span class="district-tile__sub">${how}</span>` : ""}
      </div>`;
  }

  const ICON_STAR = '<svg viewBox="0 0 16 16"><path d="M8 1.5l2 4.2 4.6.6-3.4 3.2.9 4.5L8 11.8 3.9 14l.9-4.5L1.4 6.3 6 5.7 8 1.5Z" fill="currentColor"/></svg>';

  // Затемнение под заголовком на фото: чем светлее низ кадра, тем плотнее (яркость — в PHOTOS)
  function heroShade(d) {
    const lum = d.photo ? d.photo.lum : 100;
    return Math.min(0.85, Math.max(0.45, 0.3 + lum / 250)).toFixed(2);
  }


  // Карточка школы или сада в горизонтальной ленте: фото, название, рейтинг на Яндекс Картах
  function schoolHtml(s) {
    const src = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(s.photo)}?width=300`;
    return `<div class="district-school">
        <img class="district-school__photo" src="${src}" alt="" loading="lazy" />
        <div class="district-school__name">${s.name}</div>
        <div class="district-school__rating">${ICON_STAR}${formatScore(s.rating)}<span>· ${s.reviews} ${pluralize(s.reviews, "отзыв", "отзыва", "отзывов")}</span></div>
      </div>`;
  }

  // Карточка парка в той же ленте: фото, название и чем он примечателен
  function parkHtml(p) {
    const src = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(p.photo)}?width=300`;
    return `<div class="district-school">
        <img class="district-school__photo" src="${src}" alt="" loading="lazy" />
        <div class="district-school__name">${p.name}</div>
        <div class="district-school__note">${p.note}</div>
      </div>`;
  }

  // Район, открытый в шторке сейчас
  let current = null;

  function renderSheet(d) {
    current = d;
    sheet.title.textContent = "О районе";
    const metro = d.metro.length
      ? `<div class="district-metro">${d.metro
          .map((m) => `<span class="district-metro__item"><span class="district-metro__dot" style="background:#${m.color}"></span>${m.name}</span>`)
          .join("")}</div>`
      : `<div class="district-metro district-metro--none">Своего метро нет · ближайшее: ${d.nearestMetro}</div>`;
    sheet.body.innerHTML = `
      <div class="district-hero" style="--shade:${heroShade(d)}">
        <img class="district-hero__photo" src="${photoUrl(d, 800)}" alt="${d.photo ? d.photo.caption : ""}" style="object-position:50% ${d.photo ? d.photo.pos : 50}%" />
        <span class="district-hero__chip">О районе</span>
        <div class="district-hero__text">
          <span class="district-hero__score">${ICON_STAR}${formatScore(d.score)}</span>
          <div class="district-hero__name">${d.name}</div>
          <p class="district-hero__tagline">${d.tagline}</p>
        </div>
      </div>

      <div class="district-section">
        <div class="district-section__title">Транспорт</div>
        ${metro}
        ${[d.transitNote, d.trafficNote].filter(Boolean).map((n) => `<p class="district-row__note district-transit-note">${n}</p>`).join("")}
        <div class="district-tiles">
          ${centerTileHtml(d)}
          <div class="district-tile">
            <span class="district-tile__label">Пробки вечером</span>
            <span class="district-tile__value">
              <span class="district-traffic__icon is-${trafficTone(d.traffic)}">${ICON_TRAFFIC}</span>
              ${d.traffic}
            </span>
            <span class="district-tile__sub">${pluralize(d.traffic, "балл", "балла", "баллов")} в среднем</span>
          </div>
        </div>
      </div>


      ${d.parks.length ? `<div class="district-section">
        <div class="district-section__title">Парки</div>
        <div class="district-schools">${d.parks.map(parkHtml).join("")}</div>
      </div>` : ""}

      <div class="district-section">
        <div class="district-section__title">Школы</div>
        <div class="district-schools">${d.schools.map(schoolHtml).join("")}</div>
      </div>

      <div class="district-section">
        <div class="district-section__title">Детские сады</div>
        <div class="district-schools">${d.kindergartens.map(schoolHtml).join("")}</div>
      </div>

      ${feedbackHtml(d)}

    `;
    sheet.body.scrollTop = 0;
  }

  // ---------- «Было полезно?» в конце шторки ----------
  // Меряем, полезна ли информация о районе: ответ уходит в трекинг. Ответили — по этому
  // району больше не спрашиваем до перезагрузки страницы.
  const ICON_THUMB = '<svg viewBox="0 0 16 16" fill="none"><path d="M5 7.5 7.5 2c1.1 0 2 .9 2 2v2h3.2c.8 0 1.4.7 1.3 1.5l-.8 5c-.1.6-.6 1-1.2 1H5m0-6v6m0-6H2.5v6H5" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>';
  const feedbackGiven = new Set();

  function feedbackHtml(d) {
    if (feedbackGiven.has(d.id)) return `<div class="district-feedback"><span class="district-feedback__thanks">Спасибо за ответ!</span></div>`;
    return `<div class="district-feedback">
        <span class="district-feedback__q">Информация о районе была полезна?</span>
        <span class="district-feedback__btns">
          <button type="button" class="district-feedback__btn" data-useful="yes">${ICON_THUMB}Да</button>
          <button type="button" class="district-feedback__btn district-feedback__btn--no" data-useful="no">${ICON_THUMB}Нет</button>
        </span>
      </div>`;
  }

  sheet.body.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-useful]");
    if (!btn || !current) return;
    const useful = btn.dataset.useful === "yes";
    track(useful ? "Район: было полезно" : "Район: не было полезно", { value: current.name });
    feedbackGiven.add(current.id);
    btn.closest(".district-feedback").outerHTML = feedbackHtml(current);
  });

  sheet.closeBtn.addEventListener("click", sheet.overlay.close);
  sheet.backdrop.addEventListener("click", sheet.overlay.close);

  // ---------- Виджет «О районе» справа сверху: фото, оценка, подпись; можно закрыть ----------
  const mapArea = document.getElementById("map-area");
  const header = document.getElementById("header");
  const sheetList = document.getElementById("sheet-list");
  const card = document.createElement("div");
  card.className = "district-card";
  card.hidden = true;
  card.innerHTML = `
    <button class="district-card__open" type="button">
      <span class="district-card__art">
        <img class="district-card__photo" alt="" />
        <span class="district-card__score"></span>
      </span>
      <span class="district-card__label">О районе</span>
    </button>
    <button class="district-card__close" type="button" aria-label="Скрыть">
      <svg viewBox="0 0 16 16" fill="none"><path d="M12 4 4 12M4 4l8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
    </button>
  `;
  mapArea.appendChild(card);
  const photo = card.querySelector(".district-card__photo");
  const score = card.querySelector(".district-card__score");
  let shown = null;
  // Закрыли — не показываем до перезагрузки страницы
  let dismissed = false;

  card.querySelector(".district-card__close").addEventListener("click", () => {
    track("Скрыл виджет района", { value: shown ? shown.name : "" });
    dismissed = true;
    showCard(null);
  });

  // Открыть шторку района; source — откуда пришли (виджет, подпись на карте, список районов)
  function openDistrict(d, source) {
    track("Открыл район", { value: `${d.name} · ${source}` });
    renderSheet(d);
    sheet.overlay.open();
  }

  card.querySelector(".district-card__open").addEventListener("click", () => {
    if (shown) openDistrict(shown, "виджет");
  });

  function showCard(d) {
    if (d === shown) return;
    shown = d;
    card.hidden = !d;
    if (!d) return;
    photo.src = photoUrl(d, 250);
    score.textContent = formatScore(d.score);
    card.querySelector(".district-card__open").setAttribute("aria-label", `О районе ${d.name}`);
    // Перезапускаем анимацию появления при смене района
    card.classList.remove("is-new");
    void card.offsetWidth;
    card.classList.add("is-new");
  }

  onMapReady((map) => {
    // Середина видимой части карты: между шапкой и верхом списка
    function visibleCenter() {
      const rect = mapArea.getBoundingClientRect();
      const top = header.getBoundingClientRect().bottom;
      const bottom = Math.min(sheetList.getBoundingClientRect().top, rect.bottom);
      const page = [rect.left + rect.width / 2, (top + bottom) / 2];
      const global = map.converter.pageToGlobal(page);
      return map.options.get("projection").fromGlobalPixels(global, map.getZoom());
    }

    function update() {
      card.style.top = `${header.offsetTop + header.offsetHeight + 8}px`;
      // Во второй версии вместо виджета — подписи районов на карте (districts-v2.js)
      if (window.App.ui.districtsVersion === "2") return showCard(null);
      if (dismissed || map.getZoom() < MIN_ZOOM || sheetList.classList.contains("is-full")) return showCard(null);
      const [lat, lon] = visibleCenter();
      showCard(findDistrict(lat, lon));
    }

    map.events.add(["boundschange", "actionend"], update);
    new MutationObserver(update).observe(sheetList, { attributes: true, attributeFilter: ["class", "style"] });
    update();
  });

  Object.assign(window.App, { openDistrict, districtPhotoUrl: photoUrl });
})();
