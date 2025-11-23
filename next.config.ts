/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // !! Důležité: Ignoruje chyby typů při nahrávání !!
    ignoreBuildErrors: true,
  },
  eslint: {
    // Ignoruje stylistické chyby
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;