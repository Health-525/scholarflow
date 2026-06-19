"use client";

import React from "react";

import { ErrorFallback } from "@/components/ui/ErrorFallback";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const isDev = process.env.NODE_ENV === "development";

      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center text-foreground">
          <ErrorFallback
            message={this.state.error?.message || "页面渲染出错"}
            onRetry={this.handleRetry}
          />
          <button
            onClick={() => window.location.reload()}
            className="mt-3 px-6 py-2.5 bg-secondary text-secondary-foreground rounded-lg font-medium text-sm"
          >
            刷新页面
          </button>
          {isDev && (
            <details className="mt-4 text-muted-foreground text-xs max-w-[500px] text-left">
              <summary className="cursor-pointer">错误详情</summary>
              <pre className="mt-2 p-3 bg-secondary/50 rounded-md overflow-auto text-[11px] leading-relaxed">
                {this.state.error?.stack || this.state.error?.message || "无详情"}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
