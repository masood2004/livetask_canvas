import { createTask, getConfig, getOpenTasks, getSession } from "./lib/api.js";
import { todayIso } from "./lib/ui.js";

const BADGE_ALARM = "livetask-badge-refresh";
const DUE_ALARM = "livetask-due-check";

chrome.runtime.onInstalled.addListener(async () => {
  await createMenus();
  await ensureAlarms();
  await updateBadge();
  try { await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }); } catch { /* Supported on current Chrome. */ }
});

chrome.runtime.onStartup.addListener(async () => {
  await ensureAlarms();
  await updateBadge();
  await checkDueTasks();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === BADGE_ALARM) await updateBadge();
  if (alarm.name === DUE_ALARM) await checkDueTasks();
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "livetask-selection") await captureSelection(info, tab);
  if (info.menuItemId === "livetask-page") {
    if (info.linkUrl) await captureUrl(info.linkUrl, tab?.title || "Review saved link");
    else await capturePage(tab);
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "open-livetask") return openWorkspace();
  if (command === "capture-current-page") {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await capturePage(tab);
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "TASKS_CHANGED" || message?.type === "CONFIG_CHANGED") {
    updateBadge();
    if (message.type === "CONFIG_CHANGED") ensureAlarms();
  }
});

chrome.notifications.onClicked.addListener(() => openWorkspace());

async function createMenus() {
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({ id: "livetask-selection", title: "Save selection to LiveTask", contexts: ["selection"] });
  chrome.contextMenus.create({ id: "livetask-page", title: "Save page to LiveTask", contexts: ["page", "link"] });
}

async function ensureAlarms() {
  const badge = await chrome.alarms.get(BADGE_ALARM);
  const due = await chrome.alarms.get(DUE_ALARM);
  if (!badge) chrome.alarms.create(BADGE_ALARM, { periodInMinutes: 30 });
  if (!due) chrome.alarms.create(DUE_ALARM, { periodInMinutes: 60 });
}

async function captureSelection(info, tab) {
  const selected = (info.selectionText || "").trim();
  if (!selected) return;
  const title = selected.length > 90 ? `${selected.slice(0, 87)}…` : selected;
  await performCapture({
    title,
    description: selected.slice(0, 600),
    source_url: info.pageUrl || tab?.url,
    source_title: tab?.title
  }, "Selection saved to LiveTask.");
}

async function capturePage(tab) {
  if (!tab?.url || !/^https?:\/\//.test(tab.url)) return notify("Cannot capture this page", "Open a normal website and try again.");
  await captureUrl(tab.url, tab.title || "Review captured page");
}

async function captureUrl(url, title) {
  if (!/^https?:\/\//.test(url)) return notify("Cannot capture this link", "Only normal web links can be saved.");
  await performCapture({
    title: title || "Review captured page",
    description: "Captured from the browser for later review.",
    source_url: url,
    source_title: title
  }, "Page saved to LiveTask.");
}

async function performCapture(input, successText) {
  try {
    const config = await getConfig();
    if (!config.supabaseUrl || !config.publishableKey) throw new Error("Open LiveTask Companion settings first.");
    if (!(await getSession())) throw new Error("Open the LiveTask extension and sign in first.");
    await createTask({ ...input, priority: config.defaultPriority });
    await updateBadge();
    notify("LiveTask", successText);
    chrome.runtime.sendMessage({ type: "TASKS_CHANGED" }).catch(() => {});
  } catch (error) {
    notify("LiveTask needs attention", error.message);
  }
}

async function updateBadge() {
  try {
    if (!(await getSession())) return chrome.action.setBadgeText({ text: "" });
    const count = (await getOpenTasks()).length;
    await chrome.action.setBadgeBackgroundColor({ color: "#171714" });
    await chrome.action.setBadgeText({ text: count ? (count > 99 ? "99+" : String(count)) : "" });
  } catch {
    await chrome.action.setBadgeText({ text: "" });
  }
}

async function checkDueTasks() {
  try {
    const config = await getConfig();
    if (!config.notificationsEnabled || !(await getSession())) return;
    const due = (await getOpenTasks()).filter((task) => task.due_date === todayIso());
    if (!due.length) return;
    const stateKey = "livetaskDueNotification";
    const stored = await chrome.storage.local.get(stateKey);
    const previous = stored[stateKey] || {};
    const currentIds = due.map((task) => task.id).sort();
    if (previous.date === todayIso() && JSON.stringify(previous.ids) === JSON.stringify(currentIds)) return;
    const title = due.length === 1 ? due[0].title : `${due.length} tasks are due today`;
    const message = due.length === 1 ? "Open LiveTask to finish or reschedule it." : due.slice(0, 3).map((task) => task.title).join(" · ");
    notify("LiveTask reminder", `${title}\n${message}`);
    await chrome.storage.local.set({ [stateKey]: { date: todayIso(), ids: currentIds } });
  } catch {
    // Background checks should remain quiet when offline or signed out.
  }
}

async function openWorkspace() {
  const config = await getConfig();
  const base = (config.appUrl || "http://localhost:3000").replace(/\/$/, "");
  chrome.tabs.create({ url: `${base}/dashboard` });
}

function notify(title, message) {
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icons/icon-128.png",
    title,
    message
  });
}
