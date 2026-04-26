"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  FolderKanban, Monitor, Wrench,
  ShoppingCart, AlertTriangle, LogOut, ChevronRight, Package, ScrollText, Zap,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  subRoles?: string[];
};

const LEADER_NAV: NavItem[] = [
  { href: "/projects",        label: "Projects",        icon: <FolderKanban size={15} /> },
  { href: "/purchasing",      label: "Purchasing",      icon: <ShoppingCart size={15} /> },
  { href: "/customer-items",  label: "Customer Items",  icon: <Package size={15} /> },
  { href: "/activity-log",    label: "Activity Log",    icon: <ScrollText size={15} /> },
  { href: "/tickets",         label: "Tickets",         icon: <AlertTriangle size={15} /> },
  { href: "/fixture",         label: "Fixture",         icon: <Wrench size={15} /> },
  { href: "/tester-status",   label: "Tester Status",   icon: <Monitor size={15} /> },
];

const MEMBER_NAV: NavItem[] = [
  { href: "/projects",        label: "Projects",        icon: <FolderKanban size={15} /> },
  { href: "/tester-status",   label: "Tester Status",   icon: <Monitor size={15} /> },
  { href: "/purchasing",      label: "Purchasing",      icon: <ShoppingCart size={15} />, subRoles: ["DEBUG", "CODING", "FIXTURE", "PURCHASING"] },
  { href: "/customer-items",  label: "Customer Items",  icon: <Package size={15} />,      subRoles: ["DEBUG", "CODING", "FIXTURE"] },
  { href: "/activity-log",    label: "Activity Log",    icon: <ScrollText size={15} /> },
  { href: "/tickets",         label: "Tickets",         icon: <AlertTriangle size={15} /> },
];

const DEPT_NAV: NavItem[] = [
  { href: "/tickets", label: "Tickets", icon: <AlertTriangle size={15} /> },
];

export default function Sidebar({
  role,
  subRole,
  userName,
}: {
  role: string;
  subRole?: string | null;
  userName?: string;
}) {
  const pathname = usePathname();

  const nav = role === "LEADER" ? LEADER_NAV : role === "MEMBER" ? MEMBER_NAV : DEPT_NAV;
  const visible = nav.filter((item) => {
    if (!item.subRoles) return true;
    return item.subRoles.includes(subRole ?? "");
  });

  const roleLabel = role === "LEADER" ? "Leader" : subRole ?? "Member";

  return (
    <aside
      className="flex flex-col h-full w-56 border-r relative overflow-hidden"
      style={{ borderColor: "#1f0303", background: "linear-gradient(180deg, #0a0000 0%, #080808 40%, #060606 100%)" }}
    >
      {/* Vertical red lightning line */}
      <div
        className="absolute right-0 top-0 bottom-0 w-px pointer-events-none"
        style={{ background: "linear-gradient(180deg, transparent, #cc000044 20%, #cc000088 50%, #cc000044 80%, transparent)", zIndex: 0 }}
      />

      {/* Logo */}
      <div
        className="flex flex-col items-center pt-7 pb-5 px-4 border-b relative"
        style={{ borderColor: "#1f0303" }}
      >
        {/* Outer spinning ring */}
        <div className="relative mb-3" style={{ width: 96, height: 96 }}>
          {/* Spinning dashed ring */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              border: "1px dashed #cc000033",
              animation: "spin-slow 20s linear infinite",
            }}
          />
          {/* Static glow ring */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              border: "1px solid #cc000055",
              boxShadow: "0 0 14px #cc000044, inset 0 0 14px #cc000022",
            }}
          />
          {/* Corner sparks */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <Zap size={8} style={{ color: "#ff4444", filter: "drop-shadow(0 0 4px #ff4444)" }} />
          </div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 pointer-events-none">
            <Zap size={8} style={{ color: "#ff4444", filter: "drop-shadow(0 0 4px #ff4444)" }} />
          </div>
          {/* Logo image */}
          <div className="absolute inset-2">
            <Image
              src="/logo.png"
              alt="logo"
              fill
              className="object-contain"
              style={{ animation: "logo-breathe 4s ease-in-out infinite" }}
            />
          </div>
        </div>

        <span
          className="text-xs font-bold tracking-widest uppercase glow-red"
          style={{ fontFamily: "var(--font-geist-mono)", color: "#ff3333", fontSize: "0.7rem" }}
        >
          TD MANAGER
        </span>
        <div className="red-divider w-full mt-2" style={{ opacity: 0.6 }} />
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {visible.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-item ${active ? "active" : ""}`}
            >
              <span
                style={{
                  color: active ? "#ff4444" : "#555",
                  filter: active ? "drop-shadow(0 0 4px #ff444488)" : "none",
                  transition: "filter 0.2s, color 0.2s",
                }}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
              {active && (
                <ChevronRight
                  size={11}
                  className="ml-auto"
                  style={{ color: "#cc0000", filter: "drop-shadow(0 0 3px #cc0000)" }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t px-3 py-3 relative" style={{ borderColor: "#1f0303" }}>
        <div className="red-divider mb-3" style={{ opacity: 0.4 }} />
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 relative"
            style={{ background: "#1a0000", border: "1px solid #550000", color: "#cc0000" }}
          >
            <span style={{ filter: "drop-shadow(0 0 4px #cc000099)" }}>
              {userName?.[0]?.toUpperCase() ?? "U"}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-300 leading-none truncate">{userName}</p>
            <p
              className="text-xs mt-0.5 font-mono truncate"
              style={{ color: "#664444", fontSize: "0.65rem" }}
            >
              {roleLabel}
            </p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="sidebar-item w-full"
          style={{ padding: "0.4rem 0.6rem", borderRadius: "2px", fontSize: "0.7rem" }}
        >
          <LogOut size={12} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
