"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, RotateCcw, Check } from "lucide-react";
import { Button } from "./button";
import { Alert } from "./feedback";
import { Modal } from "./overlay";
import { cn } from "@/lib/utils/cn";

/**
 * In-page camera scanner — the prototype's "Scan with camera".
 *
 * Opens the rear camera through getUserMedia, overlays a guide frame shaped
 * like the thing being scanned (an ID card, a letter-size page, or the full
 * view for a walk-around photo) and crops the capture to that frame, so a
 * licence comes out as a licence, not a desk with a licence on it. Works on
 * laptops as well as phones. Where the camera is unavailable or blocked the
 * caller falls back to the browser's own camera/file picker.
 */

export type ScanShape = "card" | "document" | "photo";

/** Width ÷ height of the guide frame. */
const RATIO: Record<Exclude<ScanShape, "photo">, number> = {
  card: 85.6 / 53.98, // ISO ID-1 — licences, insurance cards
  document: 8.5 / 11, // US letter — declarations pages
};

const HINT: Record<ScanShape, string> = {
  card: "Fit the card inside the frame, flat and in good light.",
  document: "Fit the page inside the frame. Avoid glare.",
  photo: "Frame the shot, then capture.",
};

export function cameraSupported() {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
}

/** The guide frame as fractions of the video, centred. */
function frameFor(shape: ScanShape, vw: number, vh: number) {
  if (shape === "photo" || !vw || !vh) return { w: 1, h: 1 };
  const ratio = RATIO[shape];
  // Largest frame of the right shape that leaves a margin on every side.
  let h = 0.86;
  let w = (h * vh * ratio) / vw;
  if (w > 0.86) {
    w = 0.86;
    h = (w * vw) / ratio / vh;
  }
  return { w, h };
}

export function ScannerModal({
  open,
  label,
  shape,
  onCapture,
  onClose,
  onFallback,
}: {
  open: boolean;
  label: string;
  shape: ScanShape;
  onCapture: (file: File) => void;
  onClose: () => void;
  /** Called when the camera cannot be used, so the caller can open the native picker. */
  onFallback: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [size, setSize] = useState({ vw: 0, vh: 0 });
  const [shot, setShot] = useState<{ url: string; file: File } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  }, []);

  useEffect(() => {
    if (!open || shot) return;
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        stream.current = s;
        if (video.current) {
          video.current.srcObject = s;
          void video.current.play();
        }
      })
      .catch((e: unknown) => {
        const name = e instanceof DOMException ? e.name : "";
        setError(
          name === "NotAllowedError"
            ? "Camera access is blocked. Allow it in your browser's site settings, or use your device's camera instead."
            : name === "NotFoundError"
              ? "No camera found on this device."
              : "The camera could not be started.",
        );
      });
    return () => {
      cancelled = true;
      stop();
    };
  }, [open, shot, stop]);

  // Release the preview's object URL when it is replaced or the modal closes.
  useEffect(() => () => {
    if (shot) URL.revokeObjectURL(shot.url);
  }, [shot]);

  function close() {
    stop();
    setShot(null);
    setError(null);
    setSize({ vw: 0, vh: 0 });
    onClose();
  }

  function capture() {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const { w, h } = frameFor(shape, v.videoWidth, v.videoHeight);
    const sw = Math.round(v.videoWidth * w);
    const sh = Math.round(v.videoHeight * h);
    const canvas = document.createElement("canvas");
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // A touch of contrast makes printed text on cards and pages easier to read.
    if (shape !== "photo") ctx.filter = "contrast(1.12) saturate(1.05)";
    ctx.drawImage(v, (v.videoWidth - sw) / 2, (v.videoHeight - sh) / 2, sw, sh, 0, 0, sw, sh);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        stop();
        const file = new File([blob], `scan-${Date.now()}.jpg`, { type: "image/jpeg" });
        setShot({ url: URL.createObjectURL(blob), file });
      },
      "image/jpeg",
      0.9,
    );
  }

  const frame = frameFor(shape, size.vw, size.vh);

  return (
    <Modal
      open={open}
      onClose={close}
      size="lg"
      eyebrow="Scan"
      title={label}
      description={error ? undefined : HINT[shape]}
      footer={
        error ? (
          <>
            <Button variant="ghost" onClick={close}>Cancel</Button>
            <Button onClick={() => { close(); onFallback(); }}>
              <Camera aria-hidden width={15} height={15} /> Use device camera or files
            </Button>
          </>
        ) : shot ? (
          <>
            <Button variant="ghost" onClick={() => setShot(null)}>
              <RotateCcw aria-hidden width={15} height={15} /> Retake
            </Button>
            <Button onClick={() => { onCapture(shot.file); close(); }}>
              <Check aria-hidden width={15} height={15} /> Use this scan
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={close}>Cancel</Button>
            <Button onClick={capture} disabled={!size.vw}>
              <Camera aria-hidden width={15} height={15} /> Capture
            </Button>
          </>
        )
      }
    >
      {error ? (
        <Alert tone="warning">{error}</Alert>
      ) : shot ? (
        // A local object URL — nothing for next/image to optimise.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={shot.url} alt={`${label} scan`} className="mx-auto max-h-[60vh] w-auto rounded-lg border border-line-strong" />
      ) : (
        // The inner box shrinks to the video so the frame's percentages map onto it.
        <div className="flex justify-center rounded-lg bg-ink">
          <div className={cn("relative overflow-hidden rounded-lg", !size.vw && "aspect-video w-full")}>
            <video
              ref={video}
              playsInline
              muted
              onLoadedMetadata={(e) => setSize({ vw: e.currentTarget.videoWidth, vh: e.currentTarget.videoHeight })}
              className="block max-h-[60vh] max-w-full"
            />
            {shape !== "photo" && size.vw ? (
              <div
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl border-2 border-gold shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]"
                style={{ width: `${frame.w * 100}%`, height: `${frame.h * 100}%` }}
              >
                <div className="absolute inset-x-0 h-0.5 animate-scan bg-gold/80 shadow-[0_0_10px_2px_rgba(196,160,104,0.55)]" />
              </div>
            ) : null}
            {!size.vw ? <p className="absolute inset-0 grid place-items-center text-sm text-muted">Starting camera…</p> : null}
          </div>
        </div>
      )}
    </Modal>
  );
}
