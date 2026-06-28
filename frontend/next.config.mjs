import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Scope Turbopack to the frontend app — do not traverse the full monorepo tree.
  turbopack: {
    root: __dirname,
  },
  // Reduce dev memory churn from keeping too many compiled pages hot.
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/.next/**',
          '**/dist/**',
          '**/coverage/**',
          '**/prisma/**',
          path.join(repoRoot, 'dist', '**'),
          path.join(repoRoot, 'src', '**'),
        ],
        aggregateTimeout: 300,
        poll: false,
      };
    }
    return config;
  },
};

export default nextConfig;
