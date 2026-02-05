"use client";
import { useEffect, useRef } from "react";
import Artplayer from "artplayer";
import Hls from "hls.js";
import dashjs from "dashjs";

export default function Player({ option, style, getInstance }) {
  const artRef = useRef();

  useEffect(() => {
    if (artRef.current && artRef.current.destroy) {
      artRef.current.destroy(false);
    }

    const art = new Artplayer({
      ...option,
      container: artRef.current,
      volume: 1,
      isLive: false, // Trick: Set false to FORCE show Seekbar/Progress bar
      muted: false,
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
           const dPlayer = dashjs.MediaPlayer().create();
           
           // Initialize first
           dPlayer.initialize(video, url, true);
           
           // STRICT ClearKey Setup
           if (option.clearkey) {
             // Ensure clearkey object is valid
             const protectionData = {
               "org.w3.clearkey": {
                 "clearkeys": option.clearkey
               }
             };
             dPlayer.setProtectionData(protectionData);
           }

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
