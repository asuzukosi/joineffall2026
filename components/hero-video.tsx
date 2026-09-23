"use client";

import { useRef, useState } from "react";
import { Volume2 } from "lucide-react";

export function HeroVideo() {
  const video = useRef<HTMLVideoElement>(null);
  const [silent, setSilent] = useState(true);

  // No browser will autoplay with sound. It starts muted, and the first gesture
  // anywhere on the page turns the sound on. If the browser refuses anyway it
  // pauses the video, so put it back to playing-and-muted rather than leaving a
  // still frame in silence.
  async function unmute() {
    const element = video.current;
    if (!element) return;

    element.muted = false;
    try {
      await element.play();
      setSilent(false);
    } catch {
      element.muted = true;
      void element.play();
    }
  }

  return (
    <div className="relative w-full max-w-2xl" onClick={unmute}>
      <video
        ref={video}
        src="/go-get-that-money.mp4"
        autoPlay
        muted
        loop
        playsInline
        className="w-full rounded-xl"
      />
      {silent && (
        <button
          onClick={unmute}
          className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/70 px-4 py-2 text-sm text-white backdrop-blur"
        >
          <Volume2 className="size-4" aria-hidden />
          Tap for sound
        </button>
      )}
    </div>
  );
}
