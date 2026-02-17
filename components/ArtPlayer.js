"use client";
import { useEffect, useRef, useState } from "react";
import Artplayer from "artplayer";
import Hls from "hls.js";
// Shaka Player Compiled (Engine Only)
import shaka from "shaka-player/dist/shaka-player.compiled.js";

export default function Player({ option, style, getInstance }) {
  const artRef = useRef();
  const [statusMsg, setStatusMsg] = useState("Connecting..."); // নোটিসের জন্য স্টেট

  useEffect(() => {
    if (artRef.current && artRef.current.destroy) {
      artRef.current.destroy(false);
    }

    // === 1. Header/Proxy Handling Logic ===
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
      
      // === UI SETTINGS ===
      volume: 1,
      muted: false, 
      autoplay: true,
      autoPlayback: true,
      // isLive: true,  <-- এই লাইনটি Seekbar হাইড করে দেয়, তাই রিমুভ করা হলো (অটো ডিটেক্ট করবে)
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
        // 1. HLS (.m3u8) Support (আপনার চাওয়া লজিক + কোয়ালিটি মেনু)
        m3u8: function (video, url, art) {
          setStatusMsg("Loading HLS...");
          
          if (Hls.isSupported()) {
            const hls = new Hls();
            hls.loadSource(url);
            hls.attachMedia(video);
            art.hls = hls;
            
            // Quality Menu (Auto/1080p/720p...)
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                setStatusMsg(""); // লোড হলে মেসেজ গায়েব
                video.play().catch(() => {
                    video.muted = true;
                    video.play();
                    art.notice.show = "Tap to Unmute 🔊";
                });

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

            // Error Handling for Proxies
            hls.on(Hls.Events.ERROR, function (event, data) {
                if (data.fatal) {
                   console.log("HLS Error, Trying Proxies...");
                   // এখানে প্রক্সি ট্রাই করার লজিক চাইলে বসানো যাবে, তবে HLS সাধারণত অটো রিট্রাই করে
                }
            });

            art.on('destroy', () => hls.destroy());
          } 
          // Native Safari/iOS Support
          else if (video.canPlayType("application/vnd.apple.mpegurl")) {
            video.src = url;
            video.play();
            setStatusMsg("");
          } 
          else {
            art.notice.show = "HLS not supported in this browser!";
            setStatusMsg("Format Error");
          }
        },

        // 2. DASH (.mpd) Support (With Proxy Retry Loop)
        dash: async function (video, url, art) {
           shaka.polyfill.installAll();
           if (!shaka.Player.isBrowserSupported()) {
               art.notice.show = "Browser not supported";
               return;
           }

           const player = new shaka.Player(video);
           
           // HD Start Logic
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

           // DRM
           const keyData = option.clearkey || option.Clearkey;
           if (keyData) {
               config.drm = { clearKeys: keyData };
           }

           player.configure(config);

           // === PROXY RETRY LOOP (Status Update সহ) ===
           const loadWithProxies = async () => {
               const proxies = option.proxies || [];
               
               // 1. Try Main URL
               try {
                   setStatusMsg("Connecting...");
                   await player.load(url);
                   setStatusMsg(""); // Success
                   return;
               } catch(e) { console.warn("Main failed"); }

               // 2. Try Proxy List (p1, p2, p3...)
               for(let i = 0; i < proxies.length; i++) {
                   if(!proxies[i]) continue;
                   try {
                       setStatusMsg(`Trying Server ${i+1}...`); // নোটিস আপডেট
                       await player.load(proxies[i] + url);
                       setStatusMsg(""); // Success
                       return;
                   } catch(e) {}
               }
               
               setStatusMsg("Stream Failed");
               art.notice.show = "All Servers Failed";
           };

           await loadWithProxies();

           // Quality Switching Logic
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
        {/* === STATUS OVERLAY (Connecting/Trying Server...) === */}
        {statusMsg && (
            <div className="absolute top-0 left-0 w-full bg-[#ff0055]/90 text-white text-xs font-bold py-1 z-50 text-center animate-pulse">
                {statusMsg}
            </div>
        )}
        
        {/* Player Container */}
        <div ref={artRef} className="w-full h-full" />
    </div>
  );
}
