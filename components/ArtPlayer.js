"use client";
import { useEffect, useRef } from "react";
import Artplayer from "artplayer";
import Hls from "hls.js";
import dashjs from "dashjs";

export default function Player({ option, style, getInstance }) {
  const artRef = useRef();

  useEffect(() => {
    // Destroy previous instance to prevent memory leaks
    if (artRef.current && artRef.current.destroy) {
      artRef.current.destroy(false);
    }

    // Determine if it is likely a live stream or not to adjust UI
    const isLiveStream = option.isLive || true; 

    const art = new Artplayer({
      ...option,
      container: artRef.current,
      
      // === ALL FEATURES ENABLED (Like ExoPlayer) ===
      volume: 1,
      isLive: isLiveStream,
      muted: false,
      autoplay: true,
      autoPlayback: true,
      
      // UI Controls
      pip: true,            // Picture in Picture
      autoSize: true,
      autoMini: true,       // Mini player on scroll
      screenshot: true,     // Camera icon
      setting: true,        // Settings gear
      loop: false,          // Live stream usually shouldn't loop
      flip: true,           // Flip video
      playbackRate: true,   // Speed control (0.5x, 1x, 2x)
      aspectRatio: true,    // 16:9, 4:3 fit
      fullscreen: true,
      fullscreenWeb: true,
      subtitleOffset: true,
      
      // Mobile Specific (ExoPlayer Feel)
      miniProgressBar: true, 
      lock: true,           // Lock screen button (Important)
      fastForward: true,    // Double tap to seek
      autoOrientation: true,// Auto rotate on mobile
      airplay: true,        // Cast support
      
      // Theme
      theme: "#ff0055",
      icons: {
        state: '<img width="150" heigth="150" src="https://artplayer.org/assets/img/state.svg">',
        indicator: '<img width="16" heigth="16" src="https://artplayer.org/assets/img/indicator.svg">',
      },

      // === CUSTOM LOADER ===
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
        
        // === DASH FIX FOR LOADING & TIME BUG ===
        dash: function (video, url, art) {
           const dPlayer = dashjs.MediaPlayer().create();
           
           // 1. Configure to ignore some errors and force play
           dPlayer.updateSettings({
                'streaming': {
                    'delay': {
                        'liveDelay': 3 // Keep live delay low
                    },
                    'buffer': {
                        'stableBufferTime': 5 // Stable buffer
                    }
                }
           });

           // 2. ClearKey Setup (MUST BE BEFORE INITIALIZE)
           // We handle both lowercase 'clearkey' and Uppercase 'Clearkey'
           const keyData = option.clearkey || option.Clearkey;
           
           if (keyData) {
             // Create the protection data object explicitly
             const protectionData = {
               "org.w3.clearkey": {
                 "clearkeys": keyData
               }
             };
             dPlayer.setProtectionData(protectionData);
             console.log("ClearKey Set:", protectionData);
           }

           // 3. Initialize
           dPlayer.initialize(video, url, true); // AutoPlay = true

           // 4. Fix for Time Bug (Infinite Time)
           // If it's a live stream, sometimes the duration gets messed up. 
           // We force the player to recognize it as live.
           dPlayer.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, () => {
             dPlayer.play();
             if(dPlayer.isDynamic()) {
                 art.notice.show = "Live Stream Connected";
             }
           });
           
           // Error Logging
           dPlayer.on(dashjs.MediaPlayer.events.ERROR, (e) => {
               console.error("DASH Error:", e);
               art.notice.show = "Stream Error: " + e.error + ". Try switching server.";
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
