"use client";
import { useEffect, useRef } from "react";
import Artplayer from "artplayer";
import Hls from "hls.js";
import dashjs from "dashjs";

export default function Player({ option, style, getInstance }) {
  const artRef = useRef();

  useEffect(() => {
    // Destroy old instance if exists
    if (artRef.current && artRef.current.destroy) {
      artRef.current.destroy(false);
    }

    const art = new Artplayer({
      ...option,
      container: artRef.current,
      volume: 1,
      isLive: true, // Live UI toggle
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
      
      // Control Bar Settings to force Seekbar
      controls: [
        {
          name: 'live-badge',
          position: 'right',
          html: '<span style="color:red; font-weight:bold; font-size:12px;">● LIVE</span>',
        }
      ],

      customType: {
        m3u8: function (video, url, art) {
          if (Hls.isSupported()) {
            const hls = new Hls();
            hls.loadSource(url);
            hls.attachMedia(video);
            
            // Quality Switching for HLS
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              if(hls.levels.length > 1) {
                const levels = hls.levels.map((level, index) => ({
                    html: level.height + 'p',
                    level: index,
                }));
                // Add Auto
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
          } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
            video.src = url;
          }
        },
        dash: function (video, url, art) {
           const dPlayer = dashjs.MediaPlayer().create();
           dPlayer.initialize(video, url, true);
           
           // FIXED: ClearKey Implementation
           if (option.clearkey) {
             dPlayer.setProtectionData({
               "org.w3.clearkey": {
                 "clearkeys": option.clearkey
               }
             });
           }

           // Quality Switching for DASH
           dPlayer.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, () => {
              const bitrates = dPlayer.getBitrateInfoListFor("video");
              if (bitrates.length > 1) {
                  const levels = bitrates.map((b, i) => ({
                      html: b.height + 'p',
                      index: i
                  }));
                  levels.push({ html: 'Auto', index: -1, default: true });

                  art.setting.add({
                    html: 'Quality',
                    width: 150,
                    tooltip: 'Auto',
                    selector: levels,
                    onSelect: function (item) {
                        dPlayer.setAutoSwitchQualityFor("video", item.index === -1);
                        if (item.index !== -1) {
                            dPlayer.setQualityFor("video", item.index);
                        }
                        return item.html;
                    },
                });
              }
           });
           
           art.dash = dPlayer;
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
  }, [option.url]); 

  return <div ref={artRef} style={style} />;
}
