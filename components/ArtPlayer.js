"use client";
import { useEffect, useRef, useState } from "react";
import Artplayer from "artplayer";
import Hls from "hls.js";
import shaka from "shaka-player/dist/shaka-player.compiled.js";

export default function Player({ option, style, getInstance }) {
  const artRef = useRef();
  const [statusMsg, setStatusMsg] = useState("Connecting...");

  // ============================================================
  // ১. IFRAME হ্যান্ডেলিং (Browser Native Mode)
  // ============================================================
  // এখানে আমরা কোনো প্রক্সি বা কাস্টম হেডার দিচ্ছি না।
  // সরাসরি ব্রাউজার দিয়ে লোড হবে, তাই User Agent হবে ডিভাইসের অরিজিনাল UA।
  if (option.type === "iframe") {
    return (
      <div className="w-full h-full bg-black relative">
        {statusMsg && (
             <div className="absolute top-0 left-0 w-full bg-[#ff0055] text-white text-xs font-bold text-center py-1 z-10 animate-pulse">
                Loading Stream...
             </div>
        )}
        <iframe
          src={option.url}
          className="w-full h-full border-0 absolute inset-0"
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          referrerPolicy="no-referrer" // কনফ্লিক্ট এড়ানোর জন্য রেফারার হাইড রাখা ভালো (অপশনাল)
          onLoad={() => setStatusMsg(null)} 
        ></iframe>
      </div>
    );
  }

  // ============================================================
  // ২. ARTPLAYER লজিক (শুধুমাত্র m3u8, dash, mp4 এর জন্য)
  // ============================================================
  useEffect(() => {
    // ক্লিনআপ
    if (artRef.current && artRef.current.destroy) {
      artRef.current.destroy(false);
    }

    // Proxy URL জেনারেটর (শুধুমাত্র ভিডিও স্ট্রিমের জন্য)
    let playUrl = option.url;
    if (option.referer || option.origin || option.userAgent || option.cookie) {
       const params = new URLSearchParams();
       params.set("url", option.url);
       if (option.referer) params.set("referer", option.referer);
       if (option.origin) params.set("origin", option.origin);
       if (option.userAgent) params.set("userAgent", option.userAgent);
       if (option.cookie) params.set("cookie", option.cookie);
       playUrl = `/api/proxy?${params.toString()}`;
    }

    const art = new Artplayer({
      ...option,
      url: playUrl,
      container: artRef.current,
      type: option.type || 'm3u8',
      
      // UI Settings
      volume: 1,
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
      
      customType: {
        // --- HLS Logic ---
        m3u8: function (video, url, art) {
          const proxies = option.proxies || [];
          const urlList = [url, ...proxies.map(p => p + option.url)];
          let currentIndex = 0;
          let hls = null;

          function loadHls(currentUrl) {
              setStatusMsg(currentIndex === 0 ? "Connecting..." : `Trying Server ${currentIndex}...`);
              
              if (Hls.isSupported()) {
                  if (hls) hls.destroy();
                  hls = new Hls({
                      debug: false,
                      enableWorker: true,
                      lowLatencyMode: false,
                      backBufferLength: 90
                  });

                  // ইভেন্ট লিসেনার (আগে সেট করা)
                  hls.on(Hls.Events.ERROR, function (event, data) {
                      if (data.fatal) {
                          if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                              hls.recoverMediaError();
                          } else {
                              hls.destroy();
                              if (currentIndex < urlList.length - 1) {
                                  currentIndex++;
                                  loadHls(urlList[currentIndex]);
                              } else {
                                  setStatusMsg("Stream Offline");
                                  art.notice.show("All Servers Failed");
                              }
                          }
                      }
                  });

                  hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
                      setStatusMsg("");
                      video.play().catch(() => {
                          video.muted = true;
                          video.play();
                          art.notice.show = "Tap to Unmute 🔊";
                      });

                      // Quality Menu
                      if (data.levels && data.levels.length > 1) {
                          const levels = data.levels.map((level, index) => ({
                              html: level.height + 'p',
                              level: index,
                          }));
                          levels.push({ html: 'Auto', level: -1, default: true });

                          const exist = art.setting.find(item => item.html === 'Quality');
                          if (!exist) {
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
                      }
                  });

                  hls.loadSource(currentUrl);
                  hls.attachMedia(video);
                  art.hls = hls;

              } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
                  video.src = currentUrl;
                  video.play();
                  setStatusMsg("");
              } else {
                  art.notice.show = "Format Not Supported";
              }
          }
          loadHls(urlList[0]);
        },

        // --- DASH Logic ---
        dash: async function (video, url, art) {
           shaka.polyfill.installAll();
           if (!shaka.Player.isBrowserSupported()) {
               art.notice.show = "Browser not supported";
               return;
           }
           const player = new shaka.Player(video);
           const config = { 
               abr: { enabled: true, defaultBandwidthEstimate: 3000000 },
               streaming: { bufferingGoal: 15, lowLatencyMode: true }
           };
           const keyData = option.clearkey || option.Clearkey;
           if (keyData) config.drm = { clearKeys: keyData };
           
           player.configure(config);

           const loadWithProxies = async () => {
               const proxies = option.proxies || [];
               try {
                   setStatusMsg("Connecting...");
                   await player.load(url);
                   setStatusMsg("");
                   return;
               } catch(e) {}

               for(let i = 0; i < proxies.length; i++) {
                   try {
                       setStatusMsg(`Trying Server ${i+1}...`);
                       await player.load(proxies[i] + option.url);
                       setStatusMsg("");
                       return;
                   } catch(e) {}
               }
               setStatusMsg("Stream Failed");
           };

           await loadWithProxies();
           art.shaka = player; 
           art.on('destroy', () => player.destroy());
        },

        // --- MP4 Logic ---
        mp4: function (video, url, art) {
            video.src = url;
            video.play();
            setStatusMsg("");
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
  }, [option.url, option.clearkey, option.type]);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden" style={style}>
        {statusMsg && (
            <div className="absolute top-0 left-0 w-full bg-[#ff0055]/90 text-white text-xs font-bold py-1 z-50 text-center animate-pulse">
                {statusMsg}
            </div>
        )}
        <div ref={artRef} className="w-full h-full" />
    </div>
  );
}
