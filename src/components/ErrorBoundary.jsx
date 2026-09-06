import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: "100vh",
          background: "#09090B",
          color: "#FAFAFA",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 40,
          fontFamily: "'Inter', system-ui, sans-serif",
        }}>
          <div style={{
            maxWidth: 600,
            background: "#1C1C21",
            border: "1px solid #27272A",
            borderRadius: 16,
            padding: "40px 32px",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12, color: "#F87171" }}>
              Something went wrong
            </h1>
            <p style={{ fontSize: 14, color: "#A1A1AA", marginBottom: 24, lineHeight: 1.6 }}>
              The app encountered an error. Try refreshing the page.
            </p>
            <pre style={{
              fontSize: 12,
              color: "#FF6B2B",
              background: "#09090B",
              padding: 16,
              borderRadius: 8,
              overflow: "auto",
              textAlign: "left",
              marginBottom: 24,
              border: "1px solid #27272A",
            }}>
              {this.state.error.message}
            </pre>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: "#FF6B2B",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "12px 32px",
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
