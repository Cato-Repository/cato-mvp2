import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

// proxy.ts already protects "/" (it's not in the public route matcher), so
// a signed-out visitor is redirected to sign-in before this component ever
// runs. redirect("/sign-in") below is defensive/documentation rather than
// the path actually hit in practice — redirect("/today") is the real one.
export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    redirect("/today");
  }

  redirect("/sign-in");
}
