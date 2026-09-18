const STATUS_META = {
  todo: { label: "Todo", color: "var(--color-todo)" },
  in_progress: { label: "In progress", color: "var(--color-progress)" },
  done: { label: "Done", color: "var(--color-done)" },
};

export function statusColor(status) {
  return STATUS_META[status]?.color || "var(--color-todo)";
}

export function statusLabel(status) {
  return STATUS_META[status]?.label || status;
}

export default function StatusRail({ status, children, className = "" }) {
  return (
    <div className={`flex ${className}`}>
      <div
        className="w-1 shrink-0 rounded-full mr-3"
        style={{ backgroundColor: statusColor(status) }}
      />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
