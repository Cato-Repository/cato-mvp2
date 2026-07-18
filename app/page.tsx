import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { LandingPage } from "@/app/LandingPage";

// "/" is public (see proxy.ts) so signed-out visitors can actually see the
// landing page. Signed-in users skip it entirely and go straight to the app.
export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    redirect("/today");
  }

  return <LandingPage />;
}
