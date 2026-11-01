"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const iconProps = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

const TABS: { href: string; label: string; icon: ReactNode }[] = [
  {
    href: "/home",
    label: "Today",
    icon: (
      <svg {...iconProps}>
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M3 10h18M8 3v4M16 3v4" />
        <path d="m9 15 2 2 4-4" />
      </svg>
    ),
  },
  {
    href: "/groups",
    label: "Groups",
    icon: (
      <svg {...iconProps}>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
        <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.4c1.8.8 3 2.8 3 5.6" />
      </svg>
    ),
  },
  {
    href: "/trophy",
    label: "Trophy",
    icon: (
      <svg {...iconProps}>
        <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
        <path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3" />
        <path d="M12 14v3M8 21h8M9 17h6v4H9z" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 px-4 pb-[max(env(safe-area-inset-bottom),12px)]">
      <div className="sticker mx-auto flex max-w-md bg-white">
        {TABS.map((t) => {
          const active = pathname === t.href || pathname.startsWith(`${t.href}/`);
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={`m-1.5 flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 font-display text-xs font-semibold ${
                active ? "bg-peanut text-ink" : "text-ink/50"
              }`}
            >
              {t.icon}
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
