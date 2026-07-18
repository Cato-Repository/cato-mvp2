import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  CheckCircle2,
  Clock,
  Flame,
  HelpCircle,
  MonitorUp,
  Pause,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const FEATURES = [
  {
    icon: Sparkles,
    title: "AI task breakdown",
    description:
      "Type a task and Gemini splits it into concrete sub-tasks, each with a time estimate and a difficulty rating — no more staring at a vague to-do.",
  },
  {
    icon: Clock,
    title: "Finish-by projection",
    description:
      "Once your sub-tasks are confirmed, Cato deterministically calculates when you'll be done for the day and updates it live as you go — no guessing.",
  },
  {
    icon: Pause,
    title: "Tracked focus sessions",
    description:
      "Start a session on any confirmed sub-task, pause and resume freely, and end it whenever you're done — Cato tracks elapsed time against your estimate.",
  },
  {
    icon: Camera,
    title: "Webcam focus detection",
    description:
      "Fully optional, 100% on-device — Cato notices if you've stepped away or your head's turned down at a phone for too long. Nothing is ever uploaded.",
  },
  {
    icon: MonitorUp,
    title: "Screen activity detection",
    description:
      "Share your screen (optional) and Cato flags sustained inactivity there too, on top of webcam presence.",
  },
  {
    icon: AlertTriangle,
    title: "Gentle check-ins",
    description:
      "If Cato can't tell you're still there, it asks — \"Are you still there?\" — instead of silently penalizing you. One click to say you're back, or take 10.",
  },
  {
    icon: Flame,
    title: "Focus streaks & concentration score",
    description:
      "Every 10 uninterrupted minutes earns a streak. Each session ends with a concentration score based on drift and sustained focus.",
  },
  {
    icon: CheckCircle2,
    title: "Full task control",
    description:
      "Edit, mark complete, delete, or bulk-delete any sub-task. Delete an entire task and its breakdown goes with it.",
  },
  {
    icon: HelpCircle,
    title: "Guided onboarding",
    description:
      "New here? A short interactive walkthrough shows you exactly where everything is — replay it anytime from the header.",
  },
];

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between p-6">
        <span className="text-lg font-semibold">Cato</span>
        <Button asChild size="sm">
          <Link href="/sign-in">Sign In</Link>
        </Button>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-16 px-6 pt-8 pb-24">
        <section className="flex flex-col items-center gap-6 text-center">
          <h1 className="max-w-2xl text-4xl font-semibold sm:text-5xl">
            Plan your day. Break it down. Stay focused.
          </h1>
          <p className="text-muted-foreground max-w-xl text-lg">
            Cato turns a messy to-do list into confirmed, time-estimated
            sub-tasks, tells you when you&apos;ll realistically be done, and
            keeps you honest while you work — one session at a time.
          </p>
          <Button asChild size="lg" className="mt-2">
            <Link href="/sign-in">
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <Card key={title}>
              <CardHeader>
                <Icon className="text-primary h-6 w-6" />
                <CardTitle className="text-base">{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">{description}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="flex flex-col items-center gap-4 text-center">
          <h2 className="text-2xl font-semibold">
            Stop planning your day. Start living it.
          </h2>
          <Button asChild size="lg">
            <Link href="/sign-in">
              Sign in to get started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </section>
      </main>
    </div>
  );
}
