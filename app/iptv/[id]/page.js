"use client";
import { useEffect, useState, Suspense, useRef } from "react";
import { db } from "@/lib/firebase";
import { ref, get } from "firebase/database";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Player from "@/components/ArtPlayer";
import { ArrowLeft, PlayCircle } from "lucide-react";

// Suspense Wrapper
export default function IPTVPageWrapper() {
  return (
    <Suspense fallback={<div className="bg-black text-white h-screen flex items-center justify-center">Loading Playlist...</div>}>
      <IPTVContent />
    </Suspense>
  );
}

function IPTVContent() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // URL Params
  const playUrl = searchParams.get('play');
  const playName = searchParams.get('name');
  const playLogo = searchParams.get('logo');
  const p1 = searchParams.get('p1');
  const p2 = searchParams.get('p2');
  const p3 = searchParams.get('p3');

  const [playlistInfo, setPlaylistInfo] = useState(null);
  const [channels, setChannels] = useState([]);
  const [categories, setCategories] = useState(["All"]); // ক্যাটাগরি লিস্ট
  const [activeCategory, setActiveCategory] = useState("All"); // সিলেক্ট করা ক্যাটাগরি
  const [loading, setLoading] = useState(true);

  // 1. Fetch Playlist Info
  useEffect(() => {
    const chRef = ref(db, `iptv/${id}`);
    get(chRef).then((snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setPlaylistInfo(data);
        fetchM3U(data);
      } else {
        setLoading(false);
      }
    });
  }, [id]);

  // 2. Fetch M3U
  const fetchM3U = async (data) => {
    try {
      const res = await fetch(data.url);
      const text = await res.text();
      parseM3U(text);
    } catch (err) {
      console.error("Direct fetch failed, trying fallback...");
      try {
         const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(data.url)}`;
         const res2 = await fetch(proxyUrl);
         const text2 = await res2.text();
         parseM3U(text2);
      } catch (e) {
         setLoading(false);
         alert("Failed to load playlist.");
      }
    }
  };

  // 3. Parse M3U with Categories (group-title)
  const parseM3U = (content) => {
    const lines = content.split('\n');
    const parsedChannels = [];
    const uniqueCategories = new Set(["All"]); // ইউনিক ক্যাটাগরি রাখার জন্য
    let currentCh = {};

    lines.forEach(line => {
      line = line.trim();
      if (line.startsWith('#EXTINF')) {
        // Logo Extract
        const logoMatch = line.match(/tvg-logo="([^"]*)"/);
        const logo = logoMatch ? logoMatch[1] : "";
        
        // Category Extract (group-title)
        const groupMatch = line.match(/group-title="([^"]*)"/);
        const group = groupMatch ? groupMatch[1] : "Others";
        uniqueCategories.add(group);

        // Name Extract
        const nameParts = line.split(',');
        const name = nameParts[nameParts.length - 1].trim();
        
        currentCh = { name, logo, group };
      } else if (line.startsWith('http')) {
        currentCh.url = line;
        parsedChannels.push(currentCh);
        currentCh = {};
      }
    });

    setCategories(Array.from(uniqueCategories)); // সেট থেকে অ্যারেতে কনভার্ট
    setChannels(parsedChannels);
    setLoading(false);
  };

  // 4. Handle Play
  const handlePlay = (ch) => {
    const params = new URLSearchParams(searchParams);
    params.set('play', ch.url);
    params.set('name', ch.name);
    params.set('logo', ch.logo || "");
    
    if (playlistInfo.proxy) params.set('p1', playlistInfo.proxy);
    if (playlistInfo.proxy1) params.set('p2', playlistInfo.proxy1);
    if (playlistInfo.proxy2) params.set('p3', playlistInfo.proxy2);

    router.replace(`/iptv/${id}?${params.toString()}`, { scroll: false });
  };

  // 5. Back Logic
  const goBack = () => {
    if (playUrl) {
       router.push(`/iptv/${id}`, { scroll: false });
    } else {
       router.push('/?tab=iptv');
    }
  };

  // 6. Filter Channels based on Category
  const filteredChannels = activeCategory === "All" 
     ? channels 
     : channels.filter(ch => ch.group === activeCategory);

  if (loading) return <div className="h-screen bg-black flex items-center justify-center text-white font-mono">LOADING PLAYLIST...</div>;

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col">
       
       {/* PLAYER (Sticky Top) */}
       {playUrl && (
         <div className="sticky top-0 z-50 bg-black w-full shadow-2xl border-b border-gray-800">
            <div className="w-full aspect-video md:aspect-[21/9] md:h-[60vh] mx-auto bg-black relative">
               <Player 
                  key={playUrl} 
                  option={{
                    url: playUrl,
                    type: "m3u8",
                    poster: playLogo ? `/api/image-proxy?url=${playLogo}` : "",
                    proxies: [p1, p2, p3].filter(Boolean) 
                  }}
                  style={{ width: "100%", height: "100%" }}
               />
            </div>
            <div className="p-3 bg-[#111] flex justify-between items-center">
               <div className="overflow-hidden">
                 <h2 className="text-sm md:text-lg font-bold text-white truncate pr-2">{playName}</h2>
               </div>
               <button onClick={goBack} className="flex-shrink-0 px-3 py-1 bg-[#ff0055] rounded text-xs font-bold hover:bg-red-700 transition">
                 Close
               </button>
            </div>
         </div>
       )}

       {/* HEADER */}
       <div className="p-4 border-b border-gray-800 bg-[#1a1a1a] flex items-center gap-3 shadow-md sticky top-0 z-40">
          <button onClick={goBack}>
             <ArrowLeft size={24} className="text-white hover:text-[#ff0055] transition"/>
          </button>
          <img src={playlistInfo?.logo} className="w-8 h-8 rounded-full bg-white" onError={(e) => e.target.src = "https://via.placeholder.com/50"}/>
          <h1 className="text-lg font-bold truncate">{playlistInfo?.name}</h1>
       </div>

       {/* CATEGORY TABS (SCROLLABLE) */}
       {categories.length > 1 && (
         <div className="sticky top-[73px] (playUrl ? 'top-[400px]' : 'top-[73px]') z-30 bg-[#0f0f0f]/95 backdrop-blur border-b border-gray-800 py-2 px-4">
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
               {categories.map((cat, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setActiveCategory(cat)}
                    className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 border ${
                       activeCategory === cat 
                       ? 'bg-[#ff0055] text-white border-[#ff0055]' 
                       : 'bg-[#1e1e1e] text-gray-400 border-gray-700 hover:border-gray-500'
                    }`}
                  >
                    {cat}
                  </button>
               ))}
            </div>
         </div>
       )}

       {/* CHANNEL GRID */}
       <div className="p-4 pb-20 overflow-y-auto min-h-[50vh]">
          {filteredChannels.length > 0 ? (
            <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3">
                {filteredChannels.map((ch, idx) => {
                const isActive = playUrl === ch.url;
                return (
                    <div 
                    key={idx} 
                    onClick={() => handlePlay(ch)}
                    className={`rounded-xl overflow-hidden border transition active:scale-95 cursor-pointer flex flex-col relative group ${isActive ? 'border-[#ff0055] bg-[#222]' : 'border-gray-800 bg-[#1e1e1e] hover:border-gray-600'}`}
                    >
                    <div className="aspect-square w-full bg-black/40 p-4 flex items-center justify-center relative">
                        <img 
                            src={ch.logo || "https://via.placeholder.com/100?text=TV"} 
                            className="w-full h-full object-contain drop-shadow-lg"
                            loading="lazy"
                            onError={(e) => e.target.src = "https://via.placeholder.com/100?text=TV"}
                        />
                        {isActive && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                <div className="w-3 h-3 bg-[#ff0055] rounded-full animate-ping"></div>
                            </div>
                        )}
                        {!isActive && (
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                <PlayCircle className="text-[#ff0055]" size={32} />
                            </div>
                        )}
                    </div>
                    <div className="p-2 bg-[#252525] h-10 flex items-center justify-center flex-col">
                        <span className={`text-[10px] font-medium text-center line-clamp-1 leading-tight ${isActive ? 'text-[#ff0055]' : 'text-gray-300'}`}>
                            {ch.name}
                        </span>
                    </div>
                    </div>
                );
                })}
            </div>
          ) : (
             <div className="text-center text-gray-500 mt-10">No channels found in this category.</div>
          )}
       </div>
    </div>
  );
}
