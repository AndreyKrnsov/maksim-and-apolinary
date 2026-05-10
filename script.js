const RSVP_ENDPOINT = "";
const WEDDING_DATE = new Date("2026-08-08T00:00:00+04:00");

const params = new URLSearchParams(window.location.search);
const invitedGuests = (params.get("guest") || params.get("guests") || params.get("to") || "").trim();

const inviteTitle = document.querySelector("#invite-title");
const guestNameInput = document.querySelector("#guestName");

if (invitedGuests) {
  inviteTitle.textContent = `Дорогие ${invitedGuests}!`;
  guestNameInput.value = invitedGuests;
}

const music = document.querySelector("#weddingMusic");
const musicToggle = document.querySelector("#musicToggle");
const musicToggleText = musicToggle.querySelector("span");
let musicWasRequested = false;

function setMusicButton(isPlaying) {
  musicToggle.setAttribute("aria-pressed", String(isPlaying));
  musicToggleText.textContent = isPlaying ? "Играет" : "Музыка";
}

async function playMusic() {
  musicWasRequested = true;
  try {
    await music.play();
    setMusicButton(true);
  } catch {
    setMusicButton(false);
  }
}

musicToggle.addEventListener("click", async () => {
  if (music.paused) {
    await playMusic();
    return;
  }

  musicWasRequested = false;
  music.pause();
  setMusicButton(false);
});

window.addEventListener(
  "pointerdown",
  (event) => {
    if (musicWasRequested || event.target.closest("#musicToggle")) {
      return;
    }

    playMusic();
  },
  { once: true }
);

const linkForm = document.querySelector("#linkForm");
const guestLinkName = document.querySelector("#guestLinkName");
const generatedLink = document.querySelector("#generatedLink");
const copyLinkButton = document.querySelector("#copyLink");

function buildGuestLink(name) {
  const url = new URL(window.location.href);
  url.hash = "invite";
  url.search = "";
  url.searchParams.set("guest", name);
  return url.toString();
}

async function copyText(text) {
  if (!text) {
    return false;
  }

  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  const helper = document.createElement("textarea");
  helper.value = text;
  helper.setAttribute("readonly", "");
  helper.style.position = "fixed";
  helper.style.opacity = "0";
  document.body.append(helper);
  helper.select();
  const copied = document.execCommand("copy");
  helper.remove();
  return copied;
}

linkForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = guestLinkName.value.trim();

  if (!name) {
    guestLinkName.focus();
    return;
  }

  generatedLink.value = buildGuestLink(name);
  generatedLink.select();
});

copyLinkButton.addEventListener("click", async () => {
  if (!generatedLink.value && guestLinkName.value.trim()) {
    generatedLink.value = buildGuestLink(guestLinkName.value.trim());
  }

  const copied = await copyText(generatedLink.value);
  copyLinkButton.title = copied ? "Ссылка скопирована" : "Не удалось скопировать";
});

const rsvpForm = document.querySelector("#rsvpForm");
const formStatus = document.querySelector("#formStatus");
const resultPanel = document.querySelector("#resultPanel");
const resultText = document.querySelector("#resultText");
const copyResult = document.querySelector("#copyResult");
const shareResult = document.querySelector("#shareResult");

if (!navigator.share) {
  shareResult.hidden = true;
}

function getFormData(form) {
  const formData = new FormData(form);
  return {
    guestName: String(formData.get("guestName") || "").trim(),
    attendance: String(formData.get("attendance") || ""),
    overnight: String(formData.get("overnight") || ""),
    alcohol: String(formData.get("alcohol") || "").trim() || "Без предпочтений",
    transfer: String(formData.get("transfer") || ""),
    invitationFor: invitedGuests || "Гости",
    submittedAt: new Date().toLocaleString("ru-RU"),
  };
}

function formatAnswer(data) {
  return [
    "Анкета гостя на свадьбу Максима и Полины",
    `Для приглашения: ${data.invitationFor}`,
    `ФИО: ${data.guestName}`,
    `Присутствие: ${data.attendance}`,
    `Ночевка: ${data.overnight}`,
    `Алкоголь: ${data.alcohol}`,
    `Трансфер в г. Воткинск: ${data.transfer}`,
    `Отправлено: ${data.submittedAt}`,
  ].join("\n");
}

async function sendAnswer(data) {
  if (!RSVP_ENDPOINT) {
    return { sent: false };
  }

  const response = await fetch(RSVP_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`RSVP endpoint failed with ${response.status}`);
  }

  return { sent: true };
}

rsvpForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  rsvpForm.classList.add("was-validated");

  if (!rsvpForm.checkValidity()) {
    const firstInvalid = rsvpForm.querySelector(":invalid");
    formStatus.textContent = "Пожалуйста, заполните обязательные поля.";
    firstInvalid?.focus();
    return;
  }

  const data = getFormData(rsvpForm);
  const answer = formatAnswer(data);
  localStorage.setItem("maksim-polina-rsvp", JSON.stringify(data));
  resultText.value = answer;
  resultPanel.hidden = false;
  formStatus.textContent = "Анкета сохранена в этом браузере.";

  try {
    const result = await sendAnswer(data);
    formStatus.textContent = result.sent
      ? "Спасибо! Ответ отправлен."
      : "Анкета готова. Скопируйте ответ или поделитесь им.";
  } catch {
    formStatus.textContent = "Анкета готова, но отправка не удалась. Скопируйте ответ вручную.";
  }
});

rsvpForm.addEventListener("input", () => {
  if (rsvpForm.classList.contains("was-validated")) {
    formStatus.textContent = "";
  }
});

copyResult.addEventListener("click", async () => {
  const copied = await copyText(resultText.value);
  formStatus.textContent = copied ? "Ответ скопирован." : "Не удалось скопировать ответ.";
});

shareResult.addEventListener("click", async () => {
  try {
    await navigator.share({
      title: "Анкета на свадьбу Максима и Полины",
      text: resultText.value,
    });
  } catch (error) {
    if (error.name !== "AbortError") {
      formStatus.textContent = "Не удалось открыть системное меню отправки.";
    }
  }
});

const countdownFields = {
  days: document.querySelector("#days"),
  hours: document.querySelector("#hours"),
  minutes: document.querySelector("#minutes"),
  seconds: document.querySelector("#seconds"),
};

function updateCountdown() {
  const diff = WEDDING_DATE.getTime() - Date.now();

  if (diff <= 0) {
    countdownFields.days.textContent = "0";
    countdownFields.hours.textContent = "0";
    countdownFields.minutes.textContent = "0";
    countdownFields.seconds.textContent = "0";
    document.querySelector(".closing").textContent = "Наш день уже наступил.";
    return;
  }

  const day = 24 * 60 * 60 * 1000;
  const hour = 60 * 60 * 1000;
  const minute = 60 * 1000;

  const days = Math.floor(diff / day);
  const hours = Math.floor((diff % day) / hour);
  const minutes = Math.floor((diff % hour) / minute);
  const seconds = Math.floor((diff % minute) / 1000);

  countdownFields.days.textContent = String(days);
  countdownFields.hours.textContent = String(hours).padStart(2, "0");
  countdownFields.minutes.textContent = String(minutes).padStart(2, "0");
  countdownFields.seconds.textContent = String(seconds).padStart(2, "0");
}

updateCountdown();
window.setInterval(updateCountdown, 1000);
