/**
 * Category options offered in the discovery form. Each id maps to:
 *  - `query`: a text-search fragment for Google Places / Foursquare
 *  - `osm`: real OpenStreetMap tag combinations + an optional keyword filter
 *
 * OSM has no single tag for concepts like "birthday party venue" — where that
 * is true, `osm.keywordRegex` filters on the business's own `name` tag instead
 * of pretending a perfect tag mapping exists. This is discovery input only; it
 * never influences the fit score (see lib/opportunity/scoring.ts).
 */

export interface OsmTagFilter {
  /** OSM key, e.g. "amenity", "leisure", "shop", "tourism", "office", "club". */
  key: string;
  /** Exact value match. */
  value?: string;
  /** Alternative to `value` — case-insensitive regex match on the tag value. */
  valueRegex?: string;
}

export interface OsmCategoryMapping {
  /** OR'd tag branches. May be empty for a pure keyword category. */
  tagFilters: OsmTagFilter[];
  /**
   * Case-insensitive regex tested against the OSM `name` tag. Adds one search
   * branch per key in `keywordKeys` (default: shop/amenity/leisure) — always
   * paired with a "this key exists" filter, never a bare name scan, which
   * would be far too expensive for a shared Overpass server.
   */
  keywordRegex?: string;
  /** Overrides which broad tag keys the keyword search is paired with. */
  keywordKeys?: string[];
}

export interface BusinessCategoryOption {
  id: string;
  label: string;
  group: string;
  /** Text-search fragment for Google Places / Foursquare, combined with location. */
  query: string;
  osm: OsmCategoryMapping;
}

export const CATEGORY_GROUPS = [
  "Birthday & Kids",
  "Events",
  "Hospitality",
  "Gifts & Celebration",
  "Entertainment",
] as const;

