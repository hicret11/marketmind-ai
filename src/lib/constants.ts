import type { NavGroup, NavItem } from "@/types";

export const APP_NAME = "MarketMind AI";

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "📊" },
  { label: "Chat", href: "/chat", icon: "💬" },
  { label: "Handbook", href: "/handbook", icon: "📖" },
  { label: "Notes", href: "/notes", icon: "📝" },
  { label: "Company", href: "/company", icon: "🏢" },
  { label: "Opportunities", href: "/opportunities", icon: "🎯" },
  { label: "CRM", href: "/crm", icon: "👥" },
  { label: "Analytics", href: "/analytics", icon: "📈" },
  { label: "Ads Manager", href: "/ads-manager", icon: "📣" },
  { label: "Data Insights", href: "/data-insights", icon: "🧮" },
  { label: "AI Studio", href: "/ai-studio", icon: "🤖" },
  { label: "Settings", href: "/settings", icon: "⚙️" },
];

export const NAV_GROUPS: NavGroup[] = [
  {
    title: "Social Media",
    items: [
      { label: "Overview", href: "/social-media", icon: "📡" },
      { label: "Content Calendar", href: "/social-media/calendar", icon: "🗓️" },
      { label: "Scheduled Posts", href: "/social-media/scheduler", icon: "⏰" },
      { label: "Content Library", href: "/social-media/content", icon: "🗂️" },
      { label: "Social Analytics", href: "/social-media/analytics", icon: "📊" },
    ],
  },
  {
    title: "Intelligence",
    items: [
      { label: "AI Evaluation Lab", href: "/evaluation", icon: "🧪" },
      { label: "Model Registry", href: "/evaluation/models", icon: "🧩" },
      { label: "Datasets", href: "/evaluation/datasets", icon: "🗃️" },
      { label: "Lead Qualification", href: "/evaluation/lead-qualification", icon: "🎯" },
      { label: "Website Analysis", href: "/evaluation/website-analysis", icon: "🔍" },
      { label: "Lyrics Generation", href: "/evaluation/lyrics", icon: "🎵" },
      { label: "Content Generation", href: "/evaluation/content", icon: "✍️" },
      { label: "Image Generation", href: "/evaluation/images", icon: "🖼️" },
      { label: "Benchmark Runs", href: "/evaluation/runs", icon: "📋" },
    ],
  },
];
