'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { CompanyConfig } from '@/lib/companyConfig';

// Icons (HeroIcons style SVGs)
const Icons = {
    Dashboard: (props: any) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>,
    Chat: (props: any) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>,
    Offer: (props: any) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>,
    Action: (props: any) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.25 2.25 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" /></svg>,
    Report: (props: any) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>,
    Money: (props: any) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    Cost: (props: any) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 2.025v1.5c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M4.125 12h5.875" /></svg>,
    Users: (props: any) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>,
    UserGroup: (props: any) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>,
    Bars3: (props: any) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>,
    XMark: (props: any) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>,
    Timesheet: (props: any) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" /></svg>
}

type NavItem = {
    name: string;
    href: string;
    icon: any;
    exact?: boolean;
}

type NavGroup = {
    title: string;
    items: NavItem[];
}

const NAVIGATION: NavGroup[] = [
    {
        title: 'Přehled',
        items: [
            { name: 'Firma', href: '/dashboard?tab=firma', icon: Icons.Dashboard },
            { name: 'Zaměstnanci', href: '/dashboard?tab=workers', icon: Icons.UserGroup },
            { name: 'Klienti', href: '/dashboard?tab=clients', icon: Icons.Users },
            { name: 'Experimentální', href: '/dashboard?tab=experimental', icon: Icons.Action }, // Using Action icon as placeholder or maybe a Beaker if available, sticking to existing icons for now.
            { name: 'AI Asistent', href: '/dashboard?tab=ai', icon: Icons.Chat },
        ]
    },
    {
        title: 'Obchod',
        items: [
            { name: 'Nabídky', href: '/nabidky', icon: Icons.Offer },
            // Akce moved to Administrace
        ]
    },
    {
        title: 'Administrace',
        items: [
            { name: 'Uživatelé', href: '/administrace', icon: Icons.UserGroup },
            { name: 'Akce', href: '/akce', icon: Icons.Action },
            { name: 'Klienti', href: '/klienti', icon: Icons.Users },
            { name: 'Pracovníci', href: '/pracovnici', icon: Icons.UserGroup },
        ]
    },
    {
        title: 'Finance',
        items: [
            { name: 'Výkazy', href: '/vykazy', icon: Icons.Report },
            { name: 'Mzdy', href: '/mzdy', icon: Icons.Money },
            { name: 'Náklady', href: '/naklady', icon: Icons.Cost },
            { name: 'Timesheety', href: '/timesheets', icon: Icons.Timesheet },
        ]
    }
];

