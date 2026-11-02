(function () {
  // filters-modal.js использует два повторяющихся паттерна выбора среди .pick-chip:
  // один чип за раз (радио-подобный) и несколько чипов одновременно (переключение
  // каждого по клику). Раньше оба варианта дублировались вручную для каждой группы
  // чипов (сделка/тип недвижимости/подтип/класс) — вынесено сюда один раз.

  // Клик по чипу делает активным ТОЛЬКО его, остальные в группе гасит.
  function wireSingleSelectChips(chips, onChange) {
    chips.forEach((chip) => {
      chip.addEventListener("click", () => {
        chips.forEach((c) => c.classList.toggle("is-active", c === chip));
        onChange();
      });
    });
  }

  // Клик по чипу переключает только его собственное состояние, остальные не трогает.
  function wireMultiToggleChips(chips, onChange) {
    chips.forEach((chip) => {
      chip.addEventListener("click", () => {
        chip.classList.toggle("is-active");
        onChange();
      });
    });
  }

  function activeChip(chips) {
    return chips.find((c) => c.classList.contains("is-active"));
  }

  function activeChips(chips) {
    return chips.filter((c) => c.classList.contains("is-active"));
  }

  window.App = window.App || {};
  Object.assign(window.App, { wireSingleSelectChips, wireMultiToggleChips, activeChip, activeChips });
})();
