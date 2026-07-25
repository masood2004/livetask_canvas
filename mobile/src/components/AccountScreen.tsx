import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { colors, radius } from "../theme";

const webUrl = process.env.EXPO_PUBLIC_LIVETASK_WEB_URL || "http://localhost:3000";

type Props = { user: User };

export function AccountScreen({ user }: Props) {
  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert("Could not sign out", error.message);
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>ACCOUNT</Text>
      <Text style={styles.heading}>LiveTask mobile</Text>
      <Text style={styles.intro}>A focused Android companion for the same private workspace used by the web app, Chrome extension and desktop client.</Text>

      <View style={styles.profile}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{(user.email ?? "LT").slice(0, 2).toUpperCase()}</Text></View>
        <View style={styles.profileText}><Text style={styles.profileName}>{user.email?.split("@")[0] || "LiveTask user"}</Text><Text style={styles.profileEmail}>{user.email}</Text></View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Workspace links</Text>
        <Row title="Open web dashboard" subtitle={webUrl} onPress={() => Linking.openURL(`${webUrl}/dashboard`)} />
        <Row title="Open Canvas editor" subtitle="Draw and update visual boards" onPress={() => Linking.openURL(`${webUrl}/canvas`)} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What syncs</Text>
        <Info label="Tasks" value="Create, edit, status and deletion" />
        <Info label="Realtime" value="Changes from web, Chrome and desktop" />
        <Info label="Boards" value="Read-only previews of saved Canvas work" />
        <Info label="Security" value="Supabase Auth and Row-Level Security" />
      </View>

      <Pressable style={styles.signOut} onPress={signOut}><Text style={styles.signOutText}>Sign out</Text></Pressable>
      <Text style={styles.version}>LiveTask Mobile · 1.0.0</Text>
    </ScrollView>
  );
}

function Row({ title, subtitle, onPress }: { title: string; subtitle: string; onPress: () => void }) {
  return <Pressable style={styles.row} onPress={onPress}><View style={styles.rowText}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.rowSubtitle} numberOfLines={1}>{subtitle}</Text></View><Text style={styles.arrow}>↗</Text></Pressable>;
}
function Info({ label, value }: { label: string; value: string }) {
  return <View style={styles.info}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 120 },
  kicker: { color: colors.muted, fontSize: 10, fontWeight: "800", letterSpacing: 1.4 },
  heading: { color: colors.ink, fontSize: 34, fontWeight: "800", letterSpacing: -1.3, marginTop: 2 },
  intro: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 12 },
  profile: { flexDirection: "row", alignItems: "center", gap: 13, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 16, marginTop: 20 },
  avatar: { width: 46, height: 46, borderRadius: 15, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#ffffff", fontSize: 12, fontWeight: "900" },
  profileText: { flex: 1 },
  profileName: { color: colors.ink, fontSize: 15, fontWeight: "800" },
  profileEmail: { color: colors.muted, fontSize: 11, marginTop: 4 },
  section: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, marginTop: 14, overflow: "hidden" },
  sectionTitle: { color: colors.ink, fontSize: 12, fontWeight: "800", padding: 15, borderBottomWidth: 1, borderBottomColor: colors.line },
  row: { minHeight: 68, flexDirection: "row", alignItems: "center", paddingHorizontal: 15, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  rowText: { flex: 1 },
  rowTitle: { color: colors.ink, fontSize: 13, fontWeight: "700" },
  rowSubtitle: { color: colors.muted, fontSize: 10, marginTop: 4 },
  arrow: { color: colors.ink, fontSize: 16 },
  info: { flexDirection: "row", justifyContent: "space-between", gap: 14, paddingHorizontal: 15, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  infoLabel: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  infoValue: { flex: 1, color: colors.ink, fontSize: 11, textAlign: "right" },
  signOut: { minHeight: 50, backgroundColor: colors.ink, borderRadius: radius.sm, alignItems: "center", justifyContent: "center", marginTop: 20 },
  signOutText: { color: "#ffffff", fontWeight: "800" },
  version: { color: colors.muted, fontSize: 10, textAlign: "center", marginTop: 16 },
});
