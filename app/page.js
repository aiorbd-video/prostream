"use client";
import { useState, useEffect } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import Link from "next/link";
import { format, formatDistanceToNow, parseISO, isBefore, isAfter, addMinutes } from "date-fns";

export default function Home() {
  const [activeTab, setActiveTab] = useState("matches"); 
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const dataRef = ref(db);
    onValue(dataRef, (snapshot) => {
      const val = snapshot.val();
      setData(val);
      setLoading(false);
    });
  }, []);

  const getImg = (url) => url ? `/api/image-proxy?url=${encodeURIComponent(url)}` : "https://via.placeholder.com/50";

  // --- FILTER & SORT LOGIC ---
  const getFilteredMatches = () => {
    if (!data || !data.matches) return [];
    let all = [];
    const now = new Date();

    Object.keys(data.matches).forEach((cat) => {
      Object.keys(data.matches[cat]).forEach((key) => {
        const match = data.matches[cat][key];
        const start = parseISO(match.startTime);
        const end = parseISO(match.endTime);
        const bufferEnd = addMinutes(end, 30); // 30 min buffer

        // Show if upcoming or currently live (or ended recently)
        if (isBefore(now, bufferEnd)) {
           all.push({ ...match, id: key, category: cat, startObj: start, endObj: end });
        }
      });
    });

    // Sort: Live first, then by time
    return all.sort((a, b) => {
        const aLive = isAfter(now, a.startObj) && isBefore(now, a.endObj);
        const bLive = isAfter(now, b.startObj) && isBefore(now, b.endObj);
        if (aLive && !bLive) return -1;
        if (!aLive && bLive) return 1;
        return a.startObj - b.startObj;
    });
  };

  const getStatus = (match) => {
    const now = new Date();
    if (isAfter(now, match.startObj) && isBefore(now, match.endObj)) return "LIVE";
    return "UPCOMING";
  };

  if (loading) return <div className="min-h-screen bg-black text-cyan-400 flex items-center justify-center font-mono">LOADING STREAM HUB...</div>;

  return (
    <div className="min-h-screen bg-black text-white pb-20 font-sans selection:bg-cyan-500 selection:text-black">
      
      {/* --- HEADER --- */}
      <div className="sticky top-0 z-50 bg-black/90 backdrop-blur-md p-4 border-b border-cyan-900/30 flex justify-between items-center shadow-[0_0_15px_rgba(6,182,212,0.15)]">
        <h1 className="text-xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
          STREAM<span className="text-white">HUB</span>
        </h1>
        <div className="flex gap-2 bg-gray-900/50 p-1 rounded-full border border-gray-800">
           <button onClick={() => setActiveTab("matches")} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${activeTab === 'matches' ? 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 'text-gray-400 hover:text-white'}`}>MATCHES</button>
           <button onClick={() => setActiveTab("iptv")} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${activeTab === 'iptv' ? 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 'text-gray-400 hover:text-white'}`}>TV CHANNELS</button>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto mt-4">
        
        {/* --- MATCHES TAB (DESIGN FROM IMAGE) --- */}
        {activeTab === "matches" && (
          <div className="space-y-8"> 
            {getFilteredMatches().map((match, idx) => {
              const status = getStatus(match);
              return (
                <Link key={idx} href={`/match/${match.category}-${match.id}`} className="block group relative">
                  
                  {/* Neon Glow Effect */}
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
                  
                  {/* Card Container */}
                  <div className="relative bg-[#0a0a0a] rounded-2xl border border-cyan-500/50 p-5 pt-8 hover:border-cyan-400 transition-all duration-300 shadow-xl">
                    
                    {/* Floating League Badge (Top Center) */}
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <div className="bg-black border border-cyan-500/50 px-4 py-1.5 rounded-full shadow-lg flex items-center gap-2 whitespace-nowrap">
                        {/* You can add a small league icon here if available */}
                         <span className="text-[10px] font-bold tracking-wider text-white uppercase">{match.title}</span>
                      </div>
                    </div>

                    {/* Match Content */}
                    <div className="flex items-center justify-between mt-2">
                      
                      {/* Team 1 */}
                      <div className="flex flex-col items-center w-[30%] space-y-2">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-b from-gray-800 to-black p-2 border border-gray-700 shadow-inner flex items-center justify-center group-hover:scale-110 transition duration-300">
                           <img src={getImg(match.team1?.logo)} className="w-full h-full object-contain" alt="T1" />
                        </div>
                        <span className="text-xs font-bold text-center text-gray-200 leading-tight">{match.team1?.name}</span>
                      </div>

                      {/* Center Info (Time/Live) */}
                      <div className="flex flex-col items-center justify-center w-[40%] text-center">
                         {status === "LIVE" ? (
                            <div className="flex flex-col items-center animate-pulse">
                               <span className="text-red-500 font-black text-sm tracking-widest uppercase mb-1">● LIVE</span>
                               <span className="text-xs text-gray-400 font-mono">WATCH NOW</span>
                            </div>
                         ) : (
                            <div className="flex flex-col items-center gap-1">
                               <span className="text-lg font-bold text-white">
                                  {format(match.startObj, "hh:mm a")}
                               </span>
                               <span className="text-sm font-bold text-cyan-400">
                                  {format(match.startObj, "dd/MM/yyyy")}
                               </span>
                            </div>
                         )}
                      </div>

                      {/* Team 2 */}
                      <div className="flex flex-col items-center w-[30%] space-y-2">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-b from-gray-800 to-black p-2 border border-gray-700 shadow-inner flex items-center justify-center group-hover:scale-110 transition duration-300">
                           <img src={getImg(match.team2?.logo)} className="w-full h-full object-contain" alt="T2" />
                        </div>
                        <span className="text-xs font-bold text-center text-gray-200 leading-tight">{match.team2?.name}</span>
                      </div>

                    </div>

                    {/* Bottom Countdown / Status Text */}
                    <div className="mt-4 pt-3 border-t border-gray-800 text-center">
                        {status === "LIVE" ? (
                           <span className="text-cyan-400 text-xs font-bold tracking-wider">STREAMING LIVE • HD QUALITY</span>
                        ) : (
                           <span className="text-gray-400 text-xs font-medium">
                             Starts in <span className="text-white font-bold">{formatDistanceToNow(match.startObj)}</span>
                           </span>
                        )}
                    </div>

                  </div>
                </Link>
              );
            })}
            
            {getFilteredMatches().length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-gray-600">
                   <p>No matches scheduled</p>
                </div>
            )}
          </div>
        )}

        {/* --- IPTV TAB (Grid Style) --- */}
        {activeTab === "iptv" && data?.iptv && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 animate-fade-in">
            {Object.entries(data.iptv).map(([key, item]) => (
               <Link href={`/iptv/${key}`} key={key} className="group">
                 <div className="bg-[#111] rounded-2xl p-4 flex flex-col items-center gap-3 border border-gray-800 hover:border-cyan-500 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all duration-300 aspect-square justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-tr from-cyan-900/10 to-transparent opacity-0 group-hover:opacity-100 transition"></div>
                    <img src={getImg(item.logo)} className="w-12 h-12 object-contain z-10 drop-shadow-lg group-hover:scale-110 transition" />
                    <span className="text-[10px] font-bold text-center text-gray-300 group-hover:text-cyan-400 z-10 uppercase tracking-wide line-clamp-2">{item.name}</span>
                 </div>
               </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
    }
