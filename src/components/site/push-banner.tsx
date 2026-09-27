"use client";

import { useEffect, useState } from "react";
import { BellRing, Download, X } from "lucide-react";
import { useMember } from "@/lib/auth/use-session";
import { setValue, useDemoValue } from "@/lib/data/demo-store";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

/**
 * "Stay in the loop" / "Add NXL to your home screen".
 *
 * The prototype's PushBanner. Browser notification permission is real here —
 * granting it shows a real local notification — but there is no push server
 * until M5, so booking reminders arrive in the in-app centre for now. The
 * install prompt appears only where the browser offers one (Chrome/Edge/
 * Android); the PWA manifest and service worker ship at M5.
 */

export interface NotificationPrefs {
  push: boolean;
  email: boolean;
  sms: boolean;
  reminders: boolean;
  marketing: boolean;
}

export const DEFAULT_PREFS: NotificationPrefs = { push: false, email: true, sms: true, reminders: true, marketing: false };
export const prefsKey = (email: string) => `prefs:${email}`;

interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
}

export async function enablePush(email: string, prefs: NotificationPrefs): Promise<boolean> {
  if (typeof Notification === "undefined") {
    toast("This browser doesn't support notifications.", "warning");
    return false;
  }
  const result = await Notification.requestPermission();
  if (result !== "granted") {
    toast("Notifications are blocked — you can allow them in your browser settings.", "warning");
    return false;
  }
  setValue(prefsKey(email), { ...prefs, push: true });
  try {
    new Notification("NXL notifications are on", {
      body: "We'll tell you when your car is on its way and before it's due back.",
      icon: "/icon.png",
    });
  } catch {
    // Some mobile browsers only allow notifications from a service worker.
  }
  toast("Push notifications are on.");
  return true;
}

export function PushBanner() {
  const member = useMember();
  const prefs = useDemoValue<NotificationPrefs>(prefsKey(member?.email ?? "-"), DEFAULT_PREFS);
  const dismissed = useDemoValue<boolean>("push-banner-dismissed", false);
  const [install, setInstall] = useState<InstallPrompt | null>(null);
  const [ready, setReady] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstall(e as InstallPrompt);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    // Don't greet a visitor with a permission prompt — wait until they've looked around.
    const t = window.setTimeout(() => {
      setPermission(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
      setReady(true);
    }, 8000);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.clearTimeout(t);
    };
  }, []);

  if (!ready || dismissed) return null;
  const wantsPush = !!member && !prefs.push && permission === "default";
  if (!wantsPush && !install) return null;

  const dismiss = () => setValue("push-banner-dismissed", true);

  return (
    <div
      role="dialog"
      aria-label={install ? "Install the NXL app" : "Turn on notifications"}
      className="fixed inset-x-4 bottom-24 z-[var(--z-float)] mx-auto max-w-md animate-rise sm:bottom-6"
    >
      <div className="edge-gold flex items-start gap-4 rounded-xl p-4 shadow-elev-3">
        <span className="metal-plate grid h-10 w-10 shrink-0 place-items-center rounded-full">
          {install ? <Download aria-hidden width={18} height={18} /> : <BellRing aria-hidden width={18} height={18} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-semibold text-cream">
            {install ? "Add NXL to your home screen" : "Stay in the loop"}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {install
              ? "One tap to your bookings, live delivery tracking and the concierge."
              : "Get a nudge when your car is on its way, and before it's due back."}
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              onClick={async () => {
                if (install) {
                  await install.prompt();
                  setInstall(null);
                  dismiss();
                } else if (member) {
                  await enablePush(member.email, prefs);
                  setPermission(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
                }
              }}
            >
              {install ? "Install app" : "Turn on"}
            </Button>
            <Button size="sm" variant="ghost" onClick={dismiss}>
              Not now
            </Button>
          </div>
        </div>
        <button type="button" onClick={dismiss} aria-label="Dismiss" className="text-muted hover:text-cream">
          <X width={16} height={16} />
        </button>
      </div>
    </div>
  );
}
