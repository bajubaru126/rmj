import { ReactNode, CSSProperties, ButtonHTMLAttributes } from "react";

/* ------------------------------------------------------------------ *
 * Lifecycle stage system — single source of truth for stage colors.
 * ------------------------------------------------------------------ */
export type StageKey = "preparation" | "survey" | "drm" | "instalasi" | "done";

export const STAGES: Record<
  StageKey,
  { label: string; hex: string; text: string; bg: string; ring: string }
> = {
  preparation: { label: "Preparation", hex: "#64748B", text: "text-[#64748B]", bg: "bg-[#64748B]/10", ring: "ring-[#64748B]/20" },
  survey:      { label: "Survey",      hex: "#2563EB", text: "text-[#2563EB]", bg: "bg-[#2563EB]/10", ring: "ring-[#2563EB]/20" },
  drm:         { label: "DRM",         hex: "#8B5CF6", text: "text-[#8B5CF6]", bg: "bg-[#8B5CF6]/10", ring: "ring-[#8B5CF6]/20" },
  instalasi:   { label: "Instalasi",   hex: "#F97316", text: "text-[#F97316]", bg: "bg-[#F97316]/10", ring: "ring-[#F97316]/20" },
  done:        { label: "Selesai",     hex: "#10B981", text: "text-[#10B981]", bg: "bg-[#10B981]/10", ring: "ring-[#10B981]/20" },
};

export function stageOf(s: string): StageKey {
  const k = s.toLowerCase();
  if (k.includes("survey")) return "survey";
  if (k.includes("drm")) return "drm";
  if (k.includes("instal")) return "instalasi";
  if (k.includes("selesai") || k.includes("done") || k.includes("closing") || k.includes("complete")) return "done";
  return "preparation";
}

/* ------------------------------------------------------------------ *
 * Status pills
 * ------------------------------------------------------------------ */
type Tone = "neutral" | "brand" | "blue" | "violet" | "amber" | "green" | "red";
const COLORS: Record<Tone, string> = {
  neutral: "bg-[#F1F5F9] text-[#94A3B8] ring-[#E2E8F0]",
  brand:   "bg-[#E0F2FE] text-[#0F172A] ring-[#E0F2FE]",
  blue:    "bg-[#E0F2FE] text-[#2563EB] ring-[#BFDBFE]",
  violet:  "bg-[#F3E8FF] text-[#8B5CF6] ring-[#DDD6FE]",
  amber:   "bg-[#FEF3C7] text-[#F59E0B] ring-[#FDE68A]",
  green:   "bg-[#D1FAE5] text-[#10B981] ring-[#A7F3D0]",
  red:     "bg-[#FEE2E2] text-[#EF4444] ring-[#FECACA]",
};

export function Tag({ children, tone = "neutral", dot = false, className = "" }: { children: ReactNode; tone?: Tone; dot?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-[6px] px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${COLORS[tone]} ${className}`}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function StageTag({ stage }: { stage: StageKey }) {
  const s = STAGES[stage];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider ${s.bg} ${s.text}`}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.hex }} />
      {s.label}
    </span>
  );
}

/* ------------------------------------------------------------------ *
 * Progress bar
 * ------------------------------------------------------------------ */
