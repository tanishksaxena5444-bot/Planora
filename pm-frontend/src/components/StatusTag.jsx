import { statusColor, statusLabel } from "./StatusRail";

export default function StatusTag({ status }) {
  return (
    <span
      className="font-mono text-[11px] tracking-wide uppercase px-2 py-0.5 rounded-full border"
      style={{
        color: statusColor(status),
        borderColor: statusColor(status),
        backgroundColor: "color-mix(in srgb, " + statusColor(status) + " 12%, transparent)",
      }}
    >
      {statusLabel(status)}
    </span>
  );
}
