import { redirect } from "next/navigation";
import { TaskBoard } from "@/components/task-board";
import { createClient } from "@/lib/supabase/server";
import type { Task } from "@/types/task";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Unable to load tasks: ${error.message}`);
  }

  return (
    <TaskBoard
      initialTasks={(data ?? []) as Task[]}
      userId={user.id}
      userEmail={user.email ?? "user"}
    />
  );
}
