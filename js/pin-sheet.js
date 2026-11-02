(function () {
  const { createCardEl, createOverlayController } = window.App;

  // ---------- Bottom sheet: карточка объявления по клику на пин карты ----------
  function setupPinSheet() {
    const overlay = createOverlayController(document.getElementById("pin-sheet-backdrop"), document.getElementById("pin-sheet"));
    const body = document.getElementById("pin-sheet-body");

    function open(item) {
      body.innerHTML = "";
      body.appendChild(createCardEl(item, false));
      overlay.open();
    }

    document.getElementById("pin-sheet-backdrop").addEventListener("click", overlay.close);

    return { open, close: overlay.close };
  }

  window.App = window.App || {};
  window.App.setupPinSheet = setupPinSheet;
})();
