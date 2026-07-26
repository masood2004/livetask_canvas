import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Task, TaskDraft, TaskPriority, TaskStatus } from "../types";
import { colors, radius } from "../theme";

const emptyDraft: TaskDraft = {
  title: "",
  description: "",
  status: "todo",
  priority: "medium",
  due_date: "",
};

type Props = {
  visible: boolean;
  task: Task | null;
  busy: boolean;
  onClose: () => void;
  onSave: (draft: TaskDraft) => Promise<void>;
};

export function TaskEditor({ visible, task, busy, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<TaskDraft>(emptyDraft);
  const [error, setError] = useState("");

  useEffect(() => {
    if (visible) {
      setDraft(task ? {
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        due_date: task.due_date ?? "",
      } : emptyDraft);
      setError("");
    }
  }, [visible, task]);

  function patch<K extends keyof TaskDraft>(key: K, value: TaskDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function submit() {
    if (!draft.title.trim()) {
      setError("A title is required.");
      return;
    }
    if (draft.due_date && !/^\d{4}-\d{2}-\d{2}$/.test(draft.due_date)) {
      setError("Use YYYY-MM-DD for the due date.");
      return;
    }
    setError("");
    await onSave({ ...draft, title: draft.title.trim(), description: draft.description.trim() });
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <SafeAreaView style={styles.sheet} edges={["right", "bottom", "left"]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View>
              <Text style={styles.kicker}>{task ? "EDIT TASK" : "NEW TASK"}</Text>
              <Text style={styles.title}>{task ? "Update the details" : "Capture what matters"}</Text>
            </View>
            <Pressable style={styles.close} onPress={onClose}><Text style={styles.closeText}>×</Text></Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>Title</Text>
            <TextInput style={styles.input} value={draft.title} onChangeText={(v) => patch("title", v)} placeholder="What needs to be done?" placeholderTextColor={colors.muted} maxLength={120} autoFocus />

            <Text style={styles.label}>Description</Text>
            <TextInput style={[styles.input, styles.textarea]} value={draft.description} onChangeText={(v) => patch("description", v)} placeholder="Add context" placeholderTextColor={colors.muted} multiline maxLength={600} />

            <Text style={styles.label}>Priority</Text>
            <Segmented
              values={["low", "medium", "high"]}
              selected={draft.priority}
              labels={{ low: "Low", medium: "Medium", high: "High" }}
              onChange={(value) => patch("priority", value as TaskPriority)}
            />

            <Text style={styles.label}>Status</Text>
            <Segmented
              values={["todo", "in_progress", "done"]}
              selected={draft.status}
              labels={{ todo: "To do", in_progress: "Active", done: "Done" }}
              onChange={(value) => patch("status", value as TaskStatus)}
            />

            <Text style={styles.label}>Due date</Text>
            <TextInput style={styles.input} value={draft.due_date} onChangeText={(v) => patch("due_date", v)} placeholder="YYYY-MM-DD (optional)" placeholderTextColor={colors.muted} keyboardType="numbers-and-punctuation" />

            {!!error && <Text style={styles.error}>{error}</Text>}

            <View style={styles.actions}>
              <Pressable style={styles.secondary} onPress={onClose}><Text style={styles.secondaryText}>Cancel</Text></Pressable>
              <Pressable style={styles.primary} onPress={submit} disabled={busy}><Text style={styles.primaryText}>{busy ? "Saving…" : task ? "Save changes" : "Add task"}</Text></Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

type SegmentedProps = {
  values: string[];
  selected: string;
  labels: Record<string, string>;
  onChange: (value: string) => void;
};

function Segmented({ values, selected, labels, onChange }: SegmentedProps) {
  return (
    <View style={styles.segmented}>
      {values.map((value) => (
        <Pressable key={value} style={[styles.segment, selected === value && styles.segmentActive]} onPress={() => onChange(value)}>
          <Text style={[styles.segmentText, selected === value && styles.segmentTextActive]}>{labels[value]}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,.34)" },
  sheet: { maxHeight: "92%", backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 22, paddingTop: 22 },
  handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: colors.line, alignSelf: "center", marginBottom: 18 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  kicker: { color: colors.muted, fontSize: 10, fontWeight: "800", letterSpacing: 1.3 },
  title: { color: colors.ink, fontSize: 25, fontWeight: "800", letterSpacing: -0.7, marginTop: 5 },
  close: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surfaceMuted, alignItems: "center", justifyContent: "center" },
  closeText: { color: colors.ink, fontSize: 25, lineHeight: 26 },
  label: { color: colors.ink, fontSize: 12, fontWeight: "700", marginBottom: 8, marginTop: 16 },
  input: { minHeight: 50, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, paddingHorizontal: 14, color: colors.ink, backgroundColor: colors.surface },
  textarea: { minHeight: 96, paddingTop: 14, textAlignVertical: "top" },
  segmented: { flexDirection: "row", backgroundColor: colors.surfaceMuted, padding: 4, borderRadius: 12, gap: 4 },
  segment: { flex: 1, minHeight: 42, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  segmentActive: { backgroundColor: colors.surface },
  segmentText: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  segmentTextActive: { color: colors.ink },
  error: { color: colors.danger, fontSize: 13, marginTop: 14 },
  actions: { flexDirection: "row", gap: 10, marginTop: 24, paddingBottom: 12 },
  secondary: { flex: 1, minHeight: 50, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" },
  secondaryText: { color: colors.ink, fontWeight: "800" },
  primary: { flex: 1.4, minHeight: 50, borderRadius: radius.sm, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" },
  primaryText: { color: "#ffffff", fontWeight: "800" },
});