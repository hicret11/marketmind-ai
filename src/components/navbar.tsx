export function Navbar() {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-gray-200 bg-white/80 px-6 backdrop-blur">
      <p className="text-sm text-gray-500">Welcome back 👋</p>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          + New
        </button>
        <div className="h-8 w-8 rounded-full bg-gray-900" aria-hidden />
      </div>
    </header>
  );
}
