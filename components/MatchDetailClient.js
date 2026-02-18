"use client";
import { useState } from "react";
import Player from "@/components/ArtPlayer";
import { ArrowLeft, Server, Calendar, Clock, WifiOff } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default function MatchDetailClient({ matchData }) {
  const [currentStreamIndex, setCurrentStreamIndex] = useState(0);

  const streams = matchData.streams?.filter(s => s) || [];
  const currentStream = streams[currentStreamIndex] || {};

  // PLAYER OPTIONS
  const playerOption = {
    url: currentStream.url || "",
    // টাইপ ছোট হাতের অক্ষরে কনভার্ট করা হচ্ছে যাতে মিসম্যাচ না হয়
    type: (currentStream.type || "m3u8").toLowerCase(), 
    
    clearkey: currentStream.clearkey || currentStream.Clearkey || null, 
    referer: currentStream.referer || null,
    origin: currentStream.origin || null,
    userAgent: currentStream.userAgent || null,
    cookie: currentStream.cookie || null,
    proxies: currentStream.proxies || [],
    poster: matchData.team1?.logo ? `/api/image-proxy?url=${encodeURIComponent(matchData.team1.logo)}` : "",
  };

  const getImg = (url) => url ? `/api/image-proxy?url=${encodeURIComponent(url)}` : "https://via.placeholder.com/50";

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
       
       {/* === PLAYER SECTION === */}
       <div className="w-full bg-black sticky top-0 z-50 shadow-2xl border-b border-gray-900">
          <div className="ratul-player-wrapper aspect-video w-full relative group">
            {currentStream.url ? (
                <Player 
                    key={`${currentStream.url}-${currentStreamIndex}`} // ফোর্স রি-রেন্ডার
                    option={playerOption} 
                    style={{ width: "100%", height: "100%" }} 
                />
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 bg-[#111]">
                    <WifiOff size={50} className="mb-4 opacity-30"/>
                    <p className="text-sm font-bold uppercase tracking-widest opacity-60">Stream Unavailable</p>
                </div>
            )}
          </div>
       </div>

       {/* === MATCH INFO === */}
       <div className="p-4 md:max-w-5xl md:mx-auto w-full pb-20">
          {/* Server Selector */}
          <div className="mb-8 animate-fade-in-up">
             <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-[#ff0055] flex items-center gap-2 uppercase tracking-wider">
                  <Server size={14}/> Live Servers
                </h3>
             </div>
             
             <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {streams.map((stream, idx) => (
                   <button 
                      key={idx}
                      onClick={() => setCurrentStreamIndex(idx)}
                      className={`relative px-4 py-3 rounded-lg text-xs font-bold transition-all duration-300 border overflow-hidden ${
                         currentStreamIndex === idx 
                         ? "bg-[#ff0055] text-white border-[#ff0055]" 
                         : "bg-[#161616] text-gray-400 border-gray-800 hover:bg-[#222] hover:text-white"
                      }`}
                   >
                      <span className="uppercase tracking-wider opacity-80 text-[10px]">Server {idx + 1}</span>
                      <div className="text-sm truncate w-full text-left">{stream.name || `Stream ${idx + 1}`}</div>
                   </button>
                ))}
             </div>
          </div>

          <div className="text-center mt-10">
             <Link href="/?tab=matches" className="inline-flex items-center gap-2 px-8 py-3 bg-[#1a1a1a] border border-gray-700 rounded-full text-xs font-bold hover:bg-[#ff0055] hover:text-white uppercase tracking-wider">
                <ArrowLeft size={16}/> Back to Matches
             </Link>
          </div>
       </div>
    </div>
  );
}
