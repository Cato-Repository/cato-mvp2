"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  ArrowDown,
  CheckCheck,
  Clock,
  HelpCircle,
  Pencil,
  Plus,
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

type Highlightable = "add" | "edit" | "delete" | "breakdown" | "confirm";

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
        >
          <HelpCircle className="h-5 w-5" />
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

// A static, non-interactive stand-in for a real task card, used purely to
// illustrate the UI in the tutorial. Nothing here is wired to Convex.
function MockTaskCard({ highlights }: { highlights: Highlightable[] }) {
  const has = (id: Highlightable) => highlights.includes(id);
  return (
    <Card className="pointer-events-none select-none">
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base font-normal">
          Finish math homework
        </CardTitle>
        <div className="flex items-center gap-2">
          <Highlight active={has("confirm")}>
            <Button
              type="button"
              size="sm"
              className="bg-green-600 text-white hover:bg-green-700"
            >
              <CheckCheck className="h-4 w-4" />
              Confirm
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
          <span className="flex-1">Review chapter 3</span>
          <Badge variant="outline">20 min</Badge>
          <Badge variant="secondary">easy</Badge>
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

function MockAddTaskRow() {
  return (
    <div className="flex gap-2">
      <div className="border-input text-muted-foreground flex h-9 flex-1 items-center rounded-md border px-3 text-sm">
        Finish math homework
      </div>
      <Highlight active>
        <Button type="button" size="icon" aria-hidden>
          <Plus className="h-4 w-4" />
        </Button>
      </Highlight>
    </div>
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
    title: "Add your tasks",
    description: "Type a task title and hit the + button to add it to today's list.",
    content: <MockAddTaskRow />,
  },
  {
    title: "Edit, delete, or break it down",
    description:
      "Click the pencil to edit a sub-task's title, difficulty, or time estimate, the trash icon to delete it, or \"Break down\" on a task to have Cato generate sub-tasks automatically.",
    content: <MockTaskCard highlights={["edit", "delete", "breakdown"]} />,
  },
  {
    title: "Confirm to lock it in",
    description:
      "Once you're happy with the sub-tasks, hit Confirm — this locks the breakdown in and unlocks the Start button so you can begin a tracked focus session.",
    content: <MockTaskCard highlights={["confirm"]} />,
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
