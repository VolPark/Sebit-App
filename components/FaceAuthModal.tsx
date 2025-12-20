import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface FaceAuthModalProps {
    onCapture: (imageSrc: string) => void;
    onNameSelect: (name: string) => void;
}

export default function FaceAuthModal({ onCapture, onNameSelect }: FaceAuthModalProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [mode, setMode] = useState<'face' | 'name'>('face');
    const [users, setUsers] = useState<{ id: number; jmeno: string }[]>([]);
    const [selectedUser, setSelectedUser] = useState<string>('');

    // Load users for name fallback
    useEffect(() => {
        const fetchUsers = async () => {
            const { data } = await supabase
                .from('pracovnici')
                .select('id, jmeno')
                .order('jmeno');

            const hardcodedUsers = [
                { id: -1, jmeno: 'Klára' },
                { id: -2, jmeno: 'Zdeněk' }
            ];

            if (data) {
                setUsers([...hardcodedUsers, ...data]);
            } else {
                setUsers(hardcodedUsers);
            }
        };
        fetchUsers();
    }, []);

    const startCamera = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Wait a bit to ensure previous streams are fully stopped
            await new Promise(resolve => setTimeout(resolve, 100));

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
            // Auto switch to name mode on camera error if it's a permission denied or device not found
            setMode('name');
            setError("Nepodařilo se spustit kameru. Prosím povolte přístup ke kameře nebo využijte přihlášení jménem.");
            setLoading(false);
        }
    }, []);

    // Handle mode switching
    useEffect(() => {
        if (mode === 'face') {
            startCamera();
        } else {
            // Stop stream when switching to name mode
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
                setStream(null);
            }
        }
        return () => {
            // Cleanup handled by the dependency change or unmount
            if (stream && mode === 'name') { // Only stop here if we are switching AWAY from face mode context effectively
                // Actually relying on the else block above is safer for mode switch.
                // This cleanup is mainly for component unmount
            }
        };
    }, [mode, startCamera]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        }
    }, [stream]);

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

    const handleNameSubmit = () => {
        if (selectedUser) {
            onNameSelect(selectedUser);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-slate-800">

                {/* Mode Switcher Tabs */}
                <div className="flex border-b border-slate-200 dark:border-slate-800">
                    <button
                        onClick={() => setMode('face')}
                        className={`flex-1 py-4 text-sm font-medium transition-colors ${mode === 'face' ? 'text-[#E30613] border-b-2 border-[#E30613]' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                    >
                        Ověření kamerou
                    </button>
                    <button
                        onClick={() => setMode('name')}
                        className={`flex-1 py-4 text-sm font-medium transition-colors ${mode === 'name' ? 'text-[#E30613] border-b-2 border-[#E30613]' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                    >
                        Ověření jménem
                    </button>
                </div>

                <div className="p-6 text-center">
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                            {mode === 'face' ? 'Ověření totožnosti' : 'Kdo zrovna pracuje?'}
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
                            {mode === 'face'
                                ? 'Pro vstup do aplikace je vyžadováno vyfocení obličeje.'
                                : 'Vyberte své jméno ze seznamu pro vstup do aplikace.'}
                        </p>
                    </div>

                    {mode === 'face' ? (
                        <>
                            <div className="relative mx-auto w-64 h-64 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border-4 border-[#E30613] shadow-inner mb-8">
                                {loading && (
                                    <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                                        <svg className="animate-spin h-8 w-8 text-[#E30613]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    </div>
                                )}

                                {!loading && error ? (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-slate-100 dark:bg-slate-800">
                                        <p className="text-red-500 text-sm font-medium mb-2">{error}</p>
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

                            <div className="flex flex-col gap-3">
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
                                    <button
                                        onClick={() => setMode('name')}
                                        className="text-sm text-slate-500 underline hover:text-[#E30613]"
                                    >
                                        Přepnout na výběr jména
                                    </button>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col gap-4">
                            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                                <select
                                    value={selectedUser}
                                    onChange={(e) => setSelectedUser(e.target.value)}
                                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-base rounded-lg focus:ring-[#E30613] focus:border-[#E30613] block w-full p-4"
                                >
                                    <option value="">-- Vyberte své jméno --</option>
                                    {users.map(user => (
                                        <option key={user.id} value={user.jmeno}>
                                            {user.jmeno}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <button
                                onClick={handleNameSubmit}
                                disabled={!selectedUser}
                                className="w-full bg-[#E30613] hover:bg-[#C00000] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl active:scale-95 flex items-center justify-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                                </svg>
                                Potvrdit a vstoupit
                            </button>
                        </div>
                    )}
                </div>
            </div>
            <canvas ref={canvasRef} className="hidden" />
        </div>
    );
}
