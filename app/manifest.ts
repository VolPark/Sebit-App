import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Interiéry Horyna',
        short_name: 'Horyna',
        description: 'Moderní správa interiérových projektů',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#E30613',
        icons: [
            {
                src: '/logo_small.png',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: '/logo_full.png', // Fallback to larger one for 512 if valid, but let's assume logo_small is the icon
                sizes: '512x512',
                type: 'image/png',
            },
            {
                src: '/logo_small.png',
                sizes: 'any',
                type: 'image/png',
            }
        ],
    }
}
