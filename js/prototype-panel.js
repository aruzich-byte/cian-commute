(function () {
  // ---------- Панель «Настройка прототипа» ----------
  // В ссылках для теста (?task=…) панель не показываем, чтобы респондент не переключал варианты.
  const panel = document.getElementById("prototype-panel");
  if (!panel) return;
  const { session, commute } = window.App;
  if (session.task) {
    panel.hidden = true;
    return;
  }

  // Места для демонстрации: пример из commute.js или пустой список, как у нового пользователя
  document.getElementById("proto-commute-sample").addEventListener("click", () => {
    commute.setPlaces(commute.SAMPLE_PLACES);
  });
  document.getElementById("proto-commute-clear").addEventListener("click", () => commute.setPlaces([]));

  // Версия районов — см. districtsVersion в state.js; переключение перезагружает страницу
  document.querySelectorAll("[data-districts-version]").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.districtsVersion === window.App.ui.districtsVersion);
    btn.addEventListener("click", () => window.App.setDistrictsVersion(btn.dataset.districtsVersion));
  });
})();
