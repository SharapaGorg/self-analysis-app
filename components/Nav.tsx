"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/calendar", label: "Календарь" },
  { href: "/plan", label: "План на завтра" },
  { href: "/reviews", label: "Ревью" },
  { href: "/dashboard", label: "Дашборд" },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/dashboard" className="text-sm font-semibold tracking-tight text-slate-200">
          <span className="text-indigo-400">◆</span> Self-Analysis
        </Link>
        <nav className="flex gap-1">
          {LINKS.map((l) => {
            const active = pathname === l.href || pathname.startsWith(l.href + "/");
            return (
              <Link
                key={l.href}
                href={l.href}
                className={
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors " +
                  (active
                    ? "bg-indigo-500/15 text-indigo-300"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200")
                }
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
