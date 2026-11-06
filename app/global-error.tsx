"use client";

/** Last-resort boundary when the root layout itself fails. Uses inline styles: globals may not load. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#F6F8FB", color: "#0F172A", margin: 0 }}>
        <main role="alert" style={{ maxWidth: 420, margin: "15vh auto", textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Finpal hit a snag</h1>
          <p style={{ color: "#64748B" }}>Nothing moved without your confirmation. Please reload the app.</p>
          <button
            onClick={reset}
            style={{ marginTop: 16, background: "#00C2A8", color: "#061A3F", border: 0, borderRadius: 999, padding: "12px 24px", fontWeight: 700, cursor: "pointer" }}
          >
            Reload
          </button>
        </main>
      </body>
    </html>
  );
}
