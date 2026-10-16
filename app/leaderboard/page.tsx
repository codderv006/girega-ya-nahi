import type { Metadata } from "next";
import { LeaderboardView } from "@/components/LeaderboardView";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { APP_NAME } from "@/lib/config";

export const metadata: Metadata = { title: `Leaderboard · ${APP_NAME}` };

export default function LeaderboardPage() {
  return (
    <main className="min-h-dvh">
      <SiteHeader />
      <LeaderboardView />
      <SiteFooter />
    </main>
  );
}
