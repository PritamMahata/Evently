"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CalendarPlus, Ticket } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import {
  loginSchema,
  signupSchema,
  type LoginInput,
  type SignupInput,
} from "@/lib/validation/schemas";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type AuthResponse = { user: { role: "ORGANIZER" | "ATTENDEE"; name: string } };
const homeFor = (role: string) =>
  role === "ORGANIZER" ? "/organizer" : "/dashboard";
const safeNext = (next?: string) =>
  next && next.startsWith("/") && !next.startsWith("//") ? next : null;

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginInput) {
    setFormError(null);
    const res = await api<AuthResponse>("/api/auth/login", { body: values });
    if (!res.ok) {
      setFormError(res.error.message);
      return;
    }
    toast.success(`Welcome back, ${res.data.user.name.split(" ")[0]}!`);
    router.push(safeNext(next) ?? homeFor(res.data.user.role));
    router.refresh();
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-5"
        noValidate
      >
        {formError && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <PasswordInput
                  autoComplete="current-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          className="w-full"
          size="lg"
          loading={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? "Logging in…" : "Log in"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          New to Evently?{" "}
          <Link
            href="/signup"
            className="font-medium text-primary hover:underline"
          >
            Create an account
          </Link>
        </p>
      </form>
    </Form>
  );
}

const ROLE_OPTIONS = [
  {
    value: "ATTENDEE",
    title: "Attendee",
    text: "Find events and reserve seats.",
    icon: Ticket,
  },
  {
    value: "ORGANIZER",
    title: "Organizer",
    text: "Create events and manage guest lists.",
    icon: CalendarPlus,
  },
] as const;

export function SignupForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "ATTENDEE",
    },
  });

  async function onSubmit(values: SignupInput) {
    setFormError(null);
    const res = await api<AuthResponse>("/api/auth/signup", { body: values });
    if (!res.ok) {
      if (res.error.fields)
        for (const [k, v] of Object.entries(res.error.fields))
          form.setError(k as keyof SignupInput, { message: v });
      setFormError(res.error.message);
      return;
    }
    toast.success("Account created! We've sent a verification email to your inbox.");
    router.push(`/confirm-email?email=${encodeURIComponent(values.email)}`);
    router.refresh();
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-5"
        noValidate
      >
        {formError && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel id="role-label">I want to</FormLabel>
              <RadioGroup
                value={field.value}
                onValueChange={field.onChange}
                aria-labelledby="role-label"
                className="grid gap-3 sm:grid-cols-2"
              >
                {ROLE_OPTIONS.map(({ value, title, text, icon: Icon }) => (
                  <Label
                    key={value}
                    htmlFor={`role-${value}`}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-lg border bg-card p-3 font-normal transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent/60",
                    )}
                  >
                    <RadioGroupItem
                      value={value}
                      id={`role-${value}`}
                      className="mt-1"
                    />
                    <span className="space-y-0.5">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Icon className="size-4 text-primary" aria-hidden />
                        {title}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {text}
                      </span>
                    </span>
                  </Label>
                ))}
              </RadioGroup>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full name</FormLabel>
              <FormControl>
                <Input autoComplete="name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <PasswordInput autoComplete="new-password" {...field} />
              </FormControl>
              <FormDescription>
                At least 8 characters, with a letter and a number.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm password</FormLabel>
              <FormControl>
                <PasswordInput autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          className="w-full"
          size="lg"
          loading={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? "Creating account…" : "Create account"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-primary hover:underline"
          >
            Log in
          </Link>
        </p>
      </form>
    </Form>
  );
}
