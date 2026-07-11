/** @type {import('next').NextConfig} */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseHostname = supabaseUrl
  ? new URL(supabaseUrl).hostname
  : undefined;


const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: supabaseHostname
      ? [
          {
            protocol: "https",
            hostname: supabaseHostname,
            port: "",
            pathname: "/storage/v1/object/public/products-images/**",
          },
        ]
      : [],
  },
}

export default nextConfig
