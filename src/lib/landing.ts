export type FeatureStatus = "Live" | "Planned" | "Coming Soon";

export interface EcosystemNode {
  title: string;
  status: FeatureStatus;
  description: string;
  icon: string;
}

export const ECOSYSTEM_NODES: EcosystemNode[] = [
  {
    title: "AI Marketing Chat",
    status: "Live",
    description:
      "Ask about strategy, campaigns, growth, content or your own business.",
    icon: "chat",
  },
  {
    title: "Marketing Handbook",
    status: "Live",
    description:
      "Built-in digital marketing knowledge for smarter decisions.",
    icon: "book",
  },
  {
    title: "My Marketing Notes",
    status: "Live",
    description:
      "Save mistakes, lessons and observations so MarketMind learns with you.",
    icon: "note",
  },
  {
    title: "Company Context",
    status: "Live",
    description:
      "Give MarketMind the context behind your product, audience and goals.",
    icon: "building",
  },
  {
    title: "Opportunity Discovery",
    status: "Live",
    description:
      "Find real businesses and discover where your product fits inside their business.",
    icon: "target",
  },
  {
    title: "CRM & Pipeline",
    status: "Live",
    description:
      "Track leads, follow-ups, activities and partnership progress.",
    icon: "pipeline",
  },
  {
    title: "Social Media",
    status: "Planned",
    description:
      "Plan posts, manage your content calendar and automate publishing.",
    icon: "calendar",
  },
  {
    title: "Data Intelligence",
    status: "Planned",
    description:
      "Connect business data and turn it into insights, recommendations and experiments.",
    icon: "spark",
  },
  {
    title: "Meta Ads Agent",
    status: "Coming Soon",
    description:
      "Create, analyze and optimize Meta campaigns from MarketMind.",
    icon: "megaphone",
  },
  {
    title: "AI Studio",
    status: "Coming Soon",
    description:
      "Create marketing copy, images, audio and video with AI.",
    icon: "studio",
  },
];

export interface WorkflowStep {
  label: string;
  description: string;
}

export const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    label: "Understand",
    description:
      "MarketMind learns your business, goals and marketing context.",
  },
  {
    label: "Analyze",
    description:
      "It combines marketing knowledge with your own notes and connected data.",
  },
  {
    label: "Discover",
    description:
      "It finds patterns, opportunities and relevant B2B partners.",
  },
  {
    label: "Act",
    description:
      "It recommends strategies and eventually executes marketing actions.",
  },
  {
    label: "Learn",
    description:
      "It improves recommendations using the results of your own marketing.",
  },
];

export const NAV_LINKS = [
  { label: "Features", href: "#ecosystem" },
  { label: "How it Works", href: "#how-it-works" },
  { label: "Vision", href: "#vision" },
];
