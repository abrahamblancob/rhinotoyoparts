import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

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

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 300,
          padding: 32,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>:(</div>
          <h2 style={{ marginBottom: 8, fontSize: 18, fontWeight: 600 }}>
            Algo salio mal
          </h2>
          <p style={{ color: '#8A8886', fontSize: 14, marginBottom: 20, maxWidth: 400 }}>
            Ocurrio un error inesperado. Intenta recargar la pagina.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 24px',
              backgroundColor: '#D3010A',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            Recargar pagina
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
