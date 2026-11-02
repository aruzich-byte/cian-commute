(function () {
  const { getPriceScope, clamp, formatInt, pluralize, PRICE_BOUNDS, priceLogFloor, priceMetric, smoothAreaPath, getBaseFiltered, applyPriceRange, ui } = window.App;

const PRICE_STEP_TOTAL = 5000;
const PRICE_STEP_SQM = 500;
const MIN_GAP_TOTAL = 0;
const MIN_GAP_SQM = 0;
const HISTOGRAM_BUCKETS = 36;
const HIST_VB_W = 100;
const HIST_VB_H = 40;

let histogramInstanceCounter = 0;

// ---------- Виджет цены (переиспользуемый: модалка фильтров + bottom sheet) ----------
function buildPriceWidget(container, opts) {
  // opts: { draft, onChange, liveCountEl, showModeToggle, priceVariant, getAdaptiveBase }
  const { draft } = opts;
  const showModeToggle = opts.showModeToggle !== false;
  const priceVariant = opts.priceVariant || "full"; // 'full' | 'histogram' | 'presets'
  // Источник объектов для адаптивной гистограммы/плейсхолдеров (ui.histogramAdaptive).
  // По умолчанию — getBaseFiltered() (уже применённые фильтры из state). Модалка
  // «Фильтры» передаёт свою черновую выборку (computeDraftBase), т.к. там площадь/этаж/класс
  // редактируются как черновик и попадают в state только по кнопке «Применить» —
  // getBaseFiltered() до этого момента их ещё не увидит.
  const getAdaptiveBase = opts.getAdaptiveBase || getBaseFiltered;
  const histogramInstanceId = ++histogramInstanceCounter;
  const clipId = `hist-clip-${histogramInstanceId}`;

  container.innerHTML = `
    ${
      showModeToggle
        ? `<div class="segmented price-widget__toggle" data-role="mode-toggle">
            <button type="button" class="segmented__opt" data-mode="total">За всё</button>
            <button type="button" class="segmented__opt" data-mode="perSqm">За м²</button>
          </div>`
        : ""
    }
    <div class="histogram" data-role="histogram"></div>
    <div class="price-slider" data-role="slider">
      <div class="price-slider__track"></div>
      <div class="price-slider__range" data-role="range"></div>
      <div class="price-slider__thumb" data-role="thumb-min" tabindex="0" role="slider" aria-label="Минимальная цена"></div>
      <div class="price-slider__thumb" data-role="thumb-max" tabindex="0" role="slider" aria-label="Максимальная цена"></div>
    </div>
    <div class="price-widget__inputs">
      <div class="field">
        <span class="field__label">от</span>
        <input type="text" inputmode="numeric" data-role="input-min" autocomplete="off" />
        <span class="field__suffix">₽</span>
      </div>
      <div class="field">
        <span class="field__label">до</span>
        <input type="text" inputmode="numeric" data-role="input-max" autocomplete="off" />
        <span class="field__suffix">₽</span>
      </div>
    </div>
    <div class="price-widget__presets" data-role="presets"></div>
  `;

  if (priceVariant === "histogram") {
    container.querySelector(".price-widget__presets").style.display = "none";
  } else if (priceVariant === "presets") {
    container.querySelector('[data-role="histogram"]').style.display = "none";
    container.querySelector('[data-role="slider"]').style.display = "none";
  }

  const modeToggle = container.querySelector('[data-role="mode-toggle"]');
  const inputMin = container.querySelector('[data-role="input-min"]');
  const inputMax = container.querySelector('[data-role="input-max"]');
  const histogramEl = container.querySelector('[data-role="histogram"]');
  const sliderEl = container.querySelector('[data-role="slider"]');
  const rangeEl = container.querySelector('[data-role="range"]');
  const thumbMin = container.querySelector('[data-role="thumb-min"]');
  const thumbMax = container.querySelector('[data-role="thumb-max"]');
  const presetsEl = container.querySelector('[data-role="presets"]');

  let histogramCache = {};
  function getHistogram(mode) {
    // В адаптивном режиме НЕ кэшируем: getAdaptiveBase() может измениться на
    // любой input в черновых фильтрах модалки (площадь/этаж/класс — см.
    // filters-modal.js refreshAdaptiveHistogram), и кэш по ключу mode/adaptive
    // не может это отследить — раньше это приводило к тому, что гистограмма
    // молча оставалась «старой», хотя плейсхолдеры (см. ниже) уже обновлялись.
    // Пересчёт дешёвый (один проход по <=LISTINGS.length объектам), так что
    // кэшируем только статическую ветку — по всем LISTINGS, которая не меняется.
    // Кэш статической ветки сбрасывается при смене категории (снять/купить ×
    // квартира/дом) — у каждой своя шкала и свои объявления, см. setPriceScope.
    const scope = getPriceScope();
    if (!ui.histogramAdaptive && histogramCache[mode] && histogramCache[mode].scope === scope) return histogramCache[mode];
    const bounds = PRICE_BOUNDS[mode];
    const floor = priceLogFloor(mode);
    const logMin = Math.log10(floor);
    const logMax = Math.log10(bounds.max);
    const bucketAt = (i) => Math.pow(10, logMin + (i / HISTOGRAM_BUCKETS) * (logMax - logMin));
    const buckets = Array.from({ length: HISTOGRAM_BUCKETS }, (_, i) => ({
      min: bucketAt(i),
      max: bucketAt(i + 1),
      count: 0,
    }));
    // В адаптивном режиме считаем не по всем LISTINGS, а по объектам, которые
    // проходят остальные применённые фильтры (площадь/этаж/класс) — getBaseFiltered()
    // уже не учитывает саму цену, поэтому не зацикливается на черновом диапазоне
    // этого же виджета. Ось бакетов (floor/bounds.max) остаётся глобальной —
    // подстраивается только заполненность гистограммы, а не сама шкала.
    const source = ui.histogramAdaptive ? getAdaptiveBase() : scope;
    // Выбросы за пределами [floor; bounds.max] просто не считаем — раньше они
    // clamp'ились в крайний бар и раздували его (например, бар «до 11 тыс» показывал
    // 32 объявления, хотя реально в этом ценовом диапазоне их всего 2, а остальные 30 —
    // выбросы ниже 3-го перцентиля). Ось всё равно означает «без ограничения» на краях
    // (см. setMin/setMax), так что подсчитывать выбросы как часть крайнего бара не нужно.
    source.forEach((item) => {
      const v = priceMetric(item, mode);
      if (v < floor || v > bounds.max) return;
      let idx = Math.floor(((Math.log10(v) - logMin) / (logMax - logMin)) * HISTOGRAM_BUCKETS);
      idx = clamp(idx, 0, HISTOGRAM_BUCKETS - 1);
      buckets[idx].count++;
    });
    if (!ui.histogramAdaptive) {
      buckets.scope = scope;
      histogramCache[mode] = buckets;
    }
    return buckets;
  }

  function pct(value, mode) {
    const b = PRICE_BOUNDS[mode];
    const floor = priceLogFloor(mode);
    const v = clamp(value, floor, b.max);
    const logMin = Math.log10(floor);
    const logMax = Math.log10(b.max);
    return ((Math.log10(v) - logMin) / (logMax - logMin)) * 100;
  }

  function pctToValue(p, mode) {
    const b = PRICE_BOUNDS[mode];
    const floor = priceLogFloor(mode);
    const logMin = Math.log10(floor);
    const logMax = Math.log10(b.max);
    return Math.pow(10, logMin + (clamp(p, 0, 100) / 100) * (logMax - logMin));
  }

  function step(mode) {
    return mode === "perSqm" ? PRICE_STEP_SQM : PRICE_STEP_TOTAL;
  }
  function minGap(mode) {
    return mode === "perSqm" ? MIN_GAP_SQM : MIN_GAP_TOTAL;
  }

  function buildHistogramDOM(mode) {
    const buckets = getHistogram(mode);
    const max = Math.max(...buckets.map((b) => b.count), 1);
    const barHeights = buckets.map((b) => Math.max((b.count / max) * HIST_VB_H * 0.92, HIST_VB_H * 0.03));

    let shapeMarkup;
    if (ui.histogramShape === "bars") {
      const slot = HIST_VB_W / buckets.length;
      const barWidth = slot * 0.72;
      const bars = barHeights
        .map((h, i) => {
          const x = i * slot + (slot - barWidth) / 2;
          const y = HIST_VB_H - h;
          return `<rect x="${x}" y="${y}" width="${barWidth}" height="${h}" rx="0.6" />`;
        })
        .join("");
      shapeMarkup = `<g class="hist-area">${bars}</g><g class="hist-area-active" clip-path="url(#${clipId})">${bars}</g>`;
    } else {
      const points = barHeights.map((h, i) => ({
        x: ((i + 0.5) / buckets.length) * HIST_VB_W,
        y: HIST_VB_H - h,
      }));
      const d = smoothAreaPath(points, HIST_VB_H);
      shapeMarkup = `<path class="hist-area" d="${d}"></path><path class="hist-area-active" d="${d}" clip-path="url(#${clipId})"></path>`;
    }

    histogramEl.innerHTML = `
      <svg class="histogram-svg" viewBox="0 0 ${HIST_VB_W} ${HIST_VB_H}" preserveAspectRatio="none">
        <defs>
          <clipPath id="${clipId}" clipPathUnits="objectBoundingBox">
            <rect data-role="hist-clip-rect" x="0" y="0" width="1" height="1" />
          </clipPath>
        </defs>
        ${shapeMarkup}
      </svg>
    `;
  }

  function updateHistogramHighlight(mode) {
    const range = draft.price[mode];
    const min = range.min ?? PRICE_BOUNDS[mode].min;
    const max = range.max ?? PRICE_BOUNDS[mode].max;
    const minPct = clamp(pct(min, mode), 0, 100) / 100;
    const maxPct = clamp(pct(max, mode), 0, 100) / 100;
    const rect = histogramEl.querySelector('[data-role="hist-clip-rect"]');
    if (!rect) return;
    rect.setAttribute("x", minPct);
    rect.setAttribute("width", Math.max(maxPct - minPct, 0));
  }

  function formatDisplay(v) {
    if (v == null) return "";
    return formatInt(v);
  }

  function parseInput(str) {
    const digits = str.replace(/\D/g, "");
    return digits ? Number(digits) : null;
  }

  // Меняет value инпута, сохраняя позицию курсора относительно введённых цифр
  // (иначе после переформатирования курсор скачет в конец — актуально при
  // редактировании цифр не с конца строки).
  function setInputValuePreservingCursor(input, newValue) {
    if (input.value === newValue) return;
    const prevValue = input.value;
    const prevCursor = input.selectionStart ?? prevValue.length;
    const digitsBeforeCursor = prevValue.slice(0, prevCursor).replace(/\D/g, "").length;
    input.value = newValue;
    if (document.activeElement !== input) return;
    let pos = newValue.length;
    if (digitsBeforeCursor === 0) {
      pos = 0;
    } else {
      let count = 0;
      for (let i = 0; i < newValue.length; i++) {
        if (/\d/.test(newValue[i])) count++;
        if (count === digitsBeforeCursor) {
          pos = i + 1;
          break;
        }
      }
    }
    input.setSelectionRange(pos, pos);
  }

  function setMin(mode, value) {
    const bounds = PRICE_BOUNDS[mode];
    let v = value == null ? null : clamp(value, bounds.min, bounds.max);
    const maxBound = (draft.price[mode].max ?? bounds.max) - minGap(mode);
    if (v != null && v > maxBound) v = maxBound;
    draft.price[mode].min = v != null && v <= bounds.min ? null : v;
  }

  function setMax(mode, value) {
    const bounds = PRICE_BOUNDS[mode];
    let v = value == null ? null : clamp(value, bounds.min, bounds.max);
    const minBound = (draft.price[mode].min ?? bounds.min) + minGap(mode);
    if (v != null && v < minBound) v = minBound;
    draft.price[mode].max = v != null && v >= bounds.max ? null : v;
  }

  function updateLiveCount() {
    if (!opts.liveCountEl) return;
    const base = getBaseFiltered();
    const { min, max } = draft.price[draft.priceMode];
    const n = applyPriceRange(base, draft.priceMode, min, max).length;
    opts.liveCountEl.textContent = `${n} ${pluralize(n, "объявление", "объявления", "объявлений")}`;
  }

  function updateUI(uiOpts) {
    const skip = (uiOpts && uiOpts.skipInput) || null;
    const mode = draft.priceMode;
    if (modeToggle) {
      modeToggle.querySelectorAll(".segmented__opt").forEach((btn) => {
        btn.classList.toggle("is-active", btn.dataset.mode === mode);
      });
    }

    const range = draft.price[mode];
    const minVal = range.min ?? PRICE_BOUNDS[mode].min;
    const maxVal = range.max ?? PRICE_BOUNDS[mode].max;
    const minPct = pct(minVal, mode);
    const maxPct = pct(maxVal, mode);

    thumbMin.style.left = `${minPct}%`;
    thumbMax.style.left = `${maxPct}%`;
    rangeEl.style.left = `${minPct}%`;
    rangeEl.style.width = `${Math.max(maxPct - minPct, 0)}%`;
    thumbMin.setAttribute("aria-valuenow", Math.round(minVal));
    thumbMax.setAttribute("aria-valuenow", Math.round(maxVal));

    // Инпут, в который сейчас печатает пользователь, не переформатируем —
    // это единственное надёжное решение против скачущего курсора при вводе.
    if (skip !== inputMin) inputMin.value = formatDisplay(range.min);
    if (skip !== inputMax) inputMax.value = formatDisplay(range.max);
    // Плейсхолдеры всегда показывают полный диапазон цены (PRICE_BOUNDS), даже
    // в адаптивном режиме — адаптируется только заполненность гистограммы
    // (см. getHistogram), а «от/до» остаются ориентиром по всему рынку.
    inputMin.placeholder = formatInt(PRICE_BOUNDS[mode].min);
    inputMax.placeholder = formatInt(PRICE_BOUNDS[mode].max);

    buildHistogramDOM(mode);
    updateHistogramHighlight(mode);
    updatePresets(mode);
    updateLiveCount();
    if (opts.onChange) opts.onChange();
  }

  function updatePresets(mode) {
    const presets =
      mode === "total"
        ? [
            { min: null, max: 100000, label: "До 100 тыс" },
            { min: 100000, max: 250000, label: "100–250 тыс" },
            { min: 250000, max: 600000, label: "250–600 тыс" },
            { min: 600000, max: 1500000, label: "600 тыс – 1,5 млн" },
            { min: 1500000, max: null, label: "От 1,5 млн" },
          ]
        : [
            { min: null, max: 10000, label: "До 10 тыс" },
            { min: 10000, max: 15000, label: "10–15 тыс" },
            { min: 15000, max: 25000, label: "15–25 тыс" },
            { min: 25000, max: 40000, label: "25–40 тыс" },
            { min: 40000, max: null, label: "От 40 тыс" },
          ];
    presetsEl.innerHTML = "";
    presets.forEach((p) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "preset-chip";
      const range = draft.price[mode];
      if (range.min === p.min && range.max === p.max) btn.classList.add("is-active");
      btn.textContent = p.label;
      btn.addEventListener("click", () => {
        draft.price[mode].min = p.min;
        draft.price[mode].max = p.max;
        updateUI();
      });
      presetsEl.appendChild(btn);
    });
  }

  if (modeToggle) {
    modeToggle.addEventListener("click", (e) => {
      const btn = e.target.closest(".segmented__opt");
      if (!btn) return;
      draft.priceMode = btn.dataset.mode;
      updateUI();
    });
  }

  // Во время набора значение НЕ клэмпим к границам — иначе, например, при вводе
  // "15000" уже после первой цифры "1" значение подскакивает к минимуму диапазона
  // и ввод недостижимых промежуточных цифр становится невозможным. Клэмп и
  // финальное форматирование применяются только по blur, см. commitMin/commitMax.
  inputMin.addEventListener("input", () => {
    const digits = inputMin.value.replace(/\D/g, "");
    setInputValuePreservingCursor(inputMin, digits);
    draft.price[draft.priceMode].min = digits ? Number(digits) : null;
    updateUI({ skipInput: inputMin });
  });
  inputMax.addEventListener("input", () => {
    const digits = inputMax.value.replace(/\D/g, "");
    setInputValuePreservingCursor(inputMax, digits);
    draft.price[draft.priceMode].max = digits ? Number(digits) : null;
    updateUI({ skipInput: inputMax });
  });

  function commitMin() {
    setMin(draft.priceMode, draft.price[draft.priceMode].min);
    updateUI();
  }
  function commitMax() {
    setMax(draft.priceMode, draft.price[draft.priceMode].max);
    updateUI();
  }
  inputMin.addEventListener("blur", commitMin);
  inputMax.addEventListener("blur", commitMax);
  inputMin.addEventListener("keydown", (e) => {
    if (e.key === "Enter") inputMin.blur();
  });
  inputMax.addEventListener("keydown", (e) => {
    if (e.key === "Enter") inputMax.blur();
  });

  function valueFromClientX(clientX, mode) {
    const rect = sliderEl.getBoundingClientRect();
    const p = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
    const raw = pctToValue(p, mode);
    const s = step(mode);
    return Math.round(raw / s) * s;
  }

  function startDrag(which) {
    function onMove(ev) {
      const clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const value = valueFromClientX(clientX, draft.priceMode);
      if (which === "min") setMin(draft.priceMode, value);
      else setMax(draft.priceMode, value);
      updateUI();
    }
    function onUp() {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    }
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  }

  thumbMin.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    startDrag("min");
  });
  thumbMax.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    startDrag("max");
  });

  [thumbMin, thumbMax].forEach((thumb) => {
    thumb.addEventListener("keydown", (e) => {
      const which = thumb === thumbMin ? "min" : "max";
      const mode = draft.priceMode;
      const current = (which === "min" ? draft.price[mode].min : draft.price[mode].max) ?? (which === "min" ? PRICE_BOUNDS[mode].min : PRICE_BOUNDS[mode].max);
      const s = step(mode);
      let next = null;
      if (e.key === "ArrowLeft") next = current - s;
      else if (e.key === "ArrowRight") next = current + s;
      else if (e.key === "Home") next = PRICE_BOUNDS[mode].min;
      else if (e.key === "End") next = PRICE_BOUNDS[mode].max;
      else return;
      e.preventDefault();
      if (which === "min") setMin(mode, next);
      else setMax(mode, next);
      updateUI();
    });
  });

  sliderEl.addEventListener("pointerdown", (e) => {
    if (e.target === thumbMin || e.target === thumbMax) return;
    const mode = draft.priceMode;
    const value = valueFromClientX(e.clientX, mode);
    const minVal = draft.price[mode].min ?? PRICE_BOUNDS[mode].min;
    const maxVal = draft.price[mode].max ?? PRICE_BOUNDS[mode].max;
    const which = Math.abs(value - minVal) <= Math.abs(value - maxVal) ? "min" : "max";
    if (which === "min") setMin(mode, value);
    else setMax(mode, value);
    updateUI();
  });

  updateUI();
  return {
    updateUI,
    reset: () => {
      draft.price.total = { min: null, max: null };
      draft.price.perSqm = { min: null, max: null };
      updateUI();
    },
    // Программно выставляет сразу обе границы (мин и макс) — в отличие от
    // setMin/setMax, не завязан на «противоположное» текущее значение в
    // draft, т.к. используется, чтобы одним шагом раздвинуть диапазон целиком
    // (снек «Расширить» в фильтре цены, см. filters-modal.js/price-sheet.js).
    setRange: (mode, min, max) => {
      const bounds = PRICE_BOUNDS[mode];
      let lo = min == null ? null : clamp(min, bounds.min, bounds.max);
      let hi = max == null ? null : clamp(max, bounds.min, bounds.max);
      if (lo != null && hi != null && lo > hi) [lo, hi] = [hi, lo];
      draft.price[mode].min = lo != null && lo <= bounds.min ? null : lo;
      draft.price[mode].max = hi != null && hi >= bounds.max ? null : hi;
      updateUI();
    },
  };
}

  window.App = window.App || {};
  window.App.buildPriceWidget = buildPriceWidget;
})();
