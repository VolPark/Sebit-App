'use client';

import { Html5Qrcode } from 'html5-qrcode';
import { useEffect, useRef, useState } from 'react';

type ScannerModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onScan: (decodedText: string) => void;
};

export default function ScannerModal({ isOpen, onClose, onScan }: ScannerModalProps) {
    const [error, setError] = useState<string | null>(null);
    // Use a ref to track the scanner instance to ensure we clean up the exact instance we created
    const scannerRef = useRef<Html5Qrcode | null>(null);

    useEffect(() => {
        if (!isOpen) return;

        let mounted = true;
        const readerId = "reader-element";

        // Cleanup function definition (will be returned)
        const cleanup = async () => {
            mounted = false;
            const scanner = scannerRef.current;
            if (scanner) {
                try {
                    if (scanner.isScanning) {
                        await scanner.stop();
                    }
                    // Only clear if we stopped successfully or weren't scanning
                    await scanner.clear();
                } catch (err) {
                    console.warn("Scanner cleanup warning:", err);
                } finally {
                    scannerRef.current = null;
                }
            }
        };

        const startScanner = async () => {
            // Wait for DOM
            await new Promise(r => setTimeout(r, 100));
            if (!mounted) return;

            // Ensure previous instance is gone (safety)
            if (scannerRef.current) {
                await cleanup();
            }

            if (!document.getElementById(readerId)) {
                console.warn("Scanner element not found");
                return;
            }

            try {
                const scanner = new Html5Qrcode(readerId);
                scannerRef.current = scanner;

                const config = {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                };

                // Try Environment first
                try {
                    await scanner.start(
                        { facingMode: "environment" },
                        config,
                        (decodedText) => {
                            if (mounted) {
                                onScan(decodedText);
                                onClose();
                            }
                        },
                        () => { } // ignore frame errors
                    );
                } catch (envError) {
                    console.warn("Environment camera failed, trying user facing...", envError);
                    if (mounted && scannerRef.current === scanner) {
                        await scanner.start(
                            { facingMode: "user" },
                            config,
                            (decodedText) => {
                                if (mounted) {
                                    onScan(decodedText);
                                    onClose();
                                }
                            },
                            () => { }
                        );
                    }
                }
            } catch (err) {
                console.error("Scanner init failed", err);
                if (mounted) setError("Chyba kamery. Zkontrolujte oprávnění.");
            }
        };

        startScanner();

        return () => {
            // Execute cleanup immediately on unmount
            // Note: cleanup is async, but useEffect cleanup function is sync.
            // We fire-and-forget the promise, but the logic inside handles 'mounted' check
            // so it won't affect state. Code above ensures 'stop' before 'clear'.
            cleanup().catch(e => console.error("Cleanup failed", e));
        };
    }, [isOpen]); // Re-run if open state changes (mount/unmount)

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full text-gray-500 dark:text-gray-400 transition-colors"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>

                <div className="p-6 pt-12 flex-1 flex flex-col">
                    <h3 className="text-lg font-bold text-center text-gray-900 dark:text-white mb-4">Naskenujte kód</h3>

                    <div className="relative bg-black rounded-xl overflow-hidden min-h-[300px] flex-1">
                        <div id="reader-element" className="w-full h-full"></div>
                    </div>

                    {error && (
                        <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-xl text-center text-sm font-medium">
                            {error}
                        </div>
                    )}

                    <p className="text-center text-xs text-gray-500 mt-4">
                        Povolte přístup ke kameře.
                    </p>
                </div>
            </div>
        </div>
    );
}
