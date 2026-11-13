import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { getEnv } from "@/lib/env";
import { AppError } from "@/lib/errors";

export function configureCloudinary(): boolean {
  const env = getEnv();

  if (env.cloudinaryUrl) {
    const match = env.cloudinaryUrl.match(
      /^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/,
    );
    if (match) {
      const [, apiKey, apiSecret, cloudName] = match;
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
      return true;
    }
  }

  const cloudName =
    env.cloudinaryCloudName && env.cloudinaryCloudName !== "your_cloud_name"
      ? env.cloudinaryCloudName
      : "";

  if (cloudName && env.cloudinaryApiKey && env.cloudinaryApiSecret) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: env.cloudinaryApiKey,
      api_secret: env.cloudinaryApiSecret,
      secure: true,
    });
    return true;
  }

  return false;
}

export async function uploadBannerImage(
  fileBuffer: Buffer,
): Promise<{ url: string; public_id: string }> {
  const env = getEnv();
  const configured = configureCloudinary();

  if (!configured) {
    const missing: string[] = [];
    if (!env.cloudinaryCloudName) missing.push("CLOUDINARY_CLOUD_NAME");
    if (!env.cloudinaryApiKey) missing.push("CLOUDINARY_API_KEY");
    if (!env.cloudinaryApiSecret) missing.push("CLOUDINARY_API_SECRET");

    throw new AppError(
      "BAD_REQUEST",
      `Cloudinary requires ${missing.join(", ")} (or CLOUDINARY_URL) in .env.local to upload media.`,
    );
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "evently/banners",
        resource_type: "image",
        allowed_formats: ["jpg", "png", "webp", "avif", "jpeg"],
        transformation: [
          {
            width: 1200,
            height: 630,
            crop: "fill",
            gravity: "auto",
            quality: "auto",
          },
        ],
      },
      (error, result?: UploadApiResponse) => {
        if (error || !result) {
          reject(
            new AppError(
              "BAD_REQUEST",
              error?.message || "Failed to upload image to Cloudinary.",
            ),
          );
        } else {
          resolve({
            url: result.secure_url,
            public_id: result.public_id,
          });
        }
      },
    );

    uploadStream.end(fileBuffer);
  });
}
