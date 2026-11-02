(function () {
  // Допущение: у каждого типа рассадки — диапазон площади на человека (м²/чел.),
  // а не фиксированное число. Поэтому фильтр по «Кол-во чел.» переводится в диапазон
  // площади [от людей * мин. м²/чел. — до людей * макс. м²/чел.], а не в одну точку.
  const SEATING_TYPES = [
    { id: "any", label: "Любая", perPersonMin: 4, perPersonMax: 14 },
    { id: "dense", label: "Плотная рассадка", perPersonMin: 4, perPersonMax: 6 },
    { id: "standard", label: "Стандартная рассадка", perPersonMin: 6, perPersonMax: 8 },
    { id: "comfort", label: "Комфортная рассадка", perPersonMin: 8, perPersonMax: 10 },
    { id: "cabinet", label: "Кабинетная рассадка", perPersonMin: 10, perPersonMax: 14 },
  ];

  function getSeatingType(id) {
    return SEATING_TYPES.find((t) => t.id === id) || SEATING_TYPES[0];
  }

  window.App = window.App || {};
  Object.assign(window.App, { SEATING_TYPES, getSeatingType });
})();
