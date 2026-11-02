(function () {
  // ---------- Позиционирование тултипов иконок «i» в панели прототипа ----------
  // CSS даёт тултипу position: fixed (чтобы не обрезался скроллящейся
  // .prototype-panel), поэтому left/top считаем здесь — от рект. кнопки,
  // с клампом по вьюпорту и переворотом вниз, если сверху не хватает места.
  const GAP = 8;
  const VIEWPORT_MARGIN = 8;

  function positionTooltip(button, tooltip) {
    const buttonRect = button.getBoundingClientRect();
    const tooltipWidth = tooltip.offsetWidth;
    const tooltipHeight = tooltip.offsetHeight;

    let left = buttonRect.left;
    left = Math.min(left, window.innerWidth - tooltipWidth - VIEWPORT_MARGIN);
    left = Math.max(left, VIEWPORT_MARGIN);

    let top = buttonRect.top - tooltipHeight - GAP;
    if (top < VIEWPORT_MARGIN) top = buttonRect.bottom + GAP;

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }

  document.querySelectorAll(".proto-info").forEach((button) => {
    const tooltip = button.querySelector(".proto-info__tooltip");
    if (!tooltip) return;
    const update = () => positionTooltip(button, tooltip);
    button.addEventListener("mouseenter", update);
    button.addEventListener("focus", update);
  });
})();
