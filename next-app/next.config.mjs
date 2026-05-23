/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required when using a custom server
  serverExternalPackages: ['xlsx', 'chokidar', 'bcryptjs'],
};

export default nextConfig;
