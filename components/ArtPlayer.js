"use client";
import { useEffect, useRef } from "react";
import Artplayer from "artplayer";
import Hls from "hls.js";
// Shaka Player Compiled (Engine Only)
import shaka from "shaka-player/dist/shaka-player.compiled.js";

export default function Player({ option, style, getInstance }) {
  const artRef = useRef();

  useEffect(() => {
    if (artRef.current && artRef.current.destroy) {
      artRef.current.destroy(false);
    }

    // === 1. Header/Proxy Handling Logic ===
    // যদি হেডার থাকে, URL-কে প্রক্সি লিংকে কনভার্ট করে নিবে
    let playUrl = option.url;
    if (option.referer || option.origin || option.userAgent || option.cookie) {
       const params = new URLSearchParams();
       params.set("url", option.url);
       if (option.referer) params.set("referer", option.referer);
       if (option.origin) params.set("origin", option.origin);
       if (option.userAgent) params.set("userAgent", option.userAgent);
       if (option.cookie) params.set("cookie", option.cookie);
       playUrl = `/api/proxy?${params.toString()}`;
    }

    const art = new Artplayer({
      ...option,
      url: playUrl, // আপডেটেড URL
      container: artRef.current,
      
      // === UI SETTINGS (User Friendly - No Change) ===
      volume: 1,
      isLive: true,
      muted: false, // প্রথমে সাউন্ডসহ ট্রাই করবে
      autoplay: true,
      autoPlayback: true,
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
        // 1. HLS (.m3u8) Support
        m3u8: function (video, url, art) {
          if (Hls.isSupported()) {
            const hls = new Hls();
            hls.loadSource(url);
            hls.attachMedia(video);
            art.hls = hls;
            
            // HLS Quality Menu
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
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
                // HLS Autoplay Start
                video.play().catch(() => {
                    video.muted = true;
                    video.play();
                    art.notice.show = 'Tap to Unmute';
                });
            });

            art.on('destroy', () => hls.destroy());
          } 
          // Native Safari Support
          else if (video.canPlayType("application/vnd.apple.mpegurl")) {
            video.src = url;
          }
        },

        // 2. DASH (.mpd) Support via Shaka Engine
        dash: async function (video, url, art) {
           shaka.polyfill.installAll();
           if (!shaka.Player.isBrowserSupported()) {
               art.notice.show = "Browser not supported";
               return;
           }

           const player = new shaka.Player(video);
           
           // === High Quality Start Config ===
           const config = {
               streaming: {
                   bufferingGoal: 15,
                   lowLatencyMode: true,
                   inaccurateManifestTolerance: 0,
                   jumpLargeGaps: true,
               },
               abr: {
                   enabled: true,
                   defaultBandwidthEstimate: 3000000, // Start at 3 Mbps (HD)
                   switchInterval: 1,
               }
           };

           // DRM Setup
           const keyData = option.clearkey || option.Clearkey;
           if (keyData) {
               config.drm = { clearKeys: keyData };
           }

           player.configure(config);

           // Proxy Loading Logic (Failover System)
           const loadWithProxies = async () => {
               const proxies = option.proxies || [];
               
               // 1. Try Direct or Header Proxy
               try {
                   await player.load(url);
                   return;
               } catch(e) { console.warn("Main URL failed, trying fallbacks..."); }

               // 2. Try Additional Proxies (p1, p2, p3)
               for(let p of proxies) {
                   if(!p) continue;
                   try {
                       await player.load(p + url);
                       return;
                   } catch(e) {}
               }
               art.notice.show = "Stream Failed to Load";
           };

           await loadWithProxies();

           // === Quality Switching Logic ===
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

        // 3. MP4 Support (Simple & Direct)
        mp4: function (video, url, art) {
            video.src = url;
            video.load();
        }
      },
    });

    // === 2. AUTOPLAY TRICK (Works on Chrome/Safari/Mobile) ===
    art.on('ready', () => {
        // প্রথমে সাউন্ডসহ প্লে করার চেষ্টা
        art.play().then(() => {
            // সফল হলে কিছু করার দরকার নেই
        }).catch(() => {
            // ব্যর্থ হলে (Browser Block করলে), Mute করে আবার প্লে করবে
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

  return <div ref={artRef} style={style} />;
}
