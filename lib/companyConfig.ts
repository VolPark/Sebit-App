export const CompanyConfig = {
    name: process.env.NEXT_PUBLIC_COMPANY_NAME || "Interiéry Horyna",
    shortName: process.env.NEXT_PUBLIC_COMPANY_SHORT_NAME || "Horyna",
    address: {
        line1: process.env.NEXT_PUBLIC_COMPANY_ADDRESS_LINE1 || "Nůšařská 4374",
        city: process.env.NEXT_PUBLIC_COMPANY_CITY || "276 01 Mělník",
        country: process.env.NEXT_PUBLIC_COMPANY_COUNTRY || "Česká republika",
    },
    contact: {
        phone: process.env.NEXT_PUBLIC_COMPANY_PHONE || "+420 777 945 161",
        web: process.env.NEXT_PUBLIC_COMPANY_WEB || "www.interiery-horyna.cz",
        email: process.env.NEXT_PUBLIC_COMPANY_EMAIL || "info@interiery-horyna.cz",
    },
    billing: {
        ico: process.env.NEXT_PUBLIC_COMPANY_ICO || "27649881",
        dic: process.env.NEXT_PUBLIC_COMPANY_DIC || "CZ27649881",
        companyName: process.env.NEXT_PUBLIC_COMPANY_BILLING_NAME || "Interiéry Horyna s.r.o.",
    },
    branding: {
        logoUrl: process.env.NEXT_PUBLIC_LOGO_URL || "/logo_full_dark.png",
        logoLightUrl: process.env.NEXT_PUBLIC_LOGO_LIGHT_URL || "/logo_full.png",
        favicon: process.env.NEXT_PUBLIC_FAVICON || "/icon.png",
        signatureUrl: process.env.NEXT_PUBLIC_SIGNATURE_URL || null,
    },
    features: {
        // Main Sections
        enableDashboard: process.env.NEXT_PUBLIC_ENABLE_DASHBOARD !== 'false',
        enableOffers: process.env.NEXT_PUBLIC_ENABLE_OFFERS !== 'false',
        enableAdmin: process.env.NEXT_PUBLIC_ENABLE_ADMIN !== 'false',
        enableFinance: process.env.NEXT_PUBLIC_ENABLE_FINANCE !== 'false',

        // Granular Features (Dashboard)
        enableDashboardFirma: process.env.NEXT_PUBLIC_ENABLE_DASHBOARD_FIRMA !== 'false',
        enableDashboardWorkers: process.env.NEXT_PUBLIC_ENABLE_DASHBOARD_WORKERS !== 'false',
        enableDashboardClients: process.env.NEXT_PUBLIC_ENABLE_DASHBOARD_CLIENTS !== 'false',
        enableDashboardExperimental: process.env.NEXT_PUBLIC_ENABLE_DASHBOARD_EXPERIMENTAL !== 'false',
        enableAI: process.env.NEXT_PUBLIC_ENABLE_AI !== 'false',

        // Granular Features (Admin)
        enableAdminUsers: process.env.NEXT_PUBLIC_ENABLE_ADMIN_USERS !== 'false',
        enableAdminActions: process.env.NEXT_PUBLIC_ENABLE_ADMIN_ACTIONS !== 'false',
        enableAdminClients: process.env.NEXT_PUBLIC_ENABLE_ADMIN_CLIENTS !== 'false',
        enableAdminWorkers: process.env.NEXT_PUBLIC_ENABLE_ADMIN_WORKERS !== 'false',

        // Granular Features (Finance)
        enableFinanceReports: process.env.NEXT_PUBLIC_ENABLE_FINANCE_REPORTS !== 'false',
        enableFinancePayroll: process.env.NEXT_PUBLIC_ENABLE_FINANCE_PAYROLL !== 'false',
        enableFinanceCosts: process.env.NEXT_PUBLIC_ENABLE_FINANCE_COSTS !== 'false',
        enableFinanceTimesheets: process.env.NEXT_PUBLIC_ENABLE_FINANCE_TIMESHEETS !== 'false',
    }
};
