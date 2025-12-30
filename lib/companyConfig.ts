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
    }
};
