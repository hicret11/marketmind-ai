export function ComingSoonAdsPlatform({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white p-16 text-center">
      <div className="text-4xl" aria-hidden>
        🚧
      </div>
      <h2 className="mt-4 text-xl font-semibold text-mm-ink">{title}</h2>
      <p className="mt-1 text-sm font-medium text-mm-muted">Coming Soon</p>
      {description && <p className="mt-2 max-w-sm text-sm text-gray-500">{description}</p>}
    </div>
  );
}
