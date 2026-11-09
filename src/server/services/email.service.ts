import { Resend } from "resend";
import { getEnv } from "@/lib/env";

export async function sendConfirmationEmail(params: {
  to: string;
  name?: string;
  token: string;
}): Promise<{ ok: boolean; error?: string }> {
  const env = getEnv();
  const confirmUrl = `${env.appUrl.replace(/\/$/, "")}/api/auth/confirm-email?token=${params.token}`;

  console.log(`[EMAIL] Verification link for ${params.to}: ${confirmUrl}`);

  if (!env.resendApiKey) {
    console.warn("[EMAIL] RESEND_API_KEY is not set. Skipping external email dispatch.");
    return { ok: true };
  }

  try {
    const resend = new Resend(env.resendApiKey);
    const greeting = params.name ? `Hi ${params.name},` : "Hello,";
    const res = await resend.emails.send({
      from: env.resendFromEmail,
      to: params.to,
      subject: "Confirm your Evently account",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 40px 20px; }
              .container { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
              .header { text-align: center; margin-bottom: 24px; }
              .logo { display: inline-block; font-size: 24px; font-weight: 700; color: #0d9488; text-decoration: none; }
              h1 { font-size: 20px; font-weight: 600; color: #111827; margin-bottom: 12px; }
              p { font-size: 15px; line-height: 1.6; color: #4b5563; margin-bottom: 20px; }
              .btn-container { text-align: center; margin: 30px 0; }
              .btn { display: inline-block; background-color: #0d9488; color: #ffffff !important; text-decoration: none; font-weight: 600; font-size: 15px; padding: 12px 28px; border-radius: 8px; }
              .footer { font-size: 13px; color: #9ca3af; text-align: center; margin-top: 32px; border-top: 1px solid #f3f4f6; padding-top: 20px; }
              .fallback { word-break: break-all; font-size: 13px; color: #6b7280; background: #f3f4f6; padding: 12px; border-radius: 6px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <span class="logo">✦ Evently</span>
              </div>
              <h1>Confirm your email address</h1>
              <p>${greeting}</p>
              <p>Thanks for getting started with Evently! Please click the button below to verify your email address and activate your account.</p>
              <div class="btn-container">
                <a href="${confirmUrl}" class="btn" target="_blank">Verify Email Address</a>
              </div>
              <p>Or copy and paste this link into your browser:</p>
              <p class="fallback">${confirmUrl}</p>
              <div class="footer">
                <p>This verification link will expire in 24 hours. If you did not create an Evently account, you can safely ignore this email.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (res.error) {
      console.error("[EMAIL] Resend API error:", res.error);
      return { ok: false, error: res.error.message };
    }

    console.log(`[EMAIL] Confirmation email sent successfully via Resend. ID: ${res.data?.id}`);
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[EMAIL] Failed to send email via Resend:", message);
    return { ok: false, error: message };
  }
}

