(function () {
  const { createCommuteSheet, formatPrice } = window.App;
  const track = (event, opts) => window.App.track && window.App.track(event, opts);

  // ---------- Вопросы продавцу о дороге ----------
  // Чего Циан о дороге не знает (давка утром, парковка, чистят ли зимой), спрашиваем у продавца:
  // готовый вопрос в один тап уходит в чат, а ответ остаётся в объявлении «со слов продавца».
  // В прототипе продавец «отвечает» сам через пару секунд — вариант ответа выбираем по id объявления.

  const ICON_CHAT = '<svg viewBox="0 0 16 16" fill="none"><path d="M2.5 3.5h11v7.5H7l-3 2.5V11H2.5V3.5Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  const ICON_SEND = '<svg viewBox="0 0 16 16" fill="none"><path d="M2 8l12-5.5L9.5 14 7.5 9 2 8Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  const ICON_QUOTE = '<svg viewBox="0 0 16 16" fill="none"><path d="M3 4h10v6.5H8.5L5.5 13v-2.5H3V4Z" fill="currentColor"/></svg>';

  // Вопросы о дороге для городской квартиры
  const CITY = [
    {
      id: "metro",
      short: "Сколько реально идти до метро?",
      chat: "Здравствуйте! Подскажите, сколько реально идти от дома до метро?",
      answers: (i) => [`Минут ${(i.metroMin || 10) + 2}, дорога через дворы, вечером светло`, `Около ${i.metroMin || 10} минут быстрым шагом`, `Минут ${(i.metroMin || 10) + 5}, есть переход через проспект со светофором`],
    },
    {
      id: "rush",
      short: "Как утром с транспортом?",
      chat: "Здравствуйте! Как утром с транспортом — большая давка на станции?",
      answers: () => ["Утром на входе в метро очередь минут 5–7", "Автобус до метро ходит часто, но утром битком", "Спокойно, без давки"],
    },
    {
      id: "parking",
      short: "Есть ли место на парковке вечером?",
      chat: "Здравствуйте! Вечером во дворе можно встать на машине?",
      answers: () => ["Двор за шлагбаумом, места есть всегда", "Вечером бывает тесно, рядом есть платная парковка", "Мест мало, после 20:00 встать сложно"],
    },
    {
      id: "school",
      short: "В какую школу прикреплён дом?",
      chat: "Здравствуйте! Подскажите, к какой школе прикреплён дом и далеко ли идти?",
      answers: () => ["Школа во дворе, 5 минут пешком, дорогу переходить не нужно", "Школа в 10 минутах, по пути один светофор", "Ближайшая — минут 15 пешком, многие возят на машине"],
    },
  ];


  const MAX_ASK = 3;

  function questionsFor(item) {
    // Школа важна семьям — показываем её для двушек и больше
    return CITY.filter((q) => q.id !== "school" || (item.rooms || 0) >= 2);
  }

  function seed(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  function answerText(item, q) {
    const variants = q.answers(item);
    return variants[seed(item.id + q.id) % variants.length];
  }

  // ---------- Ответы продавцов ----------
  // У части объявлений один ответ уже есть — кто-то спрашивал раньше: так видно оба состояния.
  // Ответы, полученные в прототипе, сохраняем в localStorage — они переживают перезагрузку.
  const STORAGE_KEY = "road-answers";
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch (e) {
    saved = {};
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch (e) {
      /* приватный режим — ответы живут до перезагрузки */
    }
  }

  function answersFor(item) {
    const result = [];
    const qs = questionsFor(item);
    if (seed(item.id) % 3 === 0) {
      const q = qs[seed(item.id + "pre") % qs.length];
      result.push({ q, text: answerText(item, q), when: `${2 + (seed(item.id) % 9)} дн. назад` });
    }
    Object.keys(saved[item.id] || {}).forEach((qid) => {
      const q = qs.find((x) => x.id === qid);
      if (q && !result.some((r) => r.q.id === qid)) result.push({ q, text: saved[item.id][qid], when: "сегодня" });
    });
    return result;
  }

  function sellerName(item) {
    return item.agency || item.sellerRole;
  }

  // ---------- Блок «Дорога: со слов продавца» + вопросы ----------
  // Встраивается в подробности времени в пути и в карточку объявления
  function roadBlockHtml(item) {
    const answers = answersFor(item);
    const answered = new Set(answers.map((a) => a.q.id));
    const ask = questionsFor(item).filter((q) => !answered.has(q.id)).slice(0, MAX_ASK);
    const answersHtml = answers
      .map(
        (a) => `<div class="road-answer">
          <div class="road-answer__q">${a.q.short}</div>
          <div class="road-answer__text">${ICON_QUOTE}<span>${a.text}</span></div>
          <div class="road-answer__meta">Со слов продавца · ${a.when}</div>
        </div>`
      )
      .join("");
    const askHtml = ask.length
      ? `<div class="road-ask__list">${ask.map((q) => `<button type="button" class="road-ask__q" data-road-q="${q.id}">${ICON_CHAT}<span>${q.short}</span></button>`).join("")}</div>`
      : "";
    return `<div class="road-block" data-road-item="${item.id}">
      <div class="road-block__title">Спросите продавца о дороге</div>
      ${answersHtml}
      ${askHtml}
    </div>`;
  }

  // Делегирование: вопрос можно нажать в любой шторке, где есть блок
  function bindRoadBlock(container, getItem, source) {
    container.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-road-q]");
      const item = getItem();
      if (!btn || !item) return;
      const q = questionsFor(item).find((x) => x.id === btn.dataset.roadQ);
      if (q) openChat(item, q, source);
    });
  }

  // ---------- Чат с продавцом ----------
  const chat = createCommuteSheet("road-chat-sheet", "editor");
  chat.sheet.classList.add("road-chat");
  let chatItem = null;
  let replyTimer = null;
  const refreshers = [];

  function bubble(text, from, extra = "") {
    return `<div class="chat-msg chat-msg--${from}">${text}${extra}</div>`;
  }

  function openChat(item, q, source) {
    chatItem = item;
    clearTimeout(replyTimer);
    track("Задал вопрос о дороге", { item, value: `${q.short} · ${source}` });
    chat.title.textContent = sellerName(item);
    const price = `${formatPrice(item.price)}/мес.`;
    chat.body.innerHTML = `
      <div class="chat-listing">${price} · ${item.address}</div>
      <div class="chat-thread" data-role="thread">
        ${bubble(q.chat, "me", '<span class="chat-msg__status">Отправлено</span>')}
        <div class="chat-typing">${sellerName(item)} печатает…</div>
      </div>
    `;
    chat.footer.innerHTML = `
      <div class="chat-input">
        <input type="text" data-role="input" placeholder="Сообщение" autocomplete="off" />
        <button type="button" class="chat-input__send" data-role="send" aria-label="Отправить">${ICON_SEND}</button>
      </div>
    `;
    chat.overlay.open();

    replyTimer = setTimeout(() => {
      const text = answerText(item, q);
      saved[item.id] = { ...(saved[item.id] || {}), [q.id]: text };
      persist();
      const thread = chat.body.querySelector('[data-role="thread"]');
      thread.querySelector(".chat-typing").remove();
      thread.insertAdjacentHTML("beforeend", bubble(text, "seller"));
      thread.insertAdjacentHTML("beforeend", `<div class="chat-note">Ответ добавлен в объявление — его увидят и другие покупатели</div>`);
      track("Получил ответ о дороге", { item, value: q.short });
      refreshers.forEach((fn) => fn(item));
    }, 1800);
  }

  // Своё сообщение — уходит в чат; в прототипе продавец отвечает дежурной фразой
  function sendOwn() {
    const input = chat.footer.querySelector('[data-role="input"]');
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    track("Написал продавцу своё", { item: chatItem, value: text });
    const thread = chat.body.querySelector('[data-role="thread"]');
    thread.insertAdjacentHTML("beforeend", bubble(text, "me"));
    setTimeout(() => thread.insertAdjacentHTML("beforeend", bubble("Уточню и напишу вам сегодня", "seller")), 1500);
  }

  chat.footer.addEventListener("click", (e) => {
    if (e.target.closest('[data-role="send"]')) sendOwn();
  });
  chat.footer.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendOwn();
  });
  const closeChat = () => {
    clearTimeout(replyTimer);
    chat.overlay.close();
  };
  chat.closeBtn.addEventListener("click", closeChat);
  chat.backdrop.addEventListener("click", closeChat);

  // Шторки, где виден блок, перерисовывают его, когда пришёл ответ
  function onAnswer(fn) {
    refreshers.push(fn);
  }

  window.App = window.App || {};
  window.App.road = { roadBlockHtml, bindRoadBlock, onAnswer };
})();
