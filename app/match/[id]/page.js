"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { ref, get } from "firebase/database";
import { useParams } from "next/navigation";
import Player from "@/components/ArtPlayer";
import { ArrowLeft, Server } from "lucide-react";
import Link from "next/link";

export default function MatchPlayer() {
  const { id } = useParams(); // Format: category-matchId (e.g., cricket-match1)
  const [matchData, setMatchData] = useState(null);
  const [currentStreamIndex, setCurrentStreamIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const [category, matchId] = id.split("-");
    
    // Fetch specifically this match
    const matchRef = ref(db, `matches/${category}/${matchId}`);
    get(matchRef).then((snapshot) => {
      if (snapshot.exists()) {
        setMatchData(snapshot.val());
      }
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div className="h-screen bg-black text-white flex items-center justify-center">Loading Arena...</div>;
  if (!matchData) return <div className="h-screen bg-black text-white flex items-center justify-center">Match not found</div>;

  // Filter out null streams
  const streams = matchData.streams?.filter(s => s) || [];
  const currentStream = streams[currentStreamIndex] || {};

  // Player Options
  const playerOption = {
    url: currentStream.url || "",
    type: currentStream.type === "dash" ? "dash" : "m3u8", // Auto detect or force
    clearkey: currentStream.clearkey || null,
    poster: matchData.team1?.logo ? `/api/image-proxy?url=${matchData.team1.logo}` : "",
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
       {/* Player Container */}
       <div className="w-full aspect-video bg-black sticky top-0 z-50">
          {currentStream.url ? (
             <Player 
                option={playerOption} 
                style={{ width: "100%", height: "100%" }} 
             />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500">
               {currentStream.type === 'iframe' ? (
                  <iframe src={currentStream.url} className="w-full h-full border-0" allowFullScreen></iframe>
               ) : "Stream Offline"}
            </div>
          )}
       </div>

       {/* Info & Servers */}
       <div className="p-4 flex-1 overflow-y-auto">
          <h1 className="text-lg font-bold text-white mb-1">{matchData.title}</h1>
          <p className="text-gray-400 text-sm mb-4">
             {new Date(matchData.startTime).toLocaleString()}
          </p>

          {/* Server Selector */}
          <div className="mb-6">
             <h3 className="text-sm font-semibold text-[#ff0055] mb-2 flex items-center gap-2">
               <Server size={16}/> STREAM SERVERS
             </h3>
             <div className="flex flex-wrap gap-2">
                {streams.map((stream, idx) => (
                   <button 
                      key={idx}
                      onClick={() => setCurrentStreamIndex(idx)}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
                         currentStreamIndex === idx 
                         ? "bg-[#ff0055] text-white shadow-lg shadow-pink-500/20" 
                         : "bg-[#222] text-gray-300 hover:bg-[#333]"
                      }`}
                   >
                      {stream.name || `Server ${idx + 1}`}
                   </button>
                ))}
             </div>
          </div>

          <div className="bg-[#111] p-4 rounded-xl border border-gray-800">
             <div className="flex justify-between items-center text-center">
                <div>
                   <img src={`/api/image-proxy?url=${encodeURIComponent(matchData.team1?.logo)}`} className="w-16 h-16 object-contain mx-auto mb-2"/>
                   <div className="font-bold">{matchData.team1?.name}</div>
                </div>
                <div className="text-2xl font-black text-[#ff0055]">VS</div>
                <div>
                   <img src={`/api/image-proxy?url=${encodeURIComponent(matchData.team2?.logo)}`} className="w-16 h-16 object-contain mx-auto mb-2"/>
                   <div className="font-bold">{matchData.team2?.name}</div>
                </div>
             </div>
          </div>
          
          <Link href="/" className="mt-8 block text-center py-3 bg-gray-800 rounded-full text-sm font-medium">
             Back to Home
          </Link>
       </div>
    </div>
  );
}
