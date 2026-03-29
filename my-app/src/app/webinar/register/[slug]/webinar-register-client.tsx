"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Navigation } from "@/components/layout/navigation";
import { Footer } from "@/components/layout/footer";
import { AuthPromptButtons } from "@/components/auth/auth-prompt-buttons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  studyRoomsApi,
  type WebinarPublicMetadata,
} from "@/lib/api/study-rooms.api";
import { extractHttpErrorMessage } from "@/lib/utils/error-handling";
import { toAbsoluteAppUrl } from "@/lib/utils/public-url";
import { Loader2, CheckCircle2 } from "lucide-react";

const INVALID_LINK =
  "This registration link is invalid or the webinar was removed.";

export function WebinarRegisterClient({
  slug,
  initialMeta,
}: {
  slug: string;
  /** From server RSC; null = not found or error */
  initialMeta: WebinarPublicMetadata | null;
}) {
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [extra, setExtra] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{
    title: string;
    alreadyRegistered?: boolean;
    joinUrlManual?: string;
    roomId?: string;
    approvalPending?: boolean;
    /** False when AWS SES did not send confirmation (still registered). */
    emailSent?: boolean;
    message?: string;
  } | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignedIn) {
      setError("Please sign in first to register.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await studyRoomsApi.registerWebinar(slug, {
        name: name.trim(),
        email: email.trim(),
        responses: Object.keys(extra).length ? extra : undefined,
      });
      if (res.debugEmailPreview) {
        console.group(
          "%c[Webyalaya] Webinar registration email (dev / preview API)",
          "color:#16a34a;font-weight:bold",
        );
        console.log("To:", res.debugEmailPreview.to);
        console.log("Subject:", res.debugEmailPreview.subject);
        console.log("HTML (open string below or use Elements → copy):");
        console.log(res.debugEmailPreview.html);
        console.groupEnd();
      } else if (process.env.NODE_ENV === "development") {
        console.info(
          "[Webyalaya] No email preview in API response. If the Nest API runs with NODE_ENV=production, set WEBINAR_EXPOSE_EMAIL_PREVIEW_IN_API=true (or LOG_WEBINAR_REGISTRATION_EMAIL=true) in backend .env, or use NODE_ENV=development for local API.",
        );
      }
      setDone({
        title: res.title,
        alreadyRegistered: res.alreadyRegistered === true,
        joinUrlManual: res.joinUrlManual
          ? toAbsoluteAppUrl(res.joinUrlManual)
          : undefined,
        roomId: res.roomId,
        approvalPending: res.approvalPending !== false,
        emailSent: res.emailSent !== false,
        message: res.message,
      });
    } catch (err: unknown) {
      setError(extractHttpErrorMessage(err, "Registration failed. Try again."));
    } finally {
      setSubmitting(false);
    }
  };

  if (!initialMeta) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 container mx-auto px-4 py-16 text-center">
          <p className="text-destructive">{INVALID_LINK}</p>
          <Link href="/" className="text-primary mt-4 inline-block">
            Home
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 container max-w-lg mx-auto px-4 py-16">
          <div className="rounded-2xl border bg-card p-8 text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
            <h1 className="text-2xl font-semibold">
              {done.alreadyRegistered
                ? "Already registered"
                : "You\u2019re registered"}
            </h1>
            {done.alreadyRegistered ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Join link and passcode sent—check your email.
                </p>
                {done.joinUrlManual && (
                  <p className="text-xs text-muted-foreground break-all">
                    <a className="text-primary underline" href={done.joinUrlManual}>
                      Open join page
                    </a>
                  </p>
                )}
              </>
            ) : done.approvalPending ? (
              <>
                {done.emailSent === false ? (
                  <p className="text-sm text-muted-foreground">
                    {done.message ||
                      "Registration saved. Confirmation email could not be sent—contact the host if needed."}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Join link and passcode sent—check your email.
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-muted-foreground text-sm">
                  Join link and passcode sent—check your email.
                </p>
                {done.joinUrlManual && (
                  <Button asChild className="w-full">
                    <a href={done.joinUrlManual}>Open join page</a>
                  </Button>
                )}
              </>
            )}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const fields = initialMeta.registrationFields || [];
  const formLocked = !authLoaded || !isSignedIn;

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <Navigation />
      <main className="flex-1 container max-w-lg mx-auto px-4 py-10 md:py-16">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Webinar</p>
          <h1 className="text-2xl md:text-3xl font-bold mt-1">{initialMeta.title}</h1>
          {initialMeta.description && (
            <p className="text-muted-foreground mt-2 text-sm">{initialMeta.description}</p>
          )}
          <p className="text-sm mt-3">
            Hosted by <span className="font-medium">{initialMeta.hostName}</span>
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border bg-background p-6 shadow-sm">
          {authLoaded && !isSignedIn && (
            <div
              className="rounded-xl border border-amber-200 bg-amber-50/90 dark:bg-amber-950/40 dark:border-amber-800 px-4 py-4 space-y-3 text-sm"
              role="status"
              aria-live="polite"
            >
              <p className="font-semibold text-foreground">Please sign in first</p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Use <strong className="text-foreground font-medium">Sign in</strong> or{" "}
                <strong className="text-foreground font-medium">Sign up</strong> below. After you
                return, you can fill out this form and submit your registration.
              </p>
              <AuthPromptButtons className="pt-1 w-full justify-center sm:justify-start flex-wrap" />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reg-name">Full name *</Label>
            <Input
              id="reg-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              disabled={formLocked}
              aria-disabled={formLocked}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reg-email">Email *</Label>
            <Input
              id="reg-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={formLocked}
              aria-disabled={formLocked}
            />
          </div>
          {fields
            .filter((f) => f.id !== "email" && f.id !== "name")
            .map((f) => (
              <div key={f.id} className="space-y-2">
                <Label htmlFor={f.id}>
                  {f.label}
                  {f.required ? " *" : ""}
                </Label>
                {f.type === "textarea" ? (
                  <Textarea
                    id={f.id}
                    required={!!f.required}
                    value={extra[f.id] || ""}
                    onChange={(e) =>
                      setExtra((prev) => ({ ...prev, [f.id]: e.target.value }))
                    }
                    rows={3}
                    disabled={formLocked}
                    aria-disabled={formLocked}
                  />
                ) : f.type === "number" ? (
                  <Input
                    id={f.id}
                    type="number"
                    inputMode="decimal"
                    required={!!f.required}
                    value={extra[f.id] || ""}
                    onChange={(e) =>
                      setExtra((prev) => ({ ...prev, [f.id]: e.target.value }))
                    }
                    disabled={formLocked}
                    aria-disabled={formLocked}
                  />
                ) : (
                  <Input
                    id={f.id}
                    type={f.type === "email" ? "email" : "text"}
                    required={!!f.required}
                    value={extra[f.id] || ""}
                    onChange={(e) =>
                      setExtra((prev) => ({ ...prev, [f.id]: e.target.value }))
                    }
                    disabled={formLocked}
                    aria-disabled={formLocked}
                  />
                )}
              </div>
            ))}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={submitting || formLocked}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Registering…
              </>
            ) : !authLoaded ? (
              "Loading…"
            ) : !isSignedIn ? (
              "Sign in to register"
            ) : (
              "Register"
            )}
          </Button>
        </form>
      </main>
      <Footer />
    </div>
  );
}
