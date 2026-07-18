"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  ArrowDown,
  ArrowUp,
  Clock,
  HelpCircle,
  Pause,
  Pencil,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type Highlightable = "add" | "edit" | "delete" | "breakdown" | "letsBegin";

type OnboardingContextValue = {
  restart: () => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

function useOnboardingContext() {
  const ctx = useContext(OnboardingContext);
  if (ctx === null) {
    throw new Error("useOnboardingContext must be used inside OnboardingProvider");
  }
  return ctx;
}

export function OnboardingReplayButton() {
  const { restart } = useOnboardingContext();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          onClick={restart}
          aria-label="Show tutorial"
          className="size-11"
        >
          <HelpCircle className="size-6" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Tutorial</TooltipContent>
    </Tooltip>
  );
}

// Rings + a bouncing arrow above whichever mock element is being called out
// in the current step — the "point an arrow / circle it" treatment.
function Highlight({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex rounded-md",
        active && "ring-primary ring-offset-background rounded-md ring-2 ring-offset-2"
      )}
    >
      {active && (
        <ArrowDown className="text-primary absolute -top-6 left-1/2 h-5 w-5 -translate-x-1/2 animate-bounce" />
      )}
      {children}
    </span>
  );
}

// Same width/color scheme as the real subtask badges (SubtaskRow.tsx) so
// the mock reads as authentic rather than a generic placeholder.
const MOCK_BADGE_WIDTH = "w-16";
function mockDifficultyClass(difficulty: "easy" | "medium" | "hard") {
  if (difficulty === "easy") return "bg-green-600 text-white hover:bg-green-600";
  if (difficulty === "hard") return "bg-red-600 text-white hover:bg-red-600";
  return "bg-amber-500 text-white hover:bg-amber-500";
}

// Static, non-interactive stand-ins used purely to illustrate the UI in the
// tutorial. Nothing here is wired to Convex.

function MockWelcomeCard() {
  return (
    <Card className="pointer-events-none mx-auto w-full max-w-xs select-none">
      <CardContent className="flex flex-col gap-3 py-6 text-center">
        <div>
          <p className="text-lg font-semibold">Hey there, you!</p>
          <p className="text-muted-foreground text-sm">
            What would you like to get started with?
          </p>
        </div>
        <div className="flex gap-2">
          <div className="border-input text-muted-foreground flex h-9 flex-1 items-center rounded-md border px-3 text-left text-sm">
            E.g. Write a 500 word essay on butterflies
          </div>
          <Highlight active>
            <Button
              type="button"
              size="icon"
              className="bg-primary rounded-full"
              aria-hidden
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          </Highlight>
        </div>
      </CardContent>
    </Card>
  );
}

function MockTaskCard({ highlights }: { highlights: Highlightable[] }) {
  const has = (id: Highlightable) => highlights.includes(id);
  return (
    <Card className="pointer-events-none select-none">
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="h-6 w-6 justify-center rounded-full p-0">
            1
          </Badge>
          <CardTitle className="text-base font-normal">
            Write a 500 word essay on butterflies
          </CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <Highlight active={has("letsBegin")}>
            <Button
              type="button"
              size="sm"
              className="bg-green-600 text-white hover:bg-green-700"
            >
              Let&apos;s Begin!
            </Button>
          </Highlight>
          <Highlight active={has("breakdown")}>
            <Button type="button" variant="outline" size="sm">
              <Sparkles className="h-4 w-4" />
              Break down
            </Button>
          </Highlight>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col divide-y text-sm">
        <div className="flex items-center gap-2 py-1.5">
          <span className="flex-1">Summarise Lecture 1 video</span>
          <Badge variant="outline" className={MOCK_BADGE_WIDTH}>
            15 min
          </Badge>
          <Badge className={cn(MOCK_BADGE_WIDTH, mockDifficultyClass("medium"))}>
            medium
          </Badge>
          <Highlight active={has("edit")}>
            <span className="text-muted-foreground inline-flex h-8 w-8 items-center justify-center">
              <Pencil className="h-4 w-4" />
            </span>
          </Highlight>
          <Highlight active={has("delete")}>
            <span className="text-muted-foreground inline-flex h-8 w-8 items-center justify-center">
              <Trash2 className="h-4 w-4" />
            </span>
          </Highlight>
        </div>
      </CardContent>
    </Card>
  );
}

