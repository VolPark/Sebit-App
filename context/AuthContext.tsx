'use client';

import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

type AppRole = 'owner' | 'admin' | 'office' | 'reporter';

interface AuthContextType {
    user: User | null;
    role: AppRole | null;
    isLoading: boolean;
    isSigningOut: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    role: null,
    isLoading: true,
    isSigningOut: false,
    signOut: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<AppRole | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSigningOut, setIsSigningOut] = useState(false);
    const router = useRouter();

    // Optimize: Create client once
    const supabase = useMemo(() => createClient(), []);

    useEffect(() => {
        let mounted = true;

        const fetchRole = async (userId: string) => {
            try {
                // Timeout after 1 second to prevent hanging
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Fetch role timeout')), 1000)
                );

                const fetchPromise = supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', userId)
                    .single();

                const { data: profile } = await Promise.race([fetchPromise, timeoutPromise]) as any;

                if (mounted && profile) {
                    setRole(profile.role as AppRole);
                } else if (mounted) {
                    console.warn('Profile not found, defaulting to reporter');
                    setRole('reporter');
                }
            } catch (err) {
                console.error('Error fetching role:', err);
                // Fail-safe: stop loading even if role fetch fails
                // MAJOR FIX: Only fallback to 'reporter' if we don't have a role yet.
                // If we already have a role (e.g. from previous session), don't overwrite it with 'reporter' just because a background refresh failed.
                if (mounted) {
                    setRole(prev => prev || 'reporter');
                }
            }
        };

        const checkUser = async () => {
            try {
                // Session check timeout
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Session check timeout')), 2000)
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
                setIsSigningOut(true);
                // Do NOT clear user/role immediately to avoid UI flash.
                // Leave state "stale" until hard redirect kicks in.

                // Use hard redirect here too if event fires unexpectedly
                window.location.href = '/login?logout=true';
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
        <AuthContext.Provider value={{ user, role, isLoading, isSigningOut, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
