/**
 * The dashboard reads three Google Sheets tabs on every request and takes
 * roughly a second to answer. Without this the browser held the previous page
 * with no sign anything was happening — `/players` already had a skeleton and
 * this route did not.
 *
 * Shaped like what actually arrives: title, four metric tiles, then the funnel
 * beside the leadership pipeline. A skeleton that does not match its page
 * causes a visible jump when the real content lands, which is worse than no
 * skeleton at all.
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-page">
      <div className="mx-auto w-full max-w-[1280px] px-6 py-8">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <div className="h-[24px] w-56 animate-pulse rounded bg-surface-subtle" />
          <div className="h-[13px] w-52 animate-pulse rounded bg-surface-subtle" />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {["a", "b", "c", "d"].map((k) => (
            <div key={k} className="h-[188px] animate-pulse rounded-xl bg-surface-subtle" />
          ))}
        </div>

        <div className="mt-3 grid grid-cols-1 items-start gap-3 lg:grid-cols-3">
          <div className="h-[316px] animate-pulse rounded-xl bg-surface-subtle lg:col-span-2" />
          <div className="h-[316px] animate-pulse rounded-xl bg-surface-subtle" />
        </div>

        <div className="mt-3 h-[272px] animate-pulse rounded-xl bg-surface-subtle" />

        <span className="sr-only" role="status">
          Loading the dashboard
        </span>
      </div>
    </div>
  );
}
