"use client";
import { useEffect, useRef } from "react";
import Artplayer from "artplayer";
import Hls from "hls.js";
// Shaka Player Import
import shaka from "shaka-player/dist/shaka-player.ui.js";

export default function Player({ option, style, getInstance }) {
  const artRef = useRef();

  useEffect(() => {
    // আগের ইন্সট্যান্স থাকলে ধ্বংস করা
    if (artRef.current && artRef.current.destroy) {
      artRef.current.destroy(false);
    }

    const art = new Artplayer({
      ...option,
      container: artRef.current,
      
      // === UI & FEATURES (ArtPlayer) ===
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
        // HLS এর জন্য
        m3u8: function (video, url, art) {
          if (Hls.isSupported()) {
            const hls = new Hls();
            hls.loadSource(url);
            hls.attachMedia(video);
            art.hls = hls;
            art.on('destroy', () => hls.destroy());
          } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
            video.src = url;
          }
        },

        // DASH এর জন্য Shaka Player (Direct Load)
        dash: async function (video, url, art) {
           // 1. Shaka সাপোর্ট চেক
           shaka.polyfill.installAll();
           if (!shaka.Player.isBrowserSupported()) {
               art.notice.show = "Browser not supported for Shaka Player";
               return;
           }

           // 2. Shaka Player তৈরি (ArtPlayer এর ভিডিও এলিমেন্টের ভেতর)
           const player = new shaka.Player(video);

           // 3. কনফিগারেশন (DRM & Performance)
           const config = {
               streaming: {
                   bufferingGoal: 15, // ১৫ সেকেন্ড বাফার
                   lowLatencyMode: true, // লাইভ স্ট্রিমের জন্য
               }
           };

           // ClearKey সেটআপ
           const keyData = option.clearkey || option.Clearkey;
           if (keyData) {
               config.drm = {
                   clearKeys: keyData // ডাইরেক্ট অবজেক্ট পাস
               };
           }

           player.configure(config);

           // 4. এরর হ্যান্ডলিং
           player.addEventListener('error', (event) => {
               console.error('Shaka Error:', event.detail);
               art.notice.show = "Stream Error: " + event.detail.code;
           });

           // 5. লোড করা
           try {
               await player.load(url);
               console.log('Shaka: Video Loaded Successfully');
               
               // === কোয়ালিটি কন্ট্রোল (ArtPlayer Settings এ অ্যাড করা) ===
               // লোড হওয়ার পর ট্র্যাকগুলো বের করা
               const tracks = player.getVariantTracks();
               // শুধু ভিডিও ট্র্যাক ফিল্টার করা
               const videoTracks = tracks.filter(t => t.type === 'variant' && t.height);
               
               // ডুপ্লিকেট রিমুভ করা (হাইট অনুযায়ী)
               const uniqueTracks = [];
               const map = new Map();
               for (const item of videoTracks) {
                   if(!map.has(item.height)){
                       map.set(item.height, true);
                       uniqueTracks.push(item);
                   }
               }
               // বড় থেকে ছোট সাজানো
               uniqueTracks.sort((a, b) => b.height - a.height);

               if (uniqueTracks.length > 0) {
                   const levels = uniqueTracks.map((t) => ({
                       html: t.height + 'p',
                       id: t.id,
                   }));
                   levels.push({ html: 'Auto', id: -1, default: true });

                   // ArtPlayer এর সেটিংসে যোগ করা
                   art.setting.add({
                        html: 'Quality',
                        width: 150,
                        tooltip: 'Auto',
                        selector: levels,
                        onSelect: function (item) {
                            // Shaka তে কোয়ালিটি চেঞ্জ করা
                            if (item.id === -1) {
                                player.configure({ abr: { enabled: true } });
                            } else {
                                player.configure({ abr: { enabled: false } });
                                const track = tracks.find(t => t.id === item.id);
                                if (track) {
                                    player.selectVariantTrack(track, true); 
                                }
                            }
                            return item.html;
                        },
                    });
               }

           } catch (e) {
               console.error('Shaka Load Error:', e);
               art.notice.show = "Failed to load: " + e.message;
           }

           // প্লেয়ার ডেস্ট্রয় হলে শাকা প্লেয়ার ক্লিন করা
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
