import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    const companyName = process.env.NEXT_PUBLIC_COMPANY_NAME || "Interiéry Horyna";
    const companyShortName = process.env.NEXT_PUBLIC_COMPANY_SHORT_NAME || companyName;

    return {
        name: companyName,
        short_name: companyShortName,
        description: companyName,
        start_url: '/',
        display: 'standalone',
        background_color: '#111827',
        theme_color: '#111827',
        id: '/',
        categories: ["productivity", "finance", "business"],
        orientation: 'portrait',
        shortcuts: [
            {
                name: "Přehled",
                url: "/dashboard",
                icons: [{ src: "/web-app-icon-192.png", sizes: "192x192", type: "image/png" }]
            },
            {
                name: "Výkazy",
                url: "/vykazy",
                icons: [{ src: "/web-app-icon-192.png", sizes: "192x192", type: "image/png" }]
            },
            {
                name: "Pracovníci",
                url: "/pracovnici",
                icons: [{ src: "/web-app-icon-192.png", sizes: "192x192", type: "image/png" }]
            }
        ],
        icons: [
            {
                src: '/web-app-icon-192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any maskable',
            },
            {
                src: '/web-app-icon-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any maskable',
            },
        ],
        screenshots: [
            {
                src: "/screenshot-mobile.png",
                sizes: "1080x1920",
                type: "image/png",
                form_factor: "narrow"
            },
            {
                src: "/screenshot-desktop.png",
                sizes: "1920x1080",
                type: "image/png",
                form_factor: "wide"
            }
        ]
    }
}
