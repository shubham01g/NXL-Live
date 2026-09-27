"use client";

import { useState } from "react";
import { IdCard } from "lucide-react";
import { shortDate } from "@/lib/domain/format";
import { useMember, updateMember } from "@/lib/auth/use-session";
import { logAudit, raiseAlert } from "@/lib/data/demo";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/field";
import { FileDrop } from "@/components/ui/file-drop";
import { Badge } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { DetailRow, Panel } from "../panel";

/**
 * Driver's licence — the prototype's upload zone on the Insurance tab.
 * Photos are downscaled in the browser at M2; M3 stores the originals and the
 * review happens in the back office's customer drawer.
 */
export function LicencePanel() {
  const member = useMember();
  const [editing, setEditing] = useState(false);
  const [front, setFront] = useState<string | null>(null);
  const [back, setBack] = useState<string | null>(null);
  const [number, setNumber] = useState("");
  const [state, setState] = useState("FL");
  const [expiry, setExpiry] = useState("");
  const [error, setError] = useState<string | null>(null);
  if (!member) return null;
  const licence = member.licence ?? null;

  function submit() {
    if (!front) return setError("Add a photo of the front of your licence.");
    if (number.trim().length < 5) return setError("Enter your licence number.");
    if (!/^[A-Za-z]{2}$/.test(state.trim())) return setError("Use the two-letter issuing state.");
    const expiresAt = expiry ? new Date(`${expiry}T00:00:00`).getTime() : NaN;
    if (!Number.isFinite(expiresAt)) return setError("Enter the expiry date.");
    if (expiresAt < Date.now()) return setError("That licence has expired.");
    updateMember((m) => ({
      ...m,
      licence: { number: number.trim().toUpperCase(), state: state.trim().toUpperCase(), expiresAt, front, back, status: "pending", submittedAt: Date.now() },
    }));
    raiseAlert("booking", "Licence to review", `${member?.name} uploaded a driver's licence.`);
    logAudit(member!.name, "member.licence_uploaded", member!.email, `${state.toUpperCase()} licence`);
    setEditing(false);
    setError(null);
    toast("Licence submitted — the team reviews it before your next delivery.");
  }

  const statusTone = licence?.status === "verified" ? "success" : licence?.status === "rejected" ? "danger" : "warning";

  return (
    <Panel
      title="Driver's licence"
      description="Required for every car rental. Reviewed once by the team, then good until it expires."
      action={licence && !editing ? <Badge tone={statusTone}>{licence.status === "verified" ? "Verified" : licence.status === "rejected" ? "Action required" : "In review"}</Badge> : undefined}
    >
      {licence && !editing ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {[licence.front, licence.back].map((img, i) =>
              img ? (
                // A local data URL — nothing for next/image to optimise.
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={img} alt={i ? "Licence back" : "Licence front"} className="aspect-[16/10] w-full rounded-lg border border-line object-cover" />
              ) : (
                <div key={i} className="grid aspect-[16/10] place-items-center rounded-lg border border-dashed border-line text-xs text-muted-dim">
                  No back image
                </div>
              ),
            )}
          </div>
          <dl className="mt-4">
            <DetailRow label="Number"><span className="font-mono">{licence.number}</span></DetailRow>
            <DetailRow label="State">{licence.state}</DetailRow>
            <DetailRow label="Expires">{shortDate(licence.expiresAt)}</DetailRow>
            <DetailRow label="Submitted">{shortDate(licence.submittedAt)}</DetailRow>
          </dl>
          {licence.status === "rejected" && licence.note ? <Alert tone="danger" className="mt-4" title="From the team">{licence.note}</Alert> : null}
          <Button variant="outline" size="sm" className="mt-4" onClick={() => setEditing(true)}>
            Replace licence
          </Button>
        </>
      ) : licence === null && !editing ? (
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-gold/40 text-gold">
            <IdCard aria-hidden width={20} height={20} />
          </span>
          <p className="flex-1 text-sm text-muted">No licence on file yet. It takes a minute — snap the front and back with your phone.</p>
          <Button size="sm" onClick={() => setEditing(true)}>Add licence</Button>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <FileDrop label="Front" value={front} onChange={setFront} capture="environment" accept="image/*" hint="Photo or scan" />
            <FileDrop label="Back" value={back} onChange={setBack} capture="environment" accept="image/*" hint="Optional" />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Licence number" htmlFor="lic-no" required>
              <Input id="lic-no" value={number} onChange={(e) => setNumber(e.target.value)} className="font-mono uppercase" />
            </Field>
            <Field label="State" htmlFor="lic-state" required>
              <Input id="lic-state" maxLength={2} value={state} onChange={(e) => setState(e.target.value.toUpperCase())} />
            </Field>
            <Field label="Expires" htmlFor="lic-exp" required>
              <Input id="lic-exp" type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
            </Field>
          </div>
          {error ? <Alert tone="danger">{error}</Alert> : null}
          <div className="flex gap-3">
            <Button onClick={submit}>Submit for review</Button>
            <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </Panel>
  );
}

/** The declarations page for an own policy — speeds up verification. */
export function PolicyDocument() {
  const member = useMember();
  if (!member?.insurance || member.insurance.kind !== "own") return null;
  const doc = member.insurance.document ?? null;
  return (
    <div className="mt-5">
      <FileDrop
        label="Declarations page"
        hint="PDF or photo — verification is faster with it"
        value={doc}
        aspect="aspect-[3/1]"
        onChange={(value) => {
          updateMember((m) => (m.insurance ? { ...m, insurance: { ...m.insurance, document: value } } : m));
          if (value) toast("Policy document attached.");
        }}
      />
    </div>
  );
}
