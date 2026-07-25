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

export type CanvasTool = "pen" | "highlighter" | "eraser" | "line" | "rectangle" | "ellipse" | "arrow" | "text";
