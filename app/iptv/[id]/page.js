"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { ref, get } from "firebase/database";
import { useParams } from "next/navigation";
import Player from "@/components/ArtPlayer";
import { ArrowLeft, Play } from "lucide-react";
import Link from "next/link";

export default function IPTVPage() {
  const { id } = useParams();
  const [playlistInfo, setPlaylistInfo] = useState(null);
  const [channels, setChannels] = useState([]);
  const [currentChannel, setCurrentChannel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // 1. Get Playlist Info from Firebase
    const chRef = ref(db, `iptv/${id}`);
    get(chRef).then(async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setPlaylistInfo(data);
        fetchM3U(data);
      } else {
        setLoading(false);
        setError("Playlist not found");
      }
    });
  }, [id]);

  const fetchM3U = async (data) => {
    try {
      // Use proxy if defined in JSON, else direct
      const proxyBase = data.proxy || ""; 
      const fetchUrl = proxyBase ? `${proxyBase}${encodeURIComponent(data.url)}` : data.url;

      const res = await fetch(fetchUrl);
      const text = await res.text();
      parseM3U(text);
    } catch (err) {
      console.error(err);
      setError("Failed to load playlist. CORS or Proxy issue.");
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
        // Extract Logo
        const logoMatch = line.match(/tvg-logo="([^"]*)"/);
        const logo = logoMatch ? logoMatch[1] : "";
        
        // Extract Name (Everything after the last comma)
        const nameParts = line.split(',');
        const name = nameParts[nameParts.length - 1].trim();
        
        currentCh = { name, logo };
      } else if (line.startsWith('http')) {
        currentCh.url = line;
        parsedChannels.push(currentCh);
        currentCh = {}; // Reset
      }
    });

    setChannels(parsedChannels);
    setLoading(false);
  };

  if (loading) return <div className="h-screen bg-black flex items-center justify-center text-white">Loading Playlist...</div>;
  if (error) return <div className="h-screen bg-black flex items-center justify-center text-red-500">{error}</div>;

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col md:flex-row">
       
       {/* PLAYER AREA */}
       <div className={`w-full md:w-2/3 bg-black sticky top-0 z-50 ${currentChannel ? 'block' : 'hidden md:block'}`}>
          {currentChannel ? (
            <div className="w-full aspect-video relative">
               <button 
                 onClick={() => setCurrentChannel(null)} 
                 className="absolute top-4 left-4 z-20 bg-black/60 p-2 rounded-full md:hidden"
               >
                 <ArrowLeft size={20}/>
               </button>
               <Player 
                  option={{
                    url: currentChannel.url,
                    type: "m3u8", // Usually IPTV lists are m3u8
                    isLive: true,
                  }}
                  style={{ width: "100%", height: "100%" }}
               />
            </div>
          ) : (
            <div className="w-full aspect-video flex items-center justify-center bg-gray-900 text-gray-500 flex-col gap-2">
               <Play size={40}/>
               <p>Select a channel to play</p>
            </div>
          )}
          
          {currentChannel && (
             <div className="p-4 bg-[#1a1a1a]">
                <h2 className="text-lg font-bold text-[#ff0055]">{currentChannel.name}</h2>
                <p className="text-sm text-gray-400">Source: {playlistInfo.name}</p>
             </div>
          )}
       </div>

       {/* CHANNEL LIST AREA */}
       <div className={`w-full md:w-1/3 h-screen overflow-y-auto bg-[#111] border-l border-gray-800 ${currentChannel ? 'hidden md:block' : 'block'}`}>
          <div className="p-4 border-b border-gray-800 sticky top-0 bg-[#111] z-10 flex items-center gap-2">
             <Link href="/">
               <ArrowLeft size={20} className="text-gray-400"/>
             </Link>
             <span className="font-bold">{playlistInfo.name} ({channels.length})</span>
          </div>
          
          <div className="flex flex-col">
            {channels.map((ch, idx) => (
               <div 
                 key={idx} 
                 onClick={() => setCurrentChannel(ch)}
                 className={`p-3 flex items-center gap-3 hover:bg-[#222] cursor-pointer border-b border-gray-800/50 ${currentChannel?.url === ch.url ? 'bg-[#222] border-l-4 border-l-[#ff0055]' : ''}`}
               >
                 <img 
                    src={ch.logo || playlistInfo.logo || "https://via.placeholder.com/40"} 
                    className="w-10 h-10 object-contain bg-black/20 rounded"
                    onError={(e) => e.target.src = "https://via.placeholder.com/40"}
                 />
                 <span className="text-sm font-medium">{ch.name}</span>
               </div>
            ))}
          </div>
       </div>

    </div>
  );
}
