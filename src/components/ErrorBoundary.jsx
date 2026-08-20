import { Component } from "react";
import { C, mono } from "../lib/theme";

// Per-panel boundary: a thrown render error is contained to its own panel and
// shown inline with a reset button, so one failing analytic never blanks the
// whole terminal. Satisfies the "don't crash the whole terminal" requirement.
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // surface in the console with the owning panel for fast diagnosis
    console.error(`[panel:${this.props.label || "?"}]`, error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            background: C.panel,
            border: `1px solid ${C.bear}`,
            borderRadius: 8,
            padding: 14,
            fontFamily: mono,
            fontSize: 11.5,
            color: C.bear,
            minWidth: 0,
          }}
        >
          <div style={{ letterSpacing: "0.12em", marginBottom: 6 }}>⚠ {this.props.label || "PANEL"} ERROR</div>
          <div style={{ color: C.muted, lineHeight: 1.6, wordBreak: "break-word" }}>
            {String(this.state.error?.message || this.state.error)}
          </div>
          <button
            onClick={() => this.setState({ error: null })}
            style={{
              marginTop: 10,
              fontFamily: mono,
              fontSize: 10,
              letterSpacing: "0.1em",
              padding: "4px 12px",
              borderRadius: 5,
              cursor: "pointer",
              background: "transparent",
              border: `1px solid ${C.amber}`,
              color: C.amber,
            }}
          >
            RESET PANEL
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
