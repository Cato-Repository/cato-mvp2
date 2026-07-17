import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-b from-background to-muted/40 px-4">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Cato</h1>
        <p className="text-muted-foreground text-sm">
          Stay focused, one session at a time.
        </p>
      </div>
      <SignIn />
    </div>
  );
}
