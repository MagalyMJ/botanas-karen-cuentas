import { ImageResponse } from "next/og";

export function generateImageMetadata() {
  return [32, 192, 512].map((s) => ({
    id: String(s),
    size: { width: s, height: s },
    contentType: "image/png",
  }));
}

export default async function Icon({ id }: { id: Promise<string> }) {
  const size = Number(await id);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#171717",
          color: "#fafafa",
          fontSize: size * 0.55,
          fontWeight: 700,
        }}
      >
        $
      </div>
    ),
    { width: size, height: size },
  );
}
