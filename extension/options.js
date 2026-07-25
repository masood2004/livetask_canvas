import { clearSession, getConfig, saveConfig, testConnection } from "./lib/api.js";

const el = Object.fromEntries([...document.querySelectorAll("[id]")].map((node) => [node.id, node]));
load();

async function load() {
  const config = await getConfig();
  el.supabaseUrl.value = config.supabaseUrl;
  el.publishableKey.value = config.publishableKey;
  el.appUrl.value = config.appUrl;
  el.defaultPriority.value = config.defaultPriority;
  el.notificationsEnabled.checked = config.notificationsEnabled;
}

el.settingsForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = event.submitter;
  setBusy(button, true, "Saving…");
  hideMessage();
  try {
    const candidate = readForm();
    await requestOrigin(candidate.supabaseUrl);
    await testConnection(candidate);
    await saveConfig(candidate);
    showMessage("Settings saved. LiveTask Companion is ready.");
    await chrome.runtime.sendMessage({ type: "CONFIG_CHANGED" });
  } catch (error) {
    showMessage(error.message, true);
  } finally { setBusy(button, false); }
});

el.testButton.addEventListener("click", async () => {
  setBusy(el.testButton, true, "Testing…");
  hideMessage();
  try {
    const candidate = readForm();
    await requestOrigin(candidate.supabaseUrl);
    await testConnection(candidate);
    showMessage("Connection successful.");
  } catch (error) {
    showMessage(error.message, true);
  } finally { setBusy(el.testButton, false); }
});

el.resetButton.addEventListener("click", async () => {
  if (!confirm("Reset LiveTask Companion on this browser?")) return;
  await chrome.storage.local.clear();
  await chrome.action.setBadgeText({ text: "" });
  await load();
  showMessage("Extension data cleared.");
});

el.openShortcutSettings.addEventListener("click", () => chrome.tabs.create({ url: "chrome://extensions/shortcuts" }));

function readForm() {
  return {
    supabaseUrl: el.supabaseUrl.value.trim(),
    publishableKey: el.publishableKey.value.trim(),
    appUrl: el.appUrl.value.trim(),
    defaultPriority: el.defaultPriority.value,
    notificationsEnabled: el.notificationsEnabled.checked
  };
}

async function requestOrigin(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error("Enter a valid Supabase project URL."); }
  const granted = await chrome.permissions.request({ origins: [`${url.origin}/*`] });
  if (!granted) throw new Error("Permission to connect to this Supabase project was not granted.");
}

function setBusy(button, state, label) {
  if (state) { button.dataset.label = button.textContent; button.textContent = label; }
  else if (button.dataset.label) button.textContent = button.dataset.label;
  button.disabled = state;
}
function showMessage(text, error = false) { el.settingsMessage.textContent = text; el.settingsMessage.className = `message ${error ? "error" : "success"}`; }
function hideMessage() { el.settingsMessage.classList.add("hidden"); }
