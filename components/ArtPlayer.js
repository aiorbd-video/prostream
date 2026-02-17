"use client";
import { useEffect, useRef } from "react";
import Artplayer from "artplayer";
import Hls from "hls.js";
// Shaka Player for DASH support
import shaka from "shaka-player/dist/shaka-player.compiled.js";

export default function Player({ option, style, getInstance }) {
  const artRef = useRef();

  useEffect(() => {
    // আগের ইন্সট্যান্স ক্লিন করা
    if (artRef.current && artRef.current.destroy) {
      artRef.current.destroy(false);
    }

    // --- PROXY URL GENERATOR (Optional Header Support) ---
    // যদি হেডার থাকে, তবে প্রক্সি লিংকে কনভার্ট করবে। না থাকলে ডাইরেক্ট চালাবে।
    let finalUrl = option.url;
    if (option.referer || option.origin || option.userAgent || option.cookie) {
        const params = new URLSearchParams();
        params.set("url", option.url);
        if (option.referer) params.set("referer", option.referer);
        if (option.origin) params.set("origin", option.origin);
        if (option.userAgent) params.set("userAgent", option.userAgent);
        finalUrl = `/api/proxy?${params.toString()}`;
    }

    const art = new Artplayer({
      ...option,
      url: finalUrl,
      container: artRef.current,
      
      // === UI SETTINGS ===
      volume: 1,
      isLive: true,
      muted: false,
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

      // === ENGINE CONFIGURATION (Universal Support) ===
      customType: {
        // 1. HLS (.m3u8) Support Logic
        m3u8: function (video, url, art) {
          if (Hls.isSupported()) {
            // Desktop/Android (Chrome/Firefox) এর জন্য HLS.js
            const hls = new Hls();
            hls.loadSource(url);
            hls.attachMedia(video);
            
            // Quality Selector for HLS
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
            });

            art.hls = hls;
            art.on('destroy', () => hls.destroy());
          } 
          // iOS/Safari Native Support Check (আপনার চাওয়া লাইনটি)
          else if (video.canPlayType("application/vnd.apple.mpegurl")) {
            video.src = url;
          } 
          else {
            art.notice.show = "Unsupported HLS Format";
          }
        },

        // 2. DASH (.mpd) Support via Shaka Player
        dash: async function (video, url, art) {
           shaka.polyfill.installAll();
           if (!shaka.Player.isBrowserSupported()) {
               art.notice.show = "Browser does not support DASH";
               return;
           }

           const player = new shaka.Player(video);
           
           // Config for Fast Start & ClearKey
           const config = {
               streaming: {
                   bufferingGoal: 15,
                   lowLatencyMode: true,
                   inaccurateManifestTolerance: 0,
                   jumpLargeGaps: true,
               },
               abr: {
                   enabled: true,
                   defaultBandwidthEstimate: 3000000, // Start HD
                   switchInterval: 1,
               }
           };

           // DRM Support
           const keyData = option.clearkey || option.Clearkey;
           if (keyData) {
               config.drm = { clearKeys: keyData };
           }

           player.configure(config);

           try {
               await player.load(url);
               
               // Quality Selector for Shaka/DASH
               const tracks = player.getVariantTracks();
               const videoTracks = tracks.filter(t => t.type === 'variant' && t.height);
               const uniqueTracks = [];
               const map = new Map();
               videoTracks.sort((a, b) => b.height - a.height); // Sort High to Low

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
                            } else {
                                player.configure({ abr: { enabled: false } });
                                const track = tracks.find(t => t.id === item.id);
                                if (track) player.selectVariantTrack(track, true); 
                            }
                            return item.html;
                        },
                    });
               }

           } catch (e) {
               console.error("Shaka Error:", e);
           }

           art.shaka = player;
           art.on('destroy', () => player.destroy());
        },
        
        // 3. MP4 (Direct Play) - সাধারণত ArtPlayer অটো ডিটেক্ট করে, তবুও সেইফটির জন্য
        mp4: function (video, url, art) {
            video.src = url;
        }
      },
    });

    if (getInstance && typeof getInstance === "function") {
      getInstance(art);
    }

    return () => {
      if (art && art.destroy) {
        art.destroy(false);
      }
    };
  }, [option.url, option.clearkey, option.referer, option.origin]); 

  return <div ref={artRef} style={style} />;
}
