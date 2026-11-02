(function () {
  // ---------- Переключатели в панели «Настройка прототипа» ----------
  // Вариант «Транспортной доступности», тип сделки и тип недвижимости. Выбор пишем в параметры ссылки
  // и перезагружаем страницу: так ссылку можно скопировать, а логи начинают новую сессию.
  // В ссылках для теста (?task=…) панель не показываем, чтобы респондент не переключал варианты.
  const panel = document.getElementById("prototype-panel");
  if (!panel) return;
  const { state, session } = window.App;
  if (session.task) {
    panel.hidden = true;
    return;
  }

  // Категорию можно сменить и внутри телефона (шторки, фильтры) — поэтому читаем state каждый раз
  const current = () => ({ commute: session.commute, deal: state.dealType, type: state.propertyType });
  const chips = panel.querySelectorAll("[data-proto-param] .proto-chip");

  function sync() {
    const values = current();
    chips.forEach((chip) => {
      chip.classList.toggle("is-active", chip.dataset.value === values[chip.parentElement.dataset.protoParam]);
    });
  }

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const param = chip.parentElement.dataset.protoParam;
      const values = current();
      if (chip.dataset.value === values[param]) return;
      const url = new URL(window.location.href);
      url.searchParams.set("deal", values.deal);
      url.searchParams.set("type", values.type);
      url.searchParams.set(param, chip.dataset.value);
      window.location.href = url.toString();
    });
  });

  // Места для демонстрации: пример из commute.js или пустой список, как у нового пользователя
  const { commute } = window.App;
  document.getElementById("proto-commute-sample").addEventListener("click", () => {
    commute.setPlaces(commute.SAMPLE_PLACES.map((p) => ({ ...p, limit: p.limit || (commute.variant === "zone" ? 45 : null) })));
  });
  document.getElementById("proto-commute-clear").addEventListener("click", () => commute.setPlaces([]));

  sync();
  document.addEventListener("click", () => setTimeout(sync, 0));
})();
