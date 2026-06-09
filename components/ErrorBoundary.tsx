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
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center text-foreground">
          <div className="text-[4rem] mb-4 opacity-40">
            ⚠
          </div>
          <h2 className="font-semibold mb-2">
            出了点问题
          </h2>
          <p className="text-muted-foreground mb-6 max-w-[400px] leading-relaxed">
            {this.state.error?.message || "发生了一个未知错误"}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="px-6 py-2.5 bg-primary text-primary-foreground border-none rounded-lg cursor-pointer font-medium font-inherit text-[0.95rem]"
          >
            刷新页面
          </button>
          <details className="mt-8 text-muted-foreground text-sm max-w-[500px] text-left">
            <summary className="cursor-pointer">错误详情</summary>
            <pre className="mt-2 p-3 bg-primary/5 rounded-md overflow-auto text-xs leading-relaxed">
              {this.state.error?.stack || this.state.error?.message || "无详情"}
            </pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}
