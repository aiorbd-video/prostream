"use client";
import { useEffect, useRef } from "react";
import Artplayer from "artplayer";
import Hls from "hls.js";
import dashjs from "dashjs";

export default function Player({ option, style, getInstance }) {
  const artRef = useRef();

  useEffect(() => {
    // 1. Clean up previous instance
    if (artRef.current && artRef.current.destroy) {
      artRef.current.destroy(false);
    }

    const art = new Artplayer({
      ...option,
      container: artRef.current,
      volume: 1,
      isLive: false, // Force seekbar
      muted: true,   // TRICK: Start muted to bypass browser autoplay block
      autoplay: true,
      pip: true,
      autoSize: true,
      autoMini: true,
      screenshot: true,
      setting: true,
      loop: true,
      flip: true,
      playbackRate: true,
      aspectRatio: true,
      fullscreen: true,
      fullscreenWeb: true,
      miniProgressBar: true,
      mutex: true,
      backdrop: true,
      playsInline: true,
      autoPlayback: true,
      airplay: true,
      theme: "#ff0055",
      
      customType: {
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
        dash: function (video, url, art) {
           // TRICK: Reset protection data explicitly before init
           const dPlayer = dashjs.MediaPlayer().create();
           
           // ClearKey Setup Logic
           // Note: Clearkey setup MUST happen before initialization for some streams
           if (option.clearkey) {
             const protectionData = {
               "org.w3.clearkey": {
                 "clearkeys": option.clearkey
               }
             };
             dPlayer.setProtectionData(protectionData);
           }

           dPlayer.initialize(video, url, true); // AutoPlay = true

           // TRICK: Force start if stuck
           dPlayer.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, () => {
             dPlayer.play();
             // Unmute after a short delay if user interacts, or let user unmute
             // art.muted = false; // Uncomment if you want to risk it
           });

           art.dash = dPlayer;
           art.on('destroy', () => dPlayer.reset());
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
