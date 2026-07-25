import { redirect } from "next/navigation";
import { Whiteboard } from "@/components/whiteboard";
import { createClient } from "@/lib/supabase/server";
import type { Task } from "@/types/task";
import type { WhiteboardRecord } from "@/types/whiteboard";

export const dynamic = "force-dynamic";

export default async function CanvasPage() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect("/login");

  const [{ data: tasks }, { data: boards }] = await Promise.all([
    supabase.from("tasks").select("*").order("created_at", { ascending: false }),
    supabase.from("whiteboards").select("*").order("updated_at", { ascending: false }),
  ]);

  return (
    <Whiteboard
      userId={user.id}
      userEmail={user.email ?? "user"}
      tasks={(tasks ?? []) as Task[]}
      initialBoards={(boards ?? []) as WhiteboardRecord[]}
    />
  );
}
