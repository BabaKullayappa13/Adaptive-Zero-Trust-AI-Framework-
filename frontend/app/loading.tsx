export default function Loading() {
  return (
    <main className="soc-shell flex min-h-screen items-center justify-center px-4 py-12" aria-busy="true" aria-live="polite">
      <section className="soc-panel flex w-full max-w-lg flex-col items-center p-8 text-center sm:p-10">
        <div className="mb-6 flex size-14 items-center justify-center rounded-2xl border border-cyan-300/25 bg-cyan-300/10"><span className="size-5 animate-spin rounded-full border-2 border-cyan-200/30 border-t-cyan-200" /></div>
        <p className="eyebrow">Secure workspace</p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-50">Loading security intelligence</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">Establishing a protected view and preparing the latest data.</p>
      </section>
    </main>
  )
}