export function Bar({ value, color = "#2563EB", className = "" }: { value: number; color?: string; className?: string }) {
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-[#0F172A]/8 ${className}`}>
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${value}%`, background: color }} />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Panel — elevated card
 * ------------------------------------------------------------------ */
export function Panel({ children, className = "", style, onClick }: { children: ReactNode; className?: string; style?: CSSProperties; onClick?: () => void }) {
  const hasPadding = className.includes("p-") || className.includes("px-") || className.includes("py-");
  return (
    <div
      onClick={onClick}
      className={`rounded-[10px] border border-[#E2E8F0] bg-white ${hasPadding ? "" : "p-6"} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

export function PanelHead({ title, sub, icon, action }: { title: string; sub?: string; icon?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5">
      <div className="flex items-center gap-2.5 min-w-0">
        {icon && <span className="text-[#94A3B8]">{icon}</span>}
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-semibold leading-tight text-[#0F172A]">{title}</h3>
          {sub && <p className="mt-0.5 truncate text-xs text-[#94A3B8]">{sub}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * KPI stat tile
 * ------------------------------------------------------------------ */
export function Stat({
  label, value, unit, hint, accent = "#0F172A", icon,
}: { label: string; value: string; unit?: string; hint?: ReactNode; accent?: string; icon?: ReactNode }) {
  return (
    <div
      className="relative overflow-hidden rounded-xl bg-white p-4 border border-gray-200 border-t-[4px] shadow-sm transition-all"
      style={{ borderTopColor: accent }}
    >
      <div className="flex items-start justify-between">
        <p className="font-mono text-[11px] uppercase tracking-widest text-[#94A3B8]">{label}</p>
        {icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg text-[#94A3B8]/70"
            style={{ background: `${accent}14` }}>
            {icon}
          </span>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="font-display text-3xl font-bold tabular-nums tracking-tight text-[#0F172A]" style={{ fontFamily: "var(--font-mono)" }}>{value}</span>
        {unit && <span className="text-sm text-[#94A3B8]">{unit}</span>}
      </div>
      {hint && <div className="mt-2 text-xs text-[#94A3B8]">{hint}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Stage status card — gradient background, for overview/funnel cards
 * ------------------------------------------------------------------ */
export function StageCard({ stage, count, label }: { stage: StageKey; count: number; label?: string }) {
  const GRAD: Record<StageKey, string> = {
    preparation: "linear-gradient(135deg,#64748B,#475569)",
    survey:      "linear-gradient(135deg,#3B82F6,#2563EB)",
    drm:         "linear-gradient(135deg,#8B5CF6,#7C3AED)",
    instalasi:   "linear-gradient(135deg,#F59E0B,#D97706)",
    done:        "linear-gradient(135deg,#10B981,#059669)",
  };
  return (
    <div className="relative overflow-hidden rounded-xl p-4 cursor-pointer" style={{ background: GRAD[stage] }}>
      <div className="absolute right-2 bottom-0 font-black text-white/10 text-6xl leading-none select-none">{count}</div>
      <p className="text-[9px] font-bold uppercase tracking-widest text-white/70 mb-1">{label ?? STAGES[stage].label}</p>
      <p className="text-3xl font-black text-white tabular-nums">{count}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Button
 * ------------------------------------------------------------------ */
export function Btn({
  children, variant = "outline", size = "md", className = "", ...rest
}: { children: ReactNode; variant?: "primary" | "outline" | "ghost" | "dark"; size?: "sm" | "md" } & ButtonHTMLAttributes<HTMLButtonElement>) {
  const v = {
    primary: "bg-[#2563EB] text-white shadow-[4px_4px_8px_rgba(163,177,198,0.3),-4px_-4px_8px_rgba(255,255,255,0.6)] active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2)]",
    outline: "bg-transparent text-[#2563EB] border border-[#2563EB]/60 hover:bg-[#2563EB]/5 active:bg-[#2563EB]/10 transition-colors shadow-none",
    ghost: "text-[#94A3B8] hover:bg-[#F1F5F9]/50 hover:text-[#0F172A]",
    dark: "bg-[#0F172A] text-white shadow-[4px_4px_8px_rgba(163,177,198,0.3)] active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.5)]",
  }[variant];
  const s = size === "sm" ? "h-8 px-3 text-xs rounded-lg" : "h-10 px-4 text-sm rounded-xl";
  return (
    <button {...rest} className={`inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 ${v} ${s} ${className}`}>
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * Inline chip button (for filter/segment controls)
 * ------------------------------------------------------------------ */
export function ChipBtn({
  children, active = false, accentColor, onClick,
}: { children: ReactNode; active?: boolean; accentColor?: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-all ${
        active
          ? "text-white shadow-sm"
          : "border border-[#E2E8F0]/70 bg-white text-[#94A3B8] hover:border-[#E2E8F0] hover:text-[#0F172A]"
      }`}
      style={active && accentColor ? { background: accentColor } : undefined}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * Route map panel — stylized fiber-route visualization placeholder.
 * ------------------------------------------------------------------ */
export function RouteMap({ points = 28, tagged = 22, height = "h-full" }: { points?: number; tagged?: number; height?: string }) {
  const path = "M30,210 C90,150 150,250 220,180 C290,120 330,200 400,150 C470,110 520,190 590,140";
  const nodes = Array.from({ length: 9 }).map((_, i) => {
    const t = i / 8;
    const x = 30 + t * 560 + Math.sin(t * 9) * 6;
    const y = 175 - Math.sin(t * 6.2) * 50 + (i % 2 ? 14 : -10);
    return { x, y, done: i / 8 <= tagged / points };
  });
  return (
    <div className={`relative w-full overflow-hidden rounded-xl bg-[#0a0e15] ${height}`}>
      <svg className="absolute inset-0 h-full w-full opacity-[0.15]" preserveAspectRatio="none">
        <defs>
          <pattern id="g" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M32 0H0V32" fill="none" stroke="#3a4350" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#g)" />
      </svg>
      <svg viewBox="0 0 620 340" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
        {/* Glow under route */}
        <path d={path} fill="none" stroke="#e4002b" strokeWidth="18" strokeLinecap="round" opacity="0.06" />
        <path d={path} fill="none" stroke="#232b36" strokeWidth="10" strokeLinecap="round" />
        <path d={path} fill="none" stroke="#e4002b" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="6 5" />
        {nodes.map((n, i) => (
          <g key={i}>
            <circle cx={n.x} cy={n.y} r="7" fill={n.done ? "#e4002b" : "#0e1116"} stroke={n.done ? "#ff5a76" : "#4a5563"} strokeWidth="2" />
            {n.done && <circle cx={n.x} cy={n.y} r="2.5" fill="#fff" />}
          </g>
        ))}
      </svg>
      <div className="absolute left-3 top-3 flex items-center gap-2 rounded-lg bg-black/50 px-2.5 py-1.5 backdrop-blur">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#e4002b]" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-white/80">Live Route · GIS</span>
      </div>
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between font-mono text-[10px] text-white/60">
        <span>-6.2349, 106.8456</span>
        <span>{tagged}/{points} TITIK TAGGED</span>
      </div>
    </div>
  );
}

/* Avatar with initials */
export function Avatar({ name, color = "#e4002b", size = 32 }: { name: string; color?: string; size?: number }) {
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-mono font-semibold text-white"
      style={{ width: size, height: size, background: color, fontSize: size * 0.36 }}
    >
      {initials}
    </span>
  );
}

/* ------------------------------------------------------------------ *
 * BentoCard — clickable overview tile in workflow Overview tabs
 * ------------------------------------------------------------------ */
export function BentoCard({
  label, status, statusTone, icon, children, footer, onClick, className = "",
}: {
  label: string; status?: string; statusTone?: "green" | "amber" | "red" | "blue" | "neutral";
  icon?: ReactNode; children?: ReactNode; footer?: ReactNode;
  onClick?: () => void; className?: string;
}) {
  return (
    <div
      onClick={onClick}
      className={`flex flex-col rounded-2xl bg-white p-4 transition-all duration-200 ${
        onClick ? "cursor-pointer active:shadow-[inset_4px_4px_8px_rgba(163,177,198,0.4),inset_-4px_-4px_8px_rgba(255,255,255,0.6)]" : ""
      } ${className}`}
      style={{
        boxShadow: "6px 6px 12px rgba(163,177,198,0.4), -6px -6px 12px rgba(255,255,255,0.7)",
        minHeight: 108
      }}
    >
      <div className="mb-2.5 flex items-start justify-between">
        <span className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
          {icon && <span className="opacity-70">{icon}</span>}
          {label}
        </span>
        {status && (
          <Tag tone={statusTone ?? "neutral"} className="text-[10px]">{status}</Tag>
        )}
      </div>
      <div className="flex-1">{children}</div>
      {footer && <div className="mt-2.5 text-[11px] font-semibold text-[#2563EB]">{footer}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Section label with horizontal rule (from Smartelco mockup)
 * ------------------------------------------------------------------ */
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[#94A3B8] whitespace-nowrap">{children}</span>
      <span className="flex-1 h-px bg-[#E2E8F0]/60" />
    </div>
  );
}
