export default function Loading() {
  return (
    <div className="min-h-screen bg-page">
      <div className="mx-auto w-full max-w-[880px] px-6 py-8">
        <div className="h-[13px] w-24 animate-pulse rounded bg-surface-subtle" />
        <div className="mt-4 h-[24px] w-48 animate-pulse rounded bg-surface-subtle" />
        <div className="mt-2 h-[13px] w-40 animate-pulse rounded bg-surface-subtle" />
        <div className="mt-5 h-40 animate-pulse rounded-xl bg-surface-subtle" />
        <div className="mt-4 h-48 animate-pulse rounded-xl bg-surface-subtle" />
        <div className="mt-4 h-56 animate-pulse rounded-xl bg-surface-subtle" />
      </div>
    </div>
  );
}
