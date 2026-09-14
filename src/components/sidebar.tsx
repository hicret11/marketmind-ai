"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, NAV_GROUPS, APP_NAME } from "@/lib/constants";
import { LogoMark } from "@/components/landing/logo";

function isMatch(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();

  const allHrefs = [
    ...NAV_ITEMS.map((i) => i.href),
    ...NAV_GROUPS.flatMap((g) => g.items.map((i) => i.href)),
  ];

  // The most specific matching route wins so parent routes don't stay lit.
  const activeHref = allHrefs
    .filter((href) => isMatch(pathname, href))
    .sort((a, b) => b.length - a.length)[0];

  const linkClass = (href: string) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
      href === activeHref
        ? "bg-gray-900 text-white"
        : "text-gray-700 hover:bg-gray-100"
    }`;

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="flex items-center gap-2 px-5 py-5">
        <LogoMark className="h-7 w-7" />
        <span className="text-lg font-semibold">{APP_NAME}</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {NAV_ITEMS.map((item) => (
          <Link key={item.href} href={item.href} className={linkClass(item.href)}>
            <span aria-hidden>{item.icon}</span>
            {item.label}
          </Link>
        ))}

        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="pt-4">
            <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
              {group.title}
            </p>
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={linkClass(item.href)}
              >
                <span aria-hidden>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
