(function () {
  const { commute, onMapReady, computeResults } = window.App;
  const { KINDS, MODES } = commute;
  const isZone = commute.variant === "zone";

  // ---------- Слои карты «Транспортной доступности» ----------
  // Мои места — тёмные круглые пины с иконкой типа (поверх пинов цен, не кластеризуются);
  // в «Поиске по времени» — ещё и зона досягаемости каждого адреса;
  // по тапу на пин объявления — пунктир до каждого места со временем в пути.
  const ZONE_COLOR = "#0468ff";

  onMapReady((map) => {
    const zones = new ymaps.GeoObjectCollection();
    const placePins = new ymaps.GeoObjectCollection();
    const links = new ymaps.GeoObjectCollection();
    map.geoObjects.add(zones);
    map.geoObjects.add(links);
    map.geoObjects.add(placePins);

    const placeLayout = ymaps.templateLayoutFactory.createClass(
      '<div class="place-pin"><span class="place-pin__icon">$[properties.icon]</span><span class="place-pin__label">$[properties.title]</span></div>'
    );
    const linkLabelLayout = ymaps.templateLayoutFactory.createClass(
      '<div class="commute-link-label$[properties.over]">$[properties.icon]<span>$[properties.time]</span></div>'
    );

    function renderPlaces() {
      zones.removeAll();
      placePins.removeAll();
      links.removeAll();
      commute.getPlaces().forEach((p) => {
        if (isZone) {
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
            { iconLayout: placeLayout, iconShape: { type: "Circle", coordinates: [0, 0], radius: 20 }, zIndex: 900 }
          )
        );
      });
    }

    // Показать места вместе с объявлениями: в зоне — по её границам, иначе — места + пины выдачи
    function fitToPlaces() {
      const places = commute.getPlaces();
      if (!places.length) return;
      const points = places.map((p) => [p.lat, p.lon]);
      if (isZone) zones.each((z) => z.geometry.getCoordinates()[0].forEach((c) => points.push(c)));
      else computeResults().base.forEach((item) => points.push([item.lat, item.lon]));
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

    function clearLinks() {
      links.removeAll();
    }

    window.App.onListingPinClick = (item) => {
      clearLinks();
      commute.getPlaces().forEach((p) => {
        const min = commute.minutesTo(p, item);
        const over = p.limit != null && min > p.limit;
        links.add(
          new ymaps.Polyline([[item.lat, item.lon], [p.lat, p.lon]], {}, {
            strokeColor: over ? "#b8720a" : "#0d162e",
            strokeOpacity: 0.75,
            strokeWidth: 2,
            strokeStyle: "shortdash",
            interactivityModel: "default#transparent",
          })
        );
        links.add(
          new ymaps.Placemark(
            [(item.lat + p.lat) / 2, (item.lon + p.lon) / 2],
            { icon: MODES[p.mode].icon, time: commute.formatMinutes(min), over: over ? " is-over" : "" },
            { iconLayout: linkLabelLayout, iconShape: { type: "Rectangle", coordinates: [[-36, -14], [36, 14]] }, zIndex: 800 }
          )
        );
      });
    };
    document.getElementById("pin-sheet-backdrop").addEventListener("click", clearLinks);
    map.events.add("click", clearLinks);

    renderPlaces();
    commute.onChange(() => {
      renderPlaces();
      fitToPlaces();
    });
    // Места сохранены с прошлого раза — показываем их сразу вместе с выдачей
    if (commute.getPlaces().length) setTimeout(fitToPlaces, 400);
  });
})();
