"use client";
import { useState, useEffect } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import Link from "next/link";
import { format, parseISO, isBefore, isAfter, addMinutes, isToday, differenceInSeconds } from "date-fns";

export default function Home() {
  const [activeTab, setActiveTab] = useState("matches"); 
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date()); // লাইভ টাইমার

  // ১. ফায়ারবেজ ডাটা লোড
  useEffect(() => {
    const dataRef = ref(db);
    onValue(dataRef, (snapshot) => {
      const val = snapshot.val();
      setData(val);
      setLoading(false);
    });
  }, []);

  // ২. প্রতি সেকেন্ডে ঘড়ি আপডেট (কাউন্টডাউন এর জন্য)
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getImg = (url) => url ? `/api/image-proxy?url=${encodeURIComponent(url)}` : "https://via.placeholder.com/50";

  // --- ফিল্টার লজিক ---
  const getFilteredMatches = () => {
    if (!data || !data.matches) return [];
    let all = [];

    Object.keys(data.matches).forEach((cat) => {
      Object.keys(data.matches[cat]).forEach((key) => {
        const match = data.matches[cat][key];
        const start = parseISO(match.startTime);
        const end = parseISO(match.endTime);
        const bufferEnd = addMinutes(end, 30); // খেলা শেষ হওয়ার ৩০ মিনিট পর পর্যন্ত থাকবে

        // ফিল্টার: খেলা শেষ হয়ে ৩০ মিনিট পার না হলে লিস্টে থাকবে
        if (isBefore(now, bufferEnd)) {
           all.push({ ...match, id: key, category: cat, startObj: start, endObj: end });
        }
      });
    });

    // সর্টিং: লাইভ খেলা সবার আগে, তারপর সময়ের ক্রম অনুযায়ী
    return all.sort((a, b) => {
        const aLive = isAfter(now, a.startObj) && isBefore(now, a.endObj);
        const bLive = isAfter(now, b.startObj) && isBefore(now, b.endObj);
        if (aLive && !bLive) return -1;
        if (!aLive && bLive) return 1;
        return a.startObj - b.startObj;
    });
  };

  // --- স্পেশাল কাউন্টডাউন ফাংশন (আপনার রিকোয়ারমেন্ট অনুযায়ী) ---
  const getMatchStatusText = (match) => {
    const start = match.startObj;
    const end = match.endObj;

    // ১. লাইভ লজিক
    if (isAfter(now, start) && isBefore(now, end)) {
        return <span className="text-red-500 font-bold animate-pulse">● LIVE NOW</span>;
    }

    // ২. খেলা শুরু হতে কতক্ষণ বাকি (সেকেন্ডে)
    const diffSec = differenceInSeconds(start, now);

    // ৩. যদি ২ ঘন্টার কম সময় বাকি থাকে -> কাউন্টডাউন (HH:MM:SS)
    if (diffSec > 0 && diffSec < 7200) {
        const hours = Math.floor(diffSec / 3600).toString().padStart(2, '0');
        const mins = Math.floor((diffSec % 3600) / 60).toString().padStart(2, '0');
        const secs = (diffSec % 60).toString().padStart(2, '0');
        return <span className="text-yellow-400 font-mono font-bold">Starting in {hours}:{mins}:{secs}</span>;
    }

    // ৪. যদি ২ ঘন্টার বেশি বাকি থাকে এবং আজকেই খেলা হয়
    if (diffSec >= 7200 && isToday(start)) {
        return <span className="text-blue-400">Starts today at {format(start, "hh:mm a")}</span>;
    }

    // ৫. যদি আগামীকালের বা পরের খেলা হয়
    if (diffSec > 0 && !isToday(start)) {
        return <span className="text-gray-400">Starts in {format(start, "EEEE dd MMMM 'at' hh:mm a")}</span>;
    }

    return <span className="text-gray-500">Ended</span>;
  };

  if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading Ratul Liv...</div>;

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white pb-20 font-sans">
      
      {/* --- HEADER (SEO Friendly Name) --- */}
      <div className="sticky top-0 z-50 bg-[#1a1a1a] p-4 shadow-md flex justify-between items-center border-b border-gray-800">
        <h1 className="text-xl font-bold tracking-wide text-white">
          Ratul <span className="text-[#ff0055]">Liv</span>
        </h1>
        <div className="flex gap-2">
           <button onClick={() => setActiveTab("matches")} className={`px-4 py-1 rounded-full text-xs font-bold transition ${activeTab === 'matches' ? 'bg-[#ff0055] text-white' : 'bg-gray-800 text-gray-400'}`}>Matches</button>
           <button onClick={() => setActiveTab("iptv")} className={`px-4 py-1 rounded-full text-xs font-bold transition ${activeTab === 'iptv' ? 'bg-[#ff0055] text-white' : 'bg-gray-800 text-gray-400'}`}>Channels</button>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto">
        
        {/* --- MATCHES TAB --- */}
        {activeTab === "matches" && (
          <div className="space-y-4"> 
            {getFilteredMatches().map((match, idx) => {
              const isLive = isAfter(now, match.startObj) && isBefore(now, match.endObj);
              
              return (
                <Link key={idx} href={`/match/${match.category}-${match.id}`} className="block">
                  <div className={`rounded-xl overflow-hidden shadow-lg border transition duration-300 relative group ${isLive ? 'border-[#ff0055] bg-[#1e1e1e]' : 'border-gray-800 bg-[#1a1a1a] hover:border-gray-600'}`}>
                    
                    {/* Header: Series Name & Status */}
                    <div className="p-3 bg-black/40 flex justify-between items-center border-b border-white/5">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider truncate max-w-[60%]">{match.title}</span>
                      {isLive && <span className="bg-red-600 text-white text-[10px] px-2 py-0.5 rounded animate-pulse">LIVE</span>}
                    </div>
                    
                    {/* Match Body */}
                    <div className="p-4 flex items-center justify-between">
                      {/* Team 1 */}
                      <div className="flex flex-col items-center w-[30%]">
                        <img src={getImg(match.team1?.logo)} className="w-12 h-12 object-contain mb-2 drop-shadow-md" alt="T1" />
                        <span className="text-xs font-bold text-center text-gray-200 line-clamp-2">{match.team1?.name}</span>
                      </div>
                      
                      {/* VS / Time */}
                      <div className="flex flex-col items-center justify-center w-[40%] text-center">
                         <span className="text-2xl font-black text-gray-700 opacity-50 italic">VS</span>
                      </div>

                      {/* Team 2 */}
                      <div className="flex flex-col items-center w-[30%]">
                        <img src={getImg(match.team2?.logo)} className="w-12 h-12 object-contain mb-2 drop-shadow-md" alt="T2" />
                        <span className="text-xs font-bold text-center text-gray-200 line-clamp-2">{match.team2?.name}</span>
                      </div>
                    </div>

                    {/* Footer: Countdown / Status Text */}
                    <div className="bg-[#111] p-2 text-center text-xs border-t border-white/5">
                        {getMatchStatusText(match)}
                    </div>

                  </div>
                </Link>
              );
            })}
            
            {getFilteredMatches().length === 0 && (
                <div className="text-center text-gray-500 py-10">No matches found at the moment.</div>
            )}
          </div>
        )}

        {/* --- IPTV TAB (Clean Grid) --- */}
        {activeTab === "iptv" && data?.iptv && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {Object.entries(data.iptv).map(([key, item]) => (
               <Link href={`/iptv/${key}`} key={key}>
                 <div className="bg-[#1e1e1e] rounded-xl p-3 flex flex-col items-center gap-2 border border-gray-800 hover:border-[#ff0055] hover:scale-105 transition duration-200 aspect-square justify-center shadow-lg">
                    <img src={getImg(item.logo)} className="w-10 h-10 object-contain" />
                    <span className="text-[10px] font-bold text-center text-gray-300 line-clamp-2">{item.name}</span>
                 </div>
               </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
