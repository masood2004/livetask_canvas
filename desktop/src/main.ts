import "./styles.css";
import type { AuthChangeEvent, RealtimeChannel, RealtimePostgresChangesPayload, Session } from "@supabase/supabase-js";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";
import { supabase } from "./supabase";
import type { SystemSummary, Task, TaskPriority, TaskStatus, Whiteboard } from "./types";

const app = document.querySelector<HTMLDivElement>("#app")!;
if (!app) throw new Error("Missing #app element.");

const webUrl = (import.meta.env.VITE_LIVETASK_WEB_URL as string | undefined) || "http://localhost:3000";
let session: Session | null = null;
let tasks: Task[] = [];
let boards: Whiteboard[] = [];
let activeView: "tasks" | "boards" | "settings" = "tasks";
let filter: "all" | TaskStatus = "all";
let search = "";
let editingTask: Task | null = null;
let channel: RealtimeChannel | null = null;
let syncState: "connecting" | "live" | "offline" = "connecting";
let systemSummary: SystemSummary | null = null;

void boot();

async function boot() {
  renderLoading();
  try {
    systemSummary = await invoke<SystemSummary>("system_summary");
  } catch {
    systemSummary = { os: "Desktop", arch: "Unknown", app_version: "1.0.0" };
  }

  const { data } = await supabase.auth.getSession();
  session = data.session;
  supabase.auth.onAuthStateChange((_event: AuthChangeEvent, nextSession: Session | null) => {
    session = nextSession;
    if (nextSession) void openWorkspace();
    else {
      cleanupRealtime();
      renderAuth();
    }
  });

  if (session) await openWorkspace();
  else renderAuth();
}

function renderLoading() {
  app.innerHTML = `<main class="loading-shell"><div><div class="loading-mark">LT</div><span>Opening LiveTask…</span></div></main>`;
}

function renderAuth(mode: "login" | "signup" = "login", message = "", isError = false) {
  app.innerHTML = `
    <main class="auth-shell">
      <section class="auth-aside">
        <div class="brand"><span class="brand-mark">LT</span><span>LiveTask</span></div>
        <div>
          <h1>One workspace. Every screen.</h1>
          <p>Manage the same private tasks from the web, Chrome, Android and this lightweight desktop application.</p>
          <div class="auth-points">
            <div><strong>Realtime</strong><span>Changes appear instantly</span></div>
            <div><strong>Private</strong><span>Protected by RLS</span></div>
            <div><strong>Native</strong><span>Tauri + Rust shell</span></div>
          </div>
        </div>
        <small>LiveTask Desktop · ${escapeHtml(systemSummary?.app_version || "1.0.0")}</small>
      </section>
      <section class="auth-main">
        <form class="auth-card" id="auth-form">
          <span class="kicker">${mode === "login" ? "Welcome back" : "Create account"}</span>
          <h2>${mode === "login" ? "Open your workspace." : "Start a calmer workflow."}</h2>
          <p>Use the same account as the LiveTask web application.</p>
          <div class="field"><label for="email">Email</label><input id="email" type="email" autocomplete="email" placeholder="you@example.com" required></div>
          <div class="field"><label for="password">Password</label><input id="password" type="password" autocomplete="${mode === "login" ? "current-password" : "new-password"}" placeholder="Minimum 8 characters" required></div>
          ${mode === "signup" ? `<div class="field"><label for="confirm">Confirm password</label><input id="confirm" type="password" autocomplete="new-password" placeholder="Repeat your password" required></div>` : ""}
          ${message ? `<div class="notice ${isError ? "error" : "success"}">${escapeHtml(message)}</div>` : ""}
          <button class="primary auth-submit" type="submit">${mode === "login" ? "Sign in" : "Create account"}</button>
          <button class="auth-switch" id="auth-switch" type="button">${mode === "login" ? "New to LiveTask? Create an account" : "Already registered? Sign in"}</button>
        </form>
      </section>
    </main>`;

  const form = document.querySelector<HTMLFormElement>("#auth-form")!;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = valueOf("email").trim().toLowerCase();
    const password = valueOf("password");
    const submit = form.querySelector<HTMLButtonElement>("button[type=submit]")!;
    if (!email || !password) return renderAuth(mode, "Enter your email and password.", true);
    if (password.length < 8) return renderAuth(mode, "Use at least 8 characters for your password.", true);
    if (mode === "signup" && password !== valueOf("confirm")) return renderAuth(mode, "The passwords do not match.", true);

    submit.disabled = true;
    submit.textContent = "Please wait…";
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) renderAuth(mode, error.message, true);
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) renderAuth(mode, error.message, true);
      else if (!data.session) renderAuth("login", "Account created. Confirm your email, then sign in.");
    }
  });
  document.querySelector("#auth-switch")?.addEventListener("click", () => renderAuth(mode === "login" ? "signup" : "login"));
}

