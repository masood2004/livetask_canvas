import { createTask, deleteTask, disconnect, getConfig, getSession, listTasks, signIn, updateTask } from "./lib/api.js";
import { taskCard } from "./lib/ui.js";

const elements = Object.fromEntries([...document.querySelectorAll("[id]")].map((element) => [element.id, element]));
let config;
let tasks = [];
let currentTab = null;

boot();

async function boot() {
  wireEvents();
  currentTab = await getActiveTab();
  config = await getConfig();
  if (!config.supabaseUrl || !config.publishableKey) return showState("setup");
  const session = await getSession();
  if (!session) return showState("auth");
  elements.priorityInput.value = config.defaultPriority;
  showState("app");
  await refreshTasks();
}

function wireEvents() {
  elements.settingsButton.addEventListener("click", () => chrome.runtime.openOptionsPage());
  elements.openSettingsButton.addEventListener("click", () => chrome.runtime.openOptionsPage());
  elements.loginForm.addEventListener("submit", handleLogin);
  elements.quickForm.addEventListener("submit", handleCreate);
  elements.capturePageButton.addEventListener("click", captureCurrentPage);
  elements.openPanelButton.addEventListener("click", openSidePanel);
  elements.refreshButton.addEventListener("click", refreshTasks);
  elements.openDashboardButton.addEventListener("click", () => openWeb("/dashboard"));
  elements.openWebSignup.addEventListener("click", () => openWeb("/signup"));
  elements.logoutButton.addEventListener("click", async () => { await disconnect(); showState("auth"); });
  elements.recentList.addEventListener("click", handleTaskAction);
}

function showState(state) {
  elements.setupState.classList.toggle("hidden", state !== "setup");
  elements.authState.classList.toggle("hidden", state !== "auth");
  elements.appState.classList.toggle("hidden", state !== "app");
}

async function handleLogin(event) {
  event.preventDefault();
  setButtonBusy(event.submitter, true, "Signing in…");
  hideMessage(elements.loginError);
  try {
    await signIn(elements.emailInput.value, elements.passwordInput.value);
    config = await getConfig();
    elements.priorityInput.value = config.defaultPriority;
    showState("app");
    await refreshTasks();
    await chrome.runtime.sendMessage({ type: "TASKS_CHANGED" });
  } catch (error) {
    showMessage(elements.loginError, error.message, true);
  } finally {
    setButtonBusy(event.submitter, false);
  }
}

async function handleCreate(event) {
  event.preventDefault();
  const button = event.submitter;
  setButtonBusy(button, true, "Adding…");
  hideMessage(elements.appMessage);
  try {
    const attach = elements.attachPageInput.checked && isCapturable(currentTab);
    await createTask({
      title: elements.titleInput.value,
      description: elements.descriptionInput.value,
      priority: elements.priorityInput.value,
      due_date: elements.dueDateInput.value,
      source_url: attach ? currentTab.url : null,
      source_title: attach ? currentTab.title : null
    });
    elements.quickForm.reset();
    elements.priorityInput.value = config.defaultPriority;
    showMessage(elements.appMessage, "Task added.");
    await refreshTasks();
    await chrome.runtime.sendMessage({ type: "TASKS_CHANGED" });
  } catch (error) {
    showMessage(elements.appMessage, error.message, true);
  } finally {
    setButtonBusy(button, false);
  }
}

async function captureCurrentPage() {
  if (!isCapturable(currentTab)) return showMessage(elements.appMessage, "This Chrome page cannot be captured.", true);
  setButtonBusy(elements.capturePageButton, true, "Capturing…");
  try {
    await createTask({
      title: currentTab.title || "Review captured page",
      description: "Captured from the browser for later review.",
      priority: config.defaultPriority,
      source_url: currentTab.url,
      source_title: currentTab.title
    });
    showMessage(elements.appMessage, "Page saved to LiveTask.");
    await refreshTasks();
    await chrome.runtime.sendMessage({ type: "TASKS_CHANGED" });
  } catch (error) {
    showMessage(elements.appMessage, error.message, true);
  } finally {
    setButtonBusy(elements.capturePageButton, false);
  }
}

async function refreshTasks() {
  elements.recentList.innerHTML = '<div class="loading-row">Loading…</div>';
  try {
    tasks = await listTasks({ limit: 8 });
    elements.recentList.innerHTML = tasks.length
      ? tasks.slice(0, 6).map((task) => taskCard(task, true)).join("")
      : '<div class="empty-row">No tasks yet.</div>';
    elements.connectionDot.classList.remove("offline");
  } catch (error) {
    if (/sign in|session/i.test(error.message)) showState("auth");
    else {
      elements.connectionDot.classList.add("offline");
      elements.recentList.innerHTML = `<div class="empty-row error-text">${escapeText(error.message)}</div>`;
    }
  }
}

async function handleTaskAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const card = button.closest("[data-task-id]");
  const task = tasks.find((item) => item.id === card.dataset.taskId);
  if (!task) return;
  button.disabled = true;
  try {
    if (button.dataset.action === "toggle") await updateTask(task.id, { status: task.status === "done" ? "todo" : "done" });
    if (button.dataset.action === "start") await updateTask(task.id, { status: "in_progress" });
    if (button.dataset.action === "delete") await deleteTask(task.id);
    await refreshTasks();
    await chrome.runtime.sendMessage({ type: "TASKS_CHANGED" });
  } catch (error) {
    showMessage(elements.appMessage, error.message, true);
  } finally {
    button.disabled = false;
  }
}

async function openSidePanel() {
  const currentWindow = await chrome.windows.getCurrent();
  await chrome.sidePanel.open({ windowId: currentWindow.id });
  globalThis.close();
}

function openWeb(path) {
  const base = (config?.appUrl || "http://localhost:3000").replace(/\/$/, "");
  chrome.tabs.create({ url: `${base}${path}` });
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab || null;
}

function isCapturable(tab) {
  return Boolean(tab?.url && /^https?:\/\//.test(tab.url));
}

function setButtonBusy(button, busy, label) {
  if (!button) return;
  if (busy) {
    button.dataset.originalLabel = button.textContent;
    button.textContent = label;
  } else if (button.dataset.originalLabel) {
    button.textContent = button.dataset.originalLabel;
  }
  button.disabled = busy;
}

function showMessage(element, text, error = false) {
  element.textContent = text;
  element.classList.remove("hidden", "error", "success");
  element.classList.add(error ? "error" : "success");
}
function hideMessage(element) { element.classList.add("hidden"); }
function escapeText(value) { const node = document.createElement("div"); node.textContent = value; return node.innerHTML; }
