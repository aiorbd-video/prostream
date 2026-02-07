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

    const art = new Artplayer({
      ...option,
      container: artRef.current,
      
      // === UI SETTINGS (User Friendly) ===
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
      lock: true,           // Lock Screen Feature
      fastForward: true,    // Double tap to seek
      autoOrientation: true,
      airplay: true,
      theme: "#ff0055",

      // === ENGINE CONFIGURATION ===
      customType: {
        // HLS (m3u8) Support
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
            });

            art.on('destroy', () => hls.destroy());
          } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
            video.src = url;
          }
        },

        // DASH (mpd) Support via Shaka Engine
        dash: async function (video, url, art) {
           shaka.polyfill.installAll();
           if (!shaka.Player.isBrowserSupported()) {
               art.notice.show = "Browser not supported";
               return;
           }

           const player = new shaka.Player(video);
           
           // === FIX: High Quality Start ===
           const config = {
               streaming: {
                   bufferingGoal: 15,
                   lowLatencyMode: true,
                   inaccurateManifestTolerance: 0,
                   jumpLargeGaps: true,
               },
               abr: {
                   enabled: true,
                   defaultBandwidthEstimate: 3000000, // **FIX:** Start at 3 Mbps (HD)
                   switchInterval: 1,
               }
           };

           // DRM Setup
           const keyData = option.clearkey || option.Clearkey;
           if (keyData) {
               config.drm = { clearKeys: keyData };
           }

           player.configure(config);

           // Proxy Loading Logic (If Proxies Exist)
           const loadWithProxies = async () => {
               const proxies = option.proxies || [];
               
               // 1. Try Direct
               try {
                   await player.load(url);
                   return;
               } catch(e) { console.warn("Direct failed"); }

               // 2. Try Proxies
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

           // === FIX: Quality Switching Logic ===
           try {
               const tracks = player.getVariantTracks();
               // Filter Video Tracks Only
               const videoTracks = tracks.filter(t => t.type === 'variant' && t.height);
               
               // Unique Tracks & Sort High to Low
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
                                // Auto Mode
                                player.configure({ abr: { enabled: true } });
                                art.notice.show = "Auto Quality";
                            } else {
                                // Manual Mode
                                player.configure({ abr: { enabled: false } });
                                const track = tracks.find(t => t.id === item.id);
                                if (track) {
                                    // **TRUE forces buffer clear for instant switch**
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
  }, [option.url, option.clearkey]); 

  return <div ref={artRef} style={style} />;
}
