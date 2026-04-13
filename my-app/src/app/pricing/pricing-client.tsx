"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Check, GraduationCap, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/contexts/toast-context";
import { cn } from "@/lib/utils";

const basicFeatures = [
  "1 Study Room per day",
  "3 Debate Rooms per week",
  "Join public rooms",
  "Limited room creation",
];

const plusFeatures = [
  "Unlimited Study Rooms",
  "Unlimited Debate Rooms",
  "Priority entry in active rooms",
  "Session recordings access",
  "Session summaries",
];

const studentFeatures = [
  "Unlimited Study Rooms",
  "Unlimited Debate Rooms",
  "Priority entry in active rooms",
  "Session recordings access",
  "Session summaries",
];

function FeatureList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3 text-sm text-foreground/90">
      {items.map((item) => (
        <li key={item} className="flex gap-2.5">
          <Check className="h-4 w-4 shrink-0 text-primary mt-0.5" aria-hidden />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function PricingClient() {
  const { showSuccess, showError } = useToast();

  const [code, setCode] = useState("");
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [requestForm, setRequestForm] = useState({
    name: "",
    institution: "",
    city: "",
    contact: "",
    hodName: "",
    hodContact: "",
  });

  const scrollToId = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) {
      showError("Enter a code", "Please enter your school or college code.");
      return;
    }
    showSuccess("Code received", "We’re verifying your institution code.");
  };

  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRequestSubmitted(true);
  };

  return (
    <div className="flex flex-col">
      <section className="pt-8 pb-10 sm:pt-12 sm:pb-14 px-4 text-center">
        <div className="container mx-auto max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" aria-hidden />
            <span>WEBYALAYA</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-4 leading-tight">
            Learn together.{" "}
            <span className="bg-gradient-to-r from-primary via-emerald-500 to-secondary bg-clip-text text-transparent">
              Grow together.
            </span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground font-tagline max-w-xl mx-auto">
            Pick a plan that fits how you study and debate with peers.
          </p>
        </div>
      </section>

      <section className="pb-12 sm:pb-16 px-4" aria-labelledby="plans-heading">
        <div className="container mx-auto max-w-6xl">
          <h2 id="plans-heading" className="sr-only">
            Plans
          </h2>
          <div className="grid gap-6 lg:grid-cols-3 lg:items-stretch">
            <Card className="flex flex-col border-gray-200/80">
              <CardHeader>
                <CardTitle className="text-xl">Basic</CardTitle>
                <CardDescription>Get started on the house.</CardDescription>
                <p className="text-3xl font-bold tracking-tight pt-2">Free</p>
              </CardHeader>
              <CardContent className="flex-1">
                <FeatureList items={basicFeatures} />
              </CardContent>
              <CardFooter className="flex-col gap-2 border-t border-gray-100 pt-6 mt-auto">
                <Button className="w-full" size="lg" asChild>
                  <Link href="/sign-up">Start for Free</Link>
                </Button>
              </CardFooter>
            </Card>

            <Card
              id="plus-plan"
              className={cn(
                "flex flex-col relative overflow-hidden border-2 border-primary/40 shadow-lg",
                "ring-2 ring-primary/10"
              )}
            >
              <div className="absolute top-0 right-0 rounded-bl-xl bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                Popular
              </div>
              <CardHeader className="pt-10">
                <CardTitle className="text-xl">Plus</CardTitle>
                <CardDescription>Everything unlimited, one low price.</CardDescription>
                <p className="text-3xl font-bold tracking-tight pt-2">
                  ₹29 <span className="text-base font-medium text-muted-foreground">/ month</span>
                </p>
              </CardHeader>
              <CardContent className="flex-1">
                <FeatureList items={plusFeatures} />
              </CardContent>
              <CardFooter className="flex-col gap-2 border-t border-primary/10 pt-6 mt-auto">
                <Button className="w-full" size="lg" asChild>
                  <Link href="/sign-up">Upgrade to Plus</Link>
                </Button>
                <p className="text-xs text-center text-muted-foreground font-tagline">
                  No commitments. Cancel anytime.
                </p>
              </CardFooter>
            </Card>

            <Card
              id="student-access"
              className="flex flex-col border-secondary/30 bg-gradient-to-b from-secondary/5 to-transparent"
            >
              <CardHeader>
                <div className="flex items-center gap-2 text-secondary mb-1">
                  <GraduationCap className="h-5 w-5" aria-hidden />
                </div>
                <CardTitle className="text-xl">Student Access</CardTitle>
                <CardDescription>Free with school/college/institute code</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-5">
                <FeatureList items={studentFeatures} />
                <form onSubmit={handleUnlock} className="space-y-3">
                  <Label htmlFor="institute-code" className="sr-only">
                    School or college code
                  </Label>
                  <Input
                    id="institute-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Enter your school/college code"
                    autoComplete="off"
                    className="bg-background/80"
                  />
                  <Button type="submit" className="w-full" size="lg" variant="secondary">
                    Unlock Access
                  </Button>
                </form>
                <p className="text-sm text-muted-foreground text-center font-tagline">
                  Don’t have a code? Request access for your college
                </p>
                <Button
                  type="button"
                  variant="link"
                  className="w-full text-secondary h-auto py-0"
                  onClick={() => scrollToId("request-access")}
                >
                  Request Access
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section
        className="pb-12 sm:pb-16 px-4"
        aria-labelledby="limit-nudge-heading"
      >
        <div className="container mx-auto max-w-3xl">
          <Card className="border-amber-200/80 bg-amber-50/40 dark:bg-amber-950/20 dark:border-amber-900/40">
            <CardHeader>
              <CardTitle id="limit-nudge-heading" className="text-lg sm:text-xl">
                Upgrade / Access Nudges
              </CardTitle>
              <CardDescription>
                When you hit your limit as a non-student user, you’ll see something like this:
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-base font-medium text-foreground">You’ve reached your limit.</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Go unlimited with Plus for ₹29/month or unlock free access with your college code.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <Button size="lg" className="sm:flex-1" asChild>
                  <Link href="/sign-up">Upgrade to Plus</Link>
                </Button>
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  className="sm:flex-1 border-secondary text-secondary hover:bg-secondary/10"
                  onClick={() => scrollToId("student-access")}
                >
                  Enter Code
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section
        id="request-access"
        className="pb-16 sm:pb-20 px-4"
        aria-labelledby="request-heading"
      >
        <div className="container mx-auto max-w-xl">
          <Card>
            <CardHeader>
              <CardTitle id="request-heading" className="text-2xl">
                Bring Webyalaya to your campus.
              </CardTitle>
              <CardDescription>
                Tell us about your institution and we’ll help onboard your students.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {requestSubmitted ? (
                <p className="text-center text-base font-medium text-primary py-8" role="status">
                  We’ll reach out to your institution soon.
                </p>
              ) : (
                <form onSubmit={handleRequestSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="req-name">Your Name</Label>
                    <Input
                      id="req-name"
                      required
                      value={requestForm.name}
                      onChange={(e) => setRequestForm((f) => ({ ...f, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="req-school">College/School Name</Label>
                    <Input
                      id="req-school"
                      required
                      value={requestForm.institution}
                      onChange={(e) => setRequestForm((f) => ({ ...f, institution: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="req-city">City</Label>
                    <Input
                      id="req-city"
                      required
                      value={requestForm.city}
                      onChange={(e) => setRequestForm((f) => ({ ...f, city: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="req-contact">Email / Phone</Label>
                    <Input
                      id="req-contact"
                      required
                      type="text"
                      inputMode="email"
                      value={requestForm.contact}
                      onChange={(e) => setRequestForm((f) => ({ ...f, contact: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="req-hod">Principal/HoD Name</Label>
                    <Input
                      id="req-hod"
                      required
                      value={requestForm.hodName}
                      onChange={(e) => setRequestForm((f) => ({ ...f, hodName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="req-hod-contact">Principal/HoD Email or Number</Label>
                    <Input
                      id="req-hod-contact"
                      required
                      value={requestForm.hodContact}
                      onChange={(e) => setRequestForm((f) => ({ ...f, hodContact: e.target.value }))}
                    />
                  </div>
                  <Button type="submit" className="w-full" size="lg">
                    Submit Request
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="pb-10 px-4 text-center" aria-label="Tagline">
        <p className="text-lg sm:text-xl font-medium text-muted-foreground font-tagline max-w-lg mx-auto leading-relaxed">
          Teach what you know. Learn what you want.
        </p>
      </section>
    </div>
  );
}
