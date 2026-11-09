"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, AlertCircle, MailCheck, ArrowRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/lib/api-client";
import { toast } from "sonner";

function ConfirmEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const statusParam = searchParams.get("status");
  const errorParam = searchParams.get("error");
  const tokenParam = searchParams.get("token");
  const emailParam = searchParams.get("email");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(statusParam === "success");
  const [error, setError] = useState<string | null>(
    errorParam ? (errorParam === "token_expired" ? "This confirmation link has expired." : "Invalid confirmation token.") : null
  );

  const [resendEmail, setResendEmail] = useState(emailParam || "");
  const [resending, setResending] = useState(false);
  const [manualToken, setManualToken] = useState(tokenParam || "");

  useEffect(() => {
    // If a token is provided in the query string without status/error, attempt confirmation
    if (tokenParam && !statusParam && !errorParam) {
      setLoading(true);
      void api<{ ok: boolean; user: { name: string } }>("/api/auth/confirm-email", {
        body: { token: tokenParam },
      }).then((res) => {
        setLoading(false);
        if (res.ok) {
          setSuccess(true);
          toast.success("Email verified successfully!");
          router.refresh();
        } else {
          setError(res.error.message);
        }
      });
    }
  }, [tokenParam, statusParam, errorParam, router]);

  async function handleManualConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (!manualToken.trim()) return;
    setLoading(true);
    setError(null);
    const res = await api<{ ok: boolean }>("/api/auth/confirm-email", {
      body: { token: manualToken.trim() },
    });
    setLoading(false);
    if (res.ok) {
      setSuccess(true);
      toast.success("Email verified successfully!");
      router.refresh();
    } else {
      setError(res.error.message);
      toast.error(res.error.message);
    }
  }

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    if (!resendEmail.trim()) return;
    setResending(true);
    const res = await api<{ ok: boolean; token?: string }>("/api/auth/resend-confirmation", {
      body: { email: resendEmail.trim() },
    });
    setResending(false);
    if (res.ok) {
      toast.success("A new confirmation link has been generated!");
      if (res.data.token) {
        setManualToken(res.data.token);
      }
    } else {
      toast.error(res.error.message);
    }
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center py-10">
      <Card className="w-full shadow-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            {success ? (
              <CheckCircle2 className="size-6 text-emerald-500" />
            ) : error ? (
              <AlertCircle className="size-6 text-destructive" />
            ) : (
              <MailCheck className="size-6" />
            )}
          </div>
          <CardTitle className="text-2xl font-bold">
            {success
              ? "Email Confirmed!"
              : error
              ? "Confirmation Failed"
              : emailParam
              ? "Check your inbox"
              : "Verify Your Email"}
          </CardTitle>
          <CardDescription className="text-sm">
            {success
              ? "Your email address has been verified in PostgreSQL. You have full access to Evently."
              : error
              ? error
              : emailParam
              ? `We sent a confirmation link to ${emailParam}. Please click the button inside the email to verify your address.`
              : "Confirming your email via Supabase PostgreSQL token..."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {success ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-center text-sm font-medium text-emerald-800 dark:text-emerald-300">
                You are now signed in and ready to explore or organize events.
              </div>
              <Button asChild className="w-full gap-2">
                <Link href="/events">
                  <span>Explore Events</span>
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              {emailParam && !success && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3.5 text-xs text-muted-foreground leading-relaxed">
                  We sent an email to <strong className="text-foreground">{emailParam}</strong>. Check your inbox (or spam folder) and click the verification link. You can also paste the token below.
                </div>
              )}

              {/* Manual Token Entry Form */}
              <form onSubmit={handleManualConfirm} className="space-y-3">
                <div className="space-y-1.5">
                  <label htmlFor="token" className="text-xs font-semibold uppercase text-muted-foreground">
                    Confirmation Token
                  </label>
                  <Input
                    id="token"
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    placeholder="Paste 64-character token here"
                    className="font-mono text-xs"
                    disabled={loading}
                  />
                </div>
                <Button type="submit" disabled={loading || !manualToken.trim()} className="w-full">
                  {loading ? "Verifying…" : "Confirm Email"}
                </Button>
              </form>

              {/* Resend Confirmation Form */}
              <div className="border-t pt-4 space-y-3">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Need a new confirmation link?
                </p>
                <form onSubmit={handleResend} className="flex gap-2">
                  <Input
                    type="email"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="text-sm"
                    disabled={resending}
                  />
                  <Button type="submit" variant="outline" disabled={resending || !resendEmail.trim()} className="shrink-0 gap-1.5">
                    <RefreshCw className={`size-3.5 ${resending ? "animate-spin" : ""}`} />
                    <span>Resend</span>
                  </Button>
                </form>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="justify-center border-t py-3 text-xs text-muted-foreground">
          <Link href="/" className="hover:underline">
            Back to Evently Home
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function ConfirmEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <p className="text-sm text-muted-foreground animate-pulse">Loading email verification...</p>
        </div>
      }
    >
      <ConfirmEmailContent />
    </Suspense>
  );
}

