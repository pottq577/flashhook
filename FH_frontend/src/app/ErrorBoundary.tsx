import { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '@/shared/lib/logger';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('Uncaught React Rendering Error', { error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: '2rem', textAlign: 'center', color: 'var(--text-primary)' }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>화면을 표시하는 중 문제가 발생했어요</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            {this.state.error?.message || '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'}
          </p>
          <button 
            onClick={() => window.location.reload()}
            style={{ padding: '0.75rem 1.5rem', background: 'var(--primary-color)', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
          >
            새로고침
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
