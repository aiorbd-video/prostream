"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { ref, get } from "firebase/database";
import { useParams, useRouter } from "next/navigation";
import Player from "@/components/ArtPlayer";
import { ArrowLeft, Server, Calendar, Clock } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default function MatchPlayer() {
  const { id } = useParams(); // Format: category-matchId
  const router = useRouter();
  
  const [matchData, setMatchData] = useState(null);
  const [currentStreamIndex, setCurrentStreamIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // 1. Fetch Match Data
  useEffect(() => {
    if (!id) return;
    const parts = id.split("-");
    // Handle cases where ID might have multiple dashes
    const category = parts[0]; 
    const matchId = parts.slice(1).join("-");
    
    const matchRef = ref(db, `matches/${category}/${matchId}`);
    get(matchRef).then((snapshot) => {
      if (snapshot.exists()) {
        setMatchData(snapshot.val());
      }
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div className="h-screen bg-black text-white flex items-center justify-center font-mono">LOADING ARENA...</div>;
  if (!matchData) return <div className="h-screen bg-black text-white flex items-center justify-center">Match Not Found</div>;

  // 2. Stream Setup
  const streams = matchData.streams?.filter(s => s) || [];
  const currentStream = streams[currentStreamIndex] || {};

  // Player Options
  const playerOption = {
    url: currentStream.url || "",
    type: currentStream.type === "dash" ? "dash" : "m3u8",
    // Support both lowercase and uppercase keys from DB
    clearkey: currentStream.clearkey || currentStream.Clearkey || null, 
    poster: matchData.team1?.logo ? `/api/image-proxy?url=${matchData.team1.logo}` : "",
  };

  const getImg = (url) => url ? `/api/image-proxy?url=${encodeURIComponent(url)}` : "https://via.placeholder.com/50";

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
       
       {/* === PLAYER SECTION === */}
       <div className="w-full bg-black sticky top-0 z-50 shadow-2xl">
          {/* Desktop Friendly Wrapper */}
          <div className="ratul-player-wrapper">
            {currentStream.url ? (
                <Player 
                    key={currentStream.url} // Key change forces re-mount on server switch
                    option={playerOption} 
                    style={{ width: "100%", height: "100%" }} 
                />
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 bg-[#111] aspect-video">
                   {currentStream.type === 'iframe' ? (
                      <iframe src={currentStream.url} className="w-full h-full border-0" allowFullScreen></iframe>
                   ) : (
                      <>
                        <Server size={40} className="mb-2 opacity-50"/>
                        <p>Stream Offline or Not Selected</p>
                      </>
                   )}
                </div>
            )}
          </div>
       </div>

       {/* === MATCH INFO & CONTROLS === */}
       <div className="p-4 md:max-w-4xl md:mx-auto w-full pb-20">
          
          {/* Title & Date */}
          <div className="mb-6 border-b border-gray-800 pb-4">
             <h1 className="text-xl md:text-2xl font-black text-white mb-2">{matchData.title}</h1>
             <div className="flex items-center gap-4 text-sm text-gray-400">
                <span className="flex items-center gap-1"><Calendar size={14}/> {format(new Date(matchData.startTime), "dd MMM yyyy")}</span>
                <span className="flex items-center gap-1"><Clock size={14}/> {format(new Date(matchData.startTime), "hh:mm a")}</span>
             </div>
          </div>

          {/* VS Card */}
          <div className="bg-[#111] p-6 rounded-2xl border border-gray-800 mb-8 relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-r from-blue-900/10 to-red-900/10"></div>
             <div className="relative flex justify-between items-center text-center z-10">
                <div className="flex flex-col items-center w-1/3">
                   <img src={getImg(matchData.team1?.logo)} className="w-16 h-16 md:w-20 md:h-20 object-contain mb-3 drop-shadow-lg"/>
                   <div className="font-bold text-sm md:text-lg">{matchData.team1?.name}</div>
                </div>
                <div className="text-3xl font-black text-[#ff0055] italic">VS</div>
                <div className="flex flex-col items-center w-1/3">
                   <img src={getImg(matchData.team2?.logo)} className="w-16 h-16 md:w-20 md:h-20 object-contain mb-3 drop-shadow-lg"/>
                   <div className="font-bold text-sm md:text-lg">{matchData.team2?.name}</div>
                </div>
             </div>
          </div>

          {/* Server Selector */}
          <div className="mb-8">
             <h3 className="text-sm font-bold text-[#ff0055] mb-3 flex items-center gap-2 uppercase tracking-wider">
               <Server size={16}/> Select Server
             </h3>
             <div className="flex flex-wrap gap-3">
                {streams.map((stream, idx) => (
                   <button 
                      key={idx}
                      onClick={() => setCurrentStreamIndex(idx)}
                      className={`px-6 py-3 rounded-lg text-sm font-bold transition-all duration-300 border ${
                         currentStreamIndex === idx 
                         ? "bg-[#ff0055] text-white border-[#ff0055] shadow-[0_0_15px_rgba(255,0,85,0.4)]" 
                         : "bg-[#1a1a1a] text-gray-400 border-gray-700 hover:bg-[#222] hover:text-white"
                      }`}
                   >
                      {stream.name || `Server ${idx + 1}`}
                   </button>
                ))}
             </div>
          </div>

          {/* Back Button */}
          <div className="text-center">
             <Link href="/?tab=matches" className="inline-flex items-center gap-2 px-6 py-3 bg-gray-800 rounded-full text-sm font-bold hover:bg-gray-700 transition text-white">
                <ArrowLeft size={18}/> Back to Matches
             </Link>
          </div>

       </div>
    </div>
  );
}
