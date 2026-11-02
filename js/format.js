(function () {
  function pluralize(n, one, few, many) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return few;
    return many;
  }

  function clamp(v, min, max) {
    return Math.min(Math.max(v, min), max);
  }

  function formatInt(n) {
    return Math.round(n).toLocaleString("ru-RU");
  }

  function formatPrice(n) {
    return `${Math.round(n).toLocaleString("ru-RU")} ₽`;
  }

  function formatPriceShort(n) {
    if (n >= 1_000_000) {
      const millions = n / 1_000_000;
      const rounded = millions >= 10 ? Math.round(millions) : Math.round(millions * 10) / 10;
      return `${rounded.toString().replace(".", ",")} млн ₽`;
    }
    if (n >= 1000) {
      return `${Math.round(n / 1000)} тыс ₽`;
    }
    return `${Math.round(n)} ₽`;
  }

  function formatArea(n) {
    return `${n} м²`;
  }

  window.App = window.App || {};
  Object.assign(window.App, { pluralize, clamp, formatInt, formatPrice, formatPriceShort, formatArea });
})();
