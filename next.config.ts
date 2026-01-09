/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // !! Důležité: Ignoruje chyby typů při nahrávání !!
    ignoreBuildErrors: true,
  },
  serverExternalPackages: ["ssh2", "ssh2-sftp-client"],

};

export default nextConfig;