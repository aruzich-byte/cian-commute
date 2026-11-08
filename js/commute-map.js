(function () {
  const { commute, onMapReady, computeResults } = window.App;
  const { KINDS } = commute;

  // ---------- Слои карты «Транспортной доступности» ----------
  // Мои места — тёмные круглые пины с иконкой типа (поверх пинов цен, не кластеризуются);
  // у мест с лимитом — ещё и зона досягаемости.
  const ZONE_COLOR = "#0468ff";

  onMapReady((map) => {
    const zones = new ymaps.GeoObjectCollection();
    const placePins = new ymaps.GeoObjectCollection();
    map.geoObjects.add(zones);
    map.geoObjects.add(placePins);

    const placeLayout = ymaps.templateLayoutFactory.createClass(
      '<div class="place-pin"><span class="place-pin__icon">$[properties.icon]</span><span class="place-pin__label">$[properties.title]</span></div>'
    );

    function renderPlaces() {
      zones.removeAll();
      placePins.removeAll();
      commute.getPlaces().forEach((p) => {
        if (p.limit != null) {
          zones.add(
            new ymaps.Polygon([commute.zonePolygon(p)], {}, {
              fillColor: ZONE_COLOR,
              fillOpacity: 0.1,
              strokeColor: ZONE_COLOR,
              strokeOpacity: 0.7,
              strokeWidth: 2,
              interactivityModel: "default#transparent",
            })
          );
        }
        placePins.add(
          new ymaps.Placemark(
            [p.lat, p.lon],
            { icon: KINDS[p.kind].icon, title: commute.placeTitle(p) },
            { iconLayout: placeLayout, iconShape: { type: "Circle", coordinates: [0, 0], radius: 14 }, zIndex: 900 }
          )
        );
      });
    }

    // Показать места вместе с объявлениями: места, границы зон и пины выдачи
    function fitToPlaces() {
      const places = commute.getPlaces();
      if (!places.length) return;
      const points = places.map((p) => [p.lat, p.lon]);
      zones.each((z) => z.geometry.getCoordinates()[0].forEach((c) => points.push(c)));
      computeResults().base.forEach((item) => points.push([item.lat, item.lon]));
      const lats = points.map((c) => c[0]);
      const lons = points.map((c) => c[1]);
      map.setBounds(
        [
          [Math.min(...lats), Math.min(...lons)],
          [Math.max(...lats), Math.max(...lons)],
        ],
        { checkZoomRange: true, zoomMargin: [150, 40, 380, 40], duration: 300 }
      );
    }

    // Подписи мест — только на крупном зуме: на обзорном они слипаются с пинами цен
    const LABEL_ZOOM = 13;
    const mapArea = document.getElementById("map-area");
    const syncLabels = () => mapArea.classList.toggle("show-place-labels", map.getZoom() >= LABEL_ZOOM);
    map.events.add("boundschange", syncLabels);
    syncLabels();

    renderPlaces();
    commute.onChange(() => {
      renderPlaces();
      fitToPlaces();
    });
    // Места сохранены с прошлого раза — показываем их сразу вместе с выдачей
    if (commute.getPlaces().length) setTimeout(fitToPlaces, 400);
  });
})();
