"use client";
import { useEffect, useState, Suspense } from "react";
import { db } from "@/lib/firebase";
import { ref, get } from "firebase/database";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Player from "@/components/ArtPlayer";
import { ArrowLeft, PlayCircle } from "lucide-react";
import Link from "next/link";

// Main Component Wrapper for Suspense
export default function IPTVPageWrapper() {
  return (
    <Suspense fallback={<div className="bg-black text-white h-screen">Loading...</div>}>
      <IPTVContent />
    </Suspense>
  );
}

function IPTVContent() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // URL Params State
  const playUrl = searchParams.get('play');
  const playName = searchParams.get('name');
  const playLogo = searchParams.get('logo');

  const [playlistInfo, setPlaylistInfo] = useState(null);
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const fetchM3U = async (data) => {
    try {
      const proxyBase = data.proxy || ""; 
      const fetchUrl = proxyBase ? `${proxyBase}${encodeURIComponent(data.url)}` : data.url;
      const res = await fetch(fetchUrl);
      const text = await res.text();
      parseM3U(text);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const parseM3U = (content) => {
    const lines = content.split('\n');
    const parsedChannels = [];
    let currentCh = {};

    lines.forEach(line => {
      line = line.trim();
      if (line.startsWith('#EXTINF')) {
        const logoMatch = line.match(/tvg-logo="([^"]*)"/);
        const logo = logoMatch ? logoMatch[1] : "";
        const nameParts = line.split(',');
        const name = nameParts[nameParts.length - 1].trim();
        currentCh = { name, logo };
      } else if (line.startsWith('http')) {
        currentCh.url = line;
        parsedChannels.push(currentCh);
        currentCh = {};
      }
    });

    setChannels(parsedChannels);
    setLoading(false);
  };

  // Handle Channel Click (Updates URL -> Browser History Works!)
  const handlePlay = (ch) => {
    const params = new URLSearchParams(searchParams);
    params.set('play', ch.url);
    params.set('name', ch.name);
    params.set('logo', ch.logo || "");
    router.push(`/iptv/${id}?${params.toString()}`);
  };

  if (loading) return <div className="h-screen bg-black flex items-center justify-center text-white">Loading Channels...</div>;

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col">
       
       {/* === PLAYER SECTION (Only shows if URL has 'play') === */}
       {playUrl && (
         <div className="sticky top-0 z-50 bg-black w-full shadow-2xl border-b border-gray-800">
            <div className="w-full aspect-video md:aspect-[21/9] md:h-[60vh] mx-auto bg-black relative">
               <Player 
                  option={{
                    url: playUrl,
                    type: "m3u8",
                    poster: playLogo ? `/api/image-proxy?url=${playLogo}` : "",
                  }}
                  style={{ width: "100%", height: "100%" }}
               />
            </div>
            <div className="p-3 bg-[#111] flex justify-between items-center">
               <div>
                 <h2 className="text-sm md:text-lg font-bold text-white">{playName}</h2>
                 <p className="text-xs text-gray-400">Playing from {playlistInfo?.name}</p>
               </div>
               {/* Close Button (Just goes back in history) */}
               <button 
                 onClick={() => router.back()}
                 className="px-4 py-1 bg-red-600 rounded text-sm font-bold"
               >
                 Close
               </button>
            </div>
         </div>
       )}

       {/* === HEADER === */}
       {!playUrl && (
         <div className="p-4 border-b border-gray-800 bg-[#1a1a1a] sticky top-0 z-40 flex items-center gap-3 shadow-md">
            <Link href="/">
               <ArrowLeft size={24} className="text-white"/>
            </Link>
            <img src={playlistInfo?.logo} className="w-8 h-8 rounded-full bg-white"/>
            <h1 className="text-lg font-bold">{playlistInfo?.name}</h1>
         </div>
       )}

       {/* === GRID CHANNEL LIST === */}
       <div className={`p-4 ${playUrl ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {channels.map((ch, idx) => (
               <div 
                 key={idx} 
                 onClick={() => handlePlay(ch)}
                 className="bg-[#1e1e1e] rounded-xl overflow-hidden border border-gray-800 hover:border-[#ff0055] hover:scale-105 transition active:scale-95 cursor-pointer flex flex-col relative group"
               >
                 {/* Image Container */}
                 <div className="aspect-square w-full bg-black/40 p-4 flex items-center justify-center relative">
                    <img 
                      src={ch.logo || "https://via.placeholder.com/100?text=TV"} 
                      className="w-full h-full object-contain drop-shadow-lg"
                      loading="lazy"
                      onError={(e) => e.target.src = "https://via.placeholder.com/100?text=No+Logo"}
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                       <PlayCircle size={30} className="text-[#ff0055]"/>
                    </div>
                 </div>
                 
                 {/* Name */}
                 <div className="p-2 bg-[#252525] h-12 flex items-center justify-center">
                    <span className="text-[10px] md:text-xs font-medium text-center line-clamp-2 leading-tight text-gray-300 group-hover:text-white">
                      {ch.name}
                    </span>
                 </div>
               </div>
            ))}
          </div>
       </div>

    </div>
  );
}
