'use strict';
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { SpeedInsights } from "@vercel/speed-insights/next";

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const supabase = createClient();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<'signin' | 'signup' | 'magiclink'>('signin');
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Check for errors in URL
    useEffect(() => {
        const errorMsg = searchParams.get('error_description') || searchParams.get('error');
        if (errorMsg) {
            // Decode URI component just in case, though browser usually handles it
            setError(decodeURIComponent(errorMsg));
        }
    }, [searchParams]);

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

            // Fetch role to determine redirect
            const { data: { user } } = await supabase.auth.getUser();
            let targetPath = '/vykazy'; // Default fallback

            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();

                if (profile?.role === 'owner' || profile?.role === 'admin') {
                    targetPath = '/dashboard';
                }
            }

            router.push(targetPath);
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

    // OAuth Handler
    const handleOAuthSignIn = async (provider: 'google' | 'azure') => {
        setIsLoading(true);
        setError(null);
        setSuccessMsg(null);

        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                    scopes: 'openid profile email',
                },
            });

            if (error) throw error;
        } catch (err: any) {
            setError(err.message || `Chyba při přihlášení přes ${provider}`);
            setIsLoading(false);
        }
    };

    // Magic Link Handler
    const handleMagicLink = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccessMsg(null);

        try {
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    shouldCreateUser: false,
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                },
            });

            if (error) throw error;

            setSuccessMsg("Pokud máte účet, poslali jsme vám odkaz na přihlášení na email.");
        } catch (err: any) {
            console.error('Magic link error:', err);
            // Security: Don't reveal if user exists or not definitely, but here we can just show generic
            // However, Supabase with shouldCreateUser: false might throw specific error if we want to catch.
            if (err.message && err.message.includes('Signups not allowed for otp')) {
                setError('Ups, tento email v databázi nemáme. Noví uživatelé se musí napřed registrovat.');
            } else {
                setError(err.message || 'Chyba při odesílání odkazu');
            }
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <div className="min-h-screen bg-[#111827] flex items-center justify-center p-4">
            <div className="bg-[#1A1C23] border border-[#2C2E36] w-full max-w-md rounded-2xl p-8 shadow-2xl">
                <div className="text-center mb-8">
                    <img src={process.env.NEXT_PUBLIC_LOGO_URL || "/logo_full_dark.png"} alt="Logo" className="h-10 mx-auto mb-4" />
                    {/* Assuming dark mode default for login page to look 'premium' */}
                    <h1 className="text-2xl font-bold text-white mb-2">
                        {mode === 'signin' ? 'Vítejte zpět' : (mode === 'signup' ? 'Vytvořit účet' : 'Přihlášení bez hesla')}
                    </h1>
                    <p className="text-gray-400 text-sm">
                        {mode === 'signin' ? 'Přihlaste se pro přístup do aplikace' : (mode === 'signup' ? 'Zaregistrujte se pro přístup' : 'Zašleme vám přihlašovací odkaz na email')}
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

                <form onSubmit={(e) => {
                    e.preventDefault();
                    if (mode === 'signin') handleSignIn(e);
                    else if (mode === 'signup') handleSignUp();
                    else if (mode === 'magiclink') handleMagicLink(e);
                }} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1.5 ml-1">Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 bg-[#111827] border border-[#2C2E36] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all"
                            placeholder="vladimir@horyna.cz"
                        />
                    </div>

                    {mode !== 'magiclink' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1.5 ml-1">Heslo</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-[#111827] border border-[#2C2E36] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all"
                                placeholder="••••••••"
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3.5 bg-brand-primary hover:brightness-110 text-white font-semibold rounded-xl transition-all shadow-lg shadow-brand-primary/20 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
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
                            mode === 'signin' ? 'Přihlásit se' : (mode === 'signup' ? 'Registrovat s emailem' : 'Odeslat magický odkaz')
                        )}
                    </button>


                    {mode === 'magiclink' && (
                        <button
                            type="button"
                            onClick={() => { setMode('signin'); setError(null); setSuccessMsg(null); }}
                            className="w-full text-center text-sm text-gray-500 hover:text-white transition-colors mt-2"
                        >
                            Zpět na přihlášení heslem
                        </button>
                    )}
                </form>

                <div className="my-6 flex items-center gap-4">
                    <div className="h-px bg-[#2C2E36] flex-1" />
                    <span className="text-gray-500 text-sm">nebo</span>
                    <div className="h-px bg-[#2C2E36] flex-1" />
                </div>

                <div className="space-y-3">
                    <button
                        onClick={() => { setMode('magiclink'); setError(null); setSuccessMsg(null); }}
                        disabled={isLoading}
                        className="w-full py-3 bg-[#111827] border border-[#2C2E36] hover:bg-[#2C2E36] text-white font-medium rounded-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                            <rect width="20" height="16" x="2" y="4" rx="2" />
                            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                        </svg>
                        Přihlásit se bez hesla
                    </button>

                    <button
                        onClick={() => handleOAuthSignIn('google')}
                        disabled={isLoading}
                        className="w-full py-3 bg-[#111827] border border-[#2C2E36] hover:bg-[#2C2E36] text-white font-medium rounded-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                fill="#4285F4"
                            />
                            <path
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                fill="#34A853"
                            />
                            <path
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z"
                                fill="#FBBC05"
                            />
                            <path
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                fill="#EA4335"
                            />
                        </svg>
                        Pokračovat přes Google
                    </button>

                    <button
                        onClick={() => handleOAuthSignIn('azure')}
                        disabled={isLoading}
                        className="w-full py-3 bg-[#111827] border border-[#2C2E36] hover:bg-[#2C2E36] text-white font-medium rounded-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#F25022" d="M1 1h10v10H1z" />
                            <path fill="#7FBA00" d="M13 1h10v10H1z" />
                            <path fill="#00A4EF" d="M1 13h10v10H1z" />
                            <path fill="#FFB900" d="M13 13h10v10H13z" />
                        </svg>
                        Pokračovat přes Microsoft
                    </button>
                </div>

                <div className="mt-8 pt-6 border-t border-[#2C2E36] text-center">
                    <p className="text-gray-500 text-sm">
                        {mode === 'signin' ? 'Nemáte ještě účet?' : (mode === 'signup' ? 'Máte již účet?' : 'Máte již účet?')}
                        <button
                            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                            className="ml-2 text-white hover:text-brand-primary font-medium transition-colors"
                        >
                            {mode === 'signin' ? 'Vytvořit účet' : 'Přihlásit se'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#111827] flex items-center justify-center text-white">Načítání...</div>}>
            <LoginForm />
        </Suspense>
    );
}
