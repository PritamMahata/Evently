/** Server-side environment access. Nothing here is exposed to the browser. */
export function getEnv() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set");
  return {
    databaseUrl,
    directUrl: process.env.DIRECT_URL || databaseUrl,
    databaseSsl: process.env.DATABASE_SSL === "true",
    authSecret: process.env.AUTH_SECRET || "",
    timezone: process.env.APP_TIMEZONE || "UTC",
    appUrl: process.env.APP_URL || "http://localhost:3000",
    resendApiKey: process.env.RESEND_API_KEY || "",
    resendFromEmail:
      process.env.RESEND_FROM_EMAIL || "Evently <onboarding@resend.dev>",
    cloudinaryUrl: process.env.CLOUDINARY_URL || "",
    cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
    cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || "",
    cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || "",
    isProd: process.env.NODE_ENV === "production",
  };
}
