"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "@/lib/nav";
import { ChevronDoubleLeftIcon } from "@heroicons/react/24/outline";

const BLUE = "#3771eeff";
const BLUE_DARK = "#3771eeff";

export default function Sidebar({
  collapsed,
  onToggleCollapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={[
        "h-full text-white",
        "transition-all duration-300",
        collapsed ? "w-20" : "w-72",
      ].join(" ")}
      style={{
        background: `linear-gradient(180deg, ${BLUE}, ${BLUE_DARK})`,
      }}
    >
      {/* Brand */}
      <div className="h-16 px-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/15 text-white font-extrabold flex items-center justify-center">
            DV
          </div>

          {!collapsed && (
            <span className="text-[15px] font-extrabold tracking-wide">
              Doc Versioning
            </span>
          )}
        </Link>

        <button
          onClick={onToggleCollapsed}
          className="hidden md:flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/10"
        >
          <ChevronDoubleLeftIcon
            className={`h-5 w-5 transition-transform ${
              collapsed ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {/* Menu */}
      <nav className="px-3 mt-2 space-y-1">
        {NAV[0].items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={[
                "relative flex items-center gap-3 px-4 py-2.5 rounded-xl",
                "text-sm font-semibold transition-colors",
                active
                  ? "bg-white text-blue-700"
                  : "text-white/90 hover:bg-white/15",
              ].join(" ")}
            >
              {/* Active indicator */}
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-blue-800" />
              )}

              <Icon
                className="h-5 w-5 shrink-0"
                style={{
                  color: active ? BLUE : "rgba(255,255,255,0.85)",
                }}
              />

              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