async function openWorkspace() {
  renderLoading();
  await Promise.all([loadTasks(), loadBoards()]);
  startRealtime();
  renderWorkspace();
  void notifyDueToday();
}

async function loadTasks() {
  const { data, error } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });
  if (error) toast(error.message);
  tasks = (data ?? []) as Task[];
}

async function loadBoards() {
  const { data, error } = await supabase.from("whiteboards").select("*").order("updated_at", { ascending: false });
  if (error) toast(error.message);
  boards = (data ?? []) as Whiteboard[];
}

function startRealtime() {
  cleanupRealtime();
  const userId = session?.user.id;
  if (!userId) return;
  syncState = "connecting";
  channel = supabase
    .channel(`desktop-tasks-${userId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `user_id=eq.${userId}` }, (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      if (payload.eventType === "INSERT") {
        const incoming = payload.new as Task;
        tasks = [incoming, ...tasks.filter((task) => task.id !== incoming.id)];
      } else if (payload.eventType === "UPDATE") {
        const incoming = payload.new as Task;
        tasks = tasks.map((task) => task.id === incoming.id ? incoming : task);
      } else if (payload.eventType === "DELETE") {
        const removed = payload.old as Partial<Task>;
        tasks = tasks.filter((task) => task.id !== removed.id);
      }
      if (activeView === "tasks") renderMainContent();
    })
    .subscribe((status: string) => {
      syncState = status === "SUBSCRIBED" ? "live" : (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") ? "offline" : "connecting";
      updateSyncIndicator();
    });
}

function cleanupRealtime() {
  if (channel) void supabase.removeChannel(channel);
  channel = null;
}

function renderWorkspace() {
  const user = session?.user;
  if (!user) return renderAuth();
  app.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand"><span class="brand-mark">LT</span><span>LiveTask</span></div>
        <nav class="nav">
          ${navButton("tasks", "✓", "Tasks")}
          ${navButton("boards", "□", "Boards")}
          ${navButton("settings", "○", "Desktop")}
        </nav>
        <div class="sidebar-footer">
          <span class="user-email">${escapeHtml(user.email || "LiveTask user")}</span>
          <button class="secondary" id="sign-out">Sign out</button>
        </div>
      </aside>
      <main class="main" id="main-content"></main>
    </div>`;
  document.querySelectorAll<HTMLButtonElement>("[data-view]").forEach((button) => button.addEventListener("click", () => {
    activeView = button.dataset.view as typeof activeView;
    renderWorkspace();
  }));
  document.querySelector("#sign-out")?.addEventListener("click", () => void supabase.auth.signOut());
  renderMainContent();
}

function navButton(view: typeof activeView, icon: string, label: string) {
  return `<button class="nav-button ${activeView === view ? "active" : ""}" data-view="${view}"><span class="nav-icon">${icon}</span>${label}</button>`;
}

function renderMainContent() {
  const main = document.querySelector<HTMLElement>("#main-content");
  if (!main) return;
  if (activeView === "tasks") renderTasks(main);
  else if (activeView === "boards") renderBoards(main);
  else renderSettings(main);
}

function renderTasks(main: HTMLElement) {
  const visible = getVisibleTasks();
  const total = tasks.length;
  const todo = tasks.filter((task) => task.status === "todo").length;
  const active = tasks.filter((task) => task.status === "in_progress").length;
  const done = tasks.filter((task) => task.status === "done").length;

  main.innerHTML = `
    <header class="topbar">
      <div><span class="kicker">Personal workspace</span><h1>Tasks</h1></div>
      <div class="top-actions"><div class="sync ${syncState === "live" ? "live" : ""}" id="sync"><span class="sync-dot"></span><span>${syncLabel()}</span></div><button class="primary" id="new-task">＋ New task</button></div>
    </header>
    <section class="stats">
      ${stat("Total", total)}${stat("To do", todo)}${stat("In progress", active)}${stat("Completed", done)}
    </section>
    <section class="toolbar">
      <input class="input" id="search" type="search" value="${escapeAttr(search)}" placeholder="Search title or description · Ctrl+K">
      <select class="input filter-select" id="filter">
        ${option("all", "All statuses")}${option("todo", "To do")}${option("in_progress", "In progress")}${option("done", "Completed")}
      </select>
      <button class="secondary" id="refresh">Refresh</button>
    </section>
    <section class="task-list">
      ${visible.length ? visible.map(taskCard).join("") : `<div class="empty"><div><strong>No matching tasks</strong><span>Create a task or change the current search.</span></div></div>`}
    </section>`;

  const filterElement = document.querySelector<HTMLSelectElement>("#filter")!;
  filterElement.value = filter;
  document.querySelector("#new-task")?.addEventListener("click", () => openTaskModal());
  document.querySelector("#refresh")?.addEventListener("click", async () => { await loadTasks(); renderMainContent(); toast("Tasks refreshed"); });
  document.querySelector<HTMLInputElement>("#search")?.addEventListener("input", (event) => { search = (event.target as HTMLInputElement).value; renderTasks(main); focusSearchAtEnd(); });
  filterElement.addEventListener("change", (event) => { filter = (event.target as HTMLSelectElement).value as typeof filter; renderMainContent(); });
  bindTaskActions();
}

function stat(label: string, value: number) { return `<article class="stat"><span>${label}</span><strong>${String(value).padStart(2, "0")}</strong></article>`; }
function option(value: string, label: string) { return `<option value="${value}">${label}</option>`; }

function getVisibleTasks() {
  const term = search.trim().toLowerCase();
  return tasks.filter((task) => (filter === "all" || task.status === filter) && (!term || task.title.toLowerCase().includes(term) || task.description.toLowerCase().includes(term)));
}

function taskCard(task: Task) {
  return `<article class="task-card ${task.status === "done" ? "done" : ""}" data-task="${task.id}">
    <button class="check ${task.status === "done" ? "checked" : ""}" data-action="toggle" title="Toggle completed">${task.status === "done" ? "✓" : ""}</button>
    <div>
      <div class="task-title-row"><h3 class="task-title">${escapeHtml(task.title)}</h3><span class="pill ${task.priority}">${task.priority}</span></div>
      ${task.description ? `<p class="task-description">${escapeHtml(task.description)}</p>` : ""}
      <div class="task-meta"><span>${statusLabel(task.status)}</span>${task.due_date ? `<span class="${isOverdue(task) ? "overdue" : ""}">Due ${formatDate(task.due_date)}</span>` : ""}<span>Updated ${formatDate(task.updated_at)}</span></div>
      ${task.source_url ? `<button class="ghost source-link" data-action="source" data-url="${escapeAttr(task.source_url)}">↗ ${escapeHtml(task.source_title || task.source_url)}</button>` : ""}
    </div>
    <div class="task-actions">
      <button class="icon-button" data-action="advance">${task.status === "todo" ? "Start" : task.status === "in_progress" ? "Complete" : "Reopen"}</button>
      <button class="icon-button" data-action="edit">Edit</button>
      <button class="icon-button danger" data-action="delete">Delete</button>
    </div>
  </article>`;
}

function bindTaskActions() {
  document.querySelectorAll<HTMLElement>("[data-task]").forEach((card) => {
    const task = tasks.find((item) => item.id === card.dataset.task);
    if (!task) return;
    card.querySelectorAll<HTMLButtonElement>("[data-action]").forEach((button) => button.addEventListener("click", async () => {
      const action = button.dataset.action;
      if (action === "toggle") await updateTaskStatus(task, task.status === "done" ? "todo" : "done");
      if (action === "advance") await updateTaskStatus(task, task.status === "todo" ? "in_progress" : task.status === "in_progress" ? "done" : "todo");
      if (action === "edit") openTaskModal(task);
      if (action === "delete") await deleteTask(task);
      if (action === "source" && button.dataset.url) await openUrl(button.dataset.url);
    }));
  });
}

async function updateTaskStatus(task: Task, status: TaskStatus) {
  const previous = task.status;
  tasks = tasks.map((item) => item.id === task.id ? { ...item, status } : item);
  renderMainContent();
  const { error } = await supabase.from("tasks").update({ status }).eq("id", task.id);
  if (error) {
    tasks = tasks.map((item) => item.id === task.id ? { ...item, status: previous } : item);
    renderMainContent();
    toast(error.message);
  }
}

async function deleteTask(task: Task) {
  if (!confirm(`Delete “${task.title}”?`)) return;
  const previous = tasks;
  tasks = tasks.filter((item) => item.id !== task.id);
  renderMainContent();
  const { error } = await supabase.from("tasks").delete().eq("id", task.id);
  if (error) { tasks = previous; renderMainContent(); toast(error.message); }
}

function openTaskModal(task: Task | null = null) {
  editingTask = task;
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `<form class="modal" id="task-form">
    <header class="modal-header"><div><span class="kicker">${task ? "Edit task" : "New task"}</span><h2>${task ? "Update task details" : "Capture what matters"}</h2></div><button type="button" class="modal-close">×</button></header>
    <div class="field"><label>Title</label><input id="task-title" maxlength="120" value="${escapeAttr(task?.title || "")}" placeholder="What needs to be done?" required autofocus></div>
    <div class="field"><label>Description</label><textarea id="task-description" maxlength="600" placeholder="Add useful context">${escapeHtml(task?.description || "")}</textarea></div>
    <div class="form-row">
      <div class="field"><label>Priority</label><select id="task-priority">${priorityOptions(task?.priority || "medium")}</select></div>
      <div class="field"><label>Status</label><select id="task-status">${statusOptions(task?.status || "todo")}</select></div>
    </div>
    <div class="field"><label>Due date</label><input id="task-due" type="date" value="${escapeAttr(task?.due_date || "")}"></div>
    <div class="modal-actions"><button type="button" class="secondary" id="cancel-modal">Cancel</button><button type="submit" class="primary">${task ? "Save changes" : "Add task"}</button></div>
  </form>`;
  document.body.appendChild(modal);
  modal.querySelector(".modal-close")?.addEventListener("click", () => modal.remove());
  modal.querySelector("#cancel-modal")?.addEventListener("click", () => modal.remove());
  modal.addEventListener("mousedown", (event) => { if (event.target === modal) modal.remove(); });
  modal.querySelector<HTMLFormElement>("#task-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const title = valueOf("task-title").trim();
    if (!title) return;
    const payload = {
      title,
      description: valueOf("task-description").trim(),
      priority: valueOf("task-priority") as TaskPriority,
      status: valueOf("task-status") as TaskStatus,
      due_date: valueOf("task-due") || null,
    };
    const submit = (event.currentTarget as HTMLFormElement).querySelector<HTMLButtonElement>("button[type=submit]")!;
    submit.disabled = true;
    submit.textContent = "Saving…";
    if (task) {
      const { data, error } = await supabase.from("tasks").update(payload).eq("id", task.id).select("*").single();
      if (error) return toast(error.message);
      tasks = tasks.map((item) => item.id === task.id ? data as Task : item);
    } else {
      const { data, error } = await supabase.from("tasks").insert({ user_id: session!.user.id, ...payload }).select("*").single();
      if (error) return toast(error.message);
      tasks = [data as Task, ...tasks.filter((item) => item.id !== data.id)];
    }
    modal.remove();
    renderMainContent();
  });
}

