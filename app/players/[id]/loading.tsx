export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[640px] px-6 py-16 sm:py-20">
      <div className="h-[13px] w-24 animate-pulse rounded bg-surface-subtle" />
      <div className="mt-4 h-[26px] w-48 animate-pulse rounded bg-surface-subtle" />
      <div className="mt-2 h-[15px] w-40 animate-pulse rounded bg-surface-subtle" />
      <div className="mt-8 h-32 animate-pulse rounded-2xl bg-surface-subtle" />
      <div className="mt-6 h-24 animate-pulse rounded-2xl bg-surface-subtle" />
      <div className="mt-6 h-40 animate-pulse rounded-2xl bg-surface-subtle" />
    </div>
  );
}
