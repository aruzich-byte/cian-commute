(function () {
  const { createOverlayController, formatPrice } = window.App;

  // ---------- Заглушка карточки объявления ----------
  // Карточки в прототипе нет; для UX-теста важно лишь зафиксировать, что сниппет открыли
  // (это делает cards.js → track «Открыл карточку»), и вернуть респондента к выдаче.
  const overlay = createOverlayController(document.getElementById("card-stub-backdrop"), document.getElementById("card-stub"));
  const listingEl = document.getElementById("card-stub-listing");

  function openCardStub(item) {
    listingEl.textContent = `${formatPrice(item.price)}${item.dealType === "rent" ? "/мес." : ""} · ${item.address || ""}`;
    overlay.open();
  }

  ["card-stub-close", "card-stub-back", "card-stub-backdrop"].forEach((id) => document.getElementById(id).addEventListener("click", overlay.close));

  window.App = window.App || {};
  window.App.openCardStub = openCardStub;
})();
