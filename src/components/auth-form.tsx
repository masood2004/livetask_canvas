"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "login" | "signup";

type AuthFormProps = {
  mode: AuthMode;
  initialError?: string;
};

export function AuthForm({ mode, initialError = "" }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(initialError);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const isSignup = mode === "signup";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!email.trim() || !password) {
      setError("Enter both your email address and password.");
      return;
    }

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (isSignup && password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      if (isSignup) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (signUpError) throw signUpError;

        if (data.session) {
          router.replace("/dashboard");
          router.refresh();
          return;
        }

        setMessage("Account created. Check your inbox to confirm your email, then sign in.");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (signInError) throw signInError;

        router.replace("/dashboard");
        router.refresh();
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Authentication failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <div className="form-field">
        <label htmlFor="email">Email address</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
      </div>

      <div className="form-field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Minimum 8 characters"
          autoComplete={isSignup ? "new-password" : "current-password"}
          required
        />
      </div>

      {isSignup && (
        <div className="form-field">
          <label htmlFor="confirm-password">Confirm password</label>
          <input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Repeat your password"
            autoComplete="new-password"
            required
          />
        </div>
      )}

      {error && <p className="form-alert error" role="alert">{error}</p>}
      {message && <p className="form-alert success" role="status">{message}</p>}

      <button className="button button-primary auth-submit" disabled={loading} type="submit">
        {loading ? "Please wait…" : isSignup ? "Create account" : "Sign in"}
      </button>

      <p className="auth-switch">
        {isSignup ? "Already have an account?" : "New to LiveTask?"}{" "}
        <Link href={isSignup ? "/login" : "/signup"}>
          {isSignup ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </form>
  );
}
