"use client";
import { useEffect, useRef } from "react";
import Artplayer from "artplayer";
import Hls from "hls.js";
import dashjs from "dashjs";

export default function Player({ option, style, getInstance }) {
  const artRef = useRef();

  useEffect(() => {
    const art = new Artplayer({
      ...option,
      container: artRef.current,
      volume: 1,
      isLive: true,
      muted: false,
      autoplay: true,
      pip: true,
      autoSize: true,
      autoMini: true,
      setting: true,
      loop: true,
      flip: true,
      playbackRate: true,
      aspectRatio: true,
      fullscreen: true,
      fullscreenWeb: true,
      subtitleOffset: true,
      miniProgressBar: true,
      mutex: true,
      backdrop: true,
      playsInline: true,
      autoPlayback: true,
      airplay: true,
      theme: "#ff0055", // Toffee color vibe
      customType: {
        m3u8: function (video, url) {
          if (Hls.isSupported()) {
            const hls = new Hls();
            hls.loadSource(url);
            hls.attachMedia(video);
          } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
            video.src = url;
          }
        },
        dash: function (video, url, art) {
           // DRM/ClearKey Setup
           const dPlayer = dashjs.MediaPlayer().create();
           dPlayer.initialize(video, url, true);
           
           // Check for ClearKey in options
           if (option.clearkey) {
             dPlayer.setProtectionData({
               "org.w3.clearkey": {
                 "clearkeys": option.clearkey
               }
             });
           }
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
  }, [option.url]); // Re-init if URL changes

  return <div ref={artRef} style={style} />;
}
