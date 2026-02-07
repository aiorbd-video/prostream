"use client";
import { useEffect, useRef } from "react";
import Artplayer from "artplayer";
import Hls from "hls.js";
// Shaka Player Compiled Version (Best for Custom UI)
import shaka from "shaka-player/dist/shaka-player.compiled.js";

export default function Player({ option, style, getInstance }) {
  const artRef = useRef();

  useEffect(() => {
    // আগের ইন্সট্যান্স ক্লিন করা
    if (artRef.current && artRef.current.destroy) {
      artRef.current.destroy(false);
    }

    const art = new Artplayer({
      ...option,
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

        // DASH (mpd) Support via Shaka
        dash: async function (video, url, art) {
           shaka.polyfill.installAll();
           if (!shaka.Player.isBrowserSupported()) {
               art.notice.show = "Browser not supported";
               return;
           }

           const player = new shaka.Player(video);
           
           // === FIX 1: HIGH QUALITY START CONFIG ===
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
                   switchInterval: 1, // **FIX:** Check speed every 1s
                   bandwidthUpgradeTarget: 0.85,
               }
           };

           // DRM Setup
           const keyData = option.clearkey || option.Clearkey;
           if (keyData) {
               config.drm = { clearKeys: keyData };
           }

           player.configure(config);

           try {
               await player.load(url);
               
               // === FIX 2: ROBUST QUALITY SWITCHING ===
               const tracks = player.getVariantTracks();
               // Filter unique video tracks by height
               const videoTracks = tracks.filter(t => t.type === 'variant' && t.height);
               const uniqueTracks = [];
               const map = new Map();
               
               // Sort High to Low (1080p -> 720p...)
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

                   // Add Quality to ArtPlayer Settings
                   art.setting.add({
                        html: 'Quality',
                        width: 150,
                        tooltip: 'Auto',
                        selector: levels,
                        onSelect: function (item) {
                            // **FIX:** Force Switch Logic
                            if (item.id === -1) {
                                // Auto Mode
                                player.configure({ abr: { enabled: true } });
                                art.notice.show = "Switched to Auto Quality";
                            } else {
                                // Manual Mode
                                player.configure({ abr: { enabled: false } });
                                const track = tracks.find(t => t.id === item.id);
                                if (track) {
                                    // **CRITICAL FIX:** Second argument 'true' clears buffer
                                    // This forces immediate switch instead of waiting
                                    player.selectVariantTrack(track, true); 
                                    art.notice.show = `Switched to ${item.html}`;
                                }
                            }
                            return item.html;
                        },
                    });
               }

           } catch (e) {
               console.error("Shaka Load Error:", e);
               // art.notice.show = "Stream Error: " + e.code;
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
