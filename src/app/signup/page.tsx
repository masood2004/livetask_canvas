import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export default function SignupPage() {
  return (
    <main className="auth-page">
      <Link href="/" className="brand auth-brand">
        <span className="brand-mark">LT</span>
        <span>LiveTask</span>
      </Link>

      <section className="auth-card">
        <div className="auth-heading">
          <span>Create your workspace</span>
          <h1>Plan the work. Finish the work.</h1>
          <p>Your tasks remain private through Supabase authentication and Row-Level Security.</p>
        </div>
        <AuthForm mode="signup" />
      </section>

      <p className="auth-footnote">Start with a simple list. Build momentum.</p>
    </main>
  );
}
