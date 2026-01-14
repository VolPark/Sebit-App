import { CompanyConfig } from '@/lib/companyConfig';

export type NavItem = {
    name: string;
    href: string;
    iconKey: string;
    exact?: boolean;
};

export type NavGroup = {
    title: string;
    items: NavItem[];
};

export const NAVIGATION_STRUCTURE: NavGroup[] = [
    {
        title: 'Přehled',
        items: [
            { name: 'Firma', href: '/dashboard?tab=firma', iconKey: 'Dashboard' },
            { name: 'Zaměstnanci', href: '/dashboard?tab=workers', iconKey: 'UserGroup' },
            { name: 'Klienti', href: '/dashboard?tab=clients', iconKey: 'Users' },
            { name: 'Experimentální', href: '/dashboard?tab=experimental', iconKey: 'Action' },
            { name: 'Manažerský přehled', href: '/management', iconKey: 'Chart' },
            { name: 'AI Asistent', href: '/dashboard?tab=ai', iconKey: 'Chat' },
        ]
    },
    {
        title: 'Obchod',
        items: [
            { name: 'Nabídky', href: '/nabidky', iconKey: 'Offer' },
            { name: 'Sklad', href: '/inventory', iconKey: 'Inventory' },
        ]
    },
    {
        title: 'Compliance',
        items: [
            { name: 'AML Toolbox', href: '/aml', iconKey: 'Shield' },
        ]
    },
    {
        title: 'Administrace',
        items: [
            { name: 'Nastavení', href: '/administrace', iconKey: 'UserGroup' },
            { name: 'Akce', href: '/akce', iconKey: 'Action' },
            { name: 'Klienti', href: '/klienti', iconKey: 'Users' },
            { name: 'Pracovníci', href: '/pracovnici', iconKey: 'UserGroup' },
        ]
    },
    {
        title: 'Finance',
        items: [
            { name: 'Transakce', href: '/finance', iconKey: 'Money' },
            { name: 'Výkazy', href: '/vykazy', iconKey: 'Report' },
            { name: 'Mzdy', href: '/mzdy', iconKey: 'Money' },
            { name: 'Náklady', href: '/naklady', iconKey: 'Cost' },
            { name: 'Timesheety', href: '/timesheets', iconKey: 'Timesheet' },
            { name: 'Účetnictví', href: '/accounting', iconKey: 'Accounting' },
        ]
    }
];

export function getFilteredNavigation(role: string | undefined | null): NavGroup[] {
    if (!role) return [];

    return NAVIGATION_STRUCTURE.map(group => {
        // Clone items to avoid mutating original
        let items = [...group.items];

        if (role === 'office') {
            // Office sees everything EXCEPT 'Přehled' section
            if (group.title === 'Přehled') return null;
        }

        if (role === 'reporter') {
            // Reporter sees ONLY 'Výkazy'
            items = items.filter(item => item.name === 'Výkazy' || item.name === 'Timesheety');
            if (items.length === 0) return null;
        }

        // Only owner and admin can see 'Uživatelé' (mapped to 'Nastavení' in this app context?)
        // Original code: if (role !== 'owner' && role !== 'admin') items = items.filter(item => item.name !== 'Nastavení');
        if (role !== 'owner' && role !== 'admin') {
            items = items.filter(item => item.name !== 'Nastavení');
        }

        if (items.length === 0) return null;

        // Feature Flag Filtering (Global Group Level)
        if (group.title === 'Přehled' && !CompanyConfig.features.enableDashboard) return null;
        // Special case for Obchod: Needs at least one enabled
        if (group.title === 'Obchod' && !CompanyConfig.features.enableOffers && !CompanyConfig.features.enableInventory) return null;

        // Special case for filtering Obchod items based on flags
        if (group.title === 'Obchod') {
            if (!CompanyConfig.features.enableOffers) items = items.filter(i => i.name !== 'Nabídky');
            if (!CompanyConfig.features.enableInventory) items = items.filter(i => i.name !== 'Sklad');
        }

        if (group.title === 'Compliance' && !CompanyConfig.features.enableAML) return null;
        if (group.title === 'Administrace' && !CompanyConfig.features.enableAdmin) return null;
        if (group.title === 'Finance' && !CompanyConfig.features.enableFinance) return null;

        // Granular Item Filtering (Sub-features)
        if (group.title === 'Přehled') {
            if (!CompanyConfig.features.enableDashboardFirma) items = items.filter(i => i.name !== 'Firma');
            if (!CompanyConfig.features.enableDashboardWorkers) items = items.filter(i => i.name !== 'Zaměstnanci');
            if (!CompanyConfig.features.enableDashboardClients) items = items.filter(i => i.name !== 'Klienti');
            if (!CompanyConfig.features.enableDashboardExperimental) items = items.filter(i => i.name !== 'Experimentální');
            if (!CompanyConfig.features.enableAccounting) items = items.filter(i => i.name !== 'Manažerský přehled');
            if (!CompanyConfig.features.enableAI) items = items.filter(i => i.name !== 'AI Asistent');
        }

        if (group.title === 'Administrace') {
            if (!CompanyConfig.features.enableAdminUsers) items = items.filter(i => i.name !== 'Nastavení');
            if (!CompanyConfig.features.enableAdminActions) items = items.filter(i => i.name !== 'Akce');
            if (!CompanyConfig.features.enableAdminClients) items = items.filter(i => i.name !== 'Klienti');
            if (!CompanyConfig.features.enableAdminWorkers) items = items.filter(i => i.name !== 'Pracovníci');
        }

        if (group.title === 'Finance') {
            if (!CompanyConfig.features.enableFinanceTransactions) items = items.filter(i => i.name !== 'Transakce');
            if (!CompanyConfig.features.enableFinanceReports) items = items.filter(i => i.name !== 'Výkazy');
            if (!CompanyConfig.features.enableFinancePayroll) items = items.filter(i => i.name !== 'Mzdy');
            if (!CompanyConfig.features.enableFinanceCosts) items = items.filter(i => i.name !== 'Náklady');
            if (!CompanyConfig.features.enableFinanceTimesheets) items = items.filter(i => i.name !== 'Timesheety');
            if (!CompanyConfig.features.enableAccounting) items = items.filter(i => i.name !== 'Účetnictví');
        }

        if (items.length === 0) return null;

        return {
            ...group,
            items
        };
    }).filter(Boolean) as NavGroup[];
}
