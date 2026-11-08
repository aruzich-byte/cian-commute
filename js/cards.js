(function () {
  const { ICONS, formatPrice, priceMetric, computeResults, pinSheetRef, commute } = window.App;

  // ---------- Тексты сниппета ----------
  function formatAreaRu(n) {
    return `${String(n).replace(".", ",")} м²`;
  }

  function flatTypeLabel(item) {
    if (item.flatType === "studio") return item.isApartments ? "Апарт-студия" : "Студия";
    if (item.flatType === "openPlan") return "Своб. планировка";
    return `${item.rooms}-комн. ${item.isApartments ? "апарт." : "кв."}`;
  }

  // «2-комн. кв. · 50 м² · 11/17 этаж»
  function paramsLine(item) {
    return [flatTypeLabel(item), formatAreaRu(item.area), `${item.floor}/${item.floorsTotal} этаж`].join(" · ");
  }

  // Комиссия (clientFee — % от месячной цены), залог (и можно ли частями)
  function termsLine(item) {
    const parts = [item.clientFee ? `Комиссия ${item.clientFee}%` : "Без комиссии"];
    if (item.deposit) parts.push(`Залог ${formatPrice(item.deposit)}${item.depositByParts ? " (можно частями)" : ""}`);
    else if (item.deposit === 0) parts.push("Без залога");
    return parts.join(" · ");
  }

  function addressLine(item) {
    return [item.jk, item.address].filter(Boolean).join(", ");
  }

  // Строка контактов: есть имя — оно заголовок, роль подзаголовком; имени нет —
  // заголовком роль, без подзаголовка. У суперагента подзаголовок — «Суперагент».
  function sellerHtml(item) {
    const title = item.agency || item.sellerRole;
    let subtitle = "";
    if (item.isSuperAgent) subtitle = `<div class="card__seller-level">${ICONS.superAgent}Суперагент</div>`;
    else if (item.agency) subtitle = `<div class="card__seller-role">${item.sellerRole}</div>`;
    return `
      <div class="card__seller-text">
        <div class="card__seller-name">${title}</div>
        ${subtitle}
      </div>
    `;
  }

  function sellerInitials(name) {
    return name
      .replace(/[«»"]/g, "")
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }

  function transportHtml(item) {
    if (!item.metro) return "";
    const color = item.metroColor ? `#${item.metroColor}` : "var(--text-secondary)";
    const timeIcon = item.metroTransport === "transport" ? ICONS.bus : ICONS.walk;
    return `
      <div class="card__transport">
        <span class="card__transport-item"><span class="card__metro-icon" style="color:${color}">${ICONS.pin}</span>${item.metro}</span>
        <span class="card__transport-item">${timeIcon}${item.metroMin} мин.</span>
      </div>
    `;
  }

  // Лейблы под фото: промо (с иконкой, капсула) + составной блок из сегментов.
  // Скругления сегментов (крайние 99px, внутренние 2px) задаются в CSS через :first/:last-child.
  function labelsHtml(item) {
    if (!item.promoLabel && item.labels.length === 0) return "";
    const promo = item.promoLabel
      ? `<span class="card__promo-label">${ICONS.crown}<span class="card__promo-label-text">${item.promoLabel}</span></span>`
      : "";
    const group = item.labels.length
      ? `<span class="card__label-group">${item.labels.map((l) => `<span class="card__label">${l}</span>`).join("")}</span>`
      : "";
    return `<div class="card__labels">${promo}${group}</div>`;
  }

  // Цена в месяц
  function priceRowHtml(item) {
    return `<div class="card__price">${formatPrice(item.price)}/мес.</div>`;
  }

  function priceDeltaInfo(item) {
    const { mode, min, max } = computeResults();
    const v = priceMetric(item, mode);
    const isAbove = max != null && v > max;
    const bound = isAbove ? max : min;
    const pct = bound ? Math.round((Math.abs(v - bound) / bound) * 100) : 0;
    return { isAbove, pct: Math.max(pct, 1) };
  }

  function mixedDeltaHtml(item) {
    const { isAbove, pct } = priceDeltaInfo(item);
    return `<div class="card__delta">${isAbove ? "Дороже" : "Дешевле"} на ${pct}% чем вы искали</div>`;
  }

  function createCarouselCardEl(item) {
    const card = document.createElement("article");
    card.className = "mix-carousel__card";
    card.innerHTML = `
      <div class="mix-carousel__photo">
      </div>
      <div class="mix-carousel__body">
        <div class="mix-carousel__price">${formatPrice(item.price)}/мес.</div>
        <div class="mix-carousel__type">${flatTypeLabel(item)} · ${formatAreaRu(item.area)}</div>
        <div class="mix-carousel__meta">${item.metro || ""}</div>
      </div>
    `;
    card.addEventListener("click", () => {
      if (pinSheetRef.current) pinSheetRef.current.open(item);
    });
    return card;
  }

  function createMixCarouselEl(extras) {
    const wrap = document.createElement("div");
    wrap.className = "mix-carousel";
    wrap.innerHTML = `
      <div class="mix-carousel__header">
        <div class="mix-carousel__title">Доступно по схожей цене</div>
      </div>
      <div class="mix-carousel__track" data-role="track"></div>
    `;
    const track = wrap.querySelector('[data-role="track"]');
    extras.forEach((item) => track.appendChild(createCarouselCardEl(item)));
    return wrap;
  }

  // ---------- Галерея ----------
  // Фото листаются нативным горизонтальным скроллом со snap; без фото — серая плашка.
  // Иконка планировки слева внизу — только если в объявлении есть планировка
  // (она всегда вторым фото). Точек максимум 5, активная «едет» по центру, как на Циане.
  const MAX_DOTS = 5;

  function activeDotIndex(photoIndex, total) {
    const dots = Math.min(total, MAX_DOTS);
    if (total <= MAX_DOTS || photoIndex < 2) return photoIndex;
    if (photoIndex >= total - 2) return dots - (total - photoIndex);
    return 2;
  }

  function galleryHtml(item) {
    const total = Math.max(item.photos.length, 1);
    const dots = Math.min(total, MAX_DOTS);
    return `
      <div class="card__gallery">
        ${
          item.photos.length
            ? `<div class="card__gallery-track" data-role="track">${item.photos
                .map((photo, i) => {
                  // Планировка: флаг layout у фото, а у старых записей — просто 2-е фото при hasLayout
                  const isLayout = photo.layout || (item.hasLayout && i === 1 && !item.photos.some((p) => p.layout));
                  return `<img src="${encodeURI(photo.src)}" alt="${photo.caption || ""}"${isLayout ? ' class="is-layout"' : ""}${i > 0 ? ' loading="lazy"' : ""} />`;
                })
                .join("")}</div>
              <span class="card__gallery-caption" data-role="caption"></span>`
            : ""
        }
        <div class="card__gallery-actions">
          <button class="card__gallery-btn" type="button" aria-label="В избранное">${ICONS.heart}</button>
          <button class="card__gallery-btn" type="button" aria-label="Ещё">${ICONS.more}</button>
        </div>
        ${item.hasLayout ? `<button class="card__gallery-badge" type="button" aria-label="Показать планировку">${ICONS.layout}</button>` : ""}
        ${
          dots > 1 || !item.photos.length
            ? `<div class="card__gallery-dots">${Array.from({ length: item.photos.length ? dots : MAX_DOTS }, (_, i) => `<span class="card__gallery-dot${i === 0 ? " is-active" : ""}"></span>`).join("")}</div>`
            : ""
        }
      </div>
    `;
  }

  // Галерея стартует в 16:9 и по ходу свайпа к второму фото плавно вырастает до 1:1.
  // Высота считается прямо из scrollLeft (доля пути между 1-м и 2-м фото), поэтому
  // движение идёт ровно со скоростью пальца, а доводку делает нативный scroll-snap.
  // Дальше 2-го фото галерея остаётся раскрытой, при возврате к 1-му — так же сжимается.
  const GALLERY_RATIO_START = 9 / 16;
  const GALLERY_RATIO_EXPANDED = 1;

  function setupGallery(card, item) {
    const track = card.querySelector('[data-role="track"]');
    if (!track) return;
    const gallery = card.querySelector(".card__gallery");
    const dots = card.querySelectorAll(".card__gallery-dot");
    const caption = card.querySelector('[data-role="caption"]');
    // Иконка планировки «приклеена» к первому фото — уезжает вместе с ним при листании
    const layoutBadge = card.querySelector(".card__gallery-badge");
    // Тап по иконке — листаем галерею к первой планировке (плавно, со всеми эффектами свайпа)
    if (layoutBadge) {
      layoutBadge.addEventListener("click", (e) => {
        e.stopPropagation();
        const images = Array.from(track.children);
        const index = images.findIndex((img) => img.classList.contains("is-layout"));
        if (index > 0) track.scrollTo({ left: index * track.clientWidth, behavior: "smooth" });
      });
    }

    // Подпись фото (со 2-го): текст берём у ближайшего фото, а прозрачность —
    // от того, насколько фото «доехало»: на середине свайпа подпись гаснет,
    // у нового фото проявляется уже с его текстом. Тоже идёт со скоростью пальца.
    function updateCaption(position) {
      if (!caption) return;
      const index = Math.max(0, Math.min(Math.round(position), item.photos.length - 1));
      const text = item.photos[index].caption;
      if (caption.textContent !== (text || "")) caption.textContent = text || "";
      const distance = Math.abs(position - index);
      caption.style.opacity = text ? String(Math.max(0, 1 - distance * 2.5)) : "0";
    }

    // Пересчитываем прямо в scroll-событии (оно и так приходит раз в кадр),
    // без лишнего requestAnimationFrame — иначе высота отстаёт от пальца на кадр.
    // Высоту округляем вниз до целых px (не выше ленты — без полоски фона), чтобы текст под галереей не дрожал на субпикселях.
    function update() {
      const width = track.clientWidth;
      if (!width) return;
      const position = track.scrollLeft / width;
      const progress = Math.min(Math.max(position, 0), 1);
      const ratio = GALLERY_RATIO_START + (GALLERY_RATIO_EXPANDED - GALLERY_RATIO_START) * progress;
      gallery.style.height = `${Math.floor(width * ratio)}px`;

      const active = activeDotIndex(Math.round(position), item.photos.length);
      dots.forEach((d, i) => d.classList.toggle("is-active", i === active));
      updateCaption(position);
      if (layoutBadge) layoutBadge.style.transform = `translateX(${-track.scrollLeft}px)`;
    }

    track.addEventListener("scroll", update, { passive: true });

    // Лог: кадр, на котором человек остановился (после 0,5 с без движения)
    let loggedIndex = 0;
    let settleTimer = 0;
    track.addEventListener(
      "scroll",
      () => {
        clearTimeout(settleTimer);
        settleTimer = setTimeout(() => {
          const index = Math.round(track.scrollLeft / track.clientWidth);
          if (index === loggedIndex || !window.App.track) return;
          loggedIndex = index;
          const photo = item.photos[index] || {};
          const isLayout = track.children[index] && track.children[index].classList.contains("is-layout");
          window.App.track(isLayout ? "Фото: планировка" : "Фото", {
            item,
            value: `${index + 1}/${item.photos.length}${photo.caption ? ` · ${photo.caption}` : ""}`,
          });
        }, 500);
      },
      { passive: true }
    );

    setupMouseDrag(track);
  }

  // ---------- Перетаскивание галереи мышью ----------
  // Пальцем и трекпадом лента листается нативным скроллом, а мышью браузер
  // overflow-контейнеры не тащит — эмулируем: ведём scrollLeft за курсором,
  // на отпускании доводим до ближайшего фото, а при быстром броске — до следующего.
  const FLICK_VELOCITY = 0.4; // px/мс

  function setupMouseDrag(track) {
    let drag = null;

    track.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      drag = { startX: e.clientX, startLeft: track.scrollLeft, lastX: e.clientX, lastT: e.timeStamp, velocity: 0, moved: false };
      track.style.scrollSnapType = "none";
      track.style.scrollBehavior = "auto";
      track.setPointerCapture(e.pointerId);
      track.classList.add("is-dragging");
    });

    track.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const dt = e.timeStamp - drag.lastT;
      if (dt > 0) drag.velocity = (e.clientX - drag.lastX) / dt;
      drag.lastX = e.clientX;
      drag.lastT = e.timeStamp;
      if (Math.abs(e.clientX - drag.startX) > 3) drag.moved = true;
      track.scrollLeft = drag.startLeft - (e.clientX - drag.startX);
    });

    function finish() {
      if (!drag) return;
      const width = track.clientWidth;
      const position = track.scrollLeft / width;
      let index = Math.round(position);
      if (Math.abs(drag.velocity) > FLICK_VELOCITY) {
        index = drag.velocity < 0 ? Math.ceil(position) : Math.floor(position);
      }
      index = Math.max(0, Math.min(index, track.children.length - 1));
      if (drag.moved) {
        track.dataset.justDragged = "1";
        setTimeout(() => delete track.dataset.justDragged, 0);
      }
      drag = null;
      track.classList.remove("is-dragging");
      track.scrollTo({ left: index * width, behavior: "smooth" });
      // Возвращаем нативный snap после доводки — иначе он оборвёт плавную анимацию
      window.setTimeout(() => {
        track.style.scrollSnapType = "";
        track.style.scrollBehavior = "";
      }, 450);
    }

    track.addEventListener("pointerup", finish);
    track.addEventListener("pointercancel", finish);
    // Картинки не должны уезжать как файлы при перетаскивании
    track.addEventListener("dragstart", (e) => e.preventDefault());
  }

  function createCardEl(item, mixed, showDelta = mixed) {
    const card = document.createElement("article");
    card.className = "card" + (mixed ? " card--mixed" : "");
    card.dataset.listingId = item.id;
    const seller = item.agency || item.sellerRole;

    card.innerHTML = `
      ${galleryHtml(item)}
      ${labelsHtml(item)}
      <div class="card__info">
        ${priceRowHtml(item)}
        ${showDelta ? mixedDeltaHtml(item) : ""}
        <div class="card__params">${paramsLine(item)}</div>
        <div class="card__terms">${termsLine(item)}</div>
        <div class="card__address">${addressLine(item)}</div>
        ${transportHtml(item)}
        ${commute.snippetHtml(item)}
      </div>
      <div class="card__footer">
        <div class="card__seller">
          ${
            item.avatar
              ? `<div class="card__avatar card__avatar--image"><img src="${encodeURI(item.avatar)}" alt="" loading="lazy" /></div>`
              : `<div class="card__avatar">${sellerInitials(seller)}</div>`
          }
          ${sellerHtml(item)}
        </div>
        <button class="card__btn card__btn--call" type="button" aria-label="Позвонить">${ICONS.phone}</button>
        <button class="card__btn card__btn--message" type="button">Написать</button>
      </div>
    `;
    setupGallery(card, item);
    setupCardTracking(card, item);
    return card;
  }


  // ---------- Логи UX-теста: открытие карточки, прокрутка лейблов, показ сниппета ----------
  // Тап по сниппету (кроме кнопок и контролов галереи) = «открыл карточку». Карточки в
  // прототипе нет — показываем заглушку, чтобы респондент вернулся к выдаче (см. card-stub).
  const CARD_CONTROLS = ".card__btn, .card__gallery-btn, .card__gallery-badge, .card__labels, .card__commute";

  function setupCardTracking(card, item) {
    const { track, observeSnippet, openCardStub } = window.App;
    if (observeSnippet) observeSnippet(card);
    // Время до мест — тап открывает подробности по каждому месту и способу добраться
    const commuteRow = card.querySelector(".card__commute");
    if (commuteRow) commuteRow.addEventListener("click", () => window.App.openCommuteDetails(item));
    card.addEventListener("click", (e) => {
      if (e.target.closest(CARD_CONTROLS)) return;
      const trackEl = card.querySelector('[data-role="track"]');
      if (trackEl && trackEl.dataset.justDragged) return; // это был свайп мышью, а не тап
      if (track) track("Открыл карточку", { item });
      if (openCardStub) openCardStub(item);
    });
    const labels = card.querySelector(".card__labels");
    if (labels && track) {
      let logged = false;
      labels.addEventListener(
        "scroll",
        () => {
          if (logged) return;
          logged = true;
          track("Прокрутил лейблы", { item });
        },
        { passive: true }
      );
    }
  }

  function renderEmptyState(container, message) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = `
      <div class="empty-state__title">${message}</div>
      <p class="empty-state__hint">Попробуйте расширить параметры поиска или сбросить фильтры.</p>
    `;
    container.appendChild(empty);
  }

  window.App = window.App || {};
  Object.assign(window.App, { createCarouselCardEl, createMixCarouselEl, createCardEl, renderEmptyState });
})();
