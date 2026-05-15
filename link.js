const linkForm = document.querySelector("#linkForm");
const guestLinkName = document.querySelector("#guestLinkName");
const guestGreeting = document.querySelector("#guestGreeting");
const generatedLink = document.querySelector("#generatedLink");
const copyLinkButton = document.querySelector("#copyLink");
const linkResult = document.querySelector("#linkResult");
const linkStatus = document.querySelector("#linkStatus");

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
    return "plural";
  }

  if (masculineNamesEndingWithVowel.has(normalizedName)) {
    return "male";
  }

  return /[ая]$/i.test(normalizedName) ? "female" : "male";
}

function encodeBase64Url(value) {
  const bytes = new TextEncoder().encode(value);
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return window.btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function encodeInvitePayload(payload) {
  return encodeBase64Url(JSON.stringify(payload));
}

function buildGuestLink(name, greeting) {
  const url = new URL("index.html", window.location.href);
  url.hash = "invite";
  url.searchParams.set("i", encodeInvitePayload({ guest: name, greeting }));
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
  helper.style.left = "-9999px";
  helper.style.top = "0";
  document.body.append(helper);
  helper.select();
  const copied = document.execCommand("copy");
  helper.remove();
  return copied;
}

guestLinkName.addEventListener("input", () => {
  const name = guestLinkName.value.trim();

  if (name) {
    guestGreeting.value = inferGreeting(name);
  }
});

linkForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = guestLinkName.value.trim();

  if (!name) {
    guestLinkName.focus();
    return;
  }

  generatedLink.value = buildGuestLink(name, guestGreeting.value);
  linkResult.hidden = false;
  generatedLink.select();
  linkStatus.textContent = "";
});

copyLinkButton.addEventListener("click", async () => {
  const copied = await copyText(generatedLink.value);
  linkStatus.textContent = copied ? "Ссылка скопирована." : "Не удалось скопировать ссылку.";
});
