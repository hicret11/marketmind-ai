/** A compact single-select pill group — reused for Palette/Mood/Format/Pet/Image-count controls. */
export function OptionPills<T extends string | number>({
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string;
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-mm-muted">{label}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={String(opt.value)}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              value === opt.value ? "bg-mm-pink text-white" : "border border-gray-200 bg-white text-gray-600 hover:border-mm-pink"
            } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
