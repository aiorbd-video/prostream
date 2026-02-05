"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { ref, get } from "firebase/database";
import { useParams } from "next/navigation";
import Player from "@/components/ArtPlayer";

export default function IPTVPage() {
  const { id } = useParams();
  const [channel, setChannel] = useState(null);

  useEffect(() => {
    const chRef = ref(db, `iptv/${id}`);
    get(chRef).then((snapshot) => {
      if (snapshot.exists()) setChannel(snapshot.val());
    });
  }, [id]);

  if (!channel) return <div>Loading...</div>;

  // Logic to handle proxy
  let playUrl = channel.url;
  
  // Note: For actual M3U parsing inside the browser, we usually need to fetch the content.
  // But here we are treating the list item as a playable source or a playlist source.
  // If it is an m3u8 link directly, ArtPlayer plays it.
  
  // If proxy exists in JSON, we might need to fetch via proxy. 
  // However, ArtPlayer expects a direct stream URL usually.
  // If the 'url' is a playlist (m3u) containing many channels, ArtPlayer won't show a channel list UI by default.
  // For simplicity in this scope, we load the URL into the player. 
  
  return (
    <div className="h-screen bg-black w-full">
        <Player 
          option={{
            url: playUrl,
            type: "m3u8",
          }}
          style={{ width: "100%", height: "100%" }}
        />
        <div className="absolute top-4 left-4 z-50 bg-black/50 px-3 py-1 rounded text-white font-bold">
           {channel.name}
        </div>
    </div>
  );
}
