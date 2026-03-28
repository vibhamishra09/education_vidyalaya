"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Navigation } from "@/components/layout/navigation";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { studyRoomsApi } from "@/lib/api/study-rooms.api";
import { Loader2, CheckCircle2 } from "lucide-react";

type WebinarMeta = Awaited<ReturnType<typeof studyRoomsApi.getWebinarPublic>>;

export function WebinarRegisterClient({ slug }: { slug: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<WebinarMeta | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [extra, setExtra] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{
    title: string;
    alreadyRegistered?: boolean;
    joinPasscode?: string;
    joinUrlManual?: string;
    roomId?: string;
    approvalPending?: boolean;
    message?: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    studyRoomsApi
      .getWebinarPublic(slug)
      .then((data) => {
        if (!cancelled) setMeta(data);
      })
      .catch(() => {
        if (!cancelled) setError("This registration link is invalid or the webinar was removed.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

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
      setDone({
        title: res.title,
        alreadyRegistered: res.alreadyRegistered === true,
        joinPasscode: res.joinPasscode,
        joinUrlManual: res.joinUrlManual,
        roomId: res.roomId,
        approvalPending: res.approvalPending !== false,
        message: res.message,
      });
    } catch (err: unknown) {
      const msg =
        err &&
        typeof err === "object" &&
        "response" in err &&
        err.response &&
        typeof err.response === "object" &&
        "data" in err.response &&
        err.response.data &&
        typeof err.response.data === "object" &&
        "message" in err.response.data
          ? String((err.response.data as { message?: unknown }).message)
          : "Registration failed. Try again.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </main>
        <Footer />
      </div>
    );
  }

  if (error && !meta) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 container mx-auto px-4 py-16 text-center">
          <p className="text-destructive">{error}</p>
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
                ? "Registration already complete"
                : "You\u2019re registered"}
            </h1>
            {done.alreadyRegistered ? (
              <>
                {done.message && (
                  <p className="text-muted-foreground text-sm">{done.message}</p>
                )}
                {done.joinPasscode && (
                  <p className="text-lg font-mono font-semibold tracking-widest">
                    Passcode: {done.joinPasscode}
                  </p>
                )}
                {done.joinUrlManual && (
                  <p className="text-xs text-muted-foreground break-all">
                    Join page:{" "}
                    <a className="text-primary underline" href={done.joinUrlManual}>
                      open link
                    </a>
                  </p>
                )}
              </>
            ) : done.approvalPending ? (
              <>
                {done.message && (
                  <p className="text-sm text-foreground/90">{done.message}</p>
                )}
                {done.joinPasscode && (
                  <p className="text-lg font-mono font-semibold tracking-widest">
                    Passcode: {done.joinPasscode}
                  </p>
                )}
                {done.joinUrlManual && (
                  <p className="text-xs text-muted-foreground break-all">
                    After the host approves you, open{" "}
                    <a className="text-primary underline" href={done.joinUrlManual}>
                      the join page
                    </a>{" "}
                    with the same name, email, and this passcode.
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-muted-foreground text-sm">
                  We sent a confirmation email with your join details.
                </p>
                {done.joinPasscode && (
                  <p className="text-lg font-mono font-semibold tracking-widest">
                    Passcode: {done.joinPasscode}
                  </p>
                )}
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

  if (!meta) return null;

  const fields = meta.registrationFields || [];

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <Navigation />
      <main className="flex-1 container max-w-lg mx-auto px-4 py-10 md:py-16">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Webinar</p>
          <h1 className="text-2xl md:text-3xl font-bold mt-1">{meta.title}</h1>
          {meta.description && (
            <p className="text-muted-foreground mt-2 text-sm">{meta.description}</p>
          )}
          <p className="text-sm mt-3">
            Hosted by <span className="font-medium">{meta.hostName}</span>
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border bg-background p-6 shadow-sm">
          <div className="space-y-2">
            <Label htmlFor="reg-name">Full name *</Label>
            <Input
              id="reg-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
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
