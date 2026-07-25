import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import type { Session } from "@supabase/supabase-js";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { supabase } from "./src/lib/supabase";
import { AuthScreen } from "./src/components/AuthScreen";
import { TasksScreen } from "./src/components/TasksScreen";
import { BoardsScreen } from "./src/components/BoardsScreen";
import { AccountScreen } from "./src/components/AccountScreen";
import type { AppTab } from "./src/types";
import { colors } from "./src/theme";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<AppTab>("tasks");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) setTab("tasks");
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  if (loading) {
    return <SafeAreaProvider><View style={styles.loading}><ActivityIndicator color={colors.ink} /><Text style={styles.loadingText}>Opening LiveTask…</Text></View></SafeAreaProvider>;
  }

  if (!session?.user) {
    return <SafeAreaProvider><StatusBar style="dark" /><AuthScreen /></SafeAreaProvider>;
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe}>
        <StatusBar style="dark" />
        <View style={styles.content}>
          {tab === "tasks" && <TasksScreen userId={session.user.id} />}
          {tab === "boards" && <BoardsScreen />}
          {tab === "account" && <AccountScreen user={session.user} />}
        </View>
        <View style={styles.nav}>
          <Tab value="tasks" active={tab === "tasks"} icon="✓" label="Tasks" onPress={setTab} />
          <Tab value="boards" active={tab === "boards"} icon="□" label="Boards" onPress={setTab} />
          <Tab value="account" active={tab === "account"} icon="○" label="Account" onPress={setTab} />
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function Tab({ value, active, icon, label, onPress }: { value: AppTab; active: boolean; icon: string; label: string; onPress: (tab: AppTab) => void }) {
  return (
    <Pressable style={styles.tab} onPress={() => onPress(value)}>
      <View style={[styles.tabIcon, active && styles.tabIconActive]}><Text style={[styles.iconText, active && styles.iconTextActive]}>{icon}</Text></View>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background, gap: 12 },
  loadingText: { color: colors.muted, fontSize: 13 },
  nav: { position: "absolute", left: 14, right: 14, bottom: 12, height: 72, flexDirection: "row", backgroundColor: "rgba(255,255,255,.97)", borderWidth: 1, borderColor: colors.line, borderRadius: 22, paddingHorizontal: 10, paddingVertical: 8 },
  tab: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4 },
  tabIcon: { width: 28, height: 28, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  tabIconActive: { backgroundColor: colors.ink },
  iconText: { color: colors.muted, fontSize: 15, fontWeight: "800" },
  iconTextActive: { color: "#ffffff" },
  tabLabel: { color: colors.muted, fontSize: 10, fontWeight: "700" },
  tabLabelActive: { color: colors.ink },
});
