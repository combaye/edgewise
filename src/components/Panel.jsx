import { C, mono } from "../lib/theme";
import { hasApiKey } from "../lib/api";

export const Panel = ({ title, right, children, style }) => (
  <div
    style={{
      background: C.panel,
      border: `1px solid ${C.border}`,
      borderRadius: 8,
      display: "flex",
      flexDirection: "column",
      minWidth: 0,
      ...style,
    }}
  >
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "9px 14px",
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      <span style={{ fontFamily: mono, fontSize: 11, letterSpacing: "0.14em", color: C.amber, textTransform: "uppercase" }}>
        {title}
      </span>
      {right}
    </div>
    <div style={{ padding: 14, flex: 1, minHeight: 0 }}>{children}</div>
  </div>
);

export const Pip = ({ on }) => (
  <span
    style={{
      width: 9,
      height: 9,
      borderRadius: 2,
      display: "inline-block",
      marginRight: 4,
      background: on ? C.amber : C.grid,
      boxShadow: on ? `0 0 6px ${C.amber}66` : "none",
    }}
  />
);

export const Loading = ({ label = "fetching data…" }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: mono, fontSize: 11, color: C.muted, padding: "18px 4px" }}>
    <span className="live-pulse" style={{ width: 8, height: 8, borderRadius: "50%", background: C.amber }} />
    {label}
  </div>
);

export const ErrorState = ({ error, onRetry }) => (
  <div style={{ fontFamily: mono, fontSize: 11.5, padding: "14px 4px", display: "flex", flexDirection: "column", gap: 10 }}>
    <span style={{ color: C.bear }}>⚠ {String(error?.message || error || "request failed")}</span>
    {onRetry && (
      <button
        onClick={onRetry}
        style={{
          alignSelf: "flex-start",
          fontFamily: mono,
          fontSize: 11,
          letterSpacing: "0.1em",
          padding: "5px 14px",
          borderRadius: 6,
          cursor: "pointer",
          background: "transparent",
          border: `1px solid ${C.amber}`,
          color: C.amber,
        }}
      >
        RETRY
      </button>
    )}
  </div>
);

export const EmptyState = ({ msg }) => (
  <div style={{ fontFamily: mono, fontSize: 11.5, color: C.muted, padding: "14px 4px", lineHeight: 1.6 }}>{msg}</div>
);

// Standard loading / error / no-key gate around a React Query result.
export function QueryGate({ query, loadingLabel, children }) {
  if (!hasApiKey) return <EmptyState msg="API key required — see the setup banner above." />;
  if (query.isPending) return <Loading label={loadingLabel} />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  return children;
}
