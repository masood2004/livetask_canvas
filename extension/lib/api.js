const CONFIG_KEY = "livetaskConfig";
const SESSION_KEY = "livetaskSession";
const DEFAULT_CONFIG = {
  supabaseUrl: "",
  publishableKey: "",
  appUrl: "http://localhost:3000",
  notificationsEnabled: true,
  defaultPriority: "medium"
};

export async function getConfig() {
  const stored = await chrome.storage.local.get(CONFIG_KEY);
  return { ...DEFAULT_CONFIG, ...(stored[CONFIG_KEY] || {}) };
}

export async function saveConfig(config) {
  const clean = {
    ...DEFAULT_CONFIG,
    ...config,
    supabaseUrl: normalizeUrl(config.supabaseUrl),
    appUrl: normalizeUrl(config.appUrl || DEFAULT_CONFIG.appUrl)
  };
  await chrome.storage.local.set({ [CONFIG_KEY]: clean });
  return clean;
}

export async function hasCompleteConfig() {
  const config = await getConfig();
  return Boolean(config.supabaseUrl && config.publishableKey);
}

export async function getSession() {
  const stored = await chrome.storage.local.get(SESSION_KEY);
  return stored[SESSION_KEY] || null;
}

export async function clearSession() {
  await chrome.storage.local.remove(SESSION_KEY);
}

async function saveSession(payload) {
  const session = {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresAt: payload.expires_at || Math.floor(Date.now() / 1000) + Number(payload.expires_in || 3600),
    user: payload.user
  };
  await chrome.storage.local.set({ [SESSION_KEY]: session });
  return session;
}

export async function testConnection(candidateConfig) {
  const config = { ...DEFAULT_CONFIG, ...candidateConfig, supabaseUrl: normalizeUrl(candidateConfig.supabaseUrl) };
  assertConfig(config);
  const response = await fetch(`${config.supabaseUrl}/auth/v1/settings`, {
    headers: { apikey: config.publishableKey }
  });
  if (!response.ok) throw await responseError(response, "Could not connect to Supabase.");
  return true;
}

export async function signIn(email, password) {
  const config = await getConfig();
  assertConfig(config);
  const response = await fetch(`${config.supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: jsonHeaders(config),
    body: JSON.stringify({ email: email.trim(), password })
  });
  if (!response.ok) throw await responseError(response, "Sign in failed.");
  const payload = await response.json();
  return saveSession(payload);
}

export async function disconnect() {
  await clearSession();
  await chrome.action.setBadgeText({ text: "" });
}

export async function getCurrentUser() {
  return request("/auth/v1/user");
}

export async function listTasks({ limit = 200 } = {}) {
  const url = new URL("/rest/v1/tasks", (await getConfig()).supabaseUrl);
  url.searchParams.set("select", "*");
  url.searchParams.set("order", "created_at.desc");
  url.searchParams.set("limit", String(limit));
  return requestUrl(url);
}

export async function createTask(input) {
  const session = await ensureSession();
  const payload = {
    user_id: session.user.id,
    title: input.title.trim().slice(0, 120),
    description: (input.description || "").trim().slice(0, 600),
    status: input.status || "todo",
    priority: input.priority || "medium",
    due_date: input.due_date || null,
    source_url: input.source_url || null,
    source_title: input.source_title || null
  };
  const url = new URL("/rest/v1/tasks", (await getConfig()).supabaseUrl);
  url.searchParams.set("select", "*");
  const rows = await requestUrl(url, {
    method: "POST",
    body: payload,
    prefer: "return=representation"
  });
  return rows[0];
}

export async function updateTask(id, patch) {
  const url = new URL("/rest/v1/tasks", (await getConfig()).supabaseUrl);
  url.searchParams.set("id", `eq.${id}`);
  url.searchParams.set("select", "*");
  const rows = await requestUrl(url, {
    method: "PATCH",
    body: patch,
    prefer: "return=representation"
  });
  return rows[0];
}

export async function deleteTask(id) {
  const url = new URL("/rest/v1/tasks", (await getConfig()).supabaseUrl);
  url.searchParams.set("id", `eq.${id}`);
  await requestUrl(url, { method: "DELETE", prefer: "return=minimal" });
}

export async function getOpenTasks() {
  const tasks = await listTasks();
  return tasks.filter((task) => task.status !== "done");
}

export async function ensureSession() {
  const session = await getSession();
  if (!session?.accessToken || !session?.refreshToken) throw new Error("Sign in to LiveTask first.");
  const now = Math.floor(Date.now() / 1000);
  if (Number(session.expiresAt || 0) > now + 90) return session;
  return refreshSession(session.refreshToken);
}

async function refreshSession(refreshToken) {
  const config = await getConfig();
  assertConfig(config);
  const response = await fetch(`${config.supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: jsonHeaders(config),
    body: JSON.stringify({ refresh_token: refreshToken })
  });
  if (!response.ok) {
    await clearSession();
    throw await responseError(response, "Your session expired. Sign in again.");
  }
  return saveSession(await response.json());
}

async function request(path, options = {}) {
  const config = await getConfig();
  return requestUrl(new URL(path, config.supabaseUrl), options);
}

async function requestUrl(url, options = {}, retry = true) {
  const config = await getConfig();
  assertConfig(config);
  const session = await ensureSession();
  const headers = {
    apikey: config.publishableKey,
    Authorization: `Bearer ${session.accessToken}`,
    Accept: "application/json"
  };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.prefer) headers.Prefer = options.prefer;

  const response = await fetch(url.toString(), {
    method: options.method || "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });

  if (response.status === 401 && retry) {
    await refreshSession(session.refreshToken);
    return requestUrl(url, options, false);
  }
  if (!response.ok) throw await responseError(response, "LiveTask request failed.");
  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

function jsonHeaders(config) {
  return {
    apikey: config.publishableKey,
    "Content-Type": "application/json",
    Accept: "application/json"
  };
}

function assertConfig(config) {
  if (!config.supabaseUrl || !config.publishableKey) {
    throw new Error("Open extension settings and connect your Supabase project.");
  }
}

function normalizeUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

async function responseError(response, fallback) {
  let message = fallback;
  try {
    const payload = await response.json();
    message = payload.msg || payload.message || payload.error_description || payload.error || fallback;
  } catch {
    // Keep the safe fallback when the response is not JSON.
  }
  return new Error(message);
}
