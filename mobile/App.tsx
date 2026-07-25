import { Component, type ErrorInfo, type ReactNode, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import type { Session } from "@supabase/supabase-js";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { mobileConfigurationError, supabase } from "./src/lib/supabase";
import { AuthScreen } from "./src/components/AuthScreen";
import { TasksScreen } from "./src/components/TasksScreen";
import { BoardsScreen } from "./src/components/BoardsScreen";
import { AccountScreen } from "./src/components/AccountScreen";
import type { AppTab } from "./src/types";
import { colors } from "./src/theme";

export default function App() {
  return (
    <AppErrorBoundary>
      <AppRoot />
    </AppErrorBoundary>
  );
}

function AppRoot() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<AppTab>("tasks");

  useEffect(() => {
    if (mobileConfigurationError) {
      setLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) console.warn("Unable to restore the mobile session:", error.message);
      setSession(data.session);
      setLoading(false);
    }).catch((error: unknown) => {
      if (!mounted) return;
      console.warn("Unable to initialize authentication:", error);
      setSession(null);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) setTab("tasks");
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  if (mobileConfigurationError) {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <ConfigurationScreen message={mobileConfigurationError} />
      </SafeAreaProvider>
    );
  }

  if (loading) {
    return (
      <SafeAreaProvider>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.ink} />
          <Text style={styles.loadingText}>Opening LiveTask…</Text>
        </View>
      </SafeAreaProvider>
    );
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

function ConfigurationScreen({ message }: { message: string }) {
  return (
    <SafeAreaView style={styles.configSafe}>
      <ScrollView contentContainerStyle={styles.configContent}>
        <View style={styles.configMark}><Text style={styles.configMarkText}>LT</Text></View>
        <Text style={styles.configKicker}>BUILD CONFIGURATION</Text>
        <Text style={styles.configTitle}>LiveTask could not connect yet.</Text>
        <Text style={styles.configMessage}>{message}</Text>

        <View style={styles.configCard}>
          <Text style={styles.configCardTitle}>Required EAS variables</Text>
          <Text style={styles.configCode}>EXPO_PUBLIC_SUPABASE_URL</Text>
          <Text style={styles.configCode}>EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY</Text>
          <Text style={styles.configHint}>Set both values for the preview environment, rebuild the APK and reinstall it.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
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

type ErrorBoundaryState = { error: Error | null };

class AppErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("LiveTask mobile startup error", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <SafeAreaView style={styles.configSafe}>
          <View style={styles.configContent}>
            <View style={styles.configMark}><Text style={styles.configMarkText}>!</Text></View>
            <Text style={styles.configKicker}>STARTUP RECOVERY</Text>
            <Text style={styles.configTitle}>LiveTask encountered a startup error.</Text>
            <Text style={styles.configMessage}>The app stayed open so the problem can be diagnosed. Rebuild after checking the mobile environment and dependency versions.</Text>
            <View style={styles.configCard}>
              <Text style={styles.configCardTitle}>Technical detail</Text>
              <Text style={styles.configHint}>{this.state.error.message || "Unknown startup error"}</Text>
            </View>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }
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
  configSafe: { flex: 1, backgroundColor: colors.background },
  configContent: { flexGrow: 1, justifyContent: "center", padding: 24 },
  configMark: { width: 46, height: 46, borderRadius: 14, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center", marginBottom: 28 },
  configMarkText: { color: "#ffffff", fontSize: 13, fontWeight: "900" },
  configKicker: { color: colors.muted, fontSize: 10, fontWeight: "800", letterSpacing: 1.4 },
  configTitle: { color: colors.ink, fontSize: 34, lineHeight: 39, fontWeight: "800", letterSpacing: -1.2, marginTop: 8 },
  configMessage: { color: colors.muted, fontSize: 14, lineHeight: 22, marginTop: 14 },
  configCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 18, padding: 18, marginTop: 24 },
  configCardTitle: { color: colors.ink, fontSize: 13, fontWeight: "800", marginBottom: 12 },
  configCode: { color: colors.ink, fontSize: 12, fontWeight: "700", backgroundColor: colors.background, borderRadius: 9, paddingHorizontal: 11, paddingVertical: 10, marginTop: 7 },
  configHint: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 12 },
});
