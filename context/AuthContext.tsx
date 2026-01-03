'use client';

import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

type AppRole = 'owner' | 'admin' | 'office' | 'reporter';

interface AuthContextType {
    user: User | null;
    role: AppRole | null;
    userName: string | null;
    isLoading: boolean;
    isSigningOut: boolean;
    signOut: () => Promise<void>;
    supabase: any; // Using 'any' briefly to avoid circular type dependency or complex import, ideally TypedSupabaseClient
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    role: null,
    userName: null,
    isLoading: true,
    isSigningOut: false,
    signOut: async () => { },
    supabase: {} as any,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<AppRole | null>(null);
    const [userName, setUserName] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSigningOut, setIsSigningOut] = useState(false);
    const router = useRouter();

    // Optimize: Create client once
    const supabase = useMemo(() => createClient(), []);

    useEffect(() => {
        let mounted = true;

        const fetchRole = async (userId: string) => {
            try {
                // Timeout after 3 seconds to prevent hanging (profiles table might be missing or blocked by RLS)
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Fetch role timeout')), 3000)
                );

                const fetchPromise = supabase
                    .from('profiles')
                    .select('role, full_name')
                    .eq('id', userId)
                    .single();

                const { data: profile } = await Promise.race([fetchPromise, timeoutPromise]) as any;

                if (mounted && profile) {
                    setRole(profile.role as AppRole);
                    setUserName(profile.full_name);
                } else if (mounted) {
                    console.warn('Profile not found, defaulting to reporter');
                    setRole('reporter');
                }
            } catch (err: any) {
                if (err.message === 'Fetch role timeout') {
                    console.warn('Role fetch timed out, defaulting to reporter');
                } else {
                    console.error('Error fetching role:', err);
                }

                // Fail-safe: stop loading even if role fetch fails
                if (mounted) {
                    setRole(prev => prev || 'reporter');
                }
            }
        };

        const checkUser = async () => {
            try {
                // Session check timeout
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Session check timeout')), 8000)
                );

                const { data: { session } } = await Promise.race([supabase.auth.getSession(), timeoutPromise]) as any;

                if (mounted) {
                    if (session?.user) {
                        setUser(session.user);
                        await fetchRole(session.user.id);
                    }
                    setIsLoading(false);
                }
            } catch (error) {
                console.error('Error getting session:', error);
                if (mounted) setIsLoading(false);
            }
        };

        checkUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted) return;

            console.log('Auth Event:', event);

            if (event === 'SIGNED_OUT') {
                // Prevent infinite loop and overlay on login page
                const isLoginPage = window.location.pathname === '/login';
                const isPasswordSetupPage = window.location.pathname.startsWith('/auth/update-password');
                const isLogoutParam = window.location.search.includes('logout=true');
                const isErrorParam = window.location.search.includes('error=');

                if (!isLoginPage && !isPasswordSetupPage || (isLoginPage && !isLogoutParam && !isErrorParam)) {
                    console.log('Force logout redirect triggered. Path:', window.location.pathname, 'Params:', window.location.search);
                    setIsSigningOut(true);
                    // Force hard redirect to clear all client state if not already doing so
                    window.location.href = '/login?logout=true';
                }
            } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                if (session?.user) {
                    setUser(session.user);
                    await fetchRole(session.user.id);
                }
                if (mounted) setIsLoading(false);
            } else if (event === 'INITIAL_SESSION') {
                if (session?.user) {
                    setUser(session.user);
                    await fetchRole(session.user.id);
                }
                if (mounted) setIsLoading(false);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [router, supabase]);

    const signOut = async () => {
        setIsSigningOut(true);
        // Optimistic sign out - but KEEP state to prevent UI flash
        // The overlay will cover the screen, then hard redirect happens.

        // Force hard redirect to clear all client state
        window.location.href = '/login?logout=true';

        try {
            await supabase.auth.signOut();
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, role, userName, isLoading, isSigningOut, signOut, supabase }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
