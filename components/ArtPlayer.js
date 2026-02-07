"use client";
import { useEffect, useRef, useState } from "react";
import "shaka-player/dist/controls.css";

export default function ShakaPlayer({ option, style, getInstance }) {
const uiContainerRef = useRef(null);
const videoRef = useRef(null);
const [statusMsg, setStatusMsg] = useState("");

useEffect(() => {
let localPlayer = null;
let ui = null;

const initPlayer = async () => {  
  try {  
    const shaka = (await import("shaka-player/dist/shaka-player.ui.js")).default;  
    shaka.polyfill.installAll();  

    if (!shaka.Player.isBrowserSupported()) {  
      setStatusMsg("Browser not supported!");  
      return;  
    }  

    const video = videoRef.current;  
    const uiContainer = uiContainerRef.current;  

    localPlayer = new shaka.Player(video);  
    ui = new shaka.ui.Overlay(localPlayer, uiContainer, video);  

    // --- UI CONFIGURATION ---  
    ui.configure({  
      'controlPanelElements': [  
         'play_pause', 'time_and_duration', 'spacer',   
         'mute', 'volume', 'quality', 'fullscreen', 'overflow_menu'  
      ],  
      'overflowMenuButtons': ['quality', 'picture_in_picture', 'cast'],  
      'seekBarColors': {   
         base: 'rgba(255, 255, 255, 0.3)',   
         buffered: 'rgba(255, 255, 255, 0.54)',   
         played: '#ff0055'   
      }  
    });  

    // --- ENGINE CONFIGURATION (FIXED FOR SWITCHING) ---  
    const playerConfig = {  
      streaming: {  
          bufferingGoal: 30, // বাফার গোল বাড়ানো হয়েছে (Smooth Playback)  
          rebufferingGoal: 2,   
          lowLatencyMode: false, // **Fix:** লাইভ লো-লেটেন্সি অফ করা হলো যাতে সুইচে সমস্যা না হয়  
          inaccurateManifestTolerance: 0,  
          jumpLargeGaps: true,  
          stallEnabled: true,  
          retryParameters: { maxAttempts: 5, baseDelay: 1000 },  
      },  
      abr: {  
          enabled: true, // **Fix:** অটো কোয়ালিটি অন  
          defaultBandwidthEstimate: 1000000, // ডিফল্ট ১ এমবিপিএস  
          switchInterval: 2, // **Fix:** প্রতি ২ সেকেন্ডে স্পিড চেক করবে (Fast Auto Switch)  
          bandwidthUpgradeTarget: 0.85, // ৮৫% ব্যান্ডউইথ পেলেই কোয়ালিটি বাড়াবে  
          bandwidthDowngradeTarget: 0.95,  
      },  
      manifest: {   
          dash: { ignoreMinBufferTime: true }   
      }  
    };  

    // DRM Setup  
    const keyData = option.clearkey || option.Clearkey;  
    if (keyData) {  
       playerConfig.drm = { clearKeys: keyData };  
    }  

    localPlayer.configure(playerConfig);  

    // --- EVENT LISTENERS (Quality Switch Fix) ---  
      
    // ১. যখন কোয়ালিটি চেঞ্জ হবে (Auto/Manual)  
    localPlayer.addEventListener('adaptation', () => {  
        console.log("Quality Adapting...");  
    });  

    localPlayer.addEventListener('variantchanged', () => {  
         console.log("Quality Changed");  
         // **Fix:** কোয়ালিটি চেঞ্জ হলে যদি আটকে যায়, ফোর্স প্লে করবে  
         if (video.paused && !video.ended) {  
             video.play().catch(() => {});  
         }  
    });  

    // ২. এরর হ্যান্ডলিং  
    localPlayer.addEventListener('error', (event) => {  
       console.error('Shaka Error:', event.detail);  
    });  

    // --- LOAD STREAM (Direct -> Proxy) ---  
    const loadStream = async () => {  
        const proxies = option.proxies || [];  
        const originalUrl = option.url;  

        // Try Direct  
        try {  
            setStatusMsg("Connecting...");  
            await localPlayer.load(originalUrl);  
            setStatusMsg("");   
            return;  
        } catch (e) {  
            console.warn("Direct failed, trying proxies...");  
        }  

        // Try Proxies  
        for (let i = 0; i < proxies.length; i++) {  
            if (!proxies[i]) continue;  
            const proxyUrl = proxies[i] + originalUrl;  
            try {  
                setStatusMsg(`Retrying Server ${i+1}...`);  
                await localPlayer.load(proxyUrl);  
                setStatusMsg("");  
                return;  
            } catch (e) {}  
        }  
        setStatusMsg("Stream Offline");  
    };  

    await loadStream();  

    if (getInstance) getInstance(localPlayer);  

  } catch (e) {  
    console.error("Init Error:", e);  
    setStatusMsg("Player Error: " + e.message);  
  }  
};  

initPlayer();  

return () => {  
  if (ui) ui.destroy();  
  if (localPlayer) localPlayer.destroy();  
};

}, [option.url, option.clearkey]);

return (
<div ref={uiContainerRef} className="shaka-video-container relative w-full h-full bg-black overflow-hidden" style={style}>
{statusMsg && (
<div className="absolute top-0 left-0 w-full bg-[#ff0055]/80 text-white p-1 text-xs z-50 text-center font-bold animate-pulse">
{statusMsg}
</div>
)}
<video
ref={videoRef}
className="w-full h-full shaka-video"
poster={option.poster || ""}
autoPlay
muted={true} // Auto-play fix
playsInline
style={{ width: '100%', height: '100%' }}
/>
</div>
);
}
