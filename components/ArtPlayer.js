"use client";
import { useEffect, useRef, useState } from "react";
import Artplayer from "artplayer";
import Hls from "hls.js";
// Shaka Player Compiled (Engine Only)
import shaka from "shaka-player/dist/shaka-player.compiled.js";

export default function Player({ option, style, getInstance }) {
  const artRef = useRef();
  const [statusMsg, setStatusMsg] = useState("Connecting..."); 

  useEffect(() => {
    // 1. Cleanup old instance
    if (artRef.current && artRef.current.destroy) {
      artRef.current.destroy(false);
    }

    // 2. Header/Proxy Param Logic for Main URL
    let mainUrl = option.url;
    if (option.referer || option.origin || option.userAgent || option.cookie) {
       const params = new URLSearchParams();
       params.set("url", option.url);
       if (option.referer) params.set("referer", option.referer);
       if (option.origin) params.set("origin", option.origin);
       if (option.userAgent) params.set("userAgent", option.userAgent);
       if (option.cookie) params.set("cookie", option.cookie);
       mainUrl = `/api/proxy?${params.toString()}`;
    }

    const art = new Artplayer({
      ...option,
      url: mainUrl, 
      container: artRef.current,
      
      // === UI SETTINGS (Seekbar will appear automatically for VOD) ===
      volume: 1,
      muted: false, 
      autoplay: true,
      autoPlayback: true,
      // isLive: true,  <-- REMOVED to fix seekbar issues
      pip: true,
      autoSize: true,
      autoMini: true,
      screenshot: true,
      setting: true,
      loop: false,
      flip: true,
      playbackRate: true,
      aspectRatio: true,
      fullscreen: true,
      fullscreenWeb: true,
      miniProgressBar: true,
      lock: true,           
      fastForward: true,    
      autoOrientation: true,
      airplay: true,
      theme: "#ff0055",

      // === ENGINE CONFIGURATION ===
      customType: {
        // 1. HLS (.m3u8) Support with PROXY RETRY
        m3u8: function (video, url, art) {
          // Prepare URL List: [Direct, Proxy1, Proxy2...]
          const proxies = option.proxies || [];
          const urlList = [url, ...proxies.map(p => p + option.url)]; // Use original option.url for proxies
          let currentIndex = 0;
          let hls = null;

          function loadHls(currentUrl) {
              // Update Status
              setStatusMsg(currentIndex === 0 ? "Connecting..." : `Trying Server ${currentIndex}...`);

              if (Hls.isSupported()) {
                  if (hls) hls.destroy(); // Destroy previous attempt
                  
                  hls = new Hls();
                  hls.loadSource(currentUrl);
                  hls.attachMedia(video);
                  art.hls = hls;

                  // Success Handler
                  hls.on(Hls.Events.MANIFEST_PARSED, () => {
                      setStatusMsg(""); // Clear status
                      video.play().catch(() => {
                          video.muted = true;
                          video.play();
                          art.notice.show = "Tap to Unmute 🔊";
                      });
                      
                      // Quality Menu
                      if (hls.levels.length > 1) {
                          const levels = hls.levels.map((level, index) => ({
                              html: `${level.height}p`,
                              level: index,
                          }));
                          levels.push({ html: 'Auto', level: -1, default: true });
                          art.setting.add({
                              html: 'Quality',
                              width: 150,
                              tooltip: 'Auto',
                              selector: levels,
                              onSelect: function (item) {
                                  hls.currentLevel = item.level;
                                  return item.html;
                              },
                          });
                      }
                  });

                  // Error / Retry Handler
                  hls.on(Hls.Events.ERROR, function (event, data) {
                      if (data.fatal) {
                          console.warn(`HLS Error on Server ${currentIndex}:`, data.type);
                          
                          // Try Next Proxy
                          if (currentIndex < urlList.length - 1) {
                              currentIndex++;
                              loadHls(urlList[currentIndex]);
                          } else {
                              setStatusMsg("Stream Offline");
                              art.notice.show = "All Servers Failed";
                              // hls.destroy(); // Optional: keep last error state
                          }
                      }
                  });

              } 
              // Native Safari/iOS (No Proxy Retry Logic for Native yet, Direct Only)
              else if (video.canPlayType("application/vnd.apple.mpegurl")) {
                  video.src = currentUrl;
                  video.play();
                  setStatusMsg("");
              } 
              else {
                  art.notice.show = "HLS not supported!";
                  setStatusMsg("Format Error");
              }
          }

          // Start Loading
          loadHls(urlList[0]);
        },

        // 2. DASH (.mpd) Support with PROXY RETRY
        dash: async function (video, url, art) {
           shaka.polyfill.installAll();
           if (!shaka.Player.isBrowserSupported()) {
               art.notice.show = "Browser not supported";
               return;
           }

           const player = new shaka.Player(video);
           
           // Config
           const config = {
               streaming: {
                   bufferingGoal: 15,
                   lowLatencyMode: true,
                   inaccurateManifestTolerance: 0,
                   jumpLargeGaps: true,
               },
               abr: {
                   enabled: true,
                   defaultBandwidthEstimate: 3000000, 
                   switchInterval: 1,
               }
           };

           const keyData = option.clearkey || option.Clearkey;
           if (keyData) {
               config.drm = { clearKeys: keyData };
           }
           player.configure(config);

           // === PROXY RETRY LOOP ===
           const loadWithProxies = async () => {
               const proxies = option.proxies || [];
               
               // 1. Try Main URL
               try {
                   setStatusMsg("Connecting...");
                   await player.load(url);
                   setStatusMsg(""); 
                   return;
               } catch(e) { console.warn("Direct DASH failed"); }

               // 2. Try Proxies
               for(let i = 0; i < proxies.length; i++) {
                   if(!proxies[i]) continue;
                   try {
                       setStatusMsg(`Trying Server ${i+1}...`);
                       await player.load(proxies[i] + option.url); // Use original url for proxy append
                       setStatusMsg(""); 
                       return;
                   } catch(e) {}
               }
               
               setStatusMsg("Stream Failed");
               art.notice.show = "All Servers Failed";
           };

           await loadWithProxies();

           // Quality Switching
           try {
               const tracks = player.getVariantTracks();
               const videoTracks = tracks.filter(t => t.type === 'variant' && t.height);
               const uniqueTracks = [];
               const map = new Map();
               videoTracks.sort((a, b) => b.height - a.height);

               for (const t of videoTracks) {
                   if (!map.has(t.height)) {
                       map.set(t.height, true);
                       uniqueTracks.push(t);
                   }
               }

               if (uniqueTracks.length > 0) {
                   const levels = uniqueTracks.map((t) => ({
                       html: `${t.height}p`,
                       id: t.id,
                   }));
                   levels.push({ html: 'Auto', id: -1, default: true });

                   art.setting.add({
                        html: 'Quality',
                        width: 150,
                        tooltip: 'Auto',
                        selector: levels,
                        onSelect: function (item) {
                            if (item.id === -1) {
                                player.configure({ abr: { enabled: true } });
                                art.notice.show = "Auto Quality";
                            } else {
                                player.configure({ abr: { enabled: false } });
                                const track = tracks.find(t => t.id === item.id);
                                if (track) {
                                    player.selectVariantTrack(track, true); 
                                    art.notice.show = `Quality: ${item.html}`;
                                }
                            }
                            return item.html;
                        },
                    });
               }
           } catch (e) {
               console.error("Track Error:", e);
           }

           art.shaka = player;
           art.on('destroy', () => player.destroy());
        },

        // 3. MP4 Support
        mp4: function (video, url, art) {
            video.src = url;
            video.load();
            setStatusMsg("");
        }
      },
    });

    // Autoplay Fallback (Sound)
    art.on('ready', () => {
        art.play().catch(() => {
            art.muted = true;
            art.play();
            art.notice.show = 'Tap to Unmute 🔊';
        });
    });

    if (getInstance && typeof getInstance === "function") {
      getInstance(art);
    }

    return () => {
      if (art && art.destroy) {
        art.destroy(false);
      }
    };
  }, [option.url, option.clearkey]); 

  return (
    <div className="relative w-full h-full bg-black overflow-hidden" style={style}>
        {/* === STATUS OVERLAY === */}
        {statusMsg && (
            <div className="absolute top-0 left-0 w-full bg-[#ff0055]/90 text-white text-xs font-bold py-1 z-50 text-center animate-pulse shadow-md">
                {statusMsg}
            </div>
        )}
        <div ref={artRef} className="w-full h-full" />
    </div>
  );
}
