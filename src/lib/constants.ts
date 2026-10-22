// Client-safe labels and vocabularies. No server imports here.

export const BRAND = {
  name: "HomeVista Ke",
  tagline: "Find Your Vista. Find Your Home.",
  email: "hello@homevista.co.ke",
  phone: "+254 700 000 000",
  whatsapp: "254700000000",
  address: "The Address, Muthangari Drive, Westlands, Nairobi",
};

export const PURPOSES = ["SALE", "RENT", "SHORT_STAY", "OFF_PLAN"] as const;
export type PurposeKey = (typeof PURPOSES)[number];

export const PURPOSE_LABELS: Record<PurposeKey, string> = {
  SALE: "For Sale",
  RENT: "For Rent",
  SHORT_STAY: "Short Stay",
  OFF_PLAN: "Off-Plan",
};

export const PURPOSE_SLUGS: Record<PurposeKey, string> = {
  SALE: "for-sale",
  RENT: "for-rent",
  SHORT_STAY: "short-stay",
  OFF_PLAN: "off-plan",
};

export const PERIOD_LABELS: Record<string, string> = {
  TOTAL: "",
  MONTH: "/ month",
  NIGHT: "/ night",
  WEEK: "/ week",
  YEAR: "/ year",
};

export const SIZE_UNIT_LABELS: Record<string, string> = { SQFT: "sq ft", SQM: "m²", ACRES: "acres" };

export const LISTER_TYPES = ["LANDLORD", "AGENT", "REALTOR", "COMPANY", "DEVELOPER"] as const;
export const LISTER_TYPE_LABELS: Record<string, string> = {
  LANDLORD: "Landlord",
  AGENT: "Agent",
  REALTOR: "Realtor",
  COMPANY: "Real Estate Company",
  DEVELOPER: "Developer",
};

export const KYC_LABELS: Record<string, string> = {
  NOT_SUBMITTED: "Not submitted",
  PENDING: "Pending",
  UNDER_REVIEW: "Under review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  RESUBMIT: "Resubmission required",
};

export const LISTING_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PENDING: "Awaiting approval",
  ACTIVE: "Live",
  PAUSED: "Paused",
  REJECTED: "Rejected",
  REMOVED: "Removed",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  SUCCESS: "Paid",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
  TIMEOUT: "Timed out",
};

export const SORTS = [
  { key: "newest", label: "Newest" },
  { key: "price_asc", label: "Price: low to high" },
  { key: "price_desc", label: "Price: high to low" },
  { key: "rating", label: "Highest rated" },
  { key: "popular", label: "Most popular" },
] as const;

export const AD_PLACEMENT_LABELS: Record<string, string> = {
  HOME_HERO: "Homepage hero",
  SIDEBAR: "Sidebar",
  BETWEEN_LISTINGS: "Between listings",
  FOOTER: "Footer",
};

export const REPORT_REASONS = [
  "Misleading or fake listing",
  "Wrong price or details",
  "Property no longer available",
  "Suspected scam / fraud",
  "Offensive content",
  "Other",
];

export const MAX_PROPERTY_IMAGES = 20;

/** Map tiles. The public OpenStreetMap servers are for light use only; set a provider (MapTiler, Stadia…) in production. */
export const MAP_TILES = {
  url: process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution:
    process.env.NEXT_PUBLIC_MAP_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
};
