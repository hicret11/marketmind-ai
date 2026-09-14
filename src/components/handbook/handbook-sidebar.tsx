import type { HandbookCategory } from "@/lib/handbook/types";

export function HandbookSidebar({
  categories,
  selectedId,
  onSelect,
}: {
  categories: HandbookCategory[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <nav className="space-y-4">
      {categories.map((category) => (
        <div key={category.name}>
          <p className="px-2 text-[11px] font-semibold uppercase tracking-wide text-mm-muted">
            {category.name}
          </p>
          <ul className="mt-1 space-y-0.5">
            {category.sections.map((section) => {
              const active = section.id === selectedId;
              return (
                <li key={section.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(section.id)}
                    className={`w-full rounded-lg px-2 py-1.5 text-left text-sm transition-colors ${
                      active
                        ? "bg-mm-ink text-white"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {section.title}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
