'use client';

import { useAuth } from '@/context/AuthContext';

export default function SignOutOverlay() {
    const { isSigningOut } = useAuth();

    if (!isSigningOut) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-gray-900/95 backdrop-blur-sm flex flex-col items-center justify-center transition-opacity duration-300">
            <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                    {/* Ring Spinner */}
                    <div className="w-12 h-12 rounded-full border-4 border-[#E30613]/30 border-t-[#E30613] animate-spin"></div>
                </div>
                <h2 className="text-xl font-medium text-white tracking-wide">
                    Odhlašuji se...
                </h2>
                <p className="text-sm text-gray-500">
                    Prosím čekejte
                </p>
            </div>
        </div>
    );
}
