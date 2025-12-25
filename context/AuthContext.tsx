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
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    role: null,
    isLoading: true,
    signOut: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<AppRole | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    // Optimize: Create client once
    const supabase = useMemo(() => createClient(), []);

    useEffect(() => {
        let mounted = true;

        const fetchRole = async (userId: string) => {
            try {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', userId)
                    .single();

                if (mounted && profile) {
                    setRole(profile.role as AppRole);
                } else if (mounted) {
                    console.warn('Profile not found, defaulting to reporter');
                    setRole('reporter');
                }
            } catch (err) {
                console.error('Error fetching role:', err);
                if (mounted) setRole('reporter'); // Fallback
            }
        };

        const checkUser = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (mounted) {
                    if (session?.user) {
                        setUser(session.user);
                        await fetchRole(session.user.id);
                    }
                    // Always finish loading after explicit check
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
                setUser(null);
                setRole(null);
                setIsLoading(false);
                router.push('/login');
                router.refresh();
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
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ user, role, isLoading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
