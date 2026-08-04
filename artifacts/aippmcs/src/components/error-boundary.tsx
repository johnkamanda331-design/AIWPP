import React from 'react';
import { ErrorState } from './error-state';

interface Props {
  children: React.ReactNode;
  /** Custom fallback UI — defaults to <ErrorState> if omitted. */
  fallback?: React.ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * React class-based error boundary.
 * Wrap pages or sections that might throw so a single crash
 * doesn't take down the entire dashboard.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <ErrorState
          title="Something went wrong"
          message={this.state.error.message}
          onRetry={this.handleReset}
        />
      );
    }
    return this.props.children;
  }
}
