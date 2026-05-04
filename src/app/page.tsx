export default function HomePage() {
  return (
    <main style={{ height: "100vh", margin: 0, overflow: "hidden" }}>
      <iframe
        src="/marketplace.html"
        title="Aksara Art House Marketplace"
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

