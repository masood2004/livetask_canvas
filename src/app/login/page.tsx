import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <main className="auth-page">
      <Link href="/" className="brand auth-brand">
        <span className="brand-mark">LT</span>
        <span>LiveTask Canvas</span>
      </Link>

      <section className="auth-card">
        <div className="auth-heading">
          <span>Welcome back</span>
          <h1>Sign in to your workspace.</h1>
          <p>Continue managing your personal tasks securely.</p>
        </div>
        <AuthForm mode="login" initialError={params.error ?? ""} />
      </section>

      <p className="auth-footnote">Session 2 · Task 2 · Next.js + Supabase</p>
    </main>
  );
}
