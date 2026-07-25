import Link from "next/link";

const features = [
  {
    title: "Live by default",
    text: "Changes appear across open sessions instantly, so every screen stays in sync.",
  },
  {
    title: "Private workspace",
    text: "Supabase authentication and Row-Level Security keep each account isolated.",
  },
  {
    title: "Visual thinking",
    text: "Sketch ideas, annotate images, build quick diagrams and save private boards beside your tasks.",
  },
];

export default function Home() {
  return (
    <main className="landing-shell">
      <nav className="topbar container">
        <Link href="/" className="brand" aria-label="LiveTask home">
          <span className="brand-mark">L</span>
          <span>LiveTask</span>
        </Link>
        <div className="nav-actions">
          <Link href="/login" className="button button-ghost">Sign in</Link>
          <Link href="/signup" className="button button-primary">Get started</Link>
        </div>
      </nav>

      <section className="hero container">
        <div className="eyebrow"><span /> A calm place to get things done</div>
        <h1>Plan less.<br />Finish more.</h1>
        <p className="hero-copy">
          A focused workspace for real-time tasks, visual planning and quick ideas.
        </p>
        <div className="hero-actions">
          <Link href="/signup" className="button button-primary button-large">Create workspace</Link>
          <Link href="/login" className="button button-secondary button-large">Sign in</Link>
        </div>

        <div className="product-preview" aria-label="LiveTask interface preview">
          <div className="preview-topline">
            <span>Today</span>
            <span className="preview-live"><i /> Live</span>
          </div>
          <div className="preview-heading">
            <div>
              <small>Workspace</small>
              <strong>My tasks</strong>
            </div>
            <span>6 open</span>
          </div>
          <div className="preview-cards">
            <article><i className="priority high" /><div><b>Prepare project walkthrough</b><small>High priority · Today</small></div><span>In progress</span></article>
            <article><i className="priority medium" /><div><b>Review application flow</b><small>Medium priority</small></div><span>To do</span></article>
            <article className="complete"><i className="priority low" /><div><b>Connect workspace</b><small>Completed</small></div><span>Done</span></article>
          </div>
        </div>
      </section>

      <section className="feature-section container">
        <div className="section-heading">
          <span>Built for focus</span>
          <h2>Everything needed for a clear day.</h2>
        </div>
        <div className="feature-grid">
          {features.map((feature) => (
            <article className="feature-card" key={feature.title}>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="footer container">
        <span>LiveTask</span>
        <span>Built for focused work.</span>
      </footer>
    </main>
  );
}
