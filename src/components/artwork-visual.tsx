import type { Artwork } from "@/lib/types";

export function ArtworkVisual({ artwork }: { artwork: Artwork }) {
  if (artwork.image_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt={artwork.title}
        src={artwork.image_url}
        style={{ display: "block", height: "100%", objectFit: "cover", width: "100%" }}
      />
    );
  }

  const colors = artwork.colors.length ? artwork.colors : ["#c1714b", "#5c3d2e", "#efe4d6"];

  return (
    <div
      className="generated-art"
      style={{
        background: `
          radial-gradient(circle at 20% 24%, ${colors[0]} 0, transparent 24%),
          radial-gradient(circle at 74% 32%, ${colors[1] || colors[0]} 0, transparent 28%),
          radial-gradient(circle at 48% 76%, ${colors[2] || colors[0]} 0, transparent 30%),
          linear-gradient(135deg, ${colors[3] || "#2c2320"}, ${colors[4] || colors[0]})
        `
      }}
    />
  );
}

