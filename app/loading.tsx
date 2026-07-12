export default function Loading() {
  return (
    <main className="home-page min-h-[50vh] px-4 py-10 sm:px-6 lg:px-8" aria-busy="true" aria-live="polite">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="h-7 w-48 animate-pulse rounded-md bg-slate-200 motion-reduce:animate-none" />
        <div className="h-4 w-full max-w-xl animate-pulse rounded bg-slate-200 motion-reduce:animate-none" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="aspect-[4/3] animate-pulse rounded-2xl border border-slate-200 bg-slate-100 motion-reduce:animate-none" />
          ))}
        </div>
        <span className="sr-only">Loading page…</span>
      </div>
    </main>
  );
}
