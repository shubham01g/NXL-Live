"use client";

import { useRef, useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import { readProfilePhoto } from "@/lib/auth/photo";
import { useMember, updateMember } from "@/lib/auth/use-session";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import { SectionHeader, Panel, SavedNote } from "../panel";
import { SecurityPanel } from "./security-panel";
import { Avatar } from "../avatar";

/**
 * Settings.
 *
 * Profile photo, contact details and security sit on one page because that is
 * how the client's prototype grouped them, and because they are the three
 * things a member changes rather than adds. The sidebar reaches it under
 * "Security" and the profile card's Settings button lands here too.
 */
export function SecuritySection() {
  const member = useMember();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(member?.name ?? "");
  const [email, setEmail] = useState(member?.email ?? "");
  const [phone, setPhone] = useState(member?.phone ?? "");
  const [contactSaved, setContactSaved] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);

  if (!member) return null;

  async function onPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Let the same file be chosen again after a remove.
    event.target.value = "";
    if (!file) return;

    setPhotoError(null);
    setPhotoBusy(true);
    const result = await readProfilePhoto(file);
    setPhotoBusy(false);

    if (!result.ok) {
      setPhotoError(result.error);
      return;
    }
    updateMember((current) => ({ ...current, photo: result.dataUrl }));
  }

  function onContact(event: React.FormEvent) {
    event.preventDefault();
    setContactError(null);

    if (name.trim().length < 2) {
      setContactError("Enter your full name.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setContactError("Enter a valid email address.");
      return;
    }

    const trimmedPhone = phone.trim();
    updateMember((current) => ({
      ...current,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: trimmedPhone || null,
      security: {
        ...current.security,
        // The OTP destination follows the number on file.
        otpPhoneLast4: trimmedPhone ? trimmedPhone.replace(/\D/g, "").slice(-4) : null,
      },
    }));
    setContactSaved(true);
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Settings"
        description="Manage your profile photo, contact info, MFA, and password reset."
      />

      {/* ------------------------------ profile photo ----------------------------- */}
      <Panel title="Profile photo">
        <div className="flex flex-wrap items-center gap-5">
          <Avatar name={member.name} photo={member.photo} size="lg" />

          <div className="flex flex-wrap gap-3">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="user"
              onChange={onPhoto}
              className="sr-only"
              aria-label="Choose a profile photo"
            />
            <Button
              variant="subtle"
              size="sm"
              disabled={photoBusy}
              onClick={() => fileRef.current?.click()}
            >
              <Camera aria-hidden width={14} height={14} />
              {photoBusy ? "Processing…" : member.photo ? "Change photo" : "Add photo"}
            </Button>

            {member.photo ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => updateMember((current) => ({ ...current, photo: null }))}
              >
                <Trash2 aria-hidden width={14} height={14} />
                Remove photo
              </Button>
            ) : null}
          </div>
        </div>

        <p className="mt-3 text-xs text-muted-dim">
          JPG or PNG · captured from the camera on mobile. Cropped square and scaled to
          256px, so it stays on this device rather than being uploaded anywhere.
        </p>

        {photoError ? (
          <Alert tone="danger" className="mt-4">
            {photoError}
          </Alert>
        ) : null}
      </Panel>

      {/* --------------------------- contact information -------------------------- */}
      <Panel title="Contact information">
        <form onSubmit={onContact} className="space-y-5">
          <Field label="Full name" htmlFor="set-name" required>
            <Input
              id="set-name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>

          <Field label="Email address" htmlFor="set-email" required>
            <Input
              id="set-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>

          <Field
            label="Phone number"
            htmlFor="set-phone"
            hint="Where delivery updates and one-time codes are sent."
          >
            <Input
              id="set-phone"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(305) 555-0142"
            />
          </Field>

          {contactError ? <Alert tone="danger">{contactError}</Alert> : null}

          <Button type="submit" className="w-full">
            Save contact info
          </Button>

          {contactSaved ? <SavedNote>Contact info saved.</SavedNote> : null}
        </form>
      </Panel>

      <SecurityPanel />
    </div>
  );
}
