"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { videoSources } from "@/lib/data/av1";

/**
 * Muted, looping background film.
 *
 * The client's clips carry no audio, so they autoplay inline like a moving
 * photograph. Playback stops while the clip is off screen, never starts for
 * visitors who ask for reduced motion (they get the poster), and a pause
 * control is shown because the loops run longer than five seconds, unless the
 * caller opts out.
 *
 * `eager` is for the film at the top of a page: the browser starts buffering
 * and playing it straight from the HTML instead of waiting for hydration.
 */
export function LoopVideo({
  src,
  poster,
  label,
  className,
  controlClassName,
  fit = "cover",
  overlay,
  controls = true,
  eager = false,
}: {
  src: string;
  poster: string;
  /** Describes the footage for screen readers. */
  label: string;
  className?: string;
  controlClassName?: string;
  fit?: "cover" | "contain";
  /** Scrims or captions painted over the film but under the pause control. */
  overlay?: ReactNode;
  /** Hides the pause control, for a pure backdrop loop such as the home hero. */
  controls?: boolean;
  eager?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (reduced || paused) {
      video.pause();
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.15 },
    );
    io.observe(video);
    return () => io.disconnect();
  }, [reduced, paused]);

  return (
    <>
      <video
        ref={ref}
        poster={poster}
        muted
        loop
        playsInline
        autoPlay={eager && !reduced}
        preload={reduced ? "none" : eager ? "auto" : "metadata"}
        aria-label={label}
        className={cn("absolute inset-0 h-full w-full", fit === "contain" ? "object-contain" : "object-cover", className)}
      >
        {videoSources(src).map((s) => (
          <source key={s.src} src={s.src} type={s.type} />
        ))}
      </video>
      {overlay}
      {reduced || !controls ? null : (
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? `Play video: ${label}` : `Pause video: ${label}`}
          className={cn(
            "absolute bottom-4 right-4 z-10 grid h-9 w-9 place-items-center rounded-full border border-cream/20 bg-ink/60 text-cream backdrop-blur transition-colors hover:border-gold hover:text-gold",
            controlClassName,
          )}
        >
          {paused ? <Play aria-hidden width={14} height={14} /> : <Pause aria-hidden width={14} height={14} />}
        </button>
      )}
    </>
  );
}
