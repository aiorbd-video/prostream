"use client";
import { useEffect, useRef, useState } from "react";
import Artplayer from "artplayer";
import Hls from "hls.js";
import shaka from "shaka-player/dist/shaka-player.compiled.js";

export default function Player({ option, style, getInstance }) {
  const artRef = useRef();
  const [statusMsg, setStatusMsg] = useState("Connecting...");

  useEffect(() => {
    if (!option?.url) return;

    // Destroy old instance
    if (artRef.current?.art) {
      artRef.current.art.destroy(false);
    }

    // 🧠 BUILD URL LIST (Direct → Proxy)
    const directUrl = option.url;
    const proxyBase = option.proxy || null;

    const urlList = proxyBase
      ? [directUrl, proxyBase + encodeURIComponent(directUrl)]
      : [directUrl];

    const art = new Artplayer({
      ...option,
      url: urlList[0],
      container: artRef.current,

      // UI SETTINGS
      volume: 1,
      autoplay: true,
      autoPlayback: true,
      pip: true,
      autoSize: true,
      fullscreen: true,
      fullscreenWeb: true,
      miniProgressBar: true,
      lock: true,
      fastForward: true,
      autoOrientation: true,
      theme: "#ff0055",

      customType: {
        // ================= HLS (.m3u8) =================
        m3u8: function (video, url, art) {
          let hls = null;
          let currentIndex = 0;
          let isDestroyed = false;

          function loadStream(streamUrl) {
            if (isDestroyed) return;

            setStatusMsg(
              currentIndex === 0
                ? "Connecting (Direct)..."
                : "Connecting (Proxy)..."
            );

            if (hls) {
              hls.destroy();
              hls = null;
            }

            if (Hls.isSupported()) {
              hls = new Hls({
                debug: false,
                enableWorker: true,
                lowLatencyMode: false,
                backBufferLength: 90,
                maxBufferLength: 40,
                maxMaxBufferLength: 80,
                liveSyncDurationCount: 3,
                fragLoadingTimeOut: 20000,
                manifestLoadingTimeOut: 20000,
                levelLoadingTimeOut: 20000,
                startLevel: -1,
              });

              hls.loadSource(streamUrl);
              hls.attachMedia(video);
              art.hls = hls;

              // SUCCESS
              hls.on(Hls.Events.MANIFEST_PARSED, () => {
                setStatusMsg("");
                video.play().catch(() => {
                  video.muted = true;
                  video.play();
                  art.notice.show = "Tap to Unmute 🔊";
                });

                // Quality Selector
                if (hls.levels.length > 1) {
                  const levels = hls.levels.map((level, index) => ({
                    html: level.height
                      ? `${level.height}p`
                      : `Level ${index + 1}`,
                    level: index,
                  }));

                  levels.push({ html: "Auto", level: -1, default: true });

                  art.setting.add({
                    html: "Quality",
                    width: 150,
                    tooltip: "Auto",
                    selector: levels,
                    onSelect: function (item) {
                      hls.currentLevel = item.level;
                      return item.html;
                    },
                  });
                }
              });

              // ERROR HANDLER (Direct → Proxy fallback)
              hls.on(Hls.Events.ERROR, (event, data) => {
                if (!data.fatal) return;

                console.warn("HLS Fatal Error:", data.type);

                // Try media recovery first
                if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                  hls.recoverMediaError();
                  return;
                }

                // NETWORK / OTHER ERROR → SWITCH SOURCE
                if (currentIndex < urlList.length - 1) {
                  currentIndex++;
                  console.log("Switching to fallback:", urlList[currentIndex]);
                  loadStream(urlList[currentIndex]);
                } else {
                  setStatusMsg("Stream Offline");
                  art.notice.show = "All Sources Failed";
                }
              });
            }
            // Safari / iOS Native Fallback
            else if (video.canPlayType("application/vnd.apple.mpegurl")) {
              video.src = streamUrl;
              video.play();
              setStatusMsg("");

              video.onerror = () => {
                if (currentIndex < urlList.length - 1) {
                  currentIndex++;
                  loadStream(urlList[currentIndex]);
                } else {
                  setStatusMsg("Playback Failed");
                }
              };
            } else {
              setStatusMsg("Format Not Supported");
              art.notice.show = "HLS not supported";
            }
          }

          loadStream(urlList[currentIndex]);

          art.on("destroy", () => {
            isDestroyed = true;
            if (hls) hls.destroy();
          });
        },

        // ================= DASH (.mpd) =================
        dash: async function (video, url, art) {
          shaka.polyfill.installAll();
          if (!shaka.Player.isBrowserSupported()) {
            art.notice.show = "Browser not supported";
            return;
          }

          const player = new shaka.Player(video);

          try {
            setStatusMsg("Connecting...");
            await player.load(url);
            setStatusMsg("");
          } catch (e) {
            console.error("DASH Error:", e);
            setStatusMsg("Stream Failed");
          }

          art.shaka = player;
          art.on("destroy", () => player.destroy());
        },

        // ================= MP4 =================
        mp4: function (video, url) {
          video.src = url;
          video.load();
          setStatusMsg("");
        },
      },
    });

    artRef.current.art = art;

    art.on("ready", () => {
      art.play().catch(() => {
        art.muted = true;
        art.play();
        art.notice.show = "Tap to Unmute 🔊";
      });
    });

    getInstance?.(art);

    return () => {
      if (art && art.destroy) {
        art.destroy(false);
      }
    };
  }, [option.url, option.proxy]);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden" style={style}>
      {statusMsg && (
        <div className="absolute top-0 left-0 w-full bg-[#ff0055]/90 text-white text-xs font-bold py-1 z-50 text-center animate-pulse shadow-md">
          {statusMsg}
        </div>
      )}
      <div ref={artRef} className="w-full h-full" />
    </div>
  );
}
