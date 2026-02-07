import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, Calendar, Clock, Server, Trophy } from "lucide-react";
import Link from "next/link";
import PlayerSection from "@/components/PlayerSection"; // এটা আমরা নিচে তৈরি করব

// ১. ডাটা ফেচ করার ফাংশন (Server Side)
async function getMatchData(id) {
  // ID থেকে ক্যাটাগরি এবং ম্যাচ আইডি আলাদা করা
  const parts = id.split("-");
  const category = parts[0];
  const matchId = parts.slice(1).join("-");

  // ফায়ারবেজ REST API কল (SSR এর জন্য বেস্ট)
  const res = await fetch(
    `https://ratul-liv-default-rtdb.asia-southeast1.firebasedatabase.app/matches/${category}/${matchId}.json`,
    { cache: "no-store" } // ডাটা যেন ক্যাশ না থাকে, সবসময় ফ্রেশ থাকে
  );

  if (!res.ok) return null;
  return res.json();
}

// ২. ডাইনামিক মেটাডাটা (SEO & Social Share)
export async function generateMetadata({ params }) {
  const match = await getMatchData(params.id);
  if (!match) return { title: "Match Not Found" };

  return {
    title: `${match.team1.name} vs ${match.team2.name} | Ratul Liv`,
    description: `Watch ${match.title} live streaming.`,
    openGraph: {
      title: `${match.team1.name} vs ${match.team2.name}`,
      description: `Watch Live: ${match.title}`,
      images: [match.team1.logo, match.team2.logo], // শেয়ার করলে লোগো দেখাবে
    },
  };
}

// ৩. মেইন পেজ কম্পোনেন্ট (Server Component)
export default async function MatchPage({ params }) {
  const match = await getMatchData(params.id);

  if (!match) return notFound();

  // ইমেজ প্রক্সি হেল্পার
  const getImg = (url) =>
    url ? `/api/image-proxy?url=${encodeURIComponent(url)}` : "";

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans">
      
      {/* --- CLIENT COMPONENT FOR PLAYER (নিচে কোড দেওয়া আছে) --- */}
      <PlayerSection matchData={match} />

      {/* --- SSR CONTENT SECTION --- */}
      <div className="p-4 md:max-w-4xl md:mx-auto w-full pb-20">
        
        {/* 1. MATCH TITLE & INFO */}
        <div className="text-center mb-6 mt-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ff0055]/10 border border-[#ff0055]/30 text-[#ff0055] text-xs font-bold mb-3 uppercase tracking-wider">
             <Trophy size={12} /> {match.title}
          </div>
          <div className="flex justify-center items-center gap-4 text-xs text-gray-400 font-mono">
             <span className="flex items-center gap-1"><Calendar size={12}/> {format(new Date(match.startTime), "dd MMM yyyy")}</span>
             <span className="flex items-center gap-1"><Clock size={12}/> {format(new Date(match.startTime), "hh:mm a")}</span>
          </div>
        </div>

        {/* 2. TEAM 1 VS TEAM 2 CARD (PREMIUM DESIGN) */}
        <div className="relative w-full bg-gradient-to-br from-[#111] via-black to-[#111] border border-gray-800 rounded-3xl p-6 md:p-10 shadow-2xl overflow-hidden mb-8 group">
           
           {/* Background Glow Effect */}
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-[#ff0055] blur-[100px] opacity-20 group-hover:opacity-30 transition duration-700"></div>

           <div className="relative z-10 flex items-center justify-between">
              
              {/* Team 1 */}
              <div className="flex flex-col items-center w-[35%]">
                 <div className="w-20 h-20 md:w-28 md:h-28 bg-[#1a1a1a] rounded-full p-4 mb-4 border border-gray-700 shadow-[0_0_20px_rgba(0,0,0,0.5)] flex items-center justify-center">
                    <img 
                      src={getImg(match.team1?.logo)} 
                      alt={match.team1?.name}
                      className="w-full h-full object-contain drop-shadow-md"
                    />
                 </div>
                 <h2 className="text-sm md:text-xl font-bold text-center text-gray-100 leading-tight">
                    {match.team1?.name}
                 </h2>
              </div>

              {/* VS Badge */}
              <div className="flex flex-col items-center justify-center w-[30%]">
                 <div className="relative">
                    <span className="text-5xl md:text-7xl font-black italic text-transparent bg-clip-text bg-gradient-to-b from-gray-600 to-gray-900 opacity-50">VS</span>
                    <span className="absolute inset-0 flex items-center justify-center text-3xl md:text-5xl font-black italic text-[#ff0055] drop-shadow-[0_0_10px_rgba(255,0,85,0.5)]">VS</span>
                 </div>
                 <div className="mt-2 px-3 py-0.5 bg-red-600 rounded text-[10px] font-bold tracking-widest animate-pulse">
                    LIVE
                 </div>
              </div>

              {/* Team 2 */}
              <div className="flex flex-col items-center w-[35%]">
                 <div className="w-20 h-20 md:w-28 md:h-28 bg-[#1a1a1a] rounded-full p-4 mb-4 border border-gray-700 shadow-[0_0_20px_rgba(0,0,0,0.5)] flex items-center justify-center">
                    <img 
                      src={getImg(match.team2?.logo)} 
                      alt={match.team2?.name}
                      className="w-full h-full object-contain drop-shadow-md"
                    />
                 </div>
                 <h2 className="text-sm md:text-xl font-bold text-center text-gray-100 leading-tight">
                    {match.team2?.name}
                 </h2>
              </div>

           </div>
        </div>

        {/* Back Button */}
        <div className="text-center">
             <Link href="/?tab=matches" className="inline-flex items-center gap-2 px-6 py-3 bg-[#1a1a1a] border border-gray-700 rounded-full text-xs font-bold hover:bg-[#ff0055] hover:border-[#ff0055] transition text-gray-300 hover:text-white uppercase tracking-wider">
                <ArrowLeft size={16}/> Back to Matches
             </Link>
        </div>

      </div>
    </div>
  );
}
