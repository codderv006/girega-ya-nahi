import Link from "next/link";
import { APP_NAME, REPO_URL } from "@/lib/config";

export function SiteHeader({ dark = false }: { dark?: boolean }) {
  return (
    <header className={`relative z-20 flex items-center justify-between gap-3 px-4 py-3 sm:px-8 ${dark ? "text-cream" : "text-ink"}`}>
      <Link href="/" className="flex min-w-0 items-center gap-2 whitespace-nowrap font-display text-2xl font-extrabold leading-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.svg" alt="" className="h-[1.6em] w-[1.6em] shrink-0" />
        <span>{APP_NAME}</span>
      </Link>
      <nav className="flex shrink-0 items-center gap-1 whitespace-nowrap text-sm font-semibold sm:gap-3">
        <Link href="/leaderboard" className="rounded-xl px-3 py-2 hover:bg-black/5">Leaderboard</Link>
        <Link href="/dunk" className="hidden rounded-xl bg-ink px-3 py-2 text-cream sm:inline-block">Dunk</Link>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16">
      <div className="wrapper-band" />
      <div className="bg-ink px-4 py-8 text-center text-sm text-cream/80 sm:px-8">
        <p className="font-display text-lg font-bold text-wrapper-yellow">Dunk responsibly.</p>
        <p className="mt-1">Peer-reviewed by nobody. Trusted by everybody.</p>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-cream/20 px-4 py-2 text-sm font-semibold text-cream transition hover:border-cream/50"
        >
          <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden>
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          View the source on GitHub
        </a>
        <p className="mt-4 text-xs text-cream/50">
          A fan-made, deeply unserious project for #GDGMAD. Not affiliated with any biscuit company. No biscuits were harmed in the making of this app. Several were eaten.
        </p>
      </div>
    </footer>
  );
}
