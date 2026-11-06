import { ImageResponse } from "next/og";

export const alt = "Finpal — AI investing guide in your wallet, funded with PayPal (Sandbox)";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Link preview image (Devpost, social). Original Finpal brand only. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#0B3D91",
          color: "#FFFFFF",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: -120,
            top: -160,
            width: 520,
            height: 520,
            borderRadius: 9999,
            background: "rgba(0,194,168,0.25)",
            display: "flex",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 27,
              background: "#00C2A8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              fontSize: 72,
              fontWeight: 800,
              color: "#FFFFFF",
            }}
          >
            f
            <div
              style={{ position: "absolute", top: 17, right: 17, width: 14, height: 14, borderRadius: 9999, background: "#FFFFFF" }}
            />
          </div>
          <div style={{ fontSize: 64, fontWeight: 800, letterSpacing: -2 }}>finpal</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1.5, maxWidth: 900 }}>
            Make your savings work, one safe step at a time
          </div>
          <div style={{ fontSize: 30, color: "rgba(255,255,255,0.8)", maxWidth: 900 }}>
            An AI guide that protects your safety net, explains the risks and helps you invest, funded with PayPal.
          </div>
        </div>

        <div style={{ display: "flex", gap: 16, fontSize: 24 }}>
          <div style={{ display: "flex", background: "#00C2A8", color: "#061A3F", padding: "10px 22px", borderRadius: 999, fontWeight: 700 }}>
            PayPal Sandbox · test money only
          </div>
          <div style={{ display: "flex", border: "2px solid rgba(255,255,255,0.4)", padding: "8px 20px", borderRadius: 999 }}>
            Hackathon concept
          </div>
        </div>
      </div>
    ),
    size,
  );
}
