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

        // --- ENGINE CONFIGURATION ---
        const playerConfig = {
          streaming: {
              bufferingGoal: 20, // Set to 20s for better buffering control
              rebufferingGoal: 5, // Set rebuffering goal to 5s to avoid prolonged buffering
              lowLatencyMode: false, // Disable low-latency mode to improve stability with proxies
              inaccurateManifestTolerance: 0,
              jumpLargeGaps: true,
              stallEnabled: true,
              retryParameters: { maxAttempts: 5, baseDelay: 1000 },
          },
          abr: {
              enabled: true, // Enable auto quality switching
              defaultBandwidthEstimate: 1000000, // Default bandwidth estimate set to 1Mbps
              switchInterval: 3, // Adjust switch interval to 3 seconds for smoother quality switches
              bandwidthUpgradeTarget: 0.85, // Upgrade quality when 85% bandwidth is available
              bandwidthDowngradeTarget: 0.95, // Downgrade quality when bandwidth dips below 95%
          },
          manifest: { 
              dash: { ignoreMinBufferTime: true },
              hls: { 
                // Adjust settings specific to HLS/M3U8 streams
                startFromPlaylist: true, 
              }
          }
        };

        // DRM Setup
        const keyData = option.clearkey || option.Clearkey;
        if (keyData) {
           playerConfig.drm = { clearKeys: keyData };
        }

        localPlayer.configure(playerConfig);

        // --- EVENT LISTENERS (Quality Switch Fix) ---
        
        // Handle quality adaptation event (auto or manual)
        localPlayer.addEventListener('adaptation', () => {
            console.log("Quality Adapting...");
        });

        // Handle variant change event (when quality changes)
        localPlayer.addEventListener('variantchanged', () => {
             console.log("Quality Changed");
             // If the video is paused after a quality change, force it to play
             if (video.paused && !video.ended) {
                 video.play().catch(() => {});
             }
        });

        // Error handling
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
