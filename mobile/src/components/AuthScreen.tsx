import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { supabase } from "../lib/supabase";
import { colors, radius } from "../theme";

type Mode = "login" | "signup";

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function submit() {
    setError("");
    setMessage("");

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setError("Enter your email and password.");
      return;
    }
    if (password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }
    if (mode === "signup" && password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
        });
        if (signUpError) throw signUpError;
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (!data.session) {
          setMessage("Account created. Confirm your email, then sign in.");
          setMode("login");
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (signInError) throw signInError;
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Authentication failed.");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.page}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.brandRow}>
          <View style={styles.mark}><Text style={styles.markText}>LT</Text></View>
          <Text style={styles.brand}>LiveTask</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.kicker}>{mode === "login" ? "WELCOME BACK" : "CREATE ACCOUNT"}</Text>
          <Text style={styles.title}>
            {mode === "login" ? "Your work, wherever you are." : "Build a calmer task routine."}
          </Text>
          <Text style={styles.subtitle}>
            Sign in to the same private workspace used by LiveTask on the web, Chrome and desktop.
          </Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            placeholder="you@example.com"
            placeholderTextColor={colors.muted}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder="Minimum 8 characters"
            placeholderTextColor={colors.muted}
          />

          {mode === "signup" && (
            <>
              <Text style={styles.label}>Confirm password</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
                placeholder="Repeat your password"
                placeholderTextColor={colors.muted}
              />
            </>
          )}

          {!!error && <Text style={styles.error}>{error}</Text>}
          {!!message && <Text style={styles.success}>{message}</Text>}

          <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]} onPress={submit} disabled={busy}>
            {busy ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.primaryText}>{mode === "login" ? "Sign in" : "Create account"}</Text>}
          </Pressable>

          <Pressable
            style={styles.switchButton}
            onPress={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError("");
              setMessage("");
            }}
          >
            <Text style={styles.switchText}>
              {mode === "login" ? "New to LiveTask? Create an account" : "Already registered? Sign in"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  page: { flex: 1, justifyContent: "center", padding: 24 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 28 },
  mark: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" },
  markText: { color: "#ffffff", fontWeight: "900", fontSize: 12 },
  brand: { color: colors.ink, fontSize: 17, fontWeight: "800" },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, padding: 24 },
  kicker: { color: colors.muted, fontSize: 11, fontWeight: "800", letterSpacing: 1.4 },
  title: { color: colors.ink, fontSize: 32, lineHeight: 36, fontWeight: "800", letterSpacing: -1, marginTop: 12 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 12, marginBottom: 22 },
  label: { color: colors.ink, fontSize: 12, fontWeight: "700", marginBottom: 8, marginTop: 14 },
  input: { minHeight: 50, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, paddingHorizontal: 14, color: colors.ink, backgroundColor: colors.surface },
  error: { color: colors.danger, fontSize: 13, marginTop: 14 },
  success: { color: colors.success, fontSize: 13, marginTop: 14 },
  primaryButton: { minHeight: 52, borderRadius: radius.sm, alignItems: "center", justifyContent: "center", backgroundColor: colors.ink, marginTop: 22 },
  primaryText: { color: "#ffffff", fontSize: 15, fontWeight: "800" },
  pressed: { opacity: 0.78 },
  switchButton: { paddingVertical: 18, alignItems: "center" },
  switchText: { color: colors.ink, fontSize: 13, fontWeight: "700" },
});
