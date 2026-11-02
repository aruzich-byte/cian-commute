(function () {
  const { LISTINGS } = window.App;

  // perSqm: у продажи — цена за м², у аренды — годовая ставка за м² (см. buildListings)
  function priceMetric(item, mode) {
    return mode === "perSqm" ? item.pricePerSqm : item.price;
  }

  // ---------- Категория выдачи (снять/купить × квартира/дом) ----------
  // Шкала цены у каждой категории своя: аренда квартиры за 30 тыс и дом за 45 млн
  // на одной оси не уживаются. PRICE_BOUNDS / PRICE_BOUNDS_RAW — общие объекты,
  // которые читают виджеты цены, поэтому при смене категории мутируем их на месте.
  function scopeListings(dealType, propertyType) {
    const deal = dealType === "buy" ? "sale" : dealType;
    return LISTINGS.filter((item) => item.dealType === deal && item.propertyType === propertyType);
  }

  let PRICE_SCOPE = [];

  // Обе границы шкалы берём по перцентилям, а не по абсолютным min/max (как у Airbnb):
  // у аренды офиса распределение цены сильно правостороннее, и пара-тройка совсем
  // дешёвых или совсем дорогих выбросов растягивают ось так, что вся основная масса
  // схлопывается в один бар, а по краям — пустота. Значения за пределами
  // [3-го; 97-го] перцентиля просто попадают в крайний бар с своей стороны
  // (ползунок в крайнем положении означает «без ограничения», а не жёсткий
  // порог — см. price-widget.js setMin/setMax).
  const HISTOGRAM_MIN_PERCENTILE = 0.03;
  const HISTOGRAM_MAX_PERCENTILE = 0.97;

  function percentile(sortedArr, p) {
    const idx = Math.min(sortedArr.length - 1, Math.floor(sortedArr.length * p));
    return sortedArr[idx];
  }

  const priceBoundsFromData = (arr) => {
    const sorted = [...arr].sort((a, b) => a - b);
    return {
      min: percentile(sorted, HISTOGRAM_MIN_PERCENTILE),
      max: percentile(sorted, HISTOGRAM_MAX_PERCENTILE),
    };
  };

  const PRICE_BOUNDS_RAW = { total: { min: 0, max: 0 }, perSqm: { min: 0, max: 0 } };
  const PRICE_BOUNDS = { total: { min: 0, max: 0 }, perSqm: { min: 0, max: 0 } };

  // Шаг округления границ — от порядка цены (тысячи для аренды, сотни тысяч для продажи)
  function roundStep(v) {
    return Math.pow(10, Math.max(1, Math.floor(Math.log10(Math.max(v, 1))) - 1));
  }

  function setPriceScope(dealType, propertyType) {
    PRICE_SCOPE = scopeListings(dealType, propertyType);
    const source = PRICE_SCOPE.length ? PRICE_SCOPE : LISTINGS;
    ["total", "perSqm"].forEach((mode) => {
      const raw = priceBoundsFromData(source.map((l) => priceMetric(l, mode)));
      Object.assign(PRICE_BOUNDS_RAW[mode], raw);
      const step = roundStep(raw.max);
      Object.assign(PRICE_BOUNDS[mode], { min: Math.floor(raw.min / step) * step, max: Math.ceil(raw.max / step) * step });
    });
  }

  // Объявления текущей категории — по ним строится неадаптивная гистограмма цены
  const getPriceScope = () => PRICE_SCOPE;

  // По умолчанию прототип открывается на «Снять квартиру» (см. state.js)
  setPriceScope("rent", "flat");

  // Цены на офисы — сильно правосторонне распределены (разброс в тысячи раз между
  // самым дешёвым и самым дорогим лотом), поэтому шкала гистограммы и слайдера — логарифмическая:
  // на линейной шкале дешёвые объявления (их большинство) схлопываются в один бар,
  // и по гистограмме невозможно понять форму распределения. Нижняя граница лог-шкалы
  // берётся из фактического минимума данных (а не из округлённого PRICE_BOUNDS.min,
  // который может округлиться до 0) и подстрахована минимумом в 1, чтобы log10 не ушёл в -Infinity.
  const priceLogFloor = (mode) => Math.max(PRICE_BOUNDS_RAW[mode].min, 1);

  window.App = window.App || {};
  Object.assign(window.App, { priceMetric, PRICE_BOUNDS_RAW, PRICE_BOUNDS, priceLogFloor, scopeListings, setPriceScope, getPriceScope });
})();
