import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ["res.cloudinary.com", "firebasestorage.googleapis.com"],
  },
  
  // PWA Configuration
  async headers() {
    return [
      {
        source: "/manifest.json",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
      {
        source: "/firebase-messaging-sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },

  // Allow service worker to be served from public directory
  async rewrites() {
    return [
      {
        source: "/firebase-messaging-sw.js",
        destination: "/firebase-messaging-sw.js",
      },
    ];
  },

  // Experimental features for better PWA support
  experimental: {
    // Enable scroll restoration for better mobile experience
    scrollRestoration: true,
  },
};

export default nextConfig;