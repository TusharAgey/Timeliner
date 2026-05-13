import { Component, type ErrorInfo, type ReactNode } from "react";

type ErrorBoundaryProps = {
  children: ReactNode;
  fallback?: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 rounded-2xl bg-white/[0.02] p-8 ring-1 ring-white/10">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-lg font-semibold text-white">
            Something went wrong
          </h2>
          <p className="max-w-md text-center text-sm text-slate-400">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/20"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
