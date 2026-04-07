"use client";

import { useState } from "react";
import Link from "next/link";
import { Navigation } from "@/components/layout/navigation";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  studyRoomsApi,
  type WebinarPublicMetadata,
} from "@/lib/api/study-rooms.api";
import { extractHttpErrorMessage } from "@/lib/utils/error-handling";
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
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [extra, setExtra] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{
    title: string;
    alreadyRegistered?: boolean;
    roomId?: string;
    approvalPending?: boolean;
    /** False when AWS SES did not send confirmation (still registered). */
    emailSent?: boolean;
    joinUrlManual?: string;
    message?: string;
  } | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        roomId: res.roomId,
        approvalPending: res.approvalPending !== false,
        emailSent: res.emailSent !== false,
        joinUrlManual: res.joinUrlManual,
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
          <div className="rounded-2xl border bg-card p-8 text-center space-y-5">
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
            <h1 className="text-2xl font-semibold">
              {done.alreadyRegistered
                ? "Already registered"
                : "You\u2019re registered"}
            </h1>
            {done.emailSent === false ? (
              <p className="text-sm text-muted-foreground">
                {done.message ||
                  "Registration saved. Confirmation email could not be sent—contact the host if needed."}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground leading-relaxed">
                Check your email for the{" "}
                <strong className="text-foreground font-medium">Join webinar</strong> link and your{" "}
                <strong className="text-foreground font-medium">passcode</strong>.
              </p>
            )}
            {done.joinUrlManual && (
              <div className="pt-1">
                <Button asChild className="w-full">
                  <a href={done.joinUrlManual}>
                    {done.approvalPending !== false
                      ? "Open waiting room now"
                      : "Continue to join now"}
                  </a>
                </Button>
              </div>
            )}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const fields = initialMeta.registrationFields || [];

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
          <p className="text-sm text-muted-foreground rounded-lg bg-muted/50 px-3 py-2.5">
            No sign-in required. We&apos;ll email you a join link and passcode.
          </p>

          <div className="space-y-2">
            <Label htmlFor="reg-name">Full name *</Label>
            <Input
              id="reg-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              disabled={submitting}
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
              disabled={submitting}
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
                    disabled={submitting}
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
                    disabled={submitting}
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
                    disabled={submitting}
                  />
                )}
              </div>
            ))}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Registering…
              </>
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
