'use strict';
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function LoginPage() {
    const router = useRouter();
    const supabase = createClient();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<'signin' | 'signup'>('signin');
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Sign In Handler
    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccessMsg(null);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                throw error;
            }

            router.push('/dashboard');
            router.refresh();
        } catch (err: any) {
            setError(err.message || 'Chyba při přihlášení');
        } finally {
            setIsLoading(false);
        }
    };

    // Sign Up Handler
    const handleSignUp = async () => {
        setIsLoading(true);
        setError(null);
        setSuccessMsg(null);

        try {
            // We assume we want to auto-confirm or just wait for email?
            // Basic signup
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    // If we want to capture name, we'd need another input
                    // data: { full_name: '...' }
                }
            });

            if (error) throw error;

            setSuccessMsg("Registrace úspěšná! Zkontrolujte svůj email pro potvrzení (pokud je vyžadováno), nebo se zkuste přihlásit.");
            setMode('signin');
        } catch (err: any) {
            setError(err.message || 'Chyba při registraci');
        } finally {
            setIsLoading(false);
        }
    }


    return (
        <div className="min-h-screen bg-[#111827] flex items-center justify-center p-4">
            <div className="bg-[#1A1C23] border border-[#2C2E36] w-full max-w-md rounded-2xl p-8 shadow-2xl">
                <div className="text-center mb-8">
                    <img src="/logo_full_dark.png" alt="Logo" className="h-10 mx-auto mb-4" />
                    {/* Assuming dark mode default for login page to look 'premium' */}
                    <h1 className="text-2xl font-bold text-white mb-2">
                        {mode === 'signin' ? 'Vítejte zpět' : 'Vytvořit účet'}
                    </h1>
                    <p className="text-gray-400 text-sm">
                        {mode === 'signin' ? 'Přihlaste se pro přístup do aplikace' : 'Zaregistrujte se pro přístup'}
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm text-center">
                        {error}
                    </div>
                )}

                {successMsg && (
                    <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-500 text-sm text-center">
                        {successMsg}
                    </div>
                )}

                <form onSubmit={mode === 'signin' ? handleSignIn : (e) => { e.preventDefault(); handleSignUp(); }} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1.5 ml-1">Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 bg-[#111827] border border-[#2C2E36] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-[#E30613] focus:ring-1 focus:ring-[#E30613] transition-all"
                            placeholder="vladimir@horyna.cz"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1.5 ml-1">Heslo</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-[#111827] border border-[#2C2E36] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-[#E30613] focus:ring-1 focus:ring-[#E30613] transition-all"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3.5 bg-[#E30613] hover:bg-[#c40510] text-white font-semibold rounded-xl transition-all shadow-lg shadow-red-600/20 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                    >
                        {isLoading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Zpracovávám...
                            </span>
                        ) : (
                            mode === 'signin' ? 'Přihlásit se' : 'Registrovat s emailem'
                        )}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-[#2C2E36] text-center">
                    <p className="text-gray-500 text-sm">
                        {mode === 'signin' ? 'Nemáte ještě účet?' : 'Máte již účet?'}
                        <button
                            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                            className="ml-2 text-white hover:text-[#E30613] font-medium transition-colors"
                        >
                            {mode === 'signin' ? 'Vytvořit účet' : 'Přihlásit se'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
