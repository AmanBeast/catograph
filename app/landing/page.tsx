import { auth } from "@clerk/nextjs/server";
import { LandingPage } from "@/components/landing/landing-page";

export default async function LandingRoute() {
  const { userId } = await auth();
  return <LandingPage isSignedIn={Boolean(userId)} />;
}
