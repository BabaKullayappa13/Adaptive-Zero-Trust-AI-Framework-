import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="soc-shell flex min-h-screen items-center justify-center px-4 py-12">
      <section className="soc-panel w-full max-w-lg p-8 text-center sm:p-10">
        <p className="font-mono text-6xl font-bold tracking-tight text-cyan-200">404</p>
        <p className="eyebrow mt-5">Route not found</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-50">This workspace does not exist</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">The requested security view may have moved or is not available for this account.</p>
        <Link href="/dashboard" className="mt-7 inline-flex rounded-xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200">Return to dashboard</Link>
      </section>
    </main>
  )
}
