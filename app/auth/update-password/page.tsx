'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'

export default function UpdatePasswordPage() {
    const { user: ctxUser, isLoading: authLoading, supabase } = useAuth()
    const [forceUser, setForceUser] = useState<any>(null)
    const user = ctxUser || forceUser; // Prefer context, fallback to forced

    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [oauthLoading, setOauthLoading] = useState(false)

    useEffect(() => {
        if (typeof window !== 'undefined') {
            // Check for error in hash (e.g. link expired)
            if (window.location.hash.includes('error=access_denied') || window.location.hash.includes('error_code=otp_expired')) {
                console.error('UpdatePasswordPage: Invite link expired or invalid');
                setError('Tento invitační odkaz již vypršel nebo je neplatný. Požádejte administrátora o nové pozvání.');
                return;
            }

            // Fallback: Check for hash presence immediately
            if (!user && window.location.hash.includes('access_token')) {
                // ... (rest of the logic)
                console.log('UpdatePasswordPage: Hash detected, executing IMMEDIATE manual recovery');

                try {
                    const hashParams = new URLSearchParams(window.location.hash.substring(1)); // remove #
                    const accessToken = hashParams.get('access_token');
                    const refreshToken = hashParams.get('refresh_token');

                    if (accessToken && refreshToken) {
                        console.log('UpdatePasswordPage: Tokens parsed from hash, forcing setSession');

                        supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken
                        }).then(({ data, error }) => {
                            if (error) {
                                console.error('UpdatePasswordPage: Manual setSession failed', error);
                            }
                            if (data.session) {
                                console.log('UpdatePasswordPage: Manual setSession success', data.session.user.email);
                                setForceUser(data.session.user);
                            }
                        });
                    } else {
                        console.warn('UpdatePasswordPage: Hash present but tokens missing');
                    }
                } catch (e) {
                    console.error('UpdatePasswordPage: Error resolving hash', e);
                }
            }
        }, [supabase]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        console.log('UpdatePasswordPage: Submit clicked');
        // alert('Kliknuto na uložit');

        setError(null)

        if (password !== confirmPassword) {
            setError('Hesla se neshodují')
            return
        }

        if (password.length < 6) {
            setError('Heslo musí mít alespoň 6 znaků')
            return
        }

        if (!user && !authLoading) {
            console.error('UpdatePasswordPage: User missing on submit!');
            setError('Chybí přihlášení. Obnovte stránku.');
            return;
        }

        setLoading(true)

        try {
            console.log('UpdatePasswordPage: Calling supabase.auth.updateUser');
            // Explicitly verify the user token before updating
            const { data: { session } } = await supabase.auth.getSession();
            console.log('UpdatePasswordPage: Current session for update:', session);

            const { error: updateError, data } = await supabase.auth.updateUser({
                password: password
            })
            console.log('UpdatePasswordPage: Result', updateError, data);

            if (updateError) {
                console.error('UpdatePasswordPage: Update failed', updateError);
                setError(updateError.message)
                alert('Chyba při ukládání: ' + updateError.message);
            } else {
                console.log('UpdatePasswordPage: Success');

                if (session) {
                    window.location.href = '/';
                } else {
                    window.location.href = '/login?success=Heslo+nastaveno';
                }
            }
        } catch (err: any) {
            console.error('UpdatePasswordPage: Exception', err);
            setError('Kritická chyba: ' + err.message)
            alert('Kritická chyba: ' + err.message);
        } finally {
            setLoading(false)
        }
    }

    const handleOAuthLink = async (provider: 'google' | 'azure') => {
        setOauthLoading(true)
        setError(null)

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
            setError(err.message || `Chyba při propojení s ${provider}`)
            setOauthLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900">
            <div className="w-full max-w-md space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                        Nastavte si nové heslo
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
                        Pro dokončení registrace si prosím zvolte heslo.
                    </p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="-space-y-px rounded-md shadow-sm">
                        <div>
                            <label htmlFor="password" className="sr-only">Nové heslo</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                className="relative block w-full rounded-t-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-[#E30613] sm:text-sm sm:leading-6 px-3"
                                placeholder="Nové heslo"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <div>
                            <label htmlFor="confirm-password" className="sr-only">Potvrzení hesla</label>
                            <input
                                id="confirm-password"
                                name="confirmDevice"
                                type="password"
                                required
                                className="relative block w-full rounded-b-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-[#E30613] sm:text-sm sm:leading-6 px-3"
                                placeholder="Potvrzení hesla"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="text-red-500 text-sm text-center">
                            {error}
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={loading || oauthLoading}
                            className="group relative flex w-full justify-center rounded-md bg-[#E30613] px-3 py-2 text-sm font-semibold text-white hover:bg-[#c90511] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E30613] disabled:opacity-50"
                        >
                            {loading ? 'Ukládám...' : 'Uložit heslo a přihlásit'}
                        </button>
                    </div>
                </form>

                <div className="flex items-center gap-4">
                    <div className="h-px bg-gray-300 dark:bg-gray-700 flex-1" />
                    <span className="text-gray-500 text-sm">nebo propojit účet</span>
                    <div className="h-px bg-gray-300 dark:bg-gray-700 flex-1" />
                </div>

                <div className="space-y-3">
                    <button
                        onClick={() => handleOAuthLink('google')}
                        disabled={loading || oauthLoading}
                        className="w-full py-2.5 bg-white dark:bg-[#1f2937] border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium rounded-md transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Google
                    </button>

                    <button
                        onClick={() => handleOAuthLink('azure')}
                        disabled={loading || oauthLoading}
                        className="w-full py-2.5 bg-white dark:bg-[#1f2937] border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium rounded-md transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#F25022" d="M1 1h10v10H1z" />
                            <path fill="#7FBA00" d="M13 1h10v10H13z" />
                            <path fill="#00A4EF" d="M1 13h10v10H1z" />
                            <path fill="#FFB900" d="M13 13h10v10H13z" />
                        </svg>
                        Microsoft
                    </button>
                </div>
            </div>
        </div>
    )
}
