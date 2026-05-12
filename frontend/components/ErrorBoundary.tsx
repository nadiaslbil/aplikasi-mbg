'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/dashboard';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-zinc-200 p-8 text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="text-red-600" size={32} />
            </div>
            
            <h1 className="text-2xl font-bold text-zinc-900 mb-2">Terjadi Kesalahan</h1>
            <p className="text-zinc-500 mb-8">
              Mohon maaf, aplikasi mengalami kendala teknis yang tidak terduga. Silakan coba muat ulang halaman.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-8 text-left bg-zinc-50 p-4 rounded-lg border border-zinc-200 overflow-auto max-h-40">
                <p className="text-xs font-mono text-red-600 break-words">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full btn-primary py-3 flex items-center justify-center gap-2"
              >
                <RefreshCw size={18} />
                Muat Ulang Halaman
              </button>
              
              <button
                onClick={this.handleReset}
                className="w-full btn-secondary py-3 flex items-center justify-center gap-2"
              >
                <Home size={18} />
                Kembali ke Dashboard
              </button>
            </div>
            
            <p className="mt-8 text-xs text-zinc-400">
              ID Error: {Math.random().toString(36).substring(7).toUpperCase()}
            </p>
          </div>
        </div>
      );
    }

    return this.children;
  }
}

export default ErrorBoundary;