export const BUSINESS_CATEGORY_OPTIONS: BusinessCategoryOption[] = [
  // ---- Birthday & Kids ------------------------------------------------
  {
    id: "kids-party-venues",
    label: "Kids' party venues",
    group: "Birthday & Kids",
    query: "kids birthday party venue",
    osm: {
      tagFilters: [
        { key: "amenity", value: "events_venue" },
        { key: "leisure", value: "indoor_play" },
        { key: "shop", value: "party" },
      ],
      keywordRegex: "birthday|kids party",
    },
  },
  {
    id: "soft-play",
    label: "Soft play / indoor playgrounds",
    group: "Birthday & Kids",
    query: "indoor playground soft play",
    osm: {
      tagFilters: [{ key: "leisure", value: "indoor_play" }],
      keywordRegex: "soft play|indoor playground",
    },
  },
  {
    id: "play-cafe",
    label: "Play cafes",
    group: "Birthday & Kids",
    query: "play cafe kids cafe",
    osm: {
      tagFilters: [{ key: "amenity", value: "cafe" }],
      keywordRegex: "play ?cafe|kids cafe",
    },
  },
  {
    id: "family-entertainment",
    label: "Family entertainment centres",
    group: "Birthday & Kids",
    query: "family entertainment center",
    osm: {
      tagFilters: [
        { key: "leisure", value: "amusement_arcade" },
        { key: "tourism", value: "theme_park" },
      ],
      keywordRegex: "family entertainment",
    },
  },
  {
    id: "childrens-entertainment",
    label: "Children's entertainment",
    group: "Birthday & Kids",
    query: "children's entertainment",
    osm: {
      tagFilters: [
        { key: "shop", value: "toys" },
        { key: "leisure", value: "indoor_play" },
      ],
      keywordRegex: "kids|children",
    },
  },
  {
    id: "birthday-party-services",
    label: "Birthday party services",
    group: "Birthday & Kids",
    query: "birthday party services",
    osm: {
      tagFilters: [],
      keywordRegex: "birthday part(y|ies)|birthday service",
    },
  },
  {
    id: "daycare-nursery",
    label: "Daycare / Nursery",
    group: "Birthday & Kids",
    query: "daycare nursery childcare",
    osm: {
      tagFilters: [
        { key: "amenity", value: "childcare" },
        { key: "amenity", value: "kindergarten" },
      ],
    },
  },

  // ---- Events -----------------------------------------------------------
  {
    id: "event-venues",
    label: "Event venues",
    group: "Events",
    query: "event venue",
    osm: {
      tagFilters: [
        { key: "amenity", value: "events_venue" },
        { key: "amenity", value: "conference_centre" },
        { key: "amenity", value: "exhibition_centre" },
      ],
    },
  },
  {
    id: "party-venues",
    label: "Party venues",
    group: "Events",
    query: "party venue",
    osm: {
      tagFilters: [
        { key: "amenity", value: "events_venue" },
        { key: "amenity", value: "community_centre" },
      ],
      keywordRegex: "party",
    },
  },
  {
    id: "event-planners",
    label: "Event planners",
    group: "Events",
    query: "event planner",
    osm: {
      tagFilters: [{ key: "office", value: "event_management" }],
      keywordRegex: "event planning|event planner|event management",
      keywordKeys: ["office", "club"],
    },
  },
  {
    id: "party-planners",
    label: "Party planners",
    group: "Events",
    query: "party planner",
    osm: {
      tagFilters: [],
      keywordRegex: "party planner|party planning",
      keywordKeys: ["office", "club", "shop"],
    },
  },

  // ---- Hospitality --------------------------------------------------------
  {
    id: "restaurants",
    label: "Restaurants",
    group: "Hospitality",
    query: "restaurant",
    osm: { tagFilters: [{ key: "amenity", value: "restaurant" }] },
  },
  {
    id: "family-restaurants",
    label: "Family restaurants",
    group: "Hospitality",
    query: "family restaurant",
    osm: {
      tagFilters: [{ key: "amenity", value: "restaurant" }],
      keywordRegex: "family",
    },
  },
  {
    id: "hotels",
    label: "Hotels",
    group: "Hospitality",
    query: "hotel",
    osm: { tagFilters: [{ key: "tourism", value: "hotel" }] },
  },
  {
    id: "resorts",
    label: "Resorts",
    group: "Hospitality",
    query: "resort",
    osm: {
      tagFilters: [{ key: "tourism", value: "resort" }],
      keywordRegex: "resort",
    },
  },

  // ---- Gifts & Celebration ------------------------------------------------
  {
    id: "balloon-shops",
    label: "Balloon shops",
    group: "Gifts & Celebration",
    query: "balloon shop",
    osm: {
      tagFilters: [{ key: "shop", value: "balloon" }],
      keywordRegex: "balloon",
    },
  },
  {
    id: "gift-shops",
    label: "Gift shops",
    group: "Gifts & Celebration",
    query: "gift shop",
    osm: { tagFilters: [{ key: "shop", value: "gift" }] },
  },
  {
    id: "personalized-gifts",
    label: "Personalized gift businesses",
    group: "Gifts & Celebration",
    query: "personalized gifts",
    osm: {
      tagFilters: [{ key: "shop", value: "gift" }],
      keywordRegex: "personali[sz]ed|custom|bespoke",
    },
  },
  {
    id: "florists",
    label: "Florists",
    group: "Gifts & Celebration",
    query: "florist",
    osm: { tagFilters: [{ key: "shop", value: "florist" }] },
  },
  {
    id: "bakeries",
    label: "Bakeries / cake shops",
    group: "Gifts & Celebration",
    query: "bakery cake shop",
    osm: {
      tagFilters: [
        { key: "shop", value: "bakery" },
        { key: "shop", value: "confectionery" },
        { key: "craft", value: "confectionery" },
      ],
      keywordRegex: "cake",
    },
  },

  // ---- Entertainment --------------------------------------------------
  {
    id: "amusement-centres",
    label: "Amusement centres",
    group: "Entertainment",
    query: "amusement center",
    osm: { tagFilters: [{ key: "leisure", value: "amusement_arcade" }] },
  },
  {
    id: "trampoline-parks",
    label: "Trampoline parks",
    group: "Entertainment",
    query: "trampoline park",
    osm: {
      tagFilters: [{ key: "leisure", value: "trampoline_park" }],
      keywordRegex: "trampoline",
    },
  },
  {
    id: "bowling",
    label: "Bowling venues",
    group: "Entertainment",
    query: "bowling alley",
    osm: { tagFilters: [{ key: "leisure", value: "bowling_alley" }] },
  },
  {
    id: "karaoke",
    label: "Karaoke venues",
    group: "Entertainment",
    query: "karaoke venue",
    osm: {
      tagFilters: [{ key: "amenity", value: "karaoke_box" }],
      keywordRegex: "karaoke",
    },
  },
  {
    id: "theme-parks",
    label: "Theme / amusement parks",
    group: "Entertainment",
    query: "amusement park",
    osm: {
      tagFilters: [
        { key: "tourism", value: "theme_park" },
        { key: "leisure", value: "water_park" },
      ],
    },
  },
  {
    id: "children-museum",
    label: "Children's museums & science centers",
    group: "Entertainment",
    query: "children's museum science center",
    osm: {
      tagFilters: [{ key: "tourism", value: "museum" }],
      keywordRegex: "children|science cent(er|re)",
    },
  },
  {
    id: "petting-farm",
    label: "Petting zoos & activity farms",
    group: "Entertainment",
    query: "petting zoo activity farm",
    osm: {
      tagFilters: [{ key: "tourism", value: "zoo" }],
      keywordRegex: "petting|activity farm",
    },
  },
];

const BY_ID = new Map(BUSINESS_CATEGORY_OPTIONS.map((o) => [o.id, o]));

export function getCategoryOption(id: string): BusinessCategoryOption | undefined {
  return BY_ID.get(id);
}

/** Text-search phrase for Google Places / Foursquare. Falls back to a humanized id. */
export function getCategoryQueryText(id: string): string {
  return BY_ID.get(id)?.query ?? id.replace(/-/g, " ");
}

export function getCategoryOsmMapping(id: string): OsmCategoryMapping | undefined {
  return BY_ID.get(id)?.osm;
}

export function groupedCategoryOptions(): Array<{
  group: string;
  options: BusinessCategoryOption[];
}> {
  return CATEGORY_GROUPS.map((group) => ({
    group,
    options: BUSINESS_CATEGORY_OPTIONS.filter((o) => o.group === group),
  }));
}

export const RESULT_COUNT_OPTIONS = [5, 10, 15, 20] as const;
export const DEFAULT_RESULT_COUNT = 10;
export const MAX_RESULT_COUNT = 20;
