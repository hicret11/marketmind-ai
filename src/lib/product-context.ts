import { PRODUCT_CONTEXT_ID, type ProductContext } from "@/types/opportunity";

/**
 * The single, fixed product context MarketMind reasons about: Sing My Birthday.
 * Shared across Opportunity Discovery AND MarketMind Chat/Notes/Handbook — this
 * is the one canonical definition; nothing else should redefine it.
 *
 * (Originally lived under lib/opportunity/ — moved here since it's used well
 * beyond Opportunity Discovery now. `lib/opportunity/product-context.ts`
 * re-exports this file so existing Opportunity imports are unaffected.)
 */

/** Bump when the product context changes materially — invalidates the AI analysis cache. */
export const PRODUCT_CONTEXT_VERSION = "v1";

/** Realistic partnership types the AI may choose from — never invented ad hoc. */
export const PARTNERSHIP_TYPES = [
  "Birthday Package Add-On",
  "Premium Party Experience",
  "Children's Celebration Add-On",
  "Event Planner Add-On",
  "Event Agency Reseller",
  "Restaurant Birthday Experience",
  "Hotel Birthday Surprise",
  "Gift Bundle",
  "Party Entertainment Add-On",
  "Family Event Experience",
  "Referral Partnership",
  "White-Label Experience",
] as const;

/** Job-title TYPES only — never a fabricated real person's name. */
export const CONTACT_ROLE_TYPES = [
  "Owner",
  "Founder",
  "General Manager",
  "Events Manager",
  "Partnerships Manager",
  "Marketing Manager",
  "Birthday / Party Coordinator",
] as const;

export const SING_MY_BIRTHDAY: ProductContext = {
  id: PRODUCT_CONTEXT_ID,
  name: "Sing My Birthday",
  tagline: "Personalized birthday songs, made for the guest of honor.",
  description:
    "Sing My Birthday produces custom, professionally made birthday songs personalized with the recipient's name, story and vibe, delivered as audio and a shareable video. It is built to make birthday moments feel bespoke — for families celebrating a child, for people sending a gift, and for venues that want a premium touch inside their party packages.",
  features: [
    {
      id: "personalized-song",
      name: "Personalized Birthday Song",
      description:
        "A custom, produced song featuring the birthday person's name and personal details.",
    },
    {
      id: "song-video",
      name: "Birthday Song Video",
      description:
        "A lyric / animated video version of the song for sharing and in-venue screen play.",
    },
    {
      id: "venue-package-addon",
      name: "Venue Party Package Add-on",
      description:
        "Personalized songs bundled into a venue's existing birthday packages, optionally white-labeled.",
    },
    {
      id: "event-bulk",
      name: "Event & Bulk Ordering",
      description:
        "Batch-produced personalized songs for recurring events, programs or large party volumes.",
    },
    {
      id: "gifting",
      name: "Birthday Gifting",
      description:
        "A gift-ready personalized song bought for someone else's birthday.",
    },
  ],
  audiences: [
    "Families celebrating children's birthdays",
    "Adults buying birthday gifts",
    "Venues and event businesses that run birthday packages",
    "Event planners and entertainers",
  ],
  eventRelevance: [
    "Birthday parties",
    "Milestone birthdays",
    "Kids' party packages",
    "Family celebrations",
    "Group or corporate birthday programs",
  ],
  integrationModels: [
    "Premium add-on inside an existing birthday package",
    "Revenue-share partnership per booking",
    "White-label song production for the venue's brand",
    "Affiliate / referral link at the point of booking",
    "Fixed-scope pilot bundle for a set number of parties",
  ],
  idealPartnerSignals: [
    "Sells or hosts birthday parties",
    "Has structured party or celebration packages",
    "Serves families or children",
    "Already offers personalized or premium experiences",
    "Runs a high volume of dated events",
  ],
};

/**
 * A short, model-ready summary of what MarketMind knows about Sing My Birthday.
 * Used by chat/notes prompts that want the gist without the full structure —
 * intentionally free of any invented metrics (revenue, customers, conversion).
 */
export const SING_MY_BIRTHDAY_SUMMARY = `Sing My Birthday creates personalized birthday songs — customized with the recipient's name, interests, stories and memories — delivered as personalized audio and, optionally, a shareable personalized birthday video. It's a digital birthday experience product.
Customer side (B2C): people buying a personalized song as a gift or for their own celebration.
Business side (B2B opportunity): venues, party businesses, event planners, hospitality (restaurants/hotels) and gifting businesses that could add personalized songs as a premium touch inside what they already sell.
No current revenue, customer counts, or campaign performance figures are available — never invent them.`;