function priorityOptions(selected: TaskPriority) { return (["low", "medium", "high"] as TaskPriority[]).map((value) => `<option value="${value}" ${selected === value ? "selected" : ""}>${capitalize(value)}</option>`).join(""); }
function statusOptions(selected: TaskStatus) { return (["todo", "in_progress", "done"] as TaskStatus[]).map((value) => `<option value="${value}" ${selected === value ? "selected" : ""}>${statusLabel(value)}</option>`).join(""); }

function renderBoards(main: HTMLElement) {
  main.innerHTML = `<header class="topbar"><div><span class="kicker">Visual workspace</span><h1>Boards</h1></div><div class="top-actions"><button class="secondary" id="refresh-boards">Refresh</button><button class="primary" id="open-canvas">Open Canvas editor ↗</button></div></header>
    <section class="boards-grid">${boards.length ? boards.map(boardCard).join("") : `<div class="empty"><div><strong>No saved boards</strong><span>Create a board using the web Canvas editor.</span></div></div>`}</section>`;
  document.querySelector("#open-canvas")?.addEventListener("click", () => void openUrl(`${webUrl}/canvas`));
  document.querySelector("#refresh-boards")?.addEventListener("click", async () => { await loadBoards(); renderMainContent(); toast("Boards refreshed"); });
  document.querySelectorAll<HTMLElement>("[data-board]").forEach((card) => card.addEventListener("click", () => {
    const board = boards.find((item) => item.id === card.dataset.board);
    if (board) openBoardModal(board);
  }));
}

