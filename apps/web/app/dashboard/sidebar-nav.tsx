"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SETTINGS_NAV = [
  { href: "/dashboard/settings/account", label: "Account" },
  { href: "/dashboard/settings/integrations", label: "Integrations" },
  { href: "/dashboard/settings/configuration", label: "Configuration" },
];

function NavLink({
  href,
  label,
  active,
  icon,
}: {
  href: string;
  label: string;
  active: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
        active
          ? "bg-blue-50 text-blue-700"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

export function SidebarNav() {
  const pathname = usePathname();
  const inSettings = pathname?.startsWith("/dashboard/settings") ?? false;

  return (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      <NavLink
        href="/dashboard"
        label="My Recordings"
        active={pathname === "/dashboard"}
        icon={
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="13" rx="2" />
            <path d="M8 21h8" />
            <path d="M12 17v4" />
          </svg>
        }
      />

      <div className="pt-4">
        <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Settings
        </p>
        <div className="mt-1 space-y-0.5">
          {SETTINGS_NAV.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              active={inSettings && pathname === item.href}
            />
          ))}
        </div>
      </div>
    </nav>
  );
}
