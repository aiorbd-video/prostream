import { notFound } from "next/navigation";
import MatchDetailClient from "@/components/MatchDetailClient"; 

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

// 2. SEO Metadata (Dynamic Title & Images)
export async function generateMetadata({ params }) {
  const match = await getMatchData(params.id);
  
  if (!match) {
    return {
      title: "Match Not Found | Ratul Liv",
    };
  }

  // টাইটেল ফরম্যাট: "Argentina vs Brazil - FIFA World Cup"
  const pageTitle = `${match.team1.name} vs ${match.team2.name}`;
  const description = `Watch ${match.title} Live Streaming on Ratul Liv.`;

  // লোগো হ্যান্ডলিং (Default Image যদি লোগো না থাকে)
  const image1 = match.team1.logo || "https://via.placeholder.com/600x400?text=Team1";
  
  return {
    // Browser Tab Title
    title: pageTitle,
    description: description,

    // Facebook / WhatsApp / Telegram Preview
    openGraph: {
      title: pageTitle, // এখানে যা দিবেন, লিংকের বড় টাইটেল তাই হবে
      description: match.title, // ছোট লেখা (টুর্নামেন্ট নাম)
      siteName: "Ratul Liv",
      images: [
        {
          url: image1, // ডাইরেক্ট URL হতে হবে (প্রক্সি কাজ করবে না)
          width: 800,
          height: 600,
          alt: match.team1.name,
        },
      ],
      type: "video.other",
    },

    // Twitter Card
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description: description,
      images: [image1],
    },
  };
}

// 3. Render Client Component
export default async function MatchPage({ params }) {
  const match = await getMatchData(params.id);

  if (!match) return notFound();

  // Pass data to Client Component for Design & Player
  return <MatchDetailClient matchData={match} />;
}
