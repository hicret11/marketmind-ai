/**
 * Pure, client-safe constants for "Build Evaluation Dataset" — deliberately
 * split out of dataset-builder.ts, which pulls in the server-only discovery
 * pipeline (env reads, fetch, file-backed caches) and can't be imported from
 * a "use client" component. This file has no such dependency.
 */

export interface DatasetBuilderCategoryGroup {
  id: string;
  label: string;
  /** Underlying lib/opportunity/categories.ts ids this group searches across. */
  categoryIds: string[];
}

export const DATASET_BUILDER_CATEGORY_GROUPS: DatasetBuilderCategoryGroup[] = [
  {
    id: "kids-soft-play",
    label: "Kids / Soft Play",
    categoryIds: ["kids-party-venues", "soft-play", "play-cafe", "family-entertainment", "childrens-entertainment"],
  },
  {
    id: "event-party-planner",
    label: "Event / Party Planner",
    categoryIds: ["event-venues", "party-venues", "event-planners", "party-planners"],
  },
  {
    id: "daycare-nursery",
    label: "Daycare / Nursery",
    categoryIds: ["daycare-nursery"],
  },
  {
    id: "restaurant-hotel",
    label: "Restaurant / Hotel",
    categoryIds: ["restaurants", "family-restaurants", "hotels", "resorts"],
  },
  {
    id: "gift-celebration",
    label: "Gift / Celebration",
    categoryIds: ["balloon-shops", "gift-shops", "personalized-gifts", "florists", "bakeries"],
  },
];

export const BUILD_TARGET_OPTIONS = [10, 20, 30] as const;
export type BuildTargetOption = (typeof BUILD_TARGET_OPTIONS)[number];
export const DEFAULT_BUILD_TARGET: BuildTargetOption = 20;
export const DEFAULT_BUILD_LOCATION = "London";
