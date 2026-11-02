(function () {
  const { clamp, maybeFlushOnScroll } = window.App;

// ---------- Карта + draggable-шторка со списком ----------
function setupMapSheet(mapEnabled = true) {
  const mapArea = document.getElementById("map-area");
  const sheetList = document.getElementById("sheet-list");
  const handle = document.getElementById("sheet-handle");
  // Скроллится .list-scroll (id="results-scroll") — обёртка над «Найдено N»/
  // сортировкой и самим списком карточек (#results-list), поэтому и то, и то
  // уезжает при скролле, а не остаётся прилипшим сверху.
  const resultsList = document.getElementById("results-scroll");

  const PEEK_PX = 64;
  let sheetState = "half"; // 'peek' | 'half' | 'full'

  function targetHeight(s) {
    const containerH = mapArea.clientHeight;
    const header = document.getElementById("header");
    // Реальная высота статус-бара, а не константа — на мобильном он скрыт
    // (см. .statusbar в device-frame.css) и его offsetHeight равен 0.
    const statusbar = document.getElementById("statusbar");
    if (s === "peek") return PEEK_PX;
    if (s === "full") return containerH - statusbar.offsetHeight - header.offsetHeight;
    return Math.round(containerH * 0.55);
  }

  function setState(s, animate = true) {
    sheetState = s;
    sheetList.classList.toggle("is-dragging", !animate);
    sheetList.classList.toggle("is-full", s === "full");
    sheetList.style.height = `${targetHeight(s)}px`;
    resultsList.style.overflowY = s === "full" ? "auto" : "hidden";
    document.getElementById("header").classList.toggle("is-solid", s === "full");
    document.getElementById("statusbar").classList.toggle("is-solid", s === "full");
  }

  function nearestState(px) {
    const options = [
      ["peek", targetHeight("peek")],
      ["half", targetHeight("half")],
      ["full", targetHeight("full")],
    ];
    return options.reduce((best, cur) => (Math.abs(cur[1] - px) < Math.abs(best[1] - px) ? cur : best))[0];
  }

  // Без карты шторка всегда развёрнута, жесты сворачивания не подключаем
  if (!mapEnabled) {
    resultsList.addEventListener("scroll", maybeFlushOnScroll, { passive: true });
    window.addEventListener("resize", () => setState("full", false));
    setState("full", false);
    return;
  }

  let dragStartY = 0;
  let dragStartHeight = 0;
  let dragMoved = 0;

  function onPointerDown(e) {
    dragStartY = e.clientY;
    dragStartHeight = sheetList.getBoundingClientRect().height;
    dragMoved = 0;
    sheetList.classList.add("is-dragging");
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
  }

  function onPointerMove(e) {
    const dy = e.clientY - dragStartY;
    dragMoved = Math.max(dragMoved, Math.abs(dy));
    const containerH = mapArea.clientHeight;
    const next = clamp(dragStartHeight - dy, PEEK_PX, containerH);
    sheetList.style.height = `${next}px`;
  }

  function onPointerUp() {
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
    sheetList.classList.remove("is-dragging");

    if (dragMoved < 6) {
      // короткий тап по хэндлу — переключаем состояние по кругу
      if (sheetState === "peek") setState("half");
      else if (sheetState === "half") setState("full");
      else setState("half");
    } else {
      const currentPx = sheetList.getBoundingClientRect().height;
      setState(nearestState(currentPx));
    }
  }

  handle.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    onPointerDown(e);
  });

  // Скролл списка, когда шторка не развёрнута полностью, — разворачивает её
  resultsList.addEventListener("scroll", () => {
    if (sheetState !== "full" && resultsList.scrollTop > 2) {
      setState("full");
    }
  });
  resultsList.addEventListener("scroll", maybeFlushOnScroll, { passive: true });

  // В full-состоянии хэндл скрыт: сворачиваем шторку свайпом вниз от самого
  // верха списка (когда дальше скроллить некуда — тянем шторку, а не контент).
  // Именно touch-события, а не Pointer Events: на реальных мобильных браузерах
  // после начала нативного скролла/резинового bounce в этой точке pointermove
  // перестаёт надёжно приходить, и жест просто не срабатывает. preventDefault
  // вызываем только когда точно видим оттягивание вниз — обычный скролл вверх
  // по контенту (тянут вверх) при этом не ломаем.
  let touchStartY = null;
  let touchStartX = 0;
  resultsList.addEventListener(
    "touchstart",
    (e) => {
      touchStartY = sheetState === "full" && resultsList.scrollTop <= 0 ? e.touches[0].clientY : null;
      touchStartX = e.touches[0].clientX;
    },
    { passive: true }
  );
  resultsList.addEventListener(
    "touchmove",
    (e) => {
      if (touchStartY == null) return;
      if (resultsList.scrollTop > 0) {
        touchStartY = null;
        return;
      }
      const dy = e.touches[0].clientY - touchStartY;
      // Горизонтальный жест (листание фото в карточке) не трогаем
      if (dy <= 0 || Math.abs(e.touches[0].clientX - touchStartX) > dy) return;
      e.preventDefault();
      if (dy > 50) {
        setState("half");
        touchStartY = null;
      }
    },
    { passive: false }
  );
  resultsList.addEventListener("touchend", () => (touchStartY = null));
  resultsList.addEventListener("touchcancel", () => (touchStartY = null));

  // Колесо мыши/трекпад: скролл вверх, когда список уже наверху — сворачивает шторку
  let wheelUpAccum = 0;
  resultsList.addEventListener(
    "wheel",
    (e) => {
      if (sheetState !== "full" || resultsList.scrollTop > 0) {
        wheelUpAccum = 0;
        return;
      }
      if (e.deltaY < 0) {
        wheelUpAccum += -e.deltaY;
        if (wheelUpAccum > 60) {
          setState("half");
          wheelUpAccum = 0;
        }
      } else {
        wheelUpAccum = 0;
      }
    },
    { passive: true }
  );

  window.addEventListener("resize", () => setState(sheetState, false));

  setState("half", false);
}

  window.App = window.App || {};
  window.App.setupMapSheet = setupMapSheet;
})();
