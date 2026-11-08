(function () {
  const { createOverlayController, formatPrice } = window.App;

  // ---------- Заглушка карточки объявления ----------
  // Карточки в прототипе нет; для UX-теста важно лишь зафиксировать, что сниппет открыли
  // (это делает cards.js → track «Открыл карточку»), и вернуть респондента к выдаче.
  const overlay = createOverlayController(document.getElementById("card-stub-backdrop"), document.getElementById("card-stub"));
  const listingEl = document.getElementById("card-stub-listing");
  const roadEl = document.getElementById("card-stub-road");
  let current = null;

  // Блок «Дорога» с ответами продавца и вопросами — то, что жило бы в карточке объекта
  function renderRoad() {
    const { road } = window.App;
    roadEl.innerHTML = road && current ? road.roadBlockHtml(current) : "";
  }

  function openCardStub(item) {
    current = item;
    listingEl.textContent = `${formatPrice(item.price)}/мес. · ${item.address || ""}`;
    renderRoad();
    overlay.open();
  }

  window.addEventListener("load", () => {
    const { road } = window.App;
    if (!road) return;
    road.bindRoadBlock(roadEl, () => current, "карточка");
    road.onAnswer((item) => current && item.id === current.id && renderRoad());
  });

  ["card-stub-close", "card-stub-back", "card-stub-backdrop"].forEach((id) => document.getElementById(id).addEventListener("click", overlay.close));

  window.App = window.App || {};
  window.App.openCardStub = openCardStub;
})();
