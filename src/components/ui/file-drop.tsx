"use client";

import { useId, useState } from "react";
import { Camera, FileText, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Document and photo upload.
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
  capture,
  aspect = "aspect-[16/10]",
  className,
}: {
  label: string;
  hint?: string;
  value: string | null;
  onChange: (value: string | null) => void;
  accept?: string;
  /** "environment" opens the rear camera on phones — for licences and walk-arounds. */
  capture?: "user" | "environment";
  aspect?: string;
  className?: string;
}) {
  const id = useId();
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function take(file: File | undefined) {
    if (!file) return;
    setError(null);
    const res = await readUpload(file);
    if (res.ok) onChange(res.value);
    else setError(res.error);
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
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label={`Remove ${label}`}
            className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-ink/80 text-cream backdrop-blur hover:text-danger"
          >
            <X width={14} height={14} />
          </button>
        </div>
      ) : (
        <label
          htmlFor={id}
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
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 text-center transition-colors",
            aspect,
            over ? "border-gold bg-gold/5" : "border-line-strong bg-ink/40 hover:border-gold/60",
          )}
        >
          {capture ? (
            <Camera aria-hidden width={22} height={22} className="text-gold" />
          ) : (
            <Upload aria-hidden width={22} height={22} className="text-gold" />
          )}
          <span className="text-sm text-cream">{capture ? "Take a photo or upload" : "Drop a file or browse"}</span>
          {hint ? <span className="text-xs text-muted-dim">{hint}</span> : null}
          <input
            id={id}
            type="file"
            accept={accept}
            capture={capture}
            className="sr-only"
            onChange={(e) => void take(e.target.files?.[0])}
          />
        </label>
      )}
      {error ? <p className="mt-2 text-xs text-danger">{error}</p> : null}
    </div>
  );
}
