import Link from "next/link";

export function BoutonRetour({ href, libelle }: { href: string; libelle: string }) {
  return (
    <Link
      href={href}
      aria-label={libelle}
      className="flex size-11 shrink-0 items-center justify-center rounded-full border border-trait bg-carte"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M15 5l-7 7 7 7" />
      </svg>
    </Link>
  );
}
