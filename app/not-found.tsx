import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";

export default function NotFound() {
  return (
    <main className="min-h-dvh">
      <SiteHeader />
      <section className="mx-auto max-w-xl px-4 py-20 text-center">
        <p className="font-mono text-sm text-chai">404 · biscuit not found</p>
        <h1 className="mt-2 font-display text-5xl font-extrabold">Gir gaya.</h1>
        <p className="mt-2 text-ink/70">This page fell into the chai. If it was a result link, the server may have restarted (local mode forgets everything).</p>
        <Link href="/dunk" className="btn-primary mt-6">Start a new dunk</Link>
      </section>
    </main>
  );
}
