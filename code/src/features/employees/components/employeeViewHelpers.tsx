export const STATUS_LABELS: Record<string, string> = {
  new_onboard: "Onboarding",
  active: "Active",
  archiving: "Archiving",
  archived: "Archived",
};

export const STATUS_STYLES: Record<string, string> = {
  new_onboard: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
  archiving: "bg-yellow-100 text-yellow-700",
  archived: "bg-gray-100 text-gray-500",
};

export const HIRE_TYPE_LABELS: Record<string, string> = {
  full_time: "Full Time",
  part_time: "Part Time",
  contractor: "Contractor",
  intern: "Intern",
};

export const WORK_MODE_LABELS: Record<string, string> = {
  onsite: "On-site",
  remote: "Remote",
  hybrid: "Hybrid",
};

export function InfoRow({ label, value, staleReason }: { label: string; value: string | null | undefined; staleReason?: string | undefined }) {
  return (
    <div className={staleReason ? "rounded-md border border-orange-400 bg-orange-500/5 px-2 py-1.5 -mx-2" : ""}>
      <dt className={`text-xs font-medium uppercase tracking-wide ${staleReason ? "text-orange-600" : "text-muted-foreground"}`}>{label}</dt>
      <dd className={`mt-0.5 text-sm ${staleReason ? "font-medium text-orange-700" : "text-card-foreground"}`}>
        {value ?? "—"}
        {staleReason && <span className="ml-1.5 text-[10px] font-semibold text-orange-500">⚠ {staleReason}</span>}
      </dd>
    </div>
  );
}

export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h3>
  );
}
