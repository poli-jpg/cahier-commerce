"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ONGLETS = [
  {
    href: "/",
    libelle: "Accueil",
    icone: <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  },
  {
    href: "/lebalma",
    libelle: "Lebalma",
    icone: (
      <>
        <path d="M5 4h12a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2z" />
        <path d="M9 9h6M9 13h4" />
      </>
    ),
  },
  {
    href: "/vendre",
    libelle: "Vendre",
    principal: true,
    icone: <path d="M12 5v14M5 12h14" />,
  },
  {
    href: "/clients",
    libelle: "Clients",
    icone: (
      <>
        <circle cx="9" cy="8" r="4" />
        <path d="M2 21c0-4 3-6 7-6s7 2 7 6M16 4a4 4 0 0 1 0 8M22 21c0-3-2-5-5-6" />
      </>
    ),
  },
  {
    href: "/produits",
    libelle: "Produits",
    icone: (
      <>
        <path d="M3 7l9-4 9 4v10l-9 4-9-4z" />
        <path d="M3 7l9 4 9-4M12 11v10" />
      </>
    ),
  },
];

export function Navigation() {
  const chemin = usePathname();

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 border-t border-trait bg-carte pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-md">
        {ONGLETS.map((o) => {
          const actif = o.href === "/" ? chemin === "/" : chemin.startsWith(o.href);
          return (
            <li key={o.href} className="flex-1">
              <Link
                href={o.href}
                aria-current={actif ? "page" : undefined}
                className={`flex h-16 flex-col items-center justify-center gap-1 text-xs ${
                  actif ? "font-bold text-vert" : "font-medium text-sourdine"
                } ${"principal" in o ? "font-bold text-encre" : ""}`}
              >
                {"principal" in o ? (
                  <span className="-mt-6 flex size-13 items-center justify-center rounded-full bg-vert text-white shadow-[0_0_0_4px_var(--color-carte)]">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
                      {o.icone}
                    </svg>
                  </span>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
                    {o.icone}
                  </svg>
                )}
                {o.libelle}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
