import { Suspense } from "react";
import { TEAM_META } from "@/lib/dashboard/team-meta";
import TeamPageClient from "./TeamPageClient";

export function generateStaticParams() {
  return Object.keys(TEAM_META).map((team) => ({ team }));
}

export default async function Page({ params }: { params: Promise<{ team: string }> }) {
  const { team } = await params;
  return (
    <Suspense>
      <TeamPageClient team={team} />
    </Suspense>
  );
}
