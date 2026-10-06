"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { envoyerDemandeAide } from "@/app/aide-actions";
import { SUJETS, type Sujet } from "@/lib/aide";
import { lienContact } from "@/lib/contact";

type Message = { de: "moi" | "aide"; sujet?: Sujet; texte?: string };

const BIENVENUE: Message = { de: "aide", texte: "Bonjour ! Je suis là pour vous aider. Touchez une question :" };

// Repris de l'appli Atelier, aux couleurs du Cahier.
export function AideChat() {
  const chemin = usePathname();
  const [ouvert, setOuvert] = useState(false);
  const [messages, setMessages] = useState<Message[]>([BIENVENUE]);
  const [ecrit, setEcrit] = useState(false);
  const fil = useRef<HTMLDivElement>(null);
  const fermer = useRef<HTMLButtonElement>(null);
  // « Signaler un problème » : message enregistré, visible dans l'Espace admin
  const [signaler, setSignaler] = useState(false);
  const [probleme, setProbleme] = useState("");
  const [retour, setRetour] = useState<{ texte: string; erreur: boolean } | null>(null);
  const [envoiEnCours, startEnvoi] = useTransition();

  useEffect(() => {
    fil.current?.scrollTo({ top: fil.current.scrollHeight, behavior: "smooth" });
  }, [messages, ecrit]);

  useEffect(() => {
    if (!ouvert) return;
    fermer.current?.focus();
    const echap = (e: KeyboardEvent) => e.key === "Escape" && setOuvert(false);
    window.addEventListener("keydown", echap);
    return () => window.removeEventListener("keydown", echap);
  }, [ouvert]);

  // Dans la caisse, la barre « Continuer / Valider » occupe déjà le bas de l'écran.
  if (chemin.startsWith("/vendre")) return null;

  function envoyerProbleme() {
    setRetour(null);
    startEnvoi(async () => {
      const r = await envoyerDemandeAide(probleme);
      if (r.erreur) {
        setRetour({ texte: r.erreur, erreur: true });
        return;
      }
      setProbleme("");
      setSignaler(false);
      setRetour({ texte: "Message envoyé. Nous vous répondons sur WhatsApp, en général dans la journée.", erreur: false });
    });
  }

  function demander(s: Sujet) {
    if (ecrit) return;
    setMessages((m) => [...m, { de: "moi", texte: s.question }]);
    setEcrit(true);
    setTimeout(() => {
      setMessages((m) => [...m, { de: "aide", sujet: s }]);
      setEcrit(false);
    }, 550);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOuvert(true)}
        aria-label="Aide"
        className="fixed right-4 bottom-[calc(var(--hauteur-nav)+16px)] z-20 flex size-12 items-center justify-center rounded-full bg-encre text-white shadow-lg"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.4A8.4 8.4 0 1 1 21 11.5z" />
          <path d="M9.6 9.2a2.5 2.5 0 0 1 4.8 1c0 1.6-2.4 2-2.4 3.3" />
          <circle cx="12" cy="16.6" r=".6" fill="currentColor" />
        </svg>
      </button>

      {ouvert && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-encre/45" onClick={() => setOuvert(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Aide"
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[85dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-fond pb-[env(safe-area-inset-bottom)]"
          >
            <div className="flex items-center justify-between bg-vert px-5 py-4 text-white">
              <div className="flex flex-col">
                <span className="text-lg font-bold">Aide</span>
                <span className="text-xs text-white/80">Réponses immédiates</span>
              </div>
              <button
                ref={fermer}
                type="button"
                onClick={() => setOuvert(false)}
                aria-label="Fermer l'aide"
                className="flex size-11 items-center justify-center rounded-full border border-white/30 focus-visible:outline-white"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div ref={fil} className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4" aria-live="polite">
              {messages.map((m, i) =>
                m.de === "moi" ? (
                  <p key={i} className="max-w-[85%] self-end rounded-2xl rounded-br-md bg-vert px-3.5 py-2.5 text-[15px] text-white">
                    {m.texte}
                  </p>
                ) : (
                  <div key={i} className="flex max-w-[92%] flex-col gap-2 self-start rounded-2xl rounded-bl-md border border-trait bg-carte px-3.5 py-3 text-[15px]">
                    {m.texte && <p>{m.texte}</p>}
                    {m.sujet && (
                      <>
                        <p>{m.sujet.intro}</p>
                        {m.sujet.etapes && (
                          <ol className="flex flex-col gap-1.5">
                            {m.sujet.etapes.map((e, k) => (
                              <li key={k} className="flex gap-2.5">
                                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-vert-pale text-xs font-bold text-vert-fonce">
                                  {k + 1}
                                </span>
                                <span>{e}</span>
                              </li>
                            ))}
                          </ol>
                        )}
                        {m.sujet.astuce && (
                          <p className="rounded-xl bg-fond px-3 py-2 text-sm text-sourdine">
                            <strong className="text-encre">Astuce : </strong>
                            {m.sujet.astuce}
                          </p>
                        )}
                        {m.sujet.action && (
                          <Link
                            href={m.sujet.action.href}
                            onClick={() => setOuvert(false)}
                            className="mt-1 flex h-11 items-center justify-center rounded-xl bg-vert text-sm font-semibold text-white"
                          >
                            {m.sujet.action.label}
                          </Link>
                        )}
                      </>
                    )}
                  </div>
                ),
              )}
              {ecrit && (
                <div className="self-start rounded-2xl rounded-bl-md border border-trait bg-carte px-4 py-3" aria-label="L'aide écrit">
                  <span className="inline-flex gap-1">
                    <span className="size-2 animate-bounce rounded-full bg-sourdine [animation-delay:-0.3s]" />
                    <span className="size-2 animate-bounce rounded-full bg-sourdine [animation-delay:-0.15s]" />
                    <span className="size-2 animate-bounce rounded-full bg-sourdine" />
                  </span>
                </div>
              )}
            </div>

            <div className="border-t border-trait bg-carte px-4 pt-3 pb-3">
              <div className="flex max-h-[30dvh] flex-wrap gap-2 overflow-y-auto">
                {SUJETS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => demander(s)}
                    className="rounded-full border border-bord bg-carte px-3.5 py-2 text-left text-sm active:bg-fond"
                  >
                    {s.question}
                  </button>
                ))}
              </div>
              {signaler ? (
                <div className="mt-3 flex flex-col gap-2">
                  <label htmlFor="probleme" className="text-sm font-semibold">
                    Décrivez votre problème
                  </label>
                  <textarea
                    id="probleme"
                    value={probleme}
                    onChange={(e) => setProbleme(e.target.value)}
                    rows={3}
                    maxLength={1000}
                    placeholder="Ex. : je n'arrive pas à enregistrer une vente à crédit"
                    className="rounded-xl border border-bord bg-carte px-3 py-2 text-base"
                  />
                  {retour?.erreur && (
                    <p role="alert" className="text-sm font-medium text-erreur">
                      {retour.texte}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setSignaler(false)} className="h-11 flex-1 rounded-xl border border-bord bg-carte text-sm font-semibold">
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={envoyerProbleme}
                      disabled={envoiEnCours || probleme.trim().length < 3}
                      className="h-11 flex-1 rounded-xl bg-vert text-sm font-bold text-white disabled:opacity-50"
                    >
                      {envoiEnCours ? "Envoi…" : "Envoyer"}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setRetour(null);
                    setSignaler(true);
                  }}
                  className="mt-3 flex h-12 w-full items-center justify-center rounded-xl border-2 border-vert bg-carte text-sm font-bold text-vert"
                >
                  Signaler un problème
                </button>
              )}
              {retour && !retour.erreur && (
                <p role="status" className="mt-2 rounded-xl bg-vert-pale px-3 py-2 text-sm font-medium text-vert-fonce">
                  {retour.texte}
                </p>
              )}
              <a
                href={lienContact("Bonjour, j'ai une question sur l'appli Cahier Commerce : ")}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex h-12 items-center justify-center gap-2 rounded-xl bg-encre text-sm font-semibold text-white"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.4A8.4 8.4 0 1 1 21 11.5z" />
                </svg>
                Pas trouvé ? Parler à quelqu&apos;un sur WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
