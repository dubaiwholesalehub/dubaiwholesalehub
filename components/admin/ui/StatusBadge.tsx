interface StatusBadgeProps {
  active: boolean;
}

export default function StatusBadge({ active }: StatusBadgeProps) {
  return (
    <span
      className={[
        "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
        active
          ? "bg-green-100 text-green-700"
          : "bg-slate-200 text-slate-600",
      ].join(" ")}
    >
      {active ? "Active" : "Archived"}
    </span>
  );
}