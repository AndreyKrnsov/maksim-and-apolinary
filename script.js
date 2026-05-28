const RSVP_CONFIG = window.RSVP_CONFIG || {};
const RSVP_ENDPOINT = RSVP_CONFIG.endpoint || "";
const GOOGLE_FORM_ACTION = RSVP_CONFIG.googleFormAction || "";
const GOOGLE_FORM_FIELDS = {
  guestName: "",
  attendance: "",
  overnight: "",
  alcohol: "",
  transfer: "",
  invitationFor: "",
  submittedAt: "",
  ...(RSVP_CONFIG.googleFormFields || {}),
};

const WEDDING_DATE = new Date("2026-08-08T15:30:00+04:00");
const MUSIC_START = 20;
const MUSIC_END = 49;

function setStableViewportHeight() {
  document.documentElement.style.setProperty("--stable-vh", `${window.innerHeight}px`);
}

setStableViewportHeight();
window.addEventListener("pageshow", setStableViewportHeight);
window.addEventListener("orientationchange", () => {
  window.setTimeout(setStableViewportHeight, 250);
});

const params = new URLSearchParams(window.location.search);
const invitePayload = decodeInvitePayload(params.get("i") || params.get("invite") || "");
const invitedGuests = (
  invitePayload?.guest ||
  params.get("guest") ||
  params.get("guests") ||
  params.get("to") ||
  ""
).trim();
const greetingParam = (invitePayload?.greeting || params.get("greeting") || "").trim();

const inviteTitle = document.querySelector("#invite-title");
const guestNameInput = document.querySelector("#guestName");

function decodeBase64Url(value) {
  const paddedValue = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = window.atob(paddedValue);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function decodeInvitePayload(value) {
  if (!value) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(value));
    return payload && typeof payload === "object" ? payload : null;
  } catch {
    return null;
  }
}

function hasMultipleGuests(name) {
  return /[,;&+]|\sи\s/i.test(name);
}

function inferGreeting(name) {
  const normalizedName = name.trim().toLowerCase();
  const masculineNamesEndingWithVowel = new Set([
    "илья",
    "никита",
    "данила",
    "саша",
    "женя",
    "миша",
    "паша",
    "леша",
    "лёша",
    "дима",
    "коля",
    "вася",
    "петя",
    "гриша",
  ]);

  if (hasMultipleGuests(normalizedName)) {
    return "Дорогие";
  }

  if (masculineNamesEndingWithVowel.has(normalizedName)) {
    return "Дорогой";
  }

  return /[ая]$/i.test(normalizedName) ? "Дорогая" : "Дорогой";
}

function getGreeting(name, value) {
  const greetings = {
    male: "Дорогой",
    female: "Дорогая",
    plural: "Дорогие",
    "дорогой": "Дорогой",
    "дорогая": "Дорогая",
    "дорогие": "Дорогие",
  };

  return greetings[value.toLowerCase()] || inferGreeting(name);
}

if (invitedGuests) {
  inviteTitle.textContent = `${getGreeting(invitedGuests, greetingParam)} ${invitedGuests}!`;
  guestNameInput.value = invitedGuests;
}

const music = document.querySelector("#weddingMusic");
const musicToggle = document.querySelector("#musicToggle");
const musicToggleText = musicToggle.querySelector("span");
let musicWasRequested = false;

function setMusicButton(isPlaying) {
  musicToggle.setAttribute("aria-pressed", String(isPlaying));
  musicToggle.setAttribute("aria-label", isPlaying ? "Выключить музыку" : "Включить музыку");
  musicToggleText.textContent = isPlaying ? "Играет" : "Музыка";
}

function seekMusicToStart() {
  try {
    if (Number.isFinite(music.duration)) {
      music.currentTime = MUSIC_START;
    }
  } catch {
    // Some browsers only allow seeking after enough metadata is loaded.
  }
}

async function playMusic() {
  musicWasRequested = true;

  if (music.currentTime < MUSIC_START || music.currentTime >= MUSIC_END) {
    seekMusicToStart();
  }

  try {
    await music.play();
    setMusicButton(true);
  } catch {
    setMusicButton(false);
  }
}

music.addEventListener("loadedmetadata", seekMusicToStart, { once: true });
music.addEventListener("timeupdate", () => {
  if (music.currentTime >= MUSIC_END) {
    music.currentTime = MUSIC_START;
    if (!music.paused) {
      music.play();
    }
  }
});

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

const rsvpForm = document.querySelector("#rsvpForm");
const formStatus = document.querySelector("#formStatus");

function getFormData(form) {
  const formData = new FormData(form);
  return {
    guestName: String(formData.get("guestName") || "").trim(),
    attendance: String(formData.get("attendance") || ""),
    overnight: String(formData.get("overnight") || ""),
    alcohol: String(formData.get("alcohol") || "").trim() || "Без предпочтений",
    transfer: String(formData.get("transfer") || ""),
    invitationFor: invitedGuests || "Гости без именной ссылки",
    submittedAt: new Date().toLocaleString("ru-RU"),
  };
}

function googleFormIsConfigured() {
  const requiredFields = ["guestName", "attendance", "overnight", "transfer"];
  return Boolean(GOOGLE_FORM_ACTION) && requiredFields.every((field) => GOOGLE_FORM_FIELDS[field]);
}

async function sendToGoogleForm(data) {
  const formData = new FormData();
  Object.entries(GOOGLE_FORM_FIELDS).forEach(([key, entryId]) => {
    if (entryId) {
      formData.append(entryId, data[key]);
    }
  });

  await fetch(GOOGLE_FORM_ACTION, {
    method: "POST",
    mode: "no-cors",
    body: formData,
  });

  return { sent: true, provider: "google-forms" };
}

async function sendAnswer(data) {
  if (googleFormIsConfigured()) {
    return sendToGoogleForm(data);
  }

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

  return { sent: true, provider: "json-endpoint" };
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
  localStorage.setItem("maksim-polina-rsvp", JSON.stringify(data));
  formStatus.textContent = "Анкета сохранена в этом браузере.";

  try {
    const result = await sendAnswer(data);
    formStatus.textContent = result.sent
      ? "Спасибо! Ответ отправлен."
      : "Анкета сохранена в этом браузере.";
  } catch {
    formStatus.textContent = "Не удалось отправить анкету. Попробуйте еще раз.";
  }
});

rsvpForm.addEventListener("input", () => {
  if (rsvpForm.classList.contains("was-validated")) {
    formStatus.textContent = "";
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
    document.querySelector(".closing").textContent = "Уже ждем Вас на нашем празднике!";
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
