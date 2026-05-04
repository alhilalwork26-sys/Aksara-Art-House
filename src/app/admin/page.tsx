export default function AdminPage() {
  return (
    <main style={{ height: "100vh", margin: 0, overflow: "hidden" }}>
      <iframe
        src="/admin-panel.html"
        title="Aksara Art House Admin"
        style={{
          border: 0,
          display: "block",
          height: "100vh",
          width: "100%"
        }}
      />
    </main>
  );
}

