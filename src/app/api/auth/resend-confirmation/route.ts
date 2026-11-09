import { NextResponse } from "next/server";
import { route, readJson } from "@/lib/http";
import { resendConfirmationEmail } from "@/server/services/auth.service";
import { AppError } from "@/lib/errors";

export const POST = route(
  async (req) => {
    const body = (await readJson(req).catch(() => ({}))) as { email?: string };
    const email = body.email?.trim();
    if (!email || !email.includes("@")) {
      throw new AppError("BAD_REQUEST", "A valid email address is required.");
    }

    const { sent, token } = await resendConfirmationEmail(email);

    return NextResponse.json({
      ok: true,
      sent,
      token, // provided in response for demo / test environments without an external mail server
      message: "If an account with that email is awaiting verification, a confirmation link has been sent.",
    });
  },
  { mutation: true },
);
