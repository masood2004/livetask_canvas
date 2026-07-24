import Link from "next/link";

const features = [
  {
    number: "01",
    title: "Secure authentication",
    text: "Create an account, sign in with email and password, and access a protected personal workspace.",
  },
  {
    number: "02",
    title: "Complete task CRUD",
    text: "Add, read, edit, prioritise, complete and delete tasks stored in Supabase PostgreSQL.",
  },
  {
    number: "03",
    title: "Ready for Session 2",
    text: "The architecture is prepared for Realtime, Canvas, Chrome, Android and Tauri additions in later tasks.",
  },
];

export default function Home() {
  return (
    <main className="landing-shell">
      <nav className="topbar container">
        <Link href="/" className="brand" aria-label="LiveTask Canvas home">
          <span className="brand-mark">LT</span>
          <span>LiveTask Canvas</span>
        </Link>
        <div className="nav-actions">
          <Link href="/login" className="button button-ghost">Sign in</Link>
          <Link href="/signup" className="button button-primary">Create account</Link>
        </div>
      </nav>

      <section className="hero container">
        <div className="eyebrow"><span /> Session 2 · Task 2</div>
        <h1>Turn scattered work into a clear daily plan.</h1>
        <p className="hero-copy">
          A focused task management product built with Next.js and Supabase. It includes authentication,
          protected data and the complete create, read, update and delete workflow required for the assignment.
        </p>
        <div className="hero-actions">
          <Link href="/signup" className="button button-primary button-large">Start managing tasks</Link>
          <Link href="/login" className="button button-secondary button-large">Open workspace</Link>
        </div>

        <div className="product-preview" aria-label="Product preview">
          <div className="preview-sidebar">
            <div className="preview-logo">LT</div>
            <div className="preview-line active" />
            <div className="preview-line" />
            <div className="preview-line short" />
          </div>
          <div className="preview-main">
            <div className="preview-header">
              <div>
                <span>Workspace</span>
                <strong>My tasks</strong>
              </div>
              <div className="preview-avatar">MH</div>
            </div>
            <div className="preview-stats">
              <div><strong>08</strong><span>Total</span></div>
              <div><strong>03</strong><span>In progress</span></div>
              <div><strong>04</strong><span>Completed</span></div>
            </div>
            <div className="preview-cards">
              <article><i className="priority high" /><b>Prepare Loom walkthrough</b><small>High priority · Today</small></article>
              <article><i className="priority medium" /><b>Connect Supabase project</b><small>Medium priority</small></article>
              <article><i className="priority low" /><b>Review application flow</b><small>Low priority</small></article>
            </div>
          </div>
        </div>
      </section>

      <section className="feature-section container">
        <div className="section-heading">
          <span>What is included</span>
          <h2>A small product with a complete working flow.</h2>
        </div>
        <div className="feature-grid">
          {features.map((feature) => (
            <article className="feature-card" key={feature.number}>
              <span>{feature.number}</span>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="footer container">
        <span>LiveTask Canvas</span>
        <span>MERN Stack Internship 2026</span>
      </footer>
    </main>
  );
}
