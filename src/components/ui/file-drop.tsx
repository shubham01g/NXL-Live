"use client";

import { useId, useRef, useState } from "react";
import { Camera, FileText, RotateCcw, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { cameraSupported, ScannerModal, type ScanShape } from "./document-scanner";

/**
 * Document and photo upload, with a camera scan beside it.
 *
 * Every document slot offers both: "Scan" opens the in-page scanner (rear
 * camera, a guide frame, cropped to the card or page), "Upload" opens the
 * file picker or takes a drop. Where the browser has no camera API, Scan
 * falls back to the device's own camera app.
 *
 * At M2 files never leave the browser: images are downscaled to ~1200px JPEG
 * (so a licence photo fits in localStorage) and PDFs are kept only by name.
 * M3 uploads the original to storage and stores its URL — `onChange` still
 * receives one string either way.
 */

const MAX_BYTES = 15 * 1024 * 1024;

export async function readUpload(file: File, maxPx = 1200): Promise<{ ok: true; value: string } | { ok: false; error: string }> {
  if (file.size > MAX_BYTES) return { ok: false, error: "That file is over 15MB." };
  if (file.type === "application/pdf") return { ok: true, value: `pdf:${file.name}` };
  if (!file.type.startsWith("image/")) return { ok: false, error: "Upload a photo (JPG, PNG, HEIC) or a PDF." };
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxPx / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return { ok: true, value: canvas.toDataURL("image/jpeg", 0.78) };
  } catch {
    return { ok: false, error: "That image could not be read. Try another." };
  }
}

export function isPdf(value: string | null | undefined) {
  return !!value && value.startsWith("pdf:");
}

export function FileDrop({
  label,
  hint,
  value,
  onChange,
  accept = "image/*,application/pdf",
  scan = "document",
  aspect = "aspect-[16/10]",
  className,
}: {
  label: string;
  hint?: string;
  value: string | null;
  onChange: (value: string | null) => void;
  accept?: string;
  /** Shape of the scanner's guide frame — "card" for licences and insurance cards; `false` hides Scan. */
  scan?: ScanShape | false;
  aspect?: string;
  className?: string;
}) {
  const id = useId();
  const cameraInput = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function take(file: File | undefined) {
    if (!file) return;
    setError(null);
    const res = await readUpload(file);
    if (res.ok) onChange(res.value);
    else setError(res.error);
  }

  function startScan() {
    setError(null);
    if (cameraSupported()) setScanning(true);
    else cameraInput.current?.click();
  }

  return (
    <div className={className}>
      <p className="mb-2 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted">{label}</p>
      {value ? (
        <div className={cn("relative overflow-hidden rounded-lg border border-line-strong bg-ink/60", aspect)}>
          {isPdf(value) ? (
            <div className="grid h-full place-items-center gap-2 p-4 text-center">
              <FileText aria-hidden width={28} height={28} className="text-gold" />
              <p className="truncate text-sm text-cream">{value.slice(4)}</p>
            </div>
          ) : (
            // A local data URL — nothing for next/image to optimise.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt={label} className="h-full w-full object-cover" />
          )}
          <div className="absolute right-2 top-2 flex gap-1.5">
            {scan ? (
              <button
                type="button"
                onClick={startScan}
                aria-label={`Re-scan ${label}`}
                className="grid h-8 w-8 place-items-center rounded-full bg-ink/80 text-cream backdrop-blur hover:text-gold"
              >
                <RotateCcw width={14} height={14} />
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => onChange(null)}
              aria-label={`Remove ${label}`}
              className="grid h-8 w-8 place-items-center rounded-full bg-ink/80 text-cream backdrop-blur hover:text-danger"
            >
              <X width={14} height={14} />
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            void take(e.dataTransfer.files[0]);
          }}
          className={cn(
            "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-4 text-center transition-colors",
            aspect,
            over ? "border-gold bg-gold/5" : "border-line-strong bg-ink/40",
          )}
        >
          <div className="flex flex-wrap justify-center gap-2">
            {scan ? (
              <button
                type="button"
                onClick={startScan}
                className="inline-flex items-center gap-1.5 rounded-full border border-gold/50 bg-gold/10 px-3.5 py-2 text-sm font-medium text-gold transition-colors hover:bg-gold/20"
              >
                <Camera aria-hidden width={15} height={15} /> Scan
              </button>
            ) : null}
            <label
              htmlFor={id}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-line-strong px-3.5 py-2 text-sm text-cream transition-colors hover:border-gold/60"
            >
              <Upload aria-hidden width={15} height={15} /> Upload
            </label>
          </div>
          <span className="text-xs text-muted-dim">{hint ?? (scan ? "Scan with your camera, upload, or drop a file" : "Upload or drop a file")}</span>
        </div>
      )}
      <input id={id} type="file" accept={accept} className="sr-only" onChange={(e) => { void take(e.target.files?.[0]); e.target.value = ""; }} />
      {scan ? (
        <>
          {/* Fallback: the device's own camera app, for browsers without the camera API. */}
          <input
            ref={cameraInput}
            type="file"
            accept="image/*"
            capture="environment"
            tabIndex={-1}
            aria-hidden
            className="sr-only"
            onChange={(e) => { void take(e.target.files?.[0]); e.target.value = ""; }}
          />
          <ScannerModal
            open={scanning}
            label={label}
            shape={scan}
            onCapture={(file) => void take(file)}
            onClose={() => setScanning(false)}
            onFallback={() => cameraInput.current?.click()}
          />
        </>
      ) : null}
      {error ? <p className="mt-2 text-xs text-danger">{error}</p> : null}
    </div>
  );
}
