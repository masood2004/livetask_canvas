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

export type TaskDraft = {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string;
};

export type WhiteboardRecord = {
  id: string;
  user_id: string;
  title: string;
  snapshot: string;
  background: string;
  linked_task_id: string | null;
  created_at: string;
  updated_at: string;
};

export type AppTab = "tasks" | "boards" | "account";
