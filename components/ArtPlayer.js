"use client";
import { useEffect, useRef, useState } from "react";
// Shaka UI CSS
import "shaka-player/dist/controls.css"; 

export default function ShakaPlayer({ option, style, getInstance }) {
  const uiContainerRef = useRef(null);
  const videoRef = useRef(null);
  const [errorMessage, setErrorMessage] = useState(""); // এরর দেখানোর জন্য

  useEffect(() => {
    let localPlayer = null;
    let ui = null;

    const initPlayer = async () => {
      try {
        const shaka = (await import("shaka-player/dist/shaka-player.ui.js")).default;
        
        // 1. Polyfill Install
        shaka.polyfill.installAll();

        if (!shaka.Player.isBrowserSupported()) {
          setErrorMessage("Browser not supported!");
          return;
        }

        const video = videoRef.current;
        const uiContainer = uiContainerRef.current;

        // 2. Create Player
        localPlayer = new shaka.Player(video);
        ui = new shaka.ui.Overlay(localPlayer, uiContainer, video);

        // UI Controls Setup
        ui.configure({
          'controlPanelElements': [
             'play_pause', 'time_and_duration', 'spacer', 
             'mute', 'volume', 'quality', 'fullscreen', 'overflow_menu'
          ],
          'overflowMenuButtons': ['quality', 'picture_in_picture', 'cast'],
          'seekBarColors': {
             base: 'rgba(255, 255, 255, 0.3)',
             buffered: 'rgba(255, 255, 255, 0.54)',
             played: '#ff0055',
          }
        });

        // 3. AGGRESSIVE CONFIGURATION (For Stalling Issues)
        const playerConfig = {
          streaming: {
              bufferingGoal: 10,  
              rebufferingGoal: 2, 
              lowLatencyMode: true, // লাইভ স্ট্রিম ফাস্ট হবে
              inaccurateManifestTolerance: 0,
              jumpLargeGaps: true,    // *** ভিডিও আটকে গেলে জাম্প করবে (Important)
              stallEnabled: true,     // *** স্টল ডিটেকশন অন
              stallThreshold: 5,      // ৫ সেকেন্ড আটকে থাকলে ফিক্স করার চেষ্টা করবে
              ignoreTextStreamFailures: true,
          },
          abr: {
              enabled: true,
              defaultBandwidthEstimate: 500000, // কম স্পিড থেকে শুরু করবে যাতে দ্রুত লোড হয়
          },
          manifest: {
              retryParameters: { maxAttempts: 5, baseDelay: 1000 },
              dash: { ignoreMinBufferTime: true } // ম্যানিফেস্টের বাফার টাইম ইগনোর করবে
          }
        };

        // 4. DRM SETUP (ClearKey)
        const keyData = option.clearkey || option.Clearkey;
        if (keyData) {
          // ClearKey কনফিগারেশন
          playerConfig.drm = {
            clearKeys: keyData
          };
          console.log("DRM Keys Set:", keyData);
        }

        localPlayer.configure(playerConfig);

        // 5. ERROR LISTENER (স্ক্রিনে এরর দেখাবে)
        localPlayer.addEventListener('error', (event) => {
           console.error('Shaka Error:', event.detail);
           const code = event.detail.code;
           let msg = `Error: ${code}`;
           
           if (code === 6007 || code === 6008) msg = "DRM Key Error (6007). Check Keys.";
           if (code === 1002) msg = "Network Error (1002). Check Internet/Proxy.";
           if (code === 3016) msg = "Video Decode Error (3016). Format not supported.";
           
           setErrorMessage(msg);
        });

        // 6. LOAD URL
        await localPlayer.load(option.url);
        console.log("Video Loaded");

        // Force Play after load
        video.play().catch(() => console.log("Auto-play prevented, waiting for user."));

        if (getInstance) getInstance(localPlayer);

      } catch (e) {
        console.error("Init Error:", e);
        setErrorMessage("Player Init Failed: " + e.message);
      }
    };

    initPlayer();

    return () => {
      if (ui) ui.destroy();
      if (localPlayer) localPlayer.destroy();
    };

  }, [option.url, option.clearkey]);

  return (
    <div 
        ref={uiContainerRef} 
        className="shaka-video-container relative w-full h-full bg-black overflow-hidden"
        style={style}
    >
        {/* Error Message Display */}
        {errorMessage && (
          <div className="absolute top-0 left-0 w-full bg-red-600/80 text-white p-2 text-xs z-50 text-center font-bold">
            {errorMessage}
          </div>
        )}

        <video 
            ref={videoRef} 
            className="w-full h-full shaka-video"
            poster={option.poster || ""}
            autoPlay 
            muted={true} // *** Muted is MUST for autoplay
            playsInline
            style={{ width: '100%', height: '100%' }}
        />
    </div>
  );
}
