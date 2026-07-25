export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";

export type Task = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  source_url: string | null;
  source_title: string | null;
  created_at: string;
  updated_at: string;
};

export type Whiteboard = {
  id: string;
  user_id: string;
  title: string;
  snapshot: string;
  background: string;
  linked_task_id: string | null;
  created_at: string;
  updated_at: string;
};

export type SystemSummary = {
  os: string;
  arch: string;
  app_version: string;
};
