"use client";

import { Component, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * 全局错误边界
 *
 * 捕获子组件树中未处理的 React 错误，防止整个应用白屏。
 * 使用 React 类组件实现（Error Boundary 必须用 class component）。
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "60vh",
            padding: "2rem",
            textAlign: "center",
            color: "var(--text-primary)",
            fontFamily: "var(--font-noto-sans-sc), sans-serif",
          }}
        >
          <div
            style={{
              fontSize: "4rem",
              marginBottom: "1rem",
              opacity: 0.4,
            }}
          >
            ⚠
          </div>
          <h2 style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
            出了点问题
          </h2>
          <p
            style={{
              color: "var(--text-secondary)",
              marginBottom: "1.5rem",
              maxWidth: "400px",
              lineHeight: 1.6,
            }}
          >
            {this.state.error?.message || "发生了一个未知错误"}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            style={{
              padding: "0.6rem 1.5rem",
              background: "var(--accent)",
              color: "#fff",
              border: "none",
              borderRadius: "var(--radius-md)",
              cursor: "pointer",
              fontWeight: 500,
              fontFamily: "inherit",
              fontSize: "0.95rem",
            }}
          >
            刷新页面
          </button>
          <details
            style={{
              marginTop: "2rem",
              color: "var(--text-tertiary)",
              fontSize: "0.85rem",
              maxWidth: "500px",
              textAlign: "left",
            }}
          >
            <summary style={{ cursor: "pointer" }}>错误详情</summary>
            <pre
              style={{
                marginTop: "0.5rem",
                padding: "0.75rem",
                background: "var(--accent-softer)",
                borderRadius: "var(--radius-sm)",
                overflow: "auto",
                fontSize: "0.8rem",
                lineHeight: 1.5,
              }}
            >
              {this.state.error?.stack || this.state.error?.message || "无详情"}
            </pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}
