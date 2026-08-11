export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[960px] px-6 py-16 sm:py-20">
      <div className="h-[26px] w-40 animate-pulse rounded bg-surface-subtle" />
      <div className="mt-3 h-[15px] w-56 animate-pulse rounded bg-surface-subtle" />
      <div className="mt-8 h-10 animate-pulse rounded-[10px] bg-surface-subtle" />
      <div className="mt-6 h-64 animate-pulse rounded-2xl bg-surface-subtle" />
    </div>
  );
}
