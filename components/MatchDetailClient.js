"use client";
import { useState } from "react";
import Player from "@/components/ArtPlayer";
import { ArrowLeft, Server, Calendar, Clock, MonitorPlay, WifiOff } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default function MatchDetailClient({ matchData }) {
  const [currentStreamIndex, setCurrentStreamIndex] = useState(0);

  // 1. Safe Stream Data Access
  const streams = matchData.streams?.filter(s => s) || [];
  const currentStream = streams[currentStreamIndex] || {};

  // 2. Player Options Construction (Pass ALL Data)
  const playerOption = {
    url: currentStream.url || "",
    // Fix: Type force logic removed. Use the type directly (m3u8, dash, mp4, iframe)
    type: currentStream.type || "m3u8", 
    
    // DRM & Headers
    clearkey: currentStream.clearkey || currentStream.Clearkey || null, 
    referer: currentStream.referer || null,
    origin: currentStream.origin || null,
    userAgent: currentStream.userAgent || null,
    cookie: currentStream.cookie || null,
    proxies: currentStream.proxies || [], // Proxy Retry List pass kora holo

    // Poster
    poster: matchData.team1?.logo ? `/api/image-proxy?url=${encodeURIComponent(matchData.team1.logo)}` : "",
  };

  // Image Proxy Helper
  const getImg = (url) => url ? `/api/image-proxy?url=${encodeURIComponent(url)}` : "https://via.placeholder.com/50";

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
       
       {/* === PLAYER SECTION === */}
       <div className="w-full bg-black sticky top-0 z-50 shadow-2xl border-b border-gray-900">
          <div className="ratul-player-wrapper aspect-video w-full relative group">
            {currentStream.url ? (
                <Player 
                    // Key change forces complete re-render when server changes
                    key={`${currentStream.url}-${currentStreamIndex}`} 
                    option={playerOption} 
                    style={{ width: "100%", height: "100%" }} 
                />
            ) : (
                // Offline / No Stream UI
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 bg-[#111]">
                    <WifiOff size={50} className="mb-4 opacity-30"/>
                    <p className="text-sm font-bold uppercase tracking-widest opacity-60">Stream Unavailable</p>
                    <p className="text-xs text-gray-600 mt-1">Please select another server</p>
                </div>
            )}
          </div>
       </div>

       {/* === MATCH INFO & CONTROLS === */}
       <div className="p-4 md:max-w-5xl md:mx-auto w-full pb-20">
          
          {/* --- SERVER SELECTOR --- */}
          <div className="mb-8 animate-fade-in-up">
             <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-[#ff0055] flex items-center gap-2 uppercase tracking-wider">
                  <Server size={14}/> Live Servers
                </h3>
                {streams.length > 0 && (
                   <span className="text-[10px] text-gray-500 bg-gray-900/80 px-2 py-1 rounded border border-gray-800">
                      {streams.length} Sources Available
                   </span>
                )}
             </div>
             
             {streams.length > 0 ? (
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {streams.map((stream, idx) => (
                       <button 
                          key={idx}
                          onClick={() => setCurrentStreamIndex(idx)}
                          className={`relative px-4 py-3 rounded-lg text-xs font-bold transition-all duration-300 border overflow-hidden ${
                             currentStreamIndex === idx 
                             ? "bg-gradient-to-r from-[#ff0055] to-[#cc0044] text-white border-[#ff0055] shadow-lg shadow-[#ff0055]/20" 
                             : "bg-[#161616] text-gray-400 border-gray-800 hover:bg-[#222] hover:border-gray-600 hover:text-white"
                          }`}
                       >
                          {/* Active Indicator Dot */}
                          {currentStreamIndex === idx && (
                             <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-white rounded-full animate-pulse shadow-glow"></span>
                          )}
                          
                          <div className="flex flex-col items-start gap-1">
                              <span className="uppercase tracking-wider opacity-80 text-[10px]">Server {idx + 1}</span>
                              <span className="text-sm truncate w-full text-left">{stream.name || `Stream ${idx + 1}`}</span>
                          </div>
                       </button>
                    ))}
                 </div>
             ) : (
                 <div className="p-4 bg-gray-900/30 border border-gray-800 rounded-lg text-center text-gray-500 text-xs">
                     No live servers found for this match.
                 </div>
             )}
          </div>

          {/* Title & Time */}
          <div className="mb-8 text-center md:text-left">
             <h1 className="text-xl md:text-3xl font-black text-white mb-3 leading-tight tracking-tight">
                {matchData.title}
             </h1>
             <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-xs md:text-sm text-gray-400 font-mono">
                {matchData.startTime && (
                    <>
                    <span className="flex items-center gap-1.5 bg-[#1a1a1a] px-3 py-1.5 rounded-full border border-gray-800">
                        <Calendar size={13}/> {format(new Date(matchData.startTime), "dd MMM yyyy")}
                    </span>
                    <span className="flex items-center gap-1.5 bg-[#1a1a1a] px-3 py-1.5 rounded-full border border-gray-800">
                        <Clock size={13}/> {format(new Date(matchData.startTime), "hh:mm a")}
                    </span>
                    </>
                )}
             </div>
          </div>

          {/* VS Card (Team Logos) */}
          <div className="bg-[#111] p-6 rounded-2xl border border-gray-800/60 mb-8 relative overflow-hidden shadow-2xl">
             {/* Background Glow */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-[#ff0055]/10 blur-3xl rounded-full pointer-events-none"></div>
             
             <div className="relative flex justify-between items-center text-center z-10 max-w-lg mx-auto">
                {/* Team 1 */}
                <div className="flex flex-col items-center w-1/3 group">
                   <div className="w-20 h-20 md:w-24 md:h-24 bg-black/40 rounded-full p-4 mb-3 border border-gray-800 shadow-xl group-hover:border-[#ff0055]/50 transition duration-300">
                      <img 
                        src={getImg(matchData.team1?.logo)} 
                        alt={matchData.team1?.name}
                        className="w-full h-full object-contain drop-shadow-lg transform group-hover:scale-110 transition duration-300"
                      />
                   </div>
                   <div className="font-bold text-sm md:text-base text-gray-200">{matchData.team1?.name || "TBA"}</div>
                </div>
                
                {/* VS Badge */}
                <div className="flex flex-col items-center justify-center">
                   <span className="text-5xl font-black text-[#222] select-none italic tracking-tighter">VS</span>
                </div>

                {/* Team 2 */}
                <div className="flex flex-col items-center w-1/3 group">
                   <div className="w-20 h-20 md:w-24 md:h-24 bg-black/40 rounded-full p-4 mb-3 border border-gray-800 shadow-xl group-hover:border-[#ff0055]/50 transition duration-300">
                      <img 
                        src={getImg(matchData.team2?.logo)} 
                        alt={matchData.team2?.name}
                        className="w-full h-full object-contain drop-shadow-lg transform group-hover:scale-110 transition duration-300"
                      />
                   </div>
                   <div className="font-bold text-sm md:text-base text-gray-200">{matchData.team2?.name || "TBA"}</div>
                </div>
             </div>
          </div>

          {/* Back Button */}
          <div className="text-center mt-10">
             <Link href="/?tab=matches" className="inline-flex items-center gap-2 px-8 py-3 bg-[#1a1a1a] border border-gray-700 rounded-full text-xs font-bold hover:bg-[#ff0055] hover:border-[#ff0055] transition-all duration-300 text-gray-300 hover:text-white uppercase tracking-wider shadow-lg hover:shadow-[#ff0055]/40">
                <ArrowLeft size={16}/> Back to Matches
             </Link>
          </div>

       </div>
    </div>
  );
}
