"use client";

function LightningBolt({ delay = "0s" }: { delay?: string }) {
  return (
    <svg width="9" height="13" viewBox="0 0 9 13" fill="none" style={{ flexShrink: 0 }}>
      <path
        d="M6.5 0 L1.5 6.5 L4.5 6.5 L2.5 13 L9 4.5 L5.5 4.5 Z"
        fill="#cc0000"
        style={{ opacity: 0.7, filter: "drop-shadow(0 0 2px #ff4444)" }}
      />
      <path
        d="M6.5 0 L1.5 6.5 L4.5 6.5 L2.5 13 L9 4.5 L5.5 4.5 Z"
        fill="none"
        stroke="#ff6666"
        strokeWidth="0.6"
        pathLength="50"
        strokeDasharray="50"
        strokeDashoffset="50"
        style={{
          animationName: "bolt-trace",
          animationDuration: "2.4s",
          animationTimingFunction: "ease-out",
          animationIterationCount: "infinite",
          animationDelay: delay,
        }}
      />
    </svg>
  );
}

export default function SectionHeader({
  label,
  children,
}: {
  label: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-1.5">
        <LightningBolt delay="0s" />
        <LightningBolt delay="1.2s" />
        <span
          style={{
            color: "#cc0000",
            fontFamily: "var(--font-geist-mono)",
            fontSize: "0.7rem",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          // {label}
        </span>
      </div>
      <div className="flex-1 red-divider" />
      {children}
    </div>
  );
}
