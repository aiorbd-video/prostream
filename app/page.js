"use client";
import { useState, useEffect } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import Link from "next/link";
import { formatDistanceToNow, parseISO } from "date-fns";
import { PlayCircle, Tv, Calendar } from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState("matches"); // matches | iptv
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

  // Helper for Image Proxy
  const getImg = (url) => url ? `/api/image-proxy?url=${encodeURIComponent(url)}` : "https://via.placeholder.com/50";

  // Flatten Matches
  const getAllMatches = () => {
    if (!data || !data.matches) return [];
    let all = [];
    Object.keys(data.matches).forEach((cat) => {
      Object.keys(data.matches[cat]).forEach((key) => {
        all.push({ ...data.matches[cat][key], id: key, category: cat });
      });
    });
    // Sort by status (Live first) then time
    return all.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  };

  const getStatus = (match) => {
    const now = new Date();
    const start = parseISO(match.startTime);
    const end = parseISO(match.endTime);
    
    if (now >= start && now <= end) return "LIVE";
    if (now > end) return "ENDED";
    return "UPCOMING";
  };

  if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading StreamHub...</div>;

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white pb-20">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#1a1a1a] p-4 shadow-md flex justify-between items-center border-b border-gray-800">
        <h1 className="text-xl font-bold text-[#ff0055]">ToffeeClone BD</h1>
        <div className="flex gap-2">
           <button onClick={() => setActiveTab("matches")} className={`px-4 py-1 rounded-full text-sm font-medium ${activeTab === 'matches' ? 'bg-[#ff0055]' : 'bg-gray-800'}`}>Matches</button>
           <button onClick={() => setActiveTab("iptv")} className={`px-4 py-1 rounded-full text-sm font-medium ${activeTab === 'iptv' ? 'bg-[#ff0055]' : 'bg-gray-800'}`}>IPTV</button>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto">
        
        {/* MATCHES TAB */}
        {activeTab === "matches" && (
          <div className="space-y-4">
            {getAllMatches().map((match, idx) => {
              const status = getStatus(match);
              return (
                <Link key={idx} href={`/match/${match.category}-${match.id}`} className="block">
                  <div className="bg-[#1e1e1e] rounded-xl overflow-hidden shadow-lg border border-gray-800 hover:border-[#ff0055] transition">
                    <div className="p-3 bg-gradient-to-r from-gray-900 to-gray-800 flex justify-between items-center">
                      <span className="text-xs text-gray-400 font-mono tracking-wider">{match.title}</span>
                      {status === "LIVE" ? (
                         <span className="flex items-center gap-1 text-red-500 text-xs font-bold animate-pulse"><span className="w-2 h-2 bg-red-500 rounded-full"></span> LIVE</span>
                      ) : (
                         <span className="text-xs text-blue-400 font-medium">{formatDistanceToNow(parseISO(match.startTime), { addSuffix: true })}</span>
                      )}
                    </div>
                    
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex flex-col items-center w-1/3">
                        <img src={getImg(match.team1?.logo)} className="w-12 h-12 object-contain mb-2" alt="T1" />
                        <span className="text-xs text-center font-bold text-gray-300">{match.team1?.name || "T1"}</span>
                      </div>
                      
                      <div className="flex flex-col items-center w-1/3 text-center">
                         <span className="text-2xl font-bold text-gray-600">VS</span>
                         <span className="text-[10px] text-gray-500 mt-1">{new Date(match.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>

                      <div className="flex flex-col items-center w-1/3">
                        <img src={getImg(match.team2?.logo)} className="w-12 h-12 object-contain mb-2" alt="T2" />
                        <span className="text-xs text-center font-bold text-gray-300">{match.team2?.name || "T2"}</span>
                      </div>
                    </div>
                    
                    <div className="bg-[#252525] p-2 text-center text-xs text-[#ff0055] font-semibold tracking-wide">
                       TAP TO WATCH
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* IPTV TAB */}
        {activeTab === "iptv" && data?.iptv && (
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(data.iptv).map(([key, item]) => (
               <Link href={`/iptv/${key}`} key={key}>
                 <div className="bg-[#1e1e1e] rounded-lg p-3 flex flex-col items-center gap-2 border border-gray-800 hover:border-blue-500 aspect-square justify-center">
                    <img src={getImg(item.logo)} className="w-10 h-10 object-contain rounded-full bg-white/10 p-1" />
                    <span className="text-xs text-center font-medium line-clamp-2">{item.name}</span>
                 </div>
               </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
