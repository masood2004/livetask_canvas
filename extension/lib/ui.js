export const STATUS_LABELS = {
  todo: "To do",
  in_progress: "In progress",
  done: "Completed"
};

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function formatDate(value) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
}

export function taskCard(task, compact = false) {
  const sourceUrl = safeHttpUrl(task.source_url);
  const source = sourceUrl
    ? `<a class="source-link" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noreferrer" title="Open captured page">↗ Source</a>`
    : "";
  const description = task.description && !compact
    ? `<p>${escapeHtml(task.description)}</p>`
    : "";
  const due = task.due_date ? `<span>Due ${formatDate(task.due_date)}</span>` : "";
  return `
    <article class="task-card ${task.status === "done" ? "is-done" : ""}" data-task-id="${escapeHtml(task.id)}">
      <button class="check-button" data-action="toggle" aria-label="${task.status === "done" ? "Reopen task" : "Complete task"}">${task.status === "done" ? "✓" : ""}</button>
      <div class="task-copy">
        <div class="task-title-row">
          <strong>${escapeHtml(task.title)}</strong>
          <span class="priority ${escapeHtml(task.priority)}">${escapeHtml(task.priority)}</span>
        </div>
        ${description}
        <div class="task-meta"><span>${STATUS_LABELS[task.status] || task.status}</span>${due}${source}</div>
      </div>
      <div class="task-menu">
        ${task.status === "todo" ? '<button data-action="start">Start</button>' : ""}
        <button data-action="delete" class="danger">Delete</button>
      </div>
    </article>`;
}

export function todayIso() {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function safeHttpUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
