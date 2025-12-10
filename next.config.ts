/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // !! Důležité: Ignoruje chyby typů při nahrávání !!
    ignoreBuildErrors: true,
  },

};

export default nextConfig;