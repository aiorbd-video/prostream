"use client";
import { useState } from "react";
import Player from "@/components/ArtPlayer";
import { ArrowLeft, Server, Calendar, Clock, MonitorPlay } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default function MatchDetailClient({ matchData }) {
  const [currentStreamIndex, setCurrentStreamIndex] = useState(0);

  // Stream Setup
  const streams = matchData.streams?.filter(s => s) || [];
  const currentStream = streams[currentStreamIndex] || {};

  // Player Options
  const playerOption = {
    url: currentStream.url || "",
    type: currentStream.type === "dash" ? "dash" : "m3u8",
    clearkey: currentStream.clearkey || currentStream.Clearkey || null, 
    poster: matchData.team1?.logo ? `/api/image-proxy?url=${encodeURIComponent(matchData.team1.logo)}` : "",
  };

  // Image Proxy Helper (Client Side - Works Perfectly)
  const getImg = (url) => url ? `/api/image-proxy?url=${encodeURIComponent(url)}` : "https://via.placeholder.com/50";

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
       
       {/* === PLAYER SECTION === */}
       <div className="w-full bg-black sticky top-0 z-50 shadow-2xl border-b border-gray-900">
          <div className="ratul-player-wrapper">
            {currentStream.url ? (
                <Player 
                    key={currentStream.url} // Key change forces re-mount
                    option={playerOption} 
                    style={{ width: "100%", height: "100%" }} 
                />
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 bg-[#111] aspect-video">
                   {currentStream.type === 'iframe' ? (
                      <iframe src={currentStream.url} className="w-full h-full border-0" allowFullScreen></iframe>
                   ) : (
                      <>
                        <MonitorPlay size={40} className="mb-2 opacity-50"/>
                        <p>Stream Offline or Not Selected</p>
                      </>
                   )}
                </div>
            )}
          </div>
       </div>

       {/* === MATCH INFO & CONTROLS === */}
       <div className="p-4 md:max-w-4xl md:mx-auto w-full pb-20">
          
          {/* --- SERVER SELECTOR (UP) --- */}
          <div className="mb-6 animate-fade-in-up">
             <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-[#ff0055] flex items-center gap-2 uppercase tracking-wider">
                  <Server size={14}/> Live Servers
                </h3>
                <span className="text-[10px] text-gray-500 bg-gray-900 px-2 py-1 rounded border border-gray-800">
                   Auto-Switch Supported
                </span>
             </div>
             
             <div className="flex flex-wrap gap-2">
                {streams.map((stream, idx) => (
                   <button 
                      key={idx}
                      onClick={() => setCurrentStreamIndex(idx)}
                      className={`flex-1 min-w-[100px] px-3 py-2.5 rounded text-xs font-bold transition-all duration-200 border relative overflow-hidden group ${
                         currentStreamIndex === idx 
                         ? "bg-[#ff0055] text-white border-[#ff0055] shadow-[0_0_10px_rgba(255,0,85,0.3)]" 
                         : "bg-[#1a1a1a] text-gray-400 border-gray-800 hover:bg-[#222] hover:text-white"
                      }`}
                   >
                      <span className="relative z-10">{stream.name || `Server ${idx + 1}`}</span>
                      {currentStreamIndex === idx && (
                         <span className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                      )}
                   </button>
                ))}
             </div>
          </div>

          {/* Title & Date */}
          <div className="mb-6">
             <h1 className="text-lg md:text-2xl font-black text-white mb-2 leading-tight">{matchData.title}</h1>
             <div className="flex items-center gap-4 text-xs md:text-sm text-gray-400 font-mono">
                <span className="flex items-center gap-1.5 bg-gray-900 px-2 py-1 rounded"><Calendar size={12}/> {format(new Date(matchData.startTime), "dd MMM yyyy")}</span>
                <span className="flex items-center gap-1.5 bg-gray-900 px-2 py-1 rounded"><Clock size={12}/> {format(new Date(matchData.startTime), "hh:mm a")}</span>
             </div>
          </div>

          {/* VS Card (Premium Design) */}
          <div className="bg-gradient-to-b from-[#111] to-black p-6 rounded-2xl border border-gray-800 mb-8 relative overflow-hidden shadow-lg">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#ff0055] to-transparent opacity-50"></div>
             
             <div className="relative flex justify-between items-center text-center z-10">
                {/* Team 1 */}
                <div className="flex flex-col items-center w-1/3">
                   <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-900/50 rounded-full p-3 mb-3 border border-gray-800 shadow-inner">
                      <img src={getImg(matchData.team1?.logo)} className="w-full h-full object-contain drop-shadow-md"/>
                   </div>
                   <div className="font-bold text-sm md:text-base text-gray-200">{matchData.team1?.name}</div>
                </div>
                
                {/* VS Badge */}
                <div className="flex flex-col items-center justify-center">
                   <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-gray-500 to-gray-800 italic pr-1">VS</span>
                </div>

                {/* Team 2 */}
                <div className="flex flex-col items-center w-1/3">
                   <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-900/50 rounded-full p-3 mb-3 border border-gray-800 shadow-inner">
                      <img src={getImg(matchData.team2?.logo)} className="w-full h-full object-contain drop-shadow-md"/>
                   </div>
                   <div className="font-bold text-sm md:text-base text-gray-200">{matchData.team2?.name}</div>
                </div>
             </div>
          </div>

          {/* Back Button */}
          <div className="text-center mt-8">
             <Link href="/?tab=matches" className="inline-flex items-center gap-2 px-6 py-3 bg-[#1a1a1a] border border-gray-700 rounded-full text-xs font-bold hover:bg-[#ff0055] hover:border-[#ff0055] transition text-gray-300 hover:text-white uppercase tracking-wider">
                <ArrowLeft size={16}/> Back to Matches
             </Link>
          </div>

       </div>
    </div>
  );
}
