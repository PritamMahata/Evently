import { NextResponse } from "next/server";
import { route } from "@/lib/http";
import { getSessionUser } from "@/lib/auth/session";
import { requireRole } from "@/lib/permissions";
import { AppError } from "@/lib/errors";
import { uploadBannerImage } from "@/server/services/cloudinary.service";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
]);

export const POST = route(
  async (req) => {
    const user = await getSessionUser();
    requireRole(user, "ORGANIZER");

    const formData = await req.formData().catch(() => null);
    if (!formData) {
      throw new AppError("BAD_REQUEST", "No form data submitted.");
    }

    const file = formData.get("file");
    if (!file || typeof file === "string") {
      throw new AppError("BAD_REQUEST", "Please select an image file to upload.");
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      throw new AppError(
        "BAD_REQUEST",
        "Unsupported file type. Please upload a JPEG, PNG, WebP, or AVIF image.",
      );
    }

    if (file.size > MAX_SIZE) {
      throw new AppError("BAD_REQUEST", "Image size exceeds maximum limit of 5 MB.");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadBannerImage(buffer);

    return NextResponse.json({
      ok: true,
      url: result.url,
      publicId: result.public_id,
    });
  },
  { mutation: true },
);
