import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";
import type { WhiteboardRecord } from "../types";
import { colors, radius } from "../theme";

const webUrl = process.env.EXPO_PUBLIC_LIVETASK_WEB_URL || "http://localhost:3000";

export function BoardsScreen() {
  const [boards, setBoards] = useState<WhiteboardRecord[]>([]);
  const [selected, setSelected] = useState<WhiteboardRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function loadBoards() {
    setError("");
    const { data, error: loadError } = await supabase.from("whiteboards").select("*").order("updated_at", { ascending: false });
    if (loadError) setError(loadError.message);
    else setBoards((data ?? []) as WhiteboardRecord[]);
    setLoading(false);
  }

  useEffect(() => { void loadBoards(); }, []);

  async function refresh() {
    setRefreshing(true);
    await loadBoards();
    setRefreshing(false);
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.ink} /></View>;

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>VISUAL WORKSPACE</Text>
          <Text style={styles.heading}>Boards</Text>
        </View>
        <Pressable style={styles.openButton} onPress={() => Linking.openURL(`${webUrl}/canvas`)}><Text style={styles.openButtonText}>Open editor ↗</Text></Pressable>
      </View>

      <Text style={styles.intro}>Review diagrams and annotations saved from the browser Canvas. Use the full web editor to draw or update a board.</Text>
      {!!error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        data={boards}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.columns}
        contentContainerStyle={boards.length ? styles.list : styles.emptyList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.ink} />}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => setSelected(item)}>
            <View style={[styles.preview, { backgroundColor: item.background || "#ffffff" }]}>
              <Image source={{ uri: item.snapshot }} style={styles.image} resizeMode="contain" />
            </View>
            <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.date}>Updated {formatDate(item.updated_at)}</Text>
          </Pressable>
        )}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyTitle}>No saved boards</Text><Text style={styles.emptyText}>Create your first visual board in the web Canvas editor.</Text><Pressable style={styles.primary} onPress={() => Linking.openURL(`${webUrl}/canvas`)}><Text style={styles.primaryText}>Open Canvas editor</Text></Pressable></View>}
        showsVerticalScrollIndicator={false}
      />

      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)} statusBarTranslucent navigationBarTranslucent>
        <SafeAreaView style={styles.modalBackdrop} edges={["top", "right", "bottom", "left"]}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderText}><Text style={styles.modalKicker}>BOARD PREVIEW</Text><Text style={styles.modalTitle} numberOfLines={2}>{selected?.title}</Text></View>
              <Pressable style={styles.close} onPress={() => setSelected(null)}><Text style={styles.closeText}>×</Text></Pressable>
            </View>
            {!!selected && <View style={[styles.largePreview, { backgroundColor: selected.background || "#ffffff" }]}><Image source={{ uri: selected.snapshot }} style={styles.largeImage} resizeMode="contain" /></View>}
            <Pressable style={styles.primary} onPress={() => Linking.openURL(`${webUrl}/canvas`)}><Text style={styles.primaryText}>Continue in web editor ↗</Text></Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

function formatDate(value: string) { return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value)); }

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 18, paddingTop: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  kicker: { color: colors.muted, fontSize: 10, fontWeight: "800", letterSpacing: 1.4 },
  heading: { color: colors.ink, fontSize: 34, fontWeight: "800", letterSpacing: -1.3, marginTop: 2 },
  openButton: { minHeight: 40, paddingHorizontal: 13, borderRadius: 999, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" },
  openButtonText: { color: "#ffffff", fontSize: 11, fontWeight: "800" },
  intro: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 12, marginBottom: 18 },
  error: { color: colors.danger, fontSize: 13, marginBottom: 10 },
  list: { paddingBottom: 120 },
  emptyList: { flexGrow: 1, paddingBottom: 120 },
  columns: { gap: 10 },
  card: { flex: 1, maxWidth: "49%", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 9, marginBottom: 10 },
  preview: { height: 132, borderRadius: radius.sm, overflow: "hidden", borderWidth: 1, borderColor: colors.line },
  image: { width: "100%", height: "100%" },
  title: { color: colors.ink, fontSize: 13, lineHeight: 18, fontWeight: "800", marginTop: 10 },
  date: { color: colors.muted, fontSize: 10, marginTop: 5, marginBottom: 3 },
  empty: { flex: 1, minHeight: 360, alignItems: "center", justifyContent: "center", paddingHorizontal: 30 },
  emptyTitle: { color: colors.ink, fontSize: 18, fontWeight: "800" },
  emptyText: { color: colors.muted, fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 7, marginBottom: 18 },
  primary: { minHeight: 48, borderRadius: radius.sm, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  primaryText: { color: "#ffffff", fontSize: 12, fontWeight: "800" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,.42)", padding: 20, justifyContent: "center" },
  modalCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 18 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 },
  modalHeaderText: { flex: 1 },
  modalKicker: { color: colors.muted, fontSize: 9, fontWeight: "800", letterSpacing: 1.2 },
  modalTitle: { color: colors.ink, fontSize: 21, fontWeight: "800", marginTop: 4 },
  close: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surfaceMuted, alignItems: "center", justifyContent: "center" },
  closeText: { color: colors.ink, fontSize: 25 },
  largePreview: { height: 390, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, marginBottom: 14, overflow: "hidden" },
  largeImage: { width: "100%", height: "100%" },
});