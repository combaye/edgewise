import { C, mono } from "../lib/theme";

// minimal, injection-safe rich renderer: **bold** + line breaks + • bullets +
// ALL-CAPS section headers rendered in amber. Shared by the AI analyst and the
// journal coach so both streams look identical.
export default function RichText({ text }) {
  if (!text) return null;
  return (
    <div style={{ fontFamily: mono, fontSize: 12.5, lineHeight: 1.65, color: C.text, whiteSpace: "pre-wrap" }}>
      {text.split("\n").map((line, i) => {
        const isHeader = /^[A-Z][A-Z '/&]+$/.test(line.trim()) && line.trim().length > 3;
        const parts = line.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
        return (
          <div
            key={i}
            style={{
              color: isHeader ? C.amber : undefined,
              letterSpacing: isHeader ? "0.1em" : undefined,
              fontSize: isHeader ? 11 : undefined,
              marginTop: isHeader ? 10 : line.trim().startsWith("•") ? 2 : 0,
            }}
          >
            {parts.map((p, j) =>
              p.startsWith("**") && p.endsWith("**") ? (
                <strong key={j} style={{ color: C.text }}>
                  {p.slice(2, -2)}
                </strong>
              ) : (
                <span key={j}>{p}</span>
              )
            )}
          </div>
        );
      })}
    </div>
  );
}
