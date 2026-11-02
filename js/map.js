(function () {
  const { priceMetric, formatPriceShort, formatInt, state, pinSheetRef } = window.App;

  // ---------- Карта: пины с ценой, кластеризуются на дальних зумах ----------
  let yandexMap = null;
  let clusterer = null;
  let pendingPinItems = null;
  let pinLayoutClass = null;
  let clusterIconLayout = null;
  const readyCallbacks = [];

  // Другие слои карты (мои места, зоны — см. commute-map.js) ждут готовности карты здесь
  function onMapReady(fn) {
    if (yandexMap) fn(yandexMap);
    else readyCallbacks.push(fn);
  }

  // Центр Санкт-Петербурга — Дворцовая площадь
  const MAP_CENTER = [59.9386, 30.3141];

  function initYandexMap() {
    // Скрипт карты подключён с async — может догрузиться уже после старта приложения
    if (typeof ymaps === "undefined") {
      const script = document.getElementById("ymaps-script");
      if (script) script.addEventListener("load", initYandexMap, { once: true });
      return;
    }
    ymaps.ready(() => {
      yandexMap = new ymaps.Map(
        "yandex-map",
        {
          center: MAP_CENTER,
          zoom: 12,
          controls: [],
        },
        { suppressMapOpenBlock: true }
      );
      pinLayoutClass = ymaps.templateLayoutFactory.createClass(
        '<div class="map-pin"><span class="map-pin__bubble">$[properties.label]</span></div>'
      );
      clusterIconLayout = ymaps.templateLayoutFactory.createClass(
        '<div class="map-cluster"><span class="map-cluster__count"></span></div>',
        {
          build: function () {
            clusterIconLayout.superclass.build.call(this);
            const count = this.getData().properties.get("geoObjects").length;
            this.getElement().querySelector(".map-cluster__count").textContent = formatInt(count);
          },
        }
      );
      // Группируем пины по сетке — на дальних зумах вместо сотен отдельных
      // меток рисуется один кластер-кружок, клик по нему приближает карту.
      // На близких зумах (>= 17, отдельные здания/кварталы) кластеризация
      // выключается — там показываем каждый пин отдельно.
      clusterer = new ymaps.Clusterer({
        clusterIconLayout,
        clusterIconShape: { type: "Circle", coordinates: [0, 0], radius: 26 },
        maxZoom: 16,
      });
      yandexMap.geoObjects.add(clusterer);
      if (pendingPinItems) {
        renderMapPins(pendingPinItems);
        pendingPinItems = null;
      }
      readyCallbacks.splice(0).forEach((fn) => fn(yandexMap));
    });
  }

  function renderMapPins(items) {
    if (!yandexMap || !clusterer) {
      pendingPinItems = items;
      return;
    }
    clusterer.removeAll();
    const placemarks = items.map((item) => {
      const placemark = new ymaps.Placemark(
        [item.lat, item.lon],
        { label: formatPriceShort(priceMetric(item, state.priceMode)) },
        {
          iconLayout: pinLayoutClass,
          iconShape: { type: "Rectangle", coordinates: [[-46, -18], [46, 18]] },
        }
      );
      placemark.events.add("click", () => {
        if (window.App.track) window.App.track("Пин на карте", { item });
        if (pinSheetRef.current) pinSheetRef.current.open(item);
        if (window.App.onListingPinClick) window.App.onListingPinClick(item);
      });
      return placemark;
    });
    clusterer.add(placemarks);
    fitToCategory(items);
  }

  // При первом показе и при смене категории подгоняем карту под пины — дома
  // в области иначе оказываются далеко за краем карты с центром на Дворцовой.
  let fittedScope = null;
  function fitToCategory(items) {
    const scope = `${state.dealType}/${state.propertyType}`;
    if (scope === fittedScope || items.length === 0) return;
    fittedScope = scope;
    const bounds = clusterer.getBounds();
    if (bounds) yandexMap.setBounds(bounds, { checkZoomRange: true, zoomMargin: [140, 40, 360, 40] }).then(() => {
      if (yandexMap.getZoom() > 13) yandexMap.setZoom(13);
    });
  }

  window.App = window.App || {};
  Object.assign(window.App, { initYandexMap, renderMapPins, onMapReady, getYandexMap: () => yandexMap });
})();