function boardCard(board: Whiteboard) {
  return `<article class="board-card" data-board="${board.id}"><div class="board-preview" style="background:${escapeAttr(board.background || "#ffffff")}"><img src="${escapeAttr(board.snapshot)}" alt="${escapeAttr(board.title)}"></div><h3>${escapeHtml(board.title)}</h3><p>Updated ${formatDate(board.updated_at)}</p></article>`;
}

function openBoardModal(board: Whiteboard) {
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `<section class="modal board-modal"><header class="modal-header"><div><span class="kicker">Board preview</span><h2>${escapeHtml(board.title)}</h2></div><button class="modal-close">×</button></header><div class="board-large" style="background:${escapeAttr(board.background || "#ffffff")}"><img src="${escapeAttr(board.snapshot)}" alt="${escapeAttr(board.title)}"></div><div class="modal-actions"><button class="secondary" id="close-board">Close</button><button class="primary" id="edit-board">Continue in web editor ↗</button></div></section>`;
  document.body.appendChild(modal);
  const close = () => modal.remove();
  modal.querySelector(".modal-close")?.addEventListener("click", close);
  modal.querySelector("#close-board")?.addEventListener("click", close);
  modal.querySelector("#edit-board")?.addEventListener("click", () => void openUrl(`${webUrl}/canvas`));
  modal.addEventListener("mousedown", (event) => { if (event.target === modal) close(); });
}

