import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { joinClauses, requiredTasks } from "@/lib/domain/account";
import type { MemberAccount } from "@/lib/domain/types";

/**
 * "Action required" bar.
 *
 * Only ever shows hard blockers — a member cannot rent without a card and
 * insurance on file. Address and MFA are nudges and live in the sidebar dots
 * instead, so this bar never cries wolf and can be trusted when it appears.
 */
export function SetupBanner({ member }: { member: MemberAccount }) {
  const tasks = requiredTasks(member);
  if (tasks.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-warning/25 bg-warning-dim/40 px-5 py-4">
      <p className="flex min-w-0 items-start gap-2.5 text-sm text-warning">
        <AlertTriangle aria-hidden width={16} height={16} className="mt-0.5 shrink-0" />
        <span>
          <strong className="font-semibold">Action required:</strong> Add{" "}
          {joinClauses(tasks)} before your next rental.
        </span>
      </p>

      <div className="flex shrink-0 flex-wrap gap-2">
        {tasks.map((task) => (
          <Link
            key={task.id}
            href={task.href}
            className="inline-flex items-center gap-1.5 rounded-full border border-warning/40 px-4 py-2 text-sm font-medium text-warning transition-colors hover:bg-warning/10"
          >
            {task.action}
            <ArrowRight aria-hidden width={14} height={14} />
          </Link>
        ))}
      </div>
    </div>
  );
}
