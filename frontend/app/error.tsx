'use client'

import { useEffect } from 'react'

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Keep the production screen calm while preserving the error boundary contract.
  }, [])

  return (
    <main className="soc-shell flex min-h-screen items-center justify-center px-4 py-12">
      <section className="soc-panel w-full max-w-lg p-8 text-center sm:p-10" role="alert">
        <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl border border-amber-300/25 bg-amber-300/10 text-2xl text-amber-200">!</div>
        <p className="eyebrow">System interruption</p>
        <h1 className="mt-3 text-balance text-3xl font-semibold text-slate-50">The security console needs a refresh</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">The page could not complete this request. Your session and security data remain protected.</p>
        <button type="button" onClick={() => reset()} className="mt-7 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200">Try again</button>
      </section>
    </main>
  )
}
