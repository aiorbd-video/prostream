"use client";
import { useState } from "react";
import Player from "@/components/ArtPlayer";
import { Server, MonitorPlay } from "lucide-react";

export default function PlayerSection({ matchData }) {
  const [currentStreamIndex, setCurrentStreamIndex] = useState(0);
  const streams = matchData.streams?.filter(s => s) || [];
  const currentStream = streams[currentStreamIndex] || {};

  const playerOption = {
    url: currentStream.url || "",
    type: currentStream.type === "dash" ? "dash" : "m3u8",
    clearkey: currentStream.clearkey || currentStream.Clearkey || null, 
    poster: matchData.team1?.logo ? `/api/image-proxy?url=${matchData.team1.logo}` : "",
  };

  return (
    <>
      {/* 1. PLAYER AREA */}
      <div className="w-full bg-black sticky top-0 z-50 shadow-2xl border-b border-gray-900">
          <div className="ratul-player-wrapper">
            {currentStream.url ? (
                <Player 
                    key={currentStream.url} 
                    option={playerOption} 
                    style={{ width: "100%", height: "100%" }} 
                />
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 bg-[#111] aspect-video">
                   <MonitorPlay size={40} className="mb-2 opacity-50"/>
                   <p>Stream Offline</p>
                </div>
            )}
          </div>
       </div>

       {/* 2. SERVER SELECTOR */}
       <div className="p-4 md:max-w-4xl md:mx-auto w-full">
          <div className="flex flex-wrap gap-2 justify-center">
            {streams.map((stream, idx) => (
                <button 
                    key={idx}
                    onClick={() => setCurrentStreamIndex(idx)}
                    className={`px-4 py-2 rounded text-xs font-bold transition-all border ${
                        currentStreamIndex === idx 
                        ? "bg-[#ff0055] text-white border-[#ff0055] shadow-lg" 
                        : "bg-[#1a1a1a] text-gray-400 border-gray-800 hover:bg-[#222]"
                    }`}
                >
                    {stream.name || `Server ${idx + 1}`}
                </button>
            ))}
          </div>
       </div>
    </>
  );
}
