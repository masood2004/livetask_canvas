"use client";

export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="error-page">
      <div className="error-card">
        <span>Workspace error</span>
        <h1>The dashboard could not be loaded.</h1>
        <p>{error.message}</p>
        <button className="button button-primary" onClick={reset} type="button">Try again</button>
      </div>
    </main>
  );
}
