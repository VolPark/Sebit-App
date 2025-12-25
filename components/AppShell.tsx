'use client';

import { useAuth } from "@/context/AuthContext";
import AppSidebar from "@/components/AppSidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuth();

    // Logic must match AppSidebar visibility:
    // Show if user exists OR if loading (skeleton state)
    const showSidebar = !!user || isLoading;

    return (
        <div className="flex w-full min-h-screen">
            <AppSidebar />

            <main className={`flex-1 w-full transition-all duration-300 ${showSidebar ? 'lg:pl-[260px] pt-16 lg:pt-0' : ''}`}>
                <div className={showSidebar ? "max-w-7xl mx-auto p-4 sm:p-6 lg:p-8" : "w-full h-full"}>
                    {children}
                </div>
            </main>
        </div>
    );
}