function renderSettings(main: HTMLElement) {
  const user = session?.user;
  main.innerHTML = `<header class="topbar"><div><span class="kicker">Native application</span><h1>Desktop</h1></div></header>
    <section class="settings-grid">
      <article class="settings-card"><h3>Desktop integration</h3><p>LiveTask runs inside a lightweight Tauri shell and uses Rust for native application commands.</p><div class="detail-list"><div class="detail"><span>Operating system</span><strong>${escapeHtml(systemSummary?.os || "Unknown")}</strong></div><div class="detail"><span>Architecture</span><strong>${escapeHtml(systemSummary?.arch || "Unknown")}</strong></div><div class="detail"><span>App version</span><strong>${escapeHtml(systemSummary?.app_version || "1.0.0")}</strong></div></div></article>
      <article class="settings-card"><h3>Signed-in workspace</h3><p>The desktop client uses the same Supabase Auth session and Row-Level Security policies.</p><div class="detail-list"><div class="detail"><span>Email</span><strong>${escapeHtml(user?.email || "")}</strong></div><div class="detail"><span>Task count</span><strong>${tasks.length}</strong></div><div class="detail"><span>Saved boards</span><strong>${boards.length}</strong></div></div></article>
      <article class="settings-card"><h3>Native notifications</h3><p>Allow LiveTask to show a reminder when incomplete tasks are due today.</p><button class="secondary" id="test-notification">Test notification</button></article>
      <article class="settings-card"><h3>Workspace links</h3><p>Continue in the full web experience when you need the Canvas editor or browser deployment.</p><button class="secondary" id="open-web">Open web app ↗</button></article>
      <article class="settings-card"><h3>Keyboard shortcuts</h3><p><strong>Ctrl/Cmd + N</strong> creates a task. <strong>Ctrl/Cmd + K</strong> focuses search. <strong>Escape</strong> closes an open dialog.</p></article>
      <article class="settings-card"><h3>Session</h3><p>Signing out removes the local desktop session. Your cloud data remains private in Supabase.</p><button class="danger-button" id="settings-signout">Sign out</button></article>
    </section>`;
  document.querySelector("#test-notification")?.addEventListener("click", () => void showNotification("LiveTask is ready", "Desktop notifications are working."));
  document.querySelector("#open-web")?.addEventListener("click", () => void openUrl(webUrl));
  document.querySelector("#settings-signout")?.addEventListener("click", () => void supabase.auth.signOut());
}

