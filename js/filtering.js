(function () {
  const { state, priceMetric, ui, formatInt, formatPriceShort, scopeListings, commute } = window.App;

  // Если карточек по точной цене мало (< ui.mixThreshold), подмешиваем соседние
  // по цене варианты — расширяем диапазон на ±ui.mixExpandPercent% и добираем
  // ВСЕ объекты, попавшие в расширенный диапазон. Оба параметра управляются
  // из панели «Настройка прототипа» (см. state.js ui.mixThreshold/mixExpandPercent,
  // main.js — их wiring).

  // Категория выдачи — тип сделки (снять/купить) × тип недвижимости (квартира/дом).
  // По остальным сочетаниям (комната, гараж, коммерческая, «построить дом») данных
  // нет — scopeListings вернёт пустой список, и выдача будет пустой.
  // В варианте «Поиск по времени» категория сразу ограничена зоной досягаемости — как
  // выбранный район или метро: от неё считаются и выдача, и счётчики во всех фильтрах.
  function currentScope() {
    return scopeListings(state.dealType, state.propertyType).filter(commute.inZone);
  }

  function getBaseFiltered() {
    return currentScope().filter((item) => {
      if (state.areaMin != null && item.area < state.areaMin) return false;
      if (state.areaMax != null && item.area > state.areaMax) return false;
      if (state.floorMin != null && item.floor < state.floorMin) return false;
      if (state.floorMax != null && item.floor > state.floorMax) return false;
      if (state.classes.size > 0 && !state.classes.has(item.officeClass)) return false;
      return true;
    });
  }

  // Как getBaseFiltered, но без учёта площади — нужен быстрому фильтру «Площадь»,
  // чтобы считать live-счётчик по черновому диапазону площади поверх остальных
  // применённых фильтров (см. price-widget.js updateLiveCount с той же идеей для цены).
  function getBaseFilteredExcludingArea() {
    return currentScope().filter((item) => {
      if (state.floorMin != null && item.floor < state.floorMin) return false;
      if (state.floorMax != null && item.floor > state.floorMax) return false;
      if (state.classes.size > 0 && !state.classes.has(item.officeClass)) return false;
      return true;
    });
  }

  function applyPriceRange(items, mode, min, max) {
    return items.filter((item) => {
      const v = priceMetric(item, mode);
      if (min != null && v < min) return false;
      if (max != null && v > max) return false;
      return true;
    });
  }

  function priceProximity(item, mode, min, max) {
    const v = priceMetric(item, mode);
    if (max != null && v > max) return v - max;
    if (min != null && v < min) return min - v;
    return Infinity;
  }

  // Общая механика «подмешивания»: по строгому диапазону цены считает основной
  // список + пул ближайших по цене вариантов из расширенного диапазона
  // (±ui.mixExpandPercent%). Переиспользуется и в основном рендере списка
  // (computeResults), и в фильтре цены — там же считаем, сколько объектов
  // добавит расширение диапазона, чтобы показать снек «Расширить»
  // (см. filters-modal.js, price-sheet.js).
  function computeMixSuggestion(base, mode, min, max) {
    const priceActive = min != null || max != null;
    const strict = priceActive ? applyPriceRange(base, mode, min, max) : base;

    let extras = [];
    let extrasTotal = 0;
    let expandedMin = null;
    let expandedMax = null;

    if (priceActive && strict.length < ui.mixThreshold && base.length > strict.length) {
      const expandFactor = ui.mixExpandPercent / 100;
      expandedMin = min != null ? Math.round(min * (1 - expandFactor)) : null;
      expandedMax = max != null ? Math.round(max * (1 + expandFactor)) : null;
      const pool = applyPriceRange(base, mode, expandedMin, expandedMax);
      const strictIds = new Set(strict.map((i) => i.id));
      const additional = pool.filter((i) => !strictIds.has(i.id));
      // extras и extrasTotal — один и тот же пул: подмешиваются ВСЕ объекты,
      // попавшие в расширенный диапазон, без искусственной обрезки (раньше
      // extras обрезался до 6 штук, а extrasTotal показывал реальное большее
      // число — счётчик и фактически отрендеренные карточки расходились).
      extras = additional.sort((a, b) => priceProximity(a, mode, min, max) - priceProximity(b, mode, min, max));
      extrasTotal = extras.length;
    }

    return { strict, extras, extrasTotal, priceActive, expandedMin, expandedMax };
  }

  function computeResults() {
    const base = getBaseFiltered();
    const mode = state.priceMode;
    const { min, max } = state.price[mode];
    const { strict, extras, priceActive, expandedMin, expandedMax } = computeMixSuggestion(base, mode, min, max);

    return { base, strict, extras, priceActive, mode, min, max, expandedMin, expandedMax };
  }

  function sortItems(items, sort) {
    const arr = [...items];
    switch (sort) {
      case "price_asc":
        arr.sort((a, b) => a.price - b.price);
        break;
      case "price_desc":
        arr.sort((a, b) => b.price - a.price);
        break;
      case "new":
        arr.sort((a, b) => a.addedDaysAgo - b.addedDaysAgo);
        break;
      case "area_desc":
        arr.sort((a, b) => b.area - a.area);
        break;
      case "commute":
        arr.sort((a, b) => commute.totalMinutes(a) - commute.totalMinutes(b));
        break;
      default:
        break;
    }
    return arr;
  }

  // ---------- Список применённых фильтров для блока в конце выдачи ----------
  // Каждый элемент — один снимаемый фильтр (чип с крестиком). Цена/площадь/этаж
  // отдаются одним чипом на пару мин-макс (снимаются вместе), класс объекта —
  // отдельным чипом на каждый выбранный класс (снимаются по одному).
  function getActiveFilters() {
    const entries = [];
    const mode = state.priceMode;
    const { min: priceMin, max: priceMax } = state.price[mode];
    if (priceMin != null || priceMax != null) {
      const fmt = (v) => (mode === "perSqm" ? `${formatInt(v)} ₽/м²` : formatPriceShort(v));
      let value;
      if (priceMin != null && priceMax != null) value = `${fmt(priceMin)}–${fmt(priceMax)}`;
      else if (priceMin != null) value = `От ${fmt(priceMin)}`;
      else value = `До ${fmt(priceMax)}`;
      entries.push({
        label: `Цена: ${value}`,
        onRemove: () => {
          state.price[mode] = { min: null, max: null };
        },
      });
    }

    if (state.areaMin != null || state.areaMax != null) {
      let value;
      if (state.areaMin != null && state.areaMax != null) value = `${formatInt(state.areaMin)}–${formatInt(state.areaMax)} м²`;
      else if (state.areaMin != null) value = `От ${formatInt(state.areaMin)} м²`;
      else value = `До ${formatInt(state.areaMax)} м²`;
      entries.push({
        label: `Площадь: ${value}`,
        onRemove: () => {
          state.areaMin = null;
          state.areaMax = null;
        },
      });
    }

    if (state.floorMin != null || state.floorMax != null) {
      let value;
      if (state.floorMin != null && state.floorMax != null) value = `${state.floorMin}–${state.floorMax}`;
      else if (state.floorMin != null) value = `От ${state.floorMin}`;
      else value = `До ${state.floorMax}`;
      entries.push({
        label: `Этаж: ${value}`,
        onRemove: () => {
          state.floorMin = null;
          state.floorMax = null;
        },
      });
    }

    state.classes.forEach((cls) => {
      entries.push({
        label: `Класс ${cls}`,
        onRemove: () => {
          state.classes.delete(cls);
        },
      });
    });

    return entries;
  }

  window.App = window.App || {};
  Object.assign(window.App, { currentScope, getBaseFiltered, getBaseFilteredExcludingArea, applyPriceRange, computeMixSuggestion, computeResults, sortItems, getActiveFilters });
})();
