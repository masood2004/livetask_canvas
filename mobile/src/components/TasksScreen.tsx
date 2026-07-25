import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { Task, TaskDraft, TaskPriority, TaskStatus } from "../types";
import { colors, radius } from "../theme";
import { TaskEditor } from "./TaskEditor";

type Filter = "all" | TaskStatus;
type SyncState = "connecting" | "live" | "offline";

type Props = { userId: string };

export function TasksScreen({ userId }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [syncState, setSyncState] = useState<SyncState>("connecting");
  const [error, setError] = useState("");

  async function loadTasks(showLoader = false) {
    if (showLoader) setLoading(true);
    setError("");
    const { data, error: loadError } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });
    if (loadError) {
      setError(loadError.message);
    } else {
      setTasks((data ?? []) as Task[]);
    }
    if (showLoader) setLoading(false);
  }

  useEffect(() => {
    void loadTasks(true);

    const channel = supabase
      .channel(`mobile-tasks-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `user_id=eq.${userId}` },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          if (payload.eventType === "INSERT") {
            const incoming = payload.new as Task;
            setTasks((current) => [incoming, ...current.filter((item) => item.id !== incoming.id)]);
          } else if (payload.eventType === "UPDATE") {
            const incoming = payload.new as Task;
            setTasks((current) => current.map((item) => item.id === incoming.id ? incoming : item));
          } else if (payload.eventType === "DELETE") {
            const removed = payload.old as Partial<Task>;
            setTasks((current) => current.filter((item) => item.id !== removed.id));
          }
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setSyncState("live");
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") setSyncState("offline");
        else setSyncState("connecting");
      });

    return () => { void supabase.removeChannel(channel); };
  }, [userId]);

  const visibleTasks = useMemo(() => {
    const term = search.trim().toLowerCase();
    return tasks.filter((task) => {
      const matchesFilter = filter === "all" || task.status === filter;
      const matchesSearch = !term || task.title.toLowerCase().includes(term) || task.description.toLowerCase().includes(term);
      return matchesFilter && matchesSearch;
    });
  }, [tasks, search, filter]);

  const counts = useMemo(() => ({
    total: tasks.length,
    active: tasks.filter((task) => task.status === "in_progress").length,
    done: tasks.filter((task) => task.status === "done").length,
  }), [tasks]);

  async function refresh() {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  }

  async function saveTask(draft: TaskDraft) {
    setBusy(true);
    try {
      if (editingTask) {
        const { data, error: updateError } = await supabase
          .from("tasks")
          .update({
            title: draft.title,
            description: draft.description,
            status: draft.status,
            priority: draft.priority,
            due_date: draft.due_date || null,
          })
          .eq("id", editingTask.id)
          .select("*")
          .single();
        if (updateError) throw updateError;
        setTasks((current) => current.map((task) => task.id === editingTask.id ? data as Task : task));
      } else {
        const { data, error: insertError } = await supabase
          .from("tasks")
          .insert({ user_id: userId, ...draft, due_date: draft.due_date || null })
          .select("*")
          .single();
        if (insertError) throw insertError;
        setTasks((current) => [data as Task, ...current.filter((task) => task.id !== data.id)]);
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditorOpen(false);
      setEditingTask(null);
    } catch (caught) {
      Alert.alert("Could not save task", caught instanceof Error ? caught.message : "Try again.");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setBusy(false);
    }
  }

  async function updateStatus(task: Task, status: TaskStatus) {
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status } : item));
    const { error: updateError } = await supabase.from("tasks").update({ status }).eq("id", task.id);
    if (updateError) {
      setTasks((current) => current.map((item) => item.id === task.id ? task : item));
      Alert.alert("Could not update task", updateError.message);
      return;
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function confirmDelete(task: Task) {
    Alert.alert("Delete task?", task.title, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        const previous = tasks;
        setTasks((current) => current.filter((item) => item.id !== task.id));
        const { error: deleteError } = await supabase.from("tasks").delete().eq("id", task.id);
        if (deleteError) {
          setTasks(previous);
          Alert.alert("Could not delete task", deleteError.message);
        }
      } },
    ]);
  }

  function openEditor(task: Task | null) {
    setEditingTask(task);
    setEditorOpen(true);
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.ink} /><Text style={styles.loadingText}>Loading your workspace…</Text></View>;
  }

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>MY WORKSPACE</Text>
          <Text style={styles.heading}>Tasks</Text>
        </View>
        <View style={[styles.sync, syncState === "live" && styles.syncLive]}>
          <View style={[styles.syncDot, syncState === "live" && styles.syncDotLive]} />
          <Text style={styles.syncText}>{syncState === "live" ? "Live" : syncState === "offline" ? "Offline" : "Connecting"}</Text>
        </View>
      </View>

      <View style={styles.stats}>
        <Stat label="Total" value={counts.total} />
        <Stat label="Active" value={counts.active} />
        <Stat label="Done" value={counts.done} />
      </View>

      <View style={styles.searchRow}>
        <TextInput style={styles.search} value={search} onChangeText={setSearch} placeholder="Search tasks" placeholderTextColor={colors.muted} />
        <Pressable style={styles.addButton} onPress={() => openEditor(null)}><Text style={styles.addText}>＋</Text></Pressable>
      </View>

      <View style={styles.filters}>
        {(["all", "todo", "in_progress", "done"] as Filter[]).map((value) => (
          <Pressable key={value} style={[styles.filter, filter === value && styles.filterActive]} onPress={() => setFilter(value)}>
            <Text style={[styles.filterText, filter === value && styles.filterTextActive]}>{filterLabel(value)}</Text>
          </Pressable>
        ))}
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        data={visibleTasks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={visibleTasks.length ? styles.list : styles.emptyList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.ink} />}
        renderItem={({ item }) => (
          <TaskCard
            task={item}
            onEdit={() => openEditor(item)}
            onDelete={() => confirmDelete(item)}
            onStatus={(status) => void updateStatus(item, status)}
          />
        )}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyMark}>✓</Text><Text style={styles.emptyTitle}>Nothing here</Text><Text style={styles.emptyText}>Create a task or change the current filters.</Text></View>}
        showsVerticalScrollIndicator={false}
      />

      <TaskEditor visible={editorOpen} task={editingTask} busy={busy} onClose={() => { setEditorOpen(false); setEditingTask(null); }} onSave={saveTask} />
    </View>
  );
}

function TaskCard({ task, onEdit, onDelete, onStatus }: { task: Task; onEdit: () => void; onDelete: () => void; onStatus: (status: TaskStatus) => void }) {
  const nextStatus: TaskStatus = task.status === "todo" ? "in_progress" : task.status === "in_progress" ? "done" : "todo";
  return (
    <View style={[styles.card, task.status === "done" && styles.cardDone]}>
      <Pressable style={[styles.check, task.status === "done" && styles.checkDone]} onPress={() => onStatus(task.status === "done" ? "todo" : "done")}>
        <Text style={styles.checkText}>{task.status === "done" ? "✓" : ""}</Text>
      </Pressable>
      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <Text style={[styles.cardTitle, task.status === "done" && styles.strike]} numberOfLines={2}>{task.title}</Text>
          <View style={[styles.priority, priorityStyle(task.priority)]}><Text style={styles.priorityText}>{task.priority}</Text></View>
        </View>
        {!!task.description && <Text style={styles.description} numberOfLines={3}>{task.description}</Text>}
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{statusLabel(task.status)}</Text>
          {!!task.due_date && <Text style={[styles.meta, isOverdue(task) && styles.overdue]}>Due {shortDate(task.due_date)}</Text>}
        </View>
        {!!task.source_url && (
          <Pressable onPress={() => Linking.openURL(task.source_url!)}><Text style={styles.source} numberOfLines={1}>↗ {task.source_title || task.source_url}</Text></Pressable>
        )}
        <View style={styles.cardActions}>
          <Pressable onPress={() => onStatus(nextStatus)}><Text style={styles.action}>{task.status === "todo" ? "Start" : task.status === "in_progress" ? "Complete" : "Reopen"}</Text></Pressable>
          <Pressable onPress={onEdit}><Text style={styles.action}>Edit</Text></Pressable>
          <Pressable onPress={onDelete}><Text style={[styles.action, styles.delete]}>Delete</Text></Pressable>
        </View>
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <View style={styles.stat}><Text style={styles.statValue}>{String(value).padStart(2, "0")}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

function filterLabel(value: Filter) { return value === "all" ? "All" : value === "todo" ? "To do" : value === "in_progress" ? "Active" : "Done"; }
function statusLabel(value: TaskStatus) { return value === "todo" ? "To do" : value === "in_progress" ? "In progress" : "Completed"; }
function shortDate(value: string) { return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(`${value}T00:00:00`)); }
function isOverdue(task: Task) { return !!task.due_date && task.status !== "done" && task.due_date < new Date().toISOString().slice(0, 10); }
function priorityStyle(priority: TaskPriority) { return priority === "high" ? styles.priorityHigh : priority === "medium" ? styles.priorityMedium : styles.priorityLow; }

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 18, paddingTop: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background, gap: 12 },
  loadingText: { color: colors.muted, fontSize: 13 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  kicker: { color: colors.muted, fontSize: 10, fontWeight: "800", letterSpacing: 1.4 },
  heading: { color: colors.ink, fontSize: 34, fontWeight: "800", letterSpacing: -1.3, marginTop: 2 },
  sync: { flexDirection: "row", alignItems: "center", gap: 7, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 999 },
  syncLive: { backgroundColor: "#e7f2ec", borderColor: "#c9e2d5" },
  syncDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.muted },
  syncDotLive: { backgroundColor: colors.success },
  syncText: { color: colors.ink, fontSize: 11, fontWeight: "700" },
  stats: { flexDirection: "row", gap: 10, marginBottom: 14 },
  stat: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 14 },
  statValue: { color: colors.ink, fontSize: 24, fontWeight: "800", letterSpacing: -1 },
  statLabel: { color: colors.muted, fontSize: 11, marginTop: 4 },
  searchRow: { flexDirection: "row", gap: 10 },
  search: { flex: 1, minHeight: 50, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, paddingHorizontal: 14, color: colors.ink },
  addButton: { width: 50, height: 50, borderRadius: radius.sm, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" },
  addText: { color: "#ffffff", fontSize: 26, lineHeight: 28 },
  filters: { flexDirection: "row", gap: 7, marginVertical: 14 },
  filter: { paddingHorizontal: 12, minHeight: 36, borderRadius: 999, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  filterActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  filterText: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  filterTextActive: { color: "#ffffff" },
  error: { color: colors.danger, marginBottom: 10, fontSize: 13 },
  list: { paddingBottom: 120, gap: 10 },
  emptyList: { flexGrow: 1, paddingBottom: 120 },
  card: { flexDirection: "row", gap: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 15 },
  cardDone: { opacity: 0.72 },
  check: { width: 24, height: 24, borderRadius: 8, borderWidth: 1.5, borderColor: colors.line, alignItems: "center", justifyContent: "center", marginTop: 1 },
  checkDone: { backgroundColor: colors.ink, borderColor: colors.ink },
  checkText: { color: "#ffffff", fontSize: 13, fontWeight: "900" },
  cardBody: { flex: 1 },
  cardTitleRow: { flexDirection: "row", gap: 8, alignItems: "flex-start", justifyContent: "space-between" },
  cardTitle: { flex: 1, color: colors.ink, fontSize: 15, lineHeight: 20, fontWeight: "800" },
  strike: { textDecorationLine: "line-through" },
  priority: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  priorityText: { color: colors.ink, fontSize: 9, fontWeight: "800", textTransform: "uppercase" },
  priorityHigh: { backgroundColor: "#f7dddd" },
  priorityMedium: { backgroundColor: "#f4ead7" },
  priorityLow: { backgroundColor: "#ddece3" },
  description: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 7 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 },
  meta: { color: colors.muted, fontSize: 10, fontWeight: "600" },
  overdue: { color: colors.danger },
  source: { color: colors.blue, fontSize: 11, marginTop: 9, fontWeight: "600" },
  cardActions: { flexDirection: "row", gap: 18, marginTop: 13 },
  action: { color: colors.ink, fontSize: 11, fontWeight: "800" },
  delete: { color: colors.danger },
  empty: { flex: 1, minHeight: 300, alignItems: "center", justifyContent: "center", paddingHorizontal: 30 },
  emptyMark: { color: colors.muted, fontSize: 34 },
  emptyTitle: { color: colors.ink, fontSize: 18, fontWeight: "800", marginTop: 8 },
  emptyText: { color: colors.muted, fontSize: 13, textAlign: "center", marginTop: 6 },
});
