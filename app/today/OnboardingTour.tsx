"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
} from "@/components/ui/popover";

const TOTAL_STEPS = 3;

type OnboardingContextValue = {
  currentStep: number;
  next: () => void;
  skip: () => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const status = useQuery(api.users.getOnboardingStatus, {});
  const markSeen = useMutation(api.users.markOnboardingSeen);
  const [dismissedLocally, setDismissedLocally] = useState(false);

  const currentStep =
    status === undefined || status.hasSeenOnboarding || dismissedLocally
      ? 0
      : 1;

  const [step, setStep] = useState(1);
  const activeStep = currentStep === 0 ? 0 : step;

  function next() {
    if (step >= TOTAL_STEPS) {
      setDismissedLocally(true);
      void markSeen({});
      return;
    }
    setStep((s) => s + 1);
  }

  function skip() {
    setDismissedLocally(true);
    void markSeen({});
  }

  return (
    <OnboardingContext.Provider value={{ currentStep: activeStep, next, skip }}>
      {children}
    </OnboardingContext.Provider>
  );
}

function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (ctx === null) {
    throw new Error("useOnboarding must be used inside OnboardingProvider");
  }
  return ctx;
}

export function TourStep({
  step,
  title,
  description,
  children,
}: {
  step: number;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const { currentStep, next, skip } = useOnboarding();
  const isOpen = currentStep === step;

  return (
    <Popover open={isOpen}>
      <PopoverAnchor>{children}</PopoverAnchor>
      <PopoverContent side="bottom" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
        <PopoverHeader>
          <PopoverTitle>{title}</PopoverTitle>
          <PopoverDescription>{description}</PopoverDescription>
        </PopoverHeader>
        <div className="flex items-center justify-between pt-1">
          <Button type="button" variant="ghost" size="sm" onClick={skip}>
            Skip
          </Button>
          <span className="text-muted-foreground text-xs">
            {step}/{TOTAL_STEPS}
          </span>
          <Button type="button" size="sm" onClick={next}>
            {step === TOTAL_STEPS ? "Done" : "Next"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
