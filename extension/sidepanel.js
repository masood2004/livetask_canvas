import { createTask, deleteTask, disconnect, getConfig, getCurrentUser, getSession, listTasks, signIn, updateTask } from "./lib/api.js";
import { taskCard } from "./lib/ui.js";

const el = Object.fromEntries([...document.querySelectorAll("[id]")].map((node) => [node.id, node]));
let config;
let tasks = [];
let filter = "open";
let refreshTimer;

boot();

async function boot() {
  wireEvents();
  config = await getConfig();
  if (!config.supabaseUrl || !config.publishableKey) return showState("setup");
  if (!(await getSession())) return showState("auth");
  el.panelPriority.value = config.defaultPriority;
  showState("app");
  await loadUser();
  await refreshTasks();
  refreshTimer = setInterval(refreshTasks, 15_000);
}

function wireEvents() {
  el.panelSettingsButton.addEventListener("click", () => chrome.runtime.openOptionsPage());
  el.panelOpenSettings.addEventListener("click", () => chrome.runtime.openOptionsPage());
  el.panelDashboardButton.addEventListener("click", () => openWeb("/dashboard"));
  el.panelLoginForm.addEventListener("submit", handleLogin);
  el.panelTaskForm.addEventListener("submit", handleCreate);
  el.panelCaptureButton.addEventListener("click", capturePage);
  el.panelRefresh.addEventListener("click", refreshTasks);
  el.taskSearch.addEventListener("input", renderTasks);
  el.filterTabs.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-filter]");
    if (!button) return;
    filter = button.dataset.filter;
    [...el.filterTabs.querySelectorAll("button")].forEach((item) => item.classList.toggle("active", item === button));
    renderTasks();
  });
  el.panelTaskList.addEventListener("click", handleTaskAction);
  el.panelLogout.addEventListener("click", async () => {
    clearInterval(refreshTimer);
    await disconnect();
    showState("auth");
  });
  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === "TASKS_CHANGED") refreshTasks();
  });
}

function showState(state) {
  el.panelSetupState.classList.toggle("hidden", state !== "setup");
  el.panelAuthState.classList.toggle("hidden", state !== "auth");
  el.panelAppState.classList.toggle("hidden", state !== "app");
}

async function handleLogin(event) {
  event.preventDefault();
  const button = event.submitter;
  busy(button, true, "Signing in…");
  hide(el.panelLoginError);
  try {
    await signIn(el.panelEmail.value, el.panelPassword.value);
    config = await getConfig();
    el.panelPriority.value = config.defaultPriority;
    showState("app");
    await loadUser();
    await refreshTasks();
    clearInterval(refreshTimer);
    refreshTimer = setInterval(refreshTasks, 15_000);
    await chrome.runtime.sendMessage({ type: "TASKS_CHANGED" });
  } catch (error) {
    message(el.panelLoginError, error.message, true);
  } finally { busy(button, false); }
}

async function loadUser() {
  try {
    const user = await getCurrentUser();
    el.panelUserEmail.textContent = user.email || "Connected";
  } catch {
    el.panelUserEmail.textContent = "Connected";
  }
}

async function handleCreate(event) {
  event.preventDefault();
  const button = event.submitter;
  busy(button, true, "Adding…");
  try {
    await createTask({
      title: el.panelTitle.value,
      description: el.panelDescription.value,
      priority: el.panelPriority.value,
      due_date: el.panelDueDate.value
    });
    el.panelTaskForm.reset();
    el.panelPriority.value = config.defaultPriority;
    message(el.panelMessage, "Task added.");
    await refreshTasks();
    await chrome.runtime.sendMessage({ type: "TASKS_CHANGED" });
  } catch (error) {
    message(el.panelMessage, error.message, true);
  } finally { busy(button, false); }
}

async function capturePage() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url || !/^https?:\/\//.test(tab.url)) return message(el.panelMessage, "This page cannot be captured.", true);
  busy(el.panelCaptureButton, true, "Saving…");
  try {
    await createTask({
      title: tab.title || "Review captured page",
      description: "Captured from the browser for later review.",
      priority: config.defaultPriority,
      source_url: tab.url,
      source_title: tab.title
    });
    message(el.panelMessage, "Page captured.");
    await refreshTasks();
    await chrome.runtime.sendMessage({ type: "TASKS_CHANGED" });
  } catch (error) {
    message(el.panelMessage, error.message, true);
  } finally { busy(el.panelCaptureButton, false); }
}

async function refreshTasks() {
  try {
    tasks = await listTasks();
    renderTasks();
  } catch (error) {
    if (/sign in|session/i.test(error.message)) showState("auth");
    else el.panelTaskList.innerHTML = `<div class="empty-row error-text">${safe(error.message)}</div>`;
  }
}

function renderTasks() {
  const query = el.taskSearch.value.trim().toLowerCase();
  const visible = tasks.filter((task) => {
    const matchesFilter = filter === "all" || (filter === "open" && task.status !== "done") || (filter === "done" && task.status === "done");
    const matchesSearch = !query || task.title.toLowerCase().includes(query) || (task.description || "").toLowerCase().includes(query);
    return matchesFilter && matchesSearch;
  });
  el.panelTaskList.innerHTML = visible.length ? visible.map((task) => taskCard(task)).join("") : '<div class="empty-row">Nothing here yet.</div>';
}

async function handleTaskAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const task = tasks.find((item) => item.id === button.closest("[data-task-id]").dataset.taskId);
  if (!task) return;
  button.disabled = true;
  try {
    if (button.dataset.action === "toggle") await updateTask(task.id, { status: task.status === "done" ? "todo" : "done" });
    if (button.dataset.action === "start") await updateTask(task.id, { status: "in_progress" });
    if (button.dataset.action === "delete") await deleteTask(task.id);
    await refreshTasks();
    await chrome.runtime.sendMessage({ type: "TASKS_CHANGED" });
  } catch (error) {
    message(el.panelMessage, error.message, true);
  } finally { button.disabled = false; }
}

function openWeb(path) {
  chrome.tabs.create({ url: `${(config.appUrl || "http://localhost:3000").replace(/\/$/, "")}${path}` });
}
function busy(button, state, label) {
  if (state) { button.dataset.label = button.textContent; button.textContent = label; }
  else if (button.dataset.label) button.textContent = button.dataset.label;
  button.disabled = state;
}
function message(node, text, isError = false) { node.textContent = text; node.className = `message ${isError ? "error" : "success"}`; }
function hide(node) { node.classList.add("hidden"); }
function safe(value) { const node = document.createElement("div"); node.textContent = value; return node.innerHTML; }
