"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Task, TaskDraft, TaskPriority, TaskStatus } from "@/types/task";

type TaskBoardProps = {
  initialTasks: Task[];
  userId: string;
  userEmail: string;
};

const emptyDraft: TaskDraft = {
  title: "",
  description: "",
  status: "todo",
  priority: "medium",
  due_date: "",
};

const statusLabels: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Completed",
};

const priorityLabels: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export function TaskBoard({ initialTasks, userId, userEmail }: TaskBoardProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [draft, setDraft] = useState<TaskDraft>(emptyDraft);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editDraft, setEditDraft] = useState<TaskDraft>(emptyDraft);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TaskStatus>("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [realtimeStatus, setRealtimeStatus] = useState<"connecting" | "live" | "offline">("connecting");
  const [lastSync, setLastSync] = useState<Date | null>(null);


  const refreshTasks = useCallback(async () => {
    const supabase = createClient();
    const { data, error: refreshError } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });

    if (refreshError) throw refreshError;
    setTasks((data ?? []) as Task[]);
    setLastSync(new Date());
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    const channel = supabase
      .channel(`tasks:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `user_id=eq.${userId}`,
        },
        async () => {
          try {
            await refreshTasks();
          } catch {
            if (mounted) setRealtimeStatus("offline");
          }
        },
      )
      .subscribe((status) => {
        if (!mounted) return;
        if (status === "SUBSCRIBED") {
          setRealtimeStatus("live");
          setLastSync(new Date());
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setRealtimeStatus("offline");
        } else {
          setRealtimeStatus("connecting");
        }
      });

    const handleOnline = () => {
      setRealtimeStatus("connecting");
      void refreshTasks().catch(() => setRealtimeStatus("offline"));
    };
    const handleOffline = () => setRealtimeStatus("offline");

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      mounted = false;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      void supabase.removeChannel(channel);
    };
  }, [refreshTasks, userId]);

  const counts = useMemo(() => ({
    total: tasks.length,
    todo: tasks.filter((task) => task.status === "todo").length,
    active: tasks.filter((task) => task.status === "in_progress").length,
    done: tasks.filter((task) => task.status === "done").length,
  }), [tasks]);

  const visibleTasks = useMemo(() => {
    const term = search.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesStatus = statusFilter === "all" || task.status === statusFilter;
      const matchesSearch = !term || task.title.toLowerCase().includes(term) || task.description.toLowerCase().includes(term) || (task.source_title ?? "").toLowerCase().includes(term);
      return matchesStatus && matchesSearch;
    });
  }, [tasks, search, statusFilter]);

  function updateDraft<K extends keyof TaskDraft>(key: K, value: TaskDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function updateEditDraft<K extends keyof TaskDraft>(key: K, value: TaskDraft[K]) {
    setEditDraft((current) => ({ ...current, [key]: value }));
  }

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!draft.title.trim()) {
      setError("Add a task title before saving.");
      return;
    }

    setBusy("create");

    try {
      const supabase = createClient();
      const { data, error: insertError } = await supabase
        .from("tasks")
        .insert({
          user_id: userId,
          title: draft.title.trim(),
          description: draft.description.trim(),
          status: draft.status,
          priority: draft.priority,
          due_date: draft.due_date || null,
        })
        .select("*")
        .single();

      if (insertError) throw insertError;

      setTasks((current) => [data as Task, ...current.filter((item) => item.id !== (data as Task).id)]);
      setLastSync(new Date());
      setDraft(emptyDraft);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not create the task.");
    } finally {
      setBusy(null);
    }
  }

  async function changeStatus(task: Task, status: TaskStatus) {
    setBusy(task.id);
    setError("");

    try {
      const supabase = createClient();
      const { data, error: updateError } = await supabase
        .from("tasks")
        .update({ status })
        .eq("id", task.id)
        .eq("user_id", userId)
        .select("*")
        .single();

      if (updateError) throw updateError;
      setTasks((current) => current.map((item) => item.id === task.id ? data as Task : item));
      setLastSync(new Date());
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not update task status.");
    } finally {
      setBusy(null);
    }
  }

  function openEdit(task: Task) {
    setEditingTask(task);
    setEditDraft({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      due_date: task.due_date ?? "",
    });
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingTask) return;

    if (!editDraft.title.trim()) {
      setError("Task title cannot be empty.");
      return;
    }

    setBusy(editingTask.id);
    setError("");

    try {
      const supabase = createClient();
      const { data, error: updateError } = await supabase
        .from("tasks")
        .update({
          title: editDraft.title.trim(),
          description: editDraft.description.trim(),
          status: editDraft.status,
          priority: editDraft.priority,
          due_date: editDraft.due_date || null,
        })
        .eq("id", editingTask.id)
        .eq("user_id", userId)
        .select("*")
        .single();

      if (updateError) throw updateError;

      setTasks((current) => current.map((item) => item.id === editingTask.id ? data as Task : item));
      setLastSync(new Date());
      setEditingTask(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not save task changes.");
    } finally {
      setBusy(null);
    }
  }

  async function deleteTask(task: Task) {
    const confirmed = window.confirm(`Delete “${task.title}”? This action cannot be undone.`);
    if (!confirmed) return;

    setBusy(task.id);
    setError("");

    try {
      const supabase = createClient();
      const { error: deleteError } = await supabase
        .from("tasks")
        .delete()
        .eq("id", task.id)
        .eq("user_id", userId);

      if (deleteError) throw deleteError;
      setTasks((current) => current.filter((item) => item.id !== task.id));
      setLastSync(new Date());
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not delete the task.");
    } finally {
      setBusy(null);
    }
  }

  async function signOut() {
    setBusy("signout");
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.replace("/login");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="brand dashboard-brand">
          <span className="brand-mark">LT</span>
          <span>LiveTask</span>
        </div>

        <nav className="side-nav" aria-label="Workspace navigation">
          <Link className="side-link active" href="/dashboard"><span>▦</span> My tasks</Link>
          <Link className="side-link" href="/canvas"><span>✎</span> Canvas</Link>
        </nav>

        <div className="sidebar-user">
          <div className="avatar">{userEmail.slice(0, 2).toUpperCase()}</div>
          <div><strong>{userEmail.split("@")[0]}</strong><span>{userEmail}</span></div>
          <button type="button" onClick={signOut} disabled={busy === "signout"} aria-label="Sign out">↗</button>
        </div>
      </aside>

      <section className="dashboard-content">
        <header className="dashboard-header">
          <div>
            <span className="page-kicker">Personal workspace</span>
            <h1>Good work starts with a clear plan.</h1>
          </div>
          <div className="header-actions">
            <div className={`realtime-badge ${realtimeStatus}`} role="status" aria-live="polite">
              <i />
              <span>{realtimeStatus === "live" ? "Live sync" : realtimeStatus === "connecting" ? "Connecting" : "Offline"}</span>
              {lastSync && realtimeStatus === "live" && <small>Updated {formatTime(lastSync)}</small>}
            </div>
            <button className="button button-secondary mobile-signout" onClick={signOut} disabled={busy === "signout"} type="button">
              Sign out
            </button>
          </div>
        </header>

        <div className="stats-grid">
          <article><span>Total tasks</span><strong>{String(counts.total).padStart(2, "0")}</strong><i>All items</i></article>
          <article><span>To do</span><strong>{String(counts.todo).padStart(2, "0")}</strong><i>Not started</i></article>
          <article><span>In progress</span><strong>{String(counts.active).padStart(2, "0")}</strong><i>Active work</i></article>
          <article><span>Completed</span><strong>{String(counts.done).padStart(2, "0")}</strong><i>Finished</i></article>
        </div>

        <div className="workspace-grid">
          <section className="task-panel">
            <div className="panel-heading">
              <div><span>Task list</span><h2>Your current work</h2></div>
              <span className="task-count">{visibleTasks.length} shown</span>
            </div>

            <div className="task-toolbar">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search title or description"
                aria-label="Search tasks"
              />
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | TaskStatus)} aria-label="Filter by status">
                <option value="all">All statuses</option>
                <option value="todo">To do</option>
                <option value="in_progress">In progress</option>
                <option value="done">Completed</option>
              </select>
            </div>

            {error && <p className="form-alert error dashboard-alert" role="alert">{error}</p>}

            <div className="task-list">
              {visibleTasks.length === 0 ? (
                <div className="empty-state">
                  <span>✓</span>
                  <h3>No matching tasks</h3>
                  <p>Create a task or change the current filters.</p>
                </div>
              ) : visibleTasks.map((task) => (
                <article className={`task-item ${task.status === "done" ? "is-done" : ""}`} key={task.id}>
                  <button
                    type="button"
                    className="complete-toggle"
                    onClick={() => changeStatus(task, task.status === "done" ? "todo" : "done")}
                    disabled={busy === task.id}
                    aria-label={task.status === "done" ? "Mark task as to do" : "Mark task complete"}
                  >{task.status === "done" ? "✓" : ""}</button>

                  <div className="task-body">
                    <div className="task-title-line">
                      <h3>{task.title}</h3>
                      <span className={`priority-pill ${task.priority}`}>{priorityLabels[task.priority]}</span>
                    </div>
                    {task.description && <p>{task.description}</p>}
                    {task.source_url && (
                      <a className="task-source" href={task.source_url} target="_blank" rel="noreferrer">
                        <span>↗</span> {task.source_title || "Open captured source"}
                      </a>
                    )}
                    <div className="task-meta">
                      <span>{statusLabels[task.status]}</span>
                      {task.due_date && <span>Due {formatDate(task.due_date)}</span>}
                      <span>Created {formatDate(task.created_at)}</span>
                    </div>
                  </div>

                  <div className="task-actions">
                    {task.status === "todo" && (
                      <button type="button" onClick={() => changeStatus(task, "in_progress")} disabled={busy === task.id}>Start</button>
                    )}
                    {task.status === "in_progress" && (
                      <button type="button" onClick={() => changeStatus(task, "done")} disabled={busy === task.id}>Complete</button>
                    )}
                    <button type="button" onClick={() => openEdit(task)} disabled={busy === task.id}>Edit</button>
                    <button type="button" className="danger-text" onClick={() => deleteTask(task)} disabled={busy === task.id}>Delete</button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <aside className="create-panel">
            <div className="panel-heading compact">
              <div><span>Quick add</span><h2>Create a task</h2></div>
            </div>

            <form onSubmit={createTask} className="task-form">
              <div className="form-field">
                <label htmlFor="task-title">Task title</label>
                <input id="task-title" value={draft.title} onChange={(event) => updateDraft("title", event.target.value)} placeholder="What needs to be done?" maxLength={120} />
              </div>
              <div className="form-field">
                <label htmlFor="task-description">Description</label>
                <textarea id="task-description" value={draft.description} onChange={(event) => updateDraft("description", event.target.value)} placeholder="Add useful context" rows={4} maxLength={600} />
              </div>
              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="task-priority">Priority</label>
                  <select id="task-priority" value={draft.priority} onChange={(event) => updateDraft("priority", event.target.value as TaskPriority)}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="form-field">
                  <label htmlFor="task-status">Status</label>
                  <select id="task-status" value={draft.status} onChange={(event) => updateDraft("status", event.target.value as TaskStatus)}>
                    <option value="todo">To do</option>
                    <option value="in_progress">In progress</option>
                    <option value="done">Completed</option>
                  </select>
                </div>
              </div>
              <div className="form-field">
                <label htmlFor="task-date">Due date</label>
                <input id="task-date" type="date" value={draft.due_date} onChange={(event) => updateDraft("due_date", event.target.value)} />
              </div>
              <button className="button button-primary create-button" type="submit" disabled={busy === "create"}>
                {busy === "create" ? "Creating…" : "+ Add task"}
              </button>
            </form>
          </aside>
        </div>
      </section>

      {editingTask && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setEditingTask(null)}>
          <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="edit-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-heading">
              <div><span>Edit task</span><h2 id="edit-title">Update task details</h2></div>
              <button type="button" onClick={() => setEditingTask(null)} aria-label="Close dialog">×</button>
            </div>
            <form onSubmit={saveEdit} className="task-form">
              <div className="form-field">
                <label htmlFor="edit-task-title">Task title</label>
                <input id="edit-task-title" value={editDraft.title} onChange={(event) => updateEditDraft("title", event.target.value)} maxLength={120} autoFocus />
              </div>
              <div className="form-field">
                <label htmlFor="edit-task-description">Description</label>
                <textarea id="edit-task-description" value={editDraft.description} onChange={(event) => updateEditDraft("description", event.target.value)} rows={4} maxLength={600} />
              </div>
              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="edit-task-priority">Priority</label>
                  <select id="edit-task-priority" value={editDraft.priority} onChange={(event) => updateEditDraft("priority", event.target.value as TaskPriority)}>
                    <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                  </select>
                </div>
                <div className="form-field">
                  <label htmlFor="edit-task-status">Status</label>
                  <select id="edit-task-status" value={editDraft.status} onChange={(event) => updateEditDraft("status", event.target.value as TaskStatus)}>
                    <option value="todo">To do</option><option value="in_progress">In progress</option><option value="done">Completed</option>
                  </select>
                </div>
              </div>
              <div className="form-field">
                <label htmlFor="edit-task-date">Due date</label>
                <input id="edit-task-date" type="date" value={editDraft.due_date} onChange={(event) => updateEditDraft("due_date", event.target.value)} />
              </div>
              <div className="modal-actions">
                <button className="button button-secondary" type="button" onClick={() => setEditingTask(null)}>Cancel</button>
                <button className="button button-primary" type="submit" disabled={busy === editingTask.id}>{busy === editingTask.id ? "Saving…" : "Save changes"}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

function formatTime(value: Date) {
  return new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit" }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}
