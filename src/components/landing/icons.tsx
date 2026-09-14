import type { SVGProps } from "react";

const paths: Record<string, string> = {
  chat: "M4 5h16v11H8l-4 4z",
  book: "M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM19 20H8M8 4v13",
  note: "M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h5",
  building: "M5 21V6l7-3 7 3v15M9 9h.01M15 9h.01M9 13h.01M15 13h.01M10 21v-4h4v4",
  target: "M12 12m-8 0a8 8 0 1 0 16 0a8 8 0 1 0-16 0M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0M12 12h.01",
  pipeline: "M4 7h10a3 3 0 0 1 0 6H8a3 3 0 0 0 0 6h12M4 7l3-3M4 7l3 3",
  calendar: "M4 6h16v15H4zM4 10h16M9 3v4M15 3v4M8 14h.01M12 14h.01M16 14h.01",
  spark: "M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18",
  megaphone: "M4 10v4l10 5V5L4 10zM14 7a5 5 0 0 1 0 10M4 14H3a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1h1",
  studio: "M4 5h16v11H4zM4 16l4 3M20 16l-4 3M9 10l2 2 4-4",
};

export function FeatureIcon({
  name,
  ...props
}: { name: string } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name] ?? paths.spark} />
    </svg>
  );
}
