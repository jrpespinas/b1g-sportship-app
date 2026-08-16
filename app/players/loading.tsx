export default function Loading() {
  return (
    <div className="min-h-screen bg-page">
      <div className="mx-auto w-full max-w-[1280px] px-6 py-8">
        <div className="h-[24px] w-40 animate-pulse rounded bg-surface-subtle" />
        <div className="mt-2 h-[13px] w-72 animate-pulse rounded bg-surface-subtle" />
        <div className="mt-5 flex gap-2">
          {[112, 88, 152, 148, 132].map((w) => (
            <div key={w} style={{ width: w }} className="h-8 animate-pulse rounded-full bg-surface-subtle" />
          ))}
        </div>
        <div className="mt-3 h-9 animate-pulse rounded-[8px] bg-surface-subtle" />
        <div className="mt-4 h-96 animate-pulse rounded-xl bg-surface-subtle" />
      </div>
    </div>
  );
}
