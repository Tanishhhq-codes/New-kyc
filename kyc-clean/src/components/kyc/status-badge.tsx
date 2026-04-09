type KycStatus = "pending" | "approved" | "rejected" | "under_review";

const badgeClasses: Record<KycStatus, string> = {
  pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  approved: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  rejected: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  under_review: "bg-sky-500/15 text-sky-300 border-sky-500/30",
};

export function StatusBadge({ status }: { status: string }) {
  const normalized = (status || "pending") as KycStatus;
  const className = badgeClasses[normalized] || badgeClasses.pending;

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${className}`}>
      {normalized.replace("_", " ")}
    </span>
  );
}
