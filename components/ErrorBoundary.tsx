'use client';

import React, { Component, ReactNode } from 'react';
import { createLogger } from '@/lib/logger';

const log = createLogger({ module: 'ErrorBoundary' });

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

/**
 * Error Boundary component that catches JavaScript errors in child components
 * and displays a fallback UI instead of crashing the entire application.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        log.error('Uncaught error in component tree:', error, errorInfo.componentStack);
    }

    handleRetry = (): void => {
        this.setState({ hasError: false, error: null });
    };

    render(): ReactNode {
        if (this.state.hasError) {
            // Custom fallback provided
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default fallback UI
            return (
                <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center">
                    <div className="mb-4 rounded-full bg-red-100 p-4 dark:bg-red-900/20">
                        <svg
                            className="h-8 w-8 text-red-600 dark:text-red-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                        </svg>
                    </div>
                    <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
                        Něco se pokazilo
                    </h2>
                    <p className="mb-6 max-w-md text-gray-600 dark:text-gray-400">
                        Při zobrazení této stránky došlo k chybě.
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <span className="mt-2 block text-sm text-red-500">
                                {this.state.error.message}
                            </span>
                        )}
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={this.handleRetry}
                            className="rounded-lg bg-brand-primary px-4 py-2 text-white transition-colors hover:opacity-90"
                            style={{ backgroundColor: 'var(--brand-primary, #3b82f6)' }}
                        >
                            Zkusit znovu
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                            Obnovit stránku
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