function MockLockInDialog() {
  return (
    <Card className="pointer-events-none select-none">
      <CardContent className="flex flex-col items-center gap-4 py-6 text-center">
        <p className="font-semibold">
          You can finish by <span className="text-primary">3:45 PM</span> if you
          start now and focus!
        </p>
        <p className="text-muted-foreground text-sm">Shall we lock in now?</p>
        <div className="flex gap-2">
          <Highlight active>
            <Button type="button" size="sm">
              I&apos;m locking in
            </Button>
          </Highlight>
          <Button type="button" variant="secondary" size="sm">
            I&apos;ll start in 10 mins
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MockSessionCard() {
  return (
    <Card className="border-primary/30 pointer-events-none select-none">
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base font-normal">
          Working on: Summarise Lecture 1 video
        </CardTitle>
        <span className="font-mono text-sm">12:34</span>
      </CardHeader>
      <CardContent className="flex items-center gap-2">
        <Highlight active>
          <Button type="button" variant="outline" size="sm">
            <Pause className="h-4 w-4" />
            Pause
          </Button>
        </Highlight>
        <span className="text-muted-foreground text-xs">
          If Cato can&apos;t tell you&apos;re still there, it&apos;ll gently check
          in — no penalty for stepping away.
        </span>
      </CardContent>
    </Card>
  );
}

function MockScheduleBanner() {
  return (
    <Card className="bg-primary/5 border-primary/20 pointer-events-none select-none">
      <CardContent className="flex items-center gap-2 py-4">
        <Clock className="text-primary h-4 w-4" />
        <span className="text-sm">
          If you start now, you can finish by <strong>3:45 PM</strong>.
        </span>
      </CardContent>
    </Card>
  );
}

const STEPS: { title: string; description: string; content: ReactNode }[] = [
  {
    title: "Add your first task",
    description:
      "When you're just starting out, type a task here and hit the arrow to add it to today's list.",
    content: <MockWelcomeCard />,
  },
  {
    title: "Edit, delete, or break it down",
    description:
      "Click the pencil to edit a sub-task's title, difficulty, or time estimate, the trash icon to delete it, or \"Break down\" on a task to have Cato generate sub-tasks automatically.",
    content: <MockTaskCard highlights={["edit", "delete", "breakdown"]} />,
  },
  {
    title: "Let's Begin!",
    description:
      "Once you're happy with the sub-tasks, hit Let's Begin! — this locks the breakdown in and shows you a finish-by projection.",
    content: <MockTaskCard highlights={["letsBegin"]} />,
  },
  {
    title: "Lock in, or take 10",
    description:
      "Right after confirming, Cato shows when you could finish if you start now. Not ready yet? \"I'll start in 10 mins\" adds a short pause badge and countdown so nothing's forgotten.",
    content: <MockLockInDialog />,
  },
  {
    title: "Focus, with a safety net",
    description:
      "While you work, pause anytime with no penalty. Cato also watches for sustained inactivity via webcam/screen and will gently check in if it can't tell you're still there.",
    content: <MockSessionCard />,
  },
  {
    title: "See your finish time",
    description:
      "Once tasks are confirmed, Cato shows a live projection of when you'll be done for the day, updating as you go.",
    content: <MockScheduleBanner />,
  },
];

const TOTAL_STEPS = STEPS.length;

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const status = useQuery(api.users.getOnboardingStatus, {});
  const markSeen = useMutation(api.users.markOnboardingSeen);
  const [dismissedLocally, setDismissedLocally] = useState(false);
  const [manuallyTriggered, setManuallyTriggered] = useState(false);
  const [step, setStep] = useState(1);

  const shouldAutoShow =
    status !== undefined && !status.hasSeenOnboarding && !dismissedLocally;
  const isOpen = shouldAutoShow || manuallyTriggered;

  function finish() {
    setDismissedLocally(true);
    setManuallyTriggered(false);
    setStep(1);
    void markSeen({});
  }

  function next() {
    if (step >= TOTAL_STEPS) {
      finish();
      return;
    }
    setStep((s) => s + 1);
  }

  function back() {
    setStep((s) => Math.max(1, s - 1));
  }

  function restart() {
    setStep(1);
    setManuallyTriggered(true);
  }

  const current = STEPS[step - 1];

  return (
    <OnboardingContext.Provider value={{ restart }}>
      {children}
      <Dialog open={isOpen} onOpenChange={(next) => !next && finish()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{current.title}</DialogTitle>
            <DialogDescription>{current.description}</DialogDescription>
          </DialogHeader>

          <div className="py-2">{current.content}</div>

          <DialogFooter className="items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={finish}>
                Skip
              </Button>
              {step > 1 && (
                <Button type="button" variant="outline" size="sm" onClick={back}>
                  Back
                </Button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground text-xs">
                {step}/{TOTAL_STEPS}
              </span>
              <Button type="button" size="sm" onClick={next}>
                {step === TOTAL_STEPS ? "Done" : "Next"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OnboardingContext.Provider>
  );
}