async function notifyDueToday() {
  const today = new Date().toISOString().slice(0, 10);
  const count = tasks.filter((task) => task.due_date === today && task.status !== "done").length;
  if (count > 0) await showNotification("Tasks due today", `${count} ${count === 1 ? "task needs" : "tasks need"} your attention.`);
}

async function showNotification(title: string, body: string) {
  try {
    let granted = await isPermissionGranted();
    if (!granted) granted = (await requestPermission()) === "granted";
    if (granted) sendNotification({ title, body });
    else toast("Notification permission was not granted.");
  } catch (error) {
    toast(error instanceof Error ? error.message : "Notification unavailable.");
  }
}

function updateSyncIndicator() {
  const element = document.querySelector<HTMLElement>("#sync");
  if (!element) return;
  element.classList.toggle("live", syncState === "live");
  const label = element.querySelector("span:last-child");
  if (label) label.textContent = syncLabel();
}
function syncLabel() { return syncState === "live" ? "Live sync" : syncState === "offline" ? "Offline" : "Connecting"; }

function focusSearchAtEnd() {
  requestAnimationFrame(() => {
    const input = document.querySelector<HTMLInputElement>("#search");
    input?.focus();
    input?.setSelectionRange(input.value.length, input.value.length);
  });
}

window.addEventListener("keydown", (event) => {
  const modifier = event.ctrlKey || event.metaKey;
  if (modifier && event.key.toLowerCase() === "n" && session) {
    event.preventDefault();
    openTaskModal();
  }
  if (modifier && event.key.toLowerCase() === "k" && session) {
    event.preventDefault();
    if (activeView !== "tasks") { activeView = "tasks"; renderWorkspace(); }
    focusSearchAtEnd();
  }
  if (event.key === "Escape") document.querySelector<HTMLElement>(".modal-backdrop")?.remove();
});

function valueOf(id: string) { return document.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`#${id}`)?.value ?? ""; }
function formatDate(value: string) { return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value.length === 10 ? `${value}T00:00:00` : value)); }
function statusLabel(status: TaskStatus) { return status === "todo" ? "To do" : status === "in_progress" ? "In progress" : "Completed"; }
function isOverdue(task: Task) { return !!task.due_date && task.status !== "done" && task.due_date < new Date().toISOString().slice(0, 10); }
function capitalize(value: string) { return value.charAt(0).toUpperCase() + value.slice(1); }
function escapeHtml(value: string) { return value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" }[char]!)); }
function escapeAttr(value: string) { return escapeHtml(value); }
function toast(message: string) { document.querySelector(".toast")?.remove(); const element = document.createElement("div"); element.className = "toast"; element.textContent = message; document.body.appendChild(element); setTimeout(() => element.remove(), 3200); }
