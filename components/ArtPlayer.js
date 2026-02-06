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

        // UI Config
        ui.configure({
          'controlPanelElements': ['play_pause', 'time_and_duration', 'spacer', 'mute', 'volume', 'quality', 'fullscreen', 'overflow_menu'],
          'overflowMenuButtons': ['quality', 'picture_in_picture', 'cast'],
          'seekBarColors': { base: 'rgba(255, 255, 255, 0.3)', buffered: 'rgba(255, 255, 255, 0.54)', played: '#ff0055' }
        });

        // Config
        const playerConfig = {
          streaming: {
              bufferingGoal: 15,
              rebufferingGoal: 2,
              lowLatencyMode: true,
              inaccurateManifestTolerance: 0,
              jumpLargeGaps: true,
              stallEnabled: true,
          },
          manifest: { dash: { ignoreMinBufferTime: true } }
        };

        // DRM Check
        const keyData = option.clearkey || option.Clearkey;
        if (keyData) {
           playerConfig.drm = { clearKeys: keyData };
        }

        localPlayer.configure(playerConfig);

        // --- SMART LOAD LOGIC (Direct -> Proxy -> Proxy1 -> Proxy2) ---
        const loadStream = async () => {
            const proxies = option.proxies || []; // Proxy List
            const originalUrl = option.url;

            // Attempt 1: Direct Load
            try {
                setStatusMsg("Connecting...");
                console.log("Trying Direct:", originalUrl);
                await localPlayer.load(originalUrl);
                setStatusMsg(""); 
                console.log("Direct Load Success");
                video.play().catch(()=>console.log("Autoplay blocked"));
                return;
            } catch (e) {
                console.warn("Direct load failed. Code:", e.code);
            }

            // Attempt 2, 3, 4...: Proxies
            for (let i = 0; i < proxies.length; i++) {
                const proxyUrl = proxies[i] + originalUrl; // Assuming proxy works as prefix
                if (!proxies[i]) continue;

                try {
                    setStatusMsg(`Retrying with Server ${i+1}...`);
                    console.log(`Trying Proxy ${i+1}:`, proxyUrl);
                    await localPlayer.load(proxyUrl);
                    setStatusMsg("");
                    console.log("Proxy Load Success");
                    video.play().catch(()=>console.log("Autoplay blocked"));
                    return;
                } catch (e) {
                    console.warn(`Proxy ${i+1} failed.`);
                }
            }

            setStatusMsg("Stream Offline (All servers failed)");
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
        <video ref={videoRef} className="w-full h-full shaka-video" poster={option.poster || ""} autoPlay muted={true} playsInline style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
