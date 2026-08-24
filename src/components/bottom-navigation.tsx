"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartNoAxesColumnIncreasing, Home, ReceiptText, UserRound } from "lucide-react";

const navigation = [
  { href: "/", label: "Home", icon: Home },
  { href: "/activity", label: "Aktivitas", icon: ReceiptText },
  { href: "/budget", label: "Anggaran", icon: ChartNoAxesColumnIncreasing },
  { href: "/profile", label: "Profil", icon: UserRound },
] as const;

export function BottomNavigation() {
  const pathname = usePathname();

  return (
    <nav className="bottom-navigation" aria-label="Navigasi utama">
      {navigation.map(({ href, label, icon: Icon }) => {
        const isActive = href === "/" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            className={isActive ? "is-active" : undefined}
            href={href}
            key={href}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon aria-hidden="true" size={21} strokeWidth={isActive ? 2.35 : 1.9} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
