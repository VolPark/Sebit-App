'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface FaceAuthModalProps {
    onCapture: (imageSrc: string) => void;
}

export default function FaceAuthModal({ onCapture }: FaceAuthModalProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const startCamera = useCallback(async () => {
        try {
            setLoading(true);
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
            setLoading(false);
        } catch (err) {
            console.error("Camera access error:", err);
            setError("Nepodařilo se spustit kameru. Prosím povolte přístup ke kameře.");
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        startCamera();
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [startCamera]); // stream added to dep array logic handled in return cleanup

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');

            if (context) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                context.drawImage(video, 0, 0, canvas.width, canvas.height);

                const imageSrc = canvas.toDataURL('image/jpeg', 0.8);

                // Stop stream
                if (stream) {
                    stream.getTracks().forEach(track => track.stop());
                }

                onCapture(imageSrc);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-slate-800">
                <div className="p-6 text-center">
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Ověření totožnosti</h2>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
                            Pro vstup do aplikace je vyžadováno vyfocení obličeje.
                        </p>
                    </div>

                    <div className="relative mx-auto w-64 h-64 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border-4 border-[#E30613] shadow-inner mb-8">
                        {loading && (
                            <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                                <svg className="animate-spin h-8 w-8 text-[#E30613]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            </div>
                        )}

                        {error ? (
                            <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
                                <p className="text-red-500 text-sm font-medium">{error}</p>
                            </div>
                        ) : (
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]" // Mirror effect
                            />
                        )}

                        {/* Guide overlay */}
                        <div className="absolute inset-0 border-[30px] border-slate-950/30 rounded-full pointer-events-none"></div>
                    </div>

                    <button
                        onClick={handleCapture}
                        disabled={loading || !!error}
                        className="w-full bg-[#E30613] hover:bg-[#C00000] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl active:scale-95 flex items-center justify-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                            <path d="M12 9a3.75 3.75 0 100 7.5A3.75 3.75 0 0012 9z" />
                            <path fillRule="evenodd" d="M9.344 3.071a49.52 49.52 0 015.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.24.383.645.643 1.11.71.386.054.77.113 1.152.177 1.432.239 2.429 1.493 2.429 2.909V18a3 3 0 01-3 3h-15a3 3 0 01-3-3V9.574c0-1.416.997-2.67 2.429-2.909.382-.064.766-.123 1.151-.178a1.56 1.56 0 001.11-.71l.822-1.315a2.942 2.942 0 012.332-1.39zM6.75 12.75a5.25 5.25 0 1110.5 0 5.25 5.25 0 01-10.5 0zm12-1.5a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                        </svg>
                        Vyfotit a vstoupit
                    </button>

                    {error && (
                        <button onClick={() => startCamera()} className="mt-4 text-sm text-gray-500 underline hover:text-[#E30613]">
                            Zkusit znovu
                        </button>
                    )}
                </div>
            </div>
            <canvas ref={canvasRef} className="hidden" />
        </div>
    );
}
