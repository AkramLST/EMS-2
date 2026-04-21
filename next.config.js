/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "opqsxheuqqznolawxwff.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "",
        pathname: "/**",
      },
    ],
    // Disable image optimization for local uploads to avoid HTML error responses
    unoptimized: process.env.NODE_ENV === "development",
  },
  // Configure webpack to handle large dependency trees
  webpack: (config, { isServer }) => {
    // Prevent circular dependency issues
    config.resolve.symlinks = false;

    // Basic fallbacks for Node-only modules on the client
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      fs: false,
      net: false,
      tls: false,
    };

    // Keep server build a bit simpler to avoid excessive memory usage
    if (isServer) {
      config.optimization = {
        ...(config.optimization || {}),
        minimize: false,
      };
    }

    return config;
  },
  // Optimize build performance
  swcMinify: false, // Disable SWC minification to reduce memory usage
  // Reduce build memory usage
  generateBuildId: async () => {
    return "build-" + Date.now();
  },
  // Add output configuration to prevent file system issues
  output: "standalone",
  // Disable source maps in production to save memory
  productionBrowserSourceMaps: false,
};

module.exports = nextConfig;
