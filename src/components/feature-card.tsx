interface FeatureCardProps {
  title: string;
  value?: string | number;
  description?: string;
  icon?: string;
}

export function FeatureCard({
  title,
  value,
  description,
  icon,
}: FeatureCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        {icon && <span aria-hidden>{icon}</span>}
      </div>
      {value !== undefined && (
        <p className="mt-2 text-2xl font-semibold">{value}</p>
      )}
      {description && (
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      )}
    </div>
  );
}