export default function AppSidebar() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { user, role, userName, signOut, isLoading } = useAuth();
    const [isOpen, setIsOpen] = useState(false);

    // Close sidebar on route change (mobile)
    const handleLinkClick = () => {
        setIsOpen(false);
    };

    // RBAC Filtering
    const filteredNavigation = NAVIGATION.map(group => {
        // Clone items to avoid mutating original
        let items = [...group.items];

        if (isLoading || !role) {
            // If loading or role not yet loaded, return empty to prevent flashing forbidden content
            return null;
        }

        if (role === 'office') {
            // Office sees everything EXCEPT 'Přehled' section
            if (group.title === 'Přehled') return null;
        }

        if (role === 'reporter') {
            // Reporter sees ONLY 'Výkazy'
            items = items.filter(item => item.name === 'Výkazy');
            if (items.length === 0) return null;
        }

        // Only owner and admin can see 'Uživatelé'
        if (role !== 'owner' && role !== 'admin') {
            items = items.filter(item => item.name !== 'Uživatelé');
        }

        if (items.length === 0) return null;

        if (group.title === 'Přehled' && !CompanyConfig.features.enableDashboard) return null;
        if (group.title === 'Obchod' && !CompanyConfig.features.enableOffers) return null;
        if (group.title === 'Administrace' && !CompanyConfig.features.enableAdmin) return null;
        if (group.title === 'Finance' && !CompanyConfig.features.enableFinance) return null;

        // Granular Item Filtering
        if (group.title === 'Přehled') {
            if (!CompanyConfig.features.enableDashboardFirma) items = items.filter(i => i.name !== 'Firma');
            if (!CompanyConfig.features.enableDashboardWorkers) items = items.filter(i => i.name !== 'Zaměstnanci');
            if (!CompanyConfig.features.enableDashboardClients) items = items.filter(i => i.name !== 'Klienti');
            if (!CompanyConfig.features.enableDashboardExperimental) items = items.filter(i => i.name !== 'Experimentální');
            if (!CompanyConfig.features.enableAI) items = items.filter(i => i.name !== 'AI Asistent');
        }

        if (group.title === 'Administrace') {
            if (!CompanyConfig.features.enableAdminUsers) items = items.filter(i => i.name !== 'Uživatelé');
            if (!CompanyConfig.features.enableAdminActions) items = items.filter(i => i.name !== 'Akce');
            if (!CompanyConfig.features.enableAdminClients) items = items.filter(i => i.name !== 'Klienti');
            if (!CompanyConfig.features.enableAdminWorkers) items = items.filter(i => i.name !== 'Pracovníci');
        }

        if (group.title === 'Finance') {
            if (!CompanyConfig.features.enableFinanceReports) items = items.filter(i => i.name !== 'Výkazy');
            if (!CompanyConfig.features.enableFinancePayroll) items = items.filter(i => i.name !== 'Mzdy');
            if (!CompanyConfig.features.enableFinanceCosts) items = items.filter(i => i.name !== 'Náklady');
            if (!CompanyConfig.features.enableFinanceTimesheets) items = items.filter(i => i.name !== 'Timesheety');
        }

        if (items.length === 0) return null;

        return {
            ...group,
            items
        };
    }).filter(Boolean) as NavGroup[];

    const SidebarContent = () => (
        <div className="flex flex-col h-full bg-[#111827] text-white overflow-y-auto w-[260px] border-r border-gray-800">
            {/* Header / Logo */}
            <div className="p-6">
                <Link href="/" onClick={handleLinkClick}>
                    <img
                        src={process.env.NEXT_PUBLIC_LOGO_URL || "/logo_full_dark.png"}
                        alt={process.env.NEXT_PUBLIC_COMPANY_NAME || "Interiéry Horyna"}
                        className="h-16 w-auto object-contain"
                    />
                </Link>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 px-4 space-y-8">
                {isLoading ? (
                    // Skeleton Loading
                    <div className="space-y-8 animate-pulse">
                        {[1, 2, 3].map((i) => (
                            <div key={i}>
                                <div className="h-4 w-20 bg-gray-700 rounded mb-4 mx-3"></div>
                                <div className="space-y-2">
                                    <div className="h-10 w-full bg-gray-800 rounded-xl"></div>
                                    <div className="h-10 w-full bg-gray-800 rounded-xl"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    filteredNavigation.map((group) => (
                        <div key={group.title}>
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-3">
                                {group.title}
                            </h3>
                            <ul className="space-y-1">
                                {group.items.map((item) => {
                                    // Check if active
                                    let isActive = false;
                                    if (item.href.startsWith('/dashboard')) {
                                        // Dashboard logic: check tab param
                                        const itemTab = item.href.split('=')[1];
                                        const currentTab = searchParams?.get('tab') || 'firma'; // default tab
                                        isActive = pathname === '/dashboard' && itemTab === currentTab;
                                    } else {
                                        // Standard link logic
                                        isActive = pathname.startsWith(item.href);
                                    }

                                    return (
                                        <li key={item.name}>
                                            <Link
                                                href={item.href}
                                                onClick={handleLinkClick}
                                                className={`
                                                group flex items-center px-3 py-2 text-sm font-medium rounded-xl transition-all duration-200
                                                ${isActive
                                                        ? 'bg-brand-primary text-brand-primary-foreground shadow-lg shadow-brand-primary/20'
                                                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                                    }
                                            `}
                                            >
                                                <item.icon
                                                    className={`
                                                    mr-3 h-5 w-5 flex-shrink-0 transition-colors
                                                    ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-white'}
                                                `}
                                                    aria-hidden="true"
                                                />
                                                {item.name}
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))
                )}
            </nav>

            {/* Footer / User Profile */}
            <div className="p-4 mt-auto border-t border-gray-800">
                <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl hover:bg-white/10 transition-colors group relative">
                    <div className="h-10 w-10 rounded-full bg-gray-700 ring-2 ring-transparent group-hover:ring-brand-primary transition-all overflow-hidden flex items-center justify-center">
                        <Icons.Users className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="overflow-hidden flex-1">
                        <p className="text-sm font-medium text-white truncate max-w-[100px]">
                            {userName || user?.email || 'Uživatel'}
                        </p>
                        <p className="text-xs text-gray-400 truncate capitalize">
                            {isLoading ? '...' : (role || 'načítání...')}
                        </p>
                    </div>

                    {/* Sign Out Button */}
                    <button
                        onClick={signOut}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-red-500/20 transition-all"
                        title="Odhlásit se"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );

    // If strictly NOT logged in and NOT loading (finished check), we can return null to hide.
    // BUT! Since we now have Skeleton, we should show the sidebar structure while loading even if user is null initially?
    // Actually no, if user is null, middleware redirects. But while middleware redirects, we might see a flash.
    // The safest bet:
    // If loading -> Show Skeleton.
    // If !loading && !user -> Return null (or empty div).
    // If !loading && user -> Show Content.

    if (!user && !isLoading) return null;

    return (
        <>
            {/* Mobile Trigger */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#111827] border-b border-gray-800 p-4 flex items-center justify-between">
                <Link href="/">
                    <img
                        src={process.env.NEXT_PUBLIC_LOGO_URL || "/logo_full_dark.png"}
                        alt={process.env.NEXT_PUBLIC_COMPANY_NAME || "Interiéry Horyna"}
                        className="h-8 w-auto block"
                    />
                </Link>
                <button
                    onClick={() => setIsOpen(true)}
                    className="p-2 -mr-2 text-gray-300 hover:bg-white/5 rounded-lg"
                >
                    <Icons.Bars3 className="w-6 h-6" />
                </button>
            </div>

            {/* Desktop Sidebar (Fixed) */}
            <div className="hidden lg:block fixed inset-y-0 left-0 z-40 w-[260px] bg-[#111827]">
                <SidebarContent />
            </div>

            {/* Mobile Sidebar (Drawer) */}
            {isOpen && (
                <div className="relative z-50 lg:hidden" role="dialog" aria-modal="true">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm transition-opacity"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Drawer */}
                    <div className="fixed inset-y-0 left-0 flex w-full max-w-xs transition-transform">
                        <div className="relative flex-1 flex flex-col w-full">
                            {/* Close Button */}
                            <div className="absolute top-0 right-0 -mr-12 pt-2">
                                <button
                                    type="button"
                                    className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                                    onClick={() => setIsOpen(false)}
                                >
                                    <span className="sr-only">Close sidebar</span>
                                    <Icons.XMark className="h-6 w-6 text-white" aria-hidden="true" />
                                </button>
                            </div>

                            <SidebarContent />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
