import { notFound } from "next/navigation";
import MatchDetailClient from "@/components/MatchDetailClient"; // Client Component Import

// 1. Data Fetching (Server Side)
async function getMatchData(id) {
  const parts = id.split("-");
  const category = parts[0];
  const matchId = parts.slice(1).join("-");

  const res = await fetch(
    `https://ratul-liv-default-rtdb.asia-southeast1.firebasedatabase.app/matches/${category}/${matchId}.json`,
    { cache: "no-store" }
  );

  if (!res.ok) return null;
  return res.json();
}

// 2. SEO Metadata (Google/Facebook Share Fix)
export async function generateMetadata({ params }) {
  const match = await getMatchData(params.id);
  if (!match) return { title: "Match Not Found" };

  return {
    title: `${match.team1.name} vs ${match.team2.name} | Ratul Liv`,
    description: `Watch ${match.title} live streaming.`,
    openGraph: {
      title: `${match.team1.name} vs ${match.team2.name}`,
      description: `Watch Live: ${match.title}`,
      // Metadata images must be absolute URLs. Using direct URL or a public proxy for SEO only.
      images: [
        match.team1.logo || "https://via.placeholder.com/800x400", 
      ], 
    },
  };
}

// 3. Render Client Component
export default async function MatchPage({ params }) {
  const match = await getMatchData(params.id);

  if (!match) return notFound();

  // Pass data to the Client Component (Your preferred design lives there)
  return <MatchDetailClient matchData={match} />;
}
