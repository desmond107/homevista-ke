// Static seed content for HomeVista Ke. Photos are Unsplash (free licence) placeholders.

export const img = (id: string, w = 1600) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

// Photo pools, picked by eye from a contact sheet.
export const PH = {
  villa: ["1600596542815-ffad4c1539a9", "1580587771525-78b9dba3b914", "1613490493576-7fde63acd811", "1613977257363-707ba9348227", "1599809275671-b5942cabc7a2", "1416331108676-a22ccb276e35", "1512917774080-9991f1c4c750", "1582268611958-ebfd161ef9cf"],
  modern: ["1600585154340-be6161a56a0c", "1600566753190-17f0baa2a6c3", "1600047509807-ba8f99d2cdde", "1494526585095-c41746248156", "1523217582562-09d0def993a6"],
  house: ["1564013799919-ab600027ffc6", "1570129477492-45c003edd2be", "1568605114967-8130f3a36994", "1605276374104-dee2a0ed3cd6", "1583608205776-bfd35f0d9f83", "1572120360610-d971b9d7767c", "1449844908441-8829872d2607", "1475855581690-80accde3ae2b", "1588880331179-bc9b93a8cb5e", "1576941089067-2de3c901e126", "1598228723793-52759bba239c"],
  townhouse: ["1430285561322-7808604715df", "1494526585095-c41746248156", "1600047509807-ba8f99d2cdde"],
  living: ["1600607687939-ce8a6c25118c", "1600210492486-724fe5c67fb0", "1600566753086-00f18fb6b3ea", "1600573472550-8090b5e0745e", "1502672260266-1c1ef2d93688", "1522708323590-d24dbb6b0267", "1560448204-e02f11c3d0e2", "1493809842364-78817add7ffb", "1505691938895-1758d7feb511", "1560185007-cde436f6a4d0", "1554995207-c18c203602cb", "1586023492125-27b2c045efd7", "1617806118233-18e1de247200", "1600121848594-d8644e57abab", "1501183638710-841dd1904471", "1564078516393-cf04bd966897"],
  kitchen: ["1484154218962-a197022b5858", "1556912173-46c336c7fd55", "1507089947368-19c1da9775ae"],
  bedroom: ["1615874959474-d609969a20ed", "1616594039964-ae9021a400a0", "1540518614846-7eded433c457", "1595526114035-0d45ed16cfbf", "1631049307264-da0ec9d70304"],
  bath: ["1595514535415-dae8580c416c"],
  office: ["1497366216548-37526070297c", "1497366811353-6870744d04b2", "1486406146926-c627a92ad1ab"],
  land: ["1500382017468-9049fed747ef", "1558036117-15d82a90b9b1"],
  hostel: ["1555854877-bab0e564b8d5"],
  resort: ["1571896349842-33c89424de2d", "1551882547-ff40c63fe5fa"],
  porch: ["1560184897-ae75f418493e"],
};

export const FACES = {
  w1: "1531123897727-8f129e1688ce",
  m1: "1531384441138-2736e62e0919",
  m2: "1522529599102-193c0d76b5b6",
  w2: "1507152832244-10d45c7eda57",
  m3: "1566492031773-4f4e44671857",
  w3: "1611432579699-484f7990b127",
  m4: "1506277886164-e25aa3f4ef7f",
  m5: "1519085360753-af0119f7cbe7",
};

export const TYPES: [string, string][] = [
  ["Apartments", "building-2"],
  ["Bedsitters", "door-open"],
  ["Single Rooms", "bed-single"],
  ["Studios", "sofa"],
  ["Bungalows", "house"],
  ["Maisonettes", "house-plus"],
  ["Townhouses", "rows-3"],
  ["Villas", "tree-palm"],
  ["Mansions", "castle"],
  ["Land & Plots", "map"],
  ["Commercial", "store"],
  ["Farms & Ranches", "tractor"],
  ["Student Hostels", "graduation-cap"],
  ["Serviced Apartments", "concierge-bell"],
];

export const AMENITIES: [string, string][] = [
  ["Parking", "car"],
  ["Water (24/7)", "droplets"],
  ["24h Security", "shield-check"],
  ["Borehole", "droplet"],
  ["Backup Generator", "zap"],
  ["Gym", "dumbbell"],
  ["Swimming Pool", "waves"],
  ["Balcony", "sunrise"],
  ["Furnished", "armchair"],
  ["Wi-Fi", "wifi"],
  ["DSQ", "door-closed"],
  ["Lift", "arrow-up-down"],
  ["CCTV", "cctv"],
  ["Garden", "trees"],
  ["Electric Fence", "fence"],
  ["Gated Community", "lock"],
  ["Children's Play Area", "baby"],
  ["Pet Friendly", "paw-print"],
  ["Solar Water Heating", "sun"],
  ["Ocean View", "sailboat"],
  ["Fibre Internet", "cable"],
  ["Rooftop Terrace", "building"],
];

export const CATEGORIES: [string, string, string][] = [
  ["Luxury Homes", "Exceptional residences in Kenya's most prestigious addresses.", PH.villa[2]!],
  ["Gated Communities", "Secure, serene estates with shared amenities and controlled access.", PH.house[1]!],
  ["Beachfront & Coastal", "Ocean breezes from Nyali to Diani and Watamu.", PH.resort[1]!],
  ["Investment Picks", "High-yield rentals and fast-appreciating off-plan units.", PH.office[2]!],
  ["Family Homes", "Space, gardens and good schools nearby.", PH.house[0]!],
  ["Executive Rentals", "Furnished, serviced and move-in ready for professionals.", PH.living[0]!],
];

/** County → [lat, lng, popular, image, towns[name, lat, lng]] */
export const COUNTIES: { name: string; lat: number; lng: number; popular: boolean; image: string; towns: [string, number, number][] }[] = [
  {
    name: "Nairobi", lat: -1.2864, lng: 36.8172, popular: true, image: PH.office[2]!,
    towns: [["Westlands", -1.2676, 36.8108], ["Kilimani", -1.2921, 36.7856], ["Karen", -1.3197, 36.7076], ["Runda", -1.218, 36.81], ["Lavington", -1.2799, 36.7686], ["Kileleshwa", -1.2817, 36.7834], ["Parklands", -1.263, 36.8186], ["Upper Hill", -1.2955, 36.816], ["Muthaiga", -1.247, 36.834], ["Lang'ata", -1.34, 36.77], ["South B", -1.31, 36.835], ["Kasarani", -1.221, 36.897], ["Embakasi", -1.3197, 36.8947], ["Roysambu", -1.2187, 36.883]],
  },
  {
    name: "Kiambu", lat: -1.1714, lng: 36.8356, popular: true, image: PH.house[1]!,
    towns: [["Ruiru", -1.146, 36.96], ["Thika", -1.0333, 37.0693], ["Kiambu Town", -1.1714, 36.8356], ["Kikuyu", -1.246, 36.663], ["Tatu City", -1.15, 36.91], ["Limuru", -1.1136, 36.6422], ["Juja", -1.102, 37.014]],
  },
  {
    name: "Kajiado", lat: -1.8524, lng: 36.7768, popular: true, image: PH.land[0]!,
    towns: [["Kitengela", -1.476, 36.96], ["Ngong", -1.362, 36.655], ["Ongata Rongai", -1.396, 36.742], ["Isinya", -1.674, 36.848], ["Kajiado Town", -1.8524, 36.7768]],
  },
  {
    name: "Mombasa", lat: -4.0435, lng: 39.6682, popular: true, image: PH.resort[0]!,
    towns: [["Nyali", -4.022, 39.712], ["Bamburi", -3.998, 39.723], ["Shanzu", -3.958, 39.744], ["Tudor", -4.03, 39.68]],
  },
  {
    name: "Kisumu", lat: -0.0917, lng: 34.768, popular: true, image: PH.house[4]!,
    towns: [["Milimani", -0.103, 34.757], ["Riat Hills", -0.07, 34.8], ["Mamboleo", -0.07, 34.79]],
  },
  {
    name: "Nakuru", lat: -0.3031, lng: 36.08, popular: true, image: PH.house[7]!,
    towns: [["Milimani (Nakuru)", -0.285, 36.07], ["Naivasha", -0.7167, 36.4333], ["Lanet", -0.3, 36.15]],
  },
  {
    name: "Machakos", lat: -1.5177, lng: 37.2634, popular: true, image: PH.townhouse[0]!,
    towns: [["Syokimau", -1.36, 36.93], ["Athi River", -1.45, 36.98], ["Mlolongo", -1.39, 36.94], ["Machakos Town", -1.5177, 37.2634]],
  },
  { name: "Kilifi", lat: -3.6305, lng: 39.8499, popular: false, image: PH.villa[5]!, towns: [["Watamu", -3.354, 40.024], ["Mtwapa", -3.943, 39.744], ["Vipingo", -3.8, 39.8], ["Kilifi Town", -3.6305, 39.8499]] },
  { name: "Kwale", lat: -4.1816, lng: 39.4606, popular: false, image: PH.resort[1]!, towns: [["Diani", -4.317, 39.58]] },
  { name: "Uasin Gishu", lat: 0.5143, lng: 35.2698, popular: false, image: PH.house[2]!, towns: [["Eldoret", 0.5143, 35.2698], ["Elgon View", 0.51, 35.29]] },
  { name: "Laikipia", lat: 0.0167, lng: 37.0667, popular: false, image: PH.land[1]!, towns: [["Nanyuki", 0.0167, 37.0667]] },
  { name: "Nyeri", lat: -0.4201, lng: 36.9476, popular: false, image: PH.house[6]!, towns: [["Nyeri Town", -0.4201, 36.9476]] },
];

export type SeedLister = {
  key: string;
  name: string;
  email: string;
  phone: string;
  type: "LANDLORD" | "AGENT" | "REALTOR" | "COMPANY" | "DEVELOPER";
  display: string;
  bio: string;
  kyc: "APPROVED" | "PENDING" | "UNDER_REVIEW" | "REJECTED" | "RESUBMIT" | "NOT_SUBMITTED";
  sub: "active" | "expiring" | "expired" | "none";
  website?: string;
  avatar?: string;
};

export const LISTERS: SeedLister[] = [
  { key: "vista", name: "Grace Wanjiru", email: "grace@vistaprime.co.ke", phone: "254722100200", type: "COMPANY", display: "Vista Prime Realty", bio: "Boutique agency specialising in luxury homes in Karen, Runda and Muthaiga since 2009.", kyc: "APPROVED", sub: "active", website: "https://vistaprime.example.co.ke", avatar: FACES.w1 },
  { key: "coast", name: "Hassan Omar", email: "hassan@coastalhavens.co.ke", phone: "254733200300", type: "COMPANY", display: "Coastal Havens Properties", bio: "The coast's trusted name for beachfront villas, holiday homes and short-stay rentals from Nyali to Watamu.", kyc: "APPROVED", sub: "active", avatar: FACES.m1 },
  { key: "skyline", name: "Brian Otieno", email: "brian@skylinedevelopers.co.ke", phone: "254711300400", type: "DEVELOPER", display: "Skyline Developers Ltd", bio: "Award-winning developer of modern apartments and gated townhouses across Nairobi Metro.", kyc: "APPROVED", sub: "active", avatar: FACES.m2 },
  { key: "amani", name: "Amani Achieng", email: "amani.realtor@gmail.com", phone: "254700400500", type: "REALTOR", display: "Amani Achieng — Realtor", bio: "EARB-registered realtor focused on Kilimani, Kileleshwa and Lavington rentals and resales.", kyc: "APPROVED", sub: "active", avatar: FACES.w2 },
  { key: "kamau", name: "Peter Kamau", email: "peter.kamau@gmail.com", phone: "254722500600", type: "LANDLORD", display: "Peter Kamau", bio: "Private landlord with family-run rental blocks in Ruiru, Juja and Kasarani.", kyc: "APPROVED", sub: "active", avatar: FACES.m3 },
  { key: "lakeside", name: "Faith Atieno", email: "faith@lakesidehomes.co.ke", phone: "254799600700", type: "AGENT", display: "Lakeside Homes Agency", bio: "Kisumu's go-to agency for homes, plots and student accommodation.", kyc: "APPROVED", sub: "expiring", avatar: FACES.w3 },
  { key: "rift", name: "Daniel Kiprop", email: "daniel@riftvalleyland.co.ke", phone: "254712700800", type: "AGENT", display: "Rift Valley Land & Homes", bio: "Land, farms and family homes across Nakuru, Naivasha and Eldoret.", kyc: "APPROVED", sub: "active", avatar: FACES.m4 },
  { key: "metro", name: "Samuel Mwangi", email: "samuel@metrospaces.co.ke", phone: "254734800900", type: "COMPANY", display: "Metro Spaces Commercial", bio: "Offices, retail and warehousing in Upper Hill, Westlands and along Mombasa Road.", kyc: "APPROVED", sub: "active", avatar: FACES.m5 },
  { key: "njeri", name: "Lucy Njeri", email: "lucy.njeri@gmail.com", phone: "254701900100", type: "LANDLORD", display: "Lucy Njeri", bio: "Landlord — bedsitters and one-bedroom units in Rongai and Kitengela.", kyc: "APPROVED", sub: "expired" },
  { key: "pending", name: "Kevin Mutua", email: "kevin.mutua@gmail.com", phone: "254702110220", type: "AGENT", display: "Mutua Property Agents", bio: "Machakos and Syokimau homes.", kyc: "PENDING", sub: "active" },
  { key: "review", name: "Mercy Chebet", email: "mercy@highlandsrealty.co.ke", phone: "254703220330", type: "REALTOR", display: "Highlands Realty", bio: "Nyeri and Nanyuki homes and holiday cottages.", kyc: "UNDER_REVIEW", sub: "none" },
  { key: "rejected", name: "John Doe Properties", email: "jdproperties@example.com", phone: "254704330440", type: "AGENT", display: "JD Properties", bio: "", kyc: "REJECTED", sub: "none" },
];

export type SeedProperty = {
  lister: string;
  title: string;
  purpose: "SALE" | "RENT" | "SHORT_STAY" | "OFF_PLAN";
  type: string;
  price: number;
  period?: "TOTAL" | "MONTH" | "NIGHT" | "WEEK" | "YEAR";
  county: string;
  town: string;
  estate?: string;
  address: string;
  beds?: number;
  baths?: number;
  size?: number;
  unit?: "SQFT" | "SQM" | "ACRES";
  furnished?: boolean;
  amenities: string[];
  categories?: string[];
  photos: string[];
  titleDeed?: boolean;
  video?: string;
  tour?: string;
  featured?: boolean;
  desc: string;
};

const sec = ["Parking", "Water (24/7)", "24h Security"];

export const PROPERTIES: SeedProperty[] = [
  // ── Luxury / Nairobi
  { lister: "vista", title: "Contemporary 5-Bedroom Villa with Pool in Runda", purpose: "SALE", type: "Villas", price: 185_000_000, county: "Nairobi", town: "Runda", estate: "Runda Mumwe", address: "Mimosa Close, Runda Mumwe, off Kiambu Road", beds: 5, baths: 6, size: 6500, furnished: false, amenities: [...sec, "Swimming Pool", "Borehole", "Backup Generator", "DSQ", "Garden", "Electric Fence", "CCTV", "Solar Water Heating"], categories: ["Luxury Homes", "Family Homes"], photos: [PH.villa[0]!, PH.living[0]!, PH.kitchen[0]!, PH.bedroom[1]!, PH.living[3]!, PH.bath[0]!], titleDeed: true, featured: true, tour: "https://my.matterport.com/show/?m=iL4RdJqi2yK", desc: "Set on a landscaped half-acre in the heart of Runda Mumwe, this architect-designed villa pairs clean contemporary lines with generous family living.\n\nFloor-to-ceiling glazing opens the double-volume lounge to a heated infinity pool and mature garden. The chef's kitchen has a walk-in pantry and scullery, and every bedroom is en-suite, with the master suite offering a private terrace, dressing room and spa bathroom.\n\nA two-bedroom DSQ, a 20,000-litre borehole, a full-house generator and solar water heating make it as practical as it is beautiful. The International School of Kenya and Village Market are minutes away." },
  { lister: "vista", title: "Colonial-Style Family Home on One Acre, Karen", purpose: "SALE", type: "Bungalows", price: 120_000_000, county: "Nairobi", town: "Karen", estate: "Karen Hardy", address: "Hardy Lane, Karen", beds: 4, baths: 4, size: 1, unit: "ACRES", amenities: [...sec, "Borehole", "Garden", "DSQ", "Pet Friendly", "Electric Fence"], categories: ["Luxury Homes", "Family Homes"], photos: [PH.house[1]!, PH.porch[0]!, PH.living[14]!, PH.kitchen[2]!, PH.bedroom[3]!], titleDeed: true, featured: true, desc: "A gracious single-storey home with wraparound verandas, timber floors and a stone fireplace, set in a full acre of indigenous garden in quiet Karen Hardy.\n\nFour bedrooms (master en-suite), a farmhouse kitchen, separate dining room and a study open to the garden. Includes a two-room DSQ, stables convertible to a studio, and a borehole. Hillcrest and Banda schools are close by." },
  { lister: "vista", title: "Grand 7-Bedroom Mansion with Staff Quarters, Muthaiga", purpose: "SALE", type: "Mansions", price: 380_000_000, county: "Nairobi", town: "Muthaiga", estate: "Muthaiga North", address: "Ngecha Road, Muthaiga North", beds: 7, baths: 8, size: 12000, amenities: [...sec, "Swimming Pool", "Gym", "Borehole", "Backup Generator", "DSQ", "Garden", "CCTV", "Electric Fence", "Rooftop Terrace"], categories: ["Luxury Homes"], photos: [PH.villa[2]!, PH.villa[6]!, PH.living[1]!, PH.living[12]!, PH.bedroom[1]!, PH.kitchen[1]!], titleDeed: true, featured: true, tour: "https://my.matterport.com/show/?m=JGPnGQ6hosj", desc: "One of Muthaiga's finest residences: a stately seven-bedroom home on 1.5 acres with a pool pavilion, gym, wine cellar and a cinema room.\n\nThe reception rooms flow onto a sweeping terrace overlooking manicured lawns. Staff quarters for four, a guest cottage and parking for eight cars complete the estate. Diplomatic neighbourhood with excellent security." },
  { lister: "amani", title: "Elegant 3-Bedroom Apartment with Gym & Pool, Kilimani", purpose: "RENT", type: "Apartments", price: 180_000, period: "MONTH", county: "Nairobi", town: "Kilimani", estate: "Kirichwa Road", address: "Kirichwa Road, Kilimani — Block B, 7th floor", beds: 3, baths: 3, size: 1900, amenities: [...sec, "Lift", "Gym", "Swimming Pool", "Backup Generator", "Balcony", "Fibre Internet", "DSQ", "CCTV"], categories: ["Executive Rentals"], photos: [PH.living[4]!, PH.living[5]!, PH.kitchen[0]!, PH.bedroom[0]!, PH.bath[0]!], featured: true, desc: "A bright, high-floor three-bedroom apartment in a modern block on leafy Kirichwa Road, with an all-en-suite layout, a separate DSQ and a wide balcony looking towards Ngong Hills.\n\nResidents enjoy a heated pool, a fully equipped gym, a children's area, two lifts and a 100% backup generator. Yaya Centre, Junction Mall and the CBD are 10 minutes away." },
  { lister: "amani", title: "Furnished 2-Bedroom with City Views, Kileleshwa", purpose: "RENT", type: "Apartments", price: 150_000, period: "MONTH", county: "Nairobi", town: "Kileleshwa", estate: "Othaya Road", address: "Othaya Road, Kileleshwa — Apt 12C", beds: 2, baths: 2, size: 1350, furnished: true, amenities: [...sec, "Furnished", "Wi-Fi", "Lift", "Gym", "Balcony", "Backup Generator"], categories: ["Executive Rentals"], photos: [PH.living[6]!, PH.living[7]!, PH.kitchen[1]!, PH.bedroom[4]!], desc: "Turn-key and tastefully furnished, this two-bedroom apartment offers sweeping city views, a gym and high-speed fibre. Ideal for professionals and diplomats. Minimum lease six months; utilities and service charge included." },
  { lister: "amani", title: "4-Bedroom Townhouse in Gated Compound, Lavington", purpose: "SALE", type: "Townhouses", price: 68_000_000, county: "Nairobi", town: "Lavington", estate: "James Gichuru", address: "James Gichuru Road, Lavington — Unit 4", beds: 4, baths: 5, size: 3200, amenities: [...sec, "Gated Community", "Swimming Pool", "DSQ", "Garden", "Children's Play Area", "Borehole"], categories: ["Gated Communities", "Family Homes"], photos: [PH.townhouse[0]!, PH.living[8]!, PH.living[9]!, PH.kitchen[2]!, PH.bedroom[2]!], titleDeed: true, desc: "A spacious four-bedroom townhouse in an exclusive compound of eight units, with a communal pool and play area. Private garden, family room, DSQ and two covered parking bays. Walking distance to Lavington Mall." },
  { lister: "skyline", title: "Off-Plan Studios & 1-Beds — Skyline Residences, Westlands", purpose: "OFF_PLAN", type: "Apartments", price: 6_900_000, county: "Nairobi", town: "Westlands", estate: "Rhapta Road", address: "Rhapta Road, Westlands — Skyline Residences sales suite", beds: 1, baths: 1, size: 620, amenities: [...sec, "Lift", "Gym", "Swimming Pool", "Rooftop Terrace", "Fibre Internet", "Backup Generator", "CCTV"], categories: ["Investment Picks"], photos: [PH.office[2]!, PH.living[10]!, PH.living[11]!, PH.kitchen[0]!, PH.bedroom[0]!], featured: true, desc: "Skyline Residences is a 22-storey development on Rhapta Road with studios from KSh 4.9M and one-bedroom units from KSh 6.9M.\n\nAmenities include a rooftop infinity pool and sky lounge, co-working space, gym and three high-speed lifts. Flexible payment plan: 10% deposit, balance over 24 months. Completion Q4 2027. Projected rental yield 8–9% on short-stay." },
  { lister: "skyline", title: "Off-Plan 3-Bedroom Townhouses, Tatu City", purpose: "OFF_PLAN", type: "Townhouses", price: 21_500_000, county: "Kiambu", town: "Tatu City", estate: "Kijani Ridge", address: "Kijani Ridge, Tatu City", beds: 3, baths: 3, size: 2100, amenities: [...sec, "Gated Community", "Children's Play Area", "Garden", "Solar Water Heating", "Fibre Internet"], categories: ["Gated Communities", "Investment Picks", "Family Homes"], photos: [PH.modern[3]!, PH.living[13]!, PH.kitchen[1]!, PH.bedroom[3]!], desc: "Contemporary three-bedroom townhouses in Tatu City's secure, master-planned community with schools, shopping and offices on site. Private gardens, solar water heating, and a 36-month payment plan. Title deeds issued on completion." },
  { lister: "skyline", title: "Modern 2-Bedroom Apartment, Syokimau", purpose: "SALE", type: "Apartments", price: 8_200_000, county: "Machakos", town: "Syokimau", estate: "Syokimau Gateway", address: "Gateway Mall Road, Syokimau — Block C", beds: 2, baths: 2, size: 1050, amenities: [...sec, "Lift", "Backup Generator", "Balcony", "Children's Play Area", "Borehole"], categories: ["Investment Picks"], photos: [PH.modern[4]!, PH.living[2]!, PH.kitchen[2]!, PH.bedroom[4]!], titleDeed: true, desc: "Ready-to-occupy two-bedroom apartments five minutes from the SGR terminus and JKIA. Master en-suite, open-plan kitchen, borehole water and lift. Sectional titles available." },
  { lister: "skyline", title: "Executive 4-Bedroom Maisonette, Kitengela", purpose: "SALE", type: "Maisonettes", price: 17_500_000, county: "Kajiado", town: "Kitengela", estate: "Milimani Kitengela", address: "Milimani Estate, off Namanga Road, Kitengela", beds: 4, baths: 4, size: 2600, amenities: [...sec, "Gated Community", "DSQ", "Garden", "Borehole", "Solar Water Heating"], categories: ["Family Homes", "Gated Communities"], photos: [PH.house[2]!, PH.living[3]!, PH.kitchen[0]!, PH.bedroom[2]!], titleDeed: true, desc: "A well-finished four-bedroom maisonette on an eighth-acre plot in a gated community off Namanga Road. Master en-suite with walk-in closet, family lounge upstairs, DSQ and ample parking." },

  // ── Coast
  { lister: "coast", title: "Beachfront 4-Bedroom Villa, Diani", purpose: "SALE", type: "Villas", price: 95_000_000, county: "Kwale", town: "Diani", estate: "Galu Beach", address: "Galu Beach Road, Diani — Plot 2271", beds: 4, baths: 5, size: 0.75, unit: "ACRES", amenities: [...sec, "Swimming Pool", "Ocean View", "Garden", "Borehole", "Backup Generator", "DSQ"], categories: ["Beachfront & Coastal", "Luxury Homes"], photos: [PH.villa[5]!, PH.resort[1]!, PH.living[0]!, PH.bedroom[1]!, PH.living[14]!], titleDeed: true, featured: true, desc: "Direct beach access on Galu, Diani's quietest stretch of white sand. A makuti-roofed main house, two guest cottages and a 15-metre pool set in tropical gardens. Ideal as a family retreat or a high-performing holiday rental." },
  { lister: "coast", title: "Ocean-View 3-Bedroom Apartment, Nyali", purpose: "RENT", type: "Apartments", price: 120_000, period: "MONTH", county: "Mombasa", town: "Nyali", estate: "Links Road", address: "Links Road, Nyali — Sea Breeze Towers 9A", beds: 3, baths: 3, size: 1800, furnished: true, amenities: [...sec, "Ocean View", "Swimming Pool", "Lift", "Furnished", "Balcony", "Backup Generator", "Wi-Fi"], categories: ["Beachfront & Coastal", "Executive Rentals"], photos: [PH.resort[0]!, PH.living[5]!, PH.bedroom[0]!, PH.kitchen[1]!], desc: "Furnished, sea-facing three-bedroom apartment with a wraparound balcony on Links Road. Pool, gym and lifts; five minutes to Nyali Beach and City Mall." },
  { lister: "coast", title: "Luxury Holiday Villa with Private Pool, Watamu", purpose: "SHORT_STAY", type: "Villas", price: 38_000, period: "NIGHT", county: "Kilifi", town: "Watamu", estate: "Turtle Bay", address: "Turtle Bay Road, Watamu — Villa Kisiwa", beds: 4, baths: 4, size: 3800, furnished: true, amenities: ["Parking", "Swimming Pool", "Ocean View", "Furnished", "Wi-Fi", "24h Security", "Garden"], categories: ["Beachfront & Coastal", "Luxury Homes"], photos: [PH.villa[7]!, PH.resort[1]!, PH.living[12]!, PH.bedroom[2]!, PH.bath[0]!], featured: true, desc: "A serene four-bedroom villa a short walk from Watamu Marine Park. Private pool, chef on request, daily housekeeping and high-speed Wi-Fi. Sleeps eight. Minimum two nights." },
  { lister: "coast", title: "Cosy 1-Bedroom Airbnb near Bamburi Beach", purpose: "SHORT_STAY", type: "Serviced Apartments", price: 6_500, period: "NIGHT", county: "Mombasa", town: "Bamburi", estate: "Bamburi Beach", address: "Mombasa–Malindi Road, Bamburi — Coral Apartments 3", beds: 1, baths: 1, size: 650, furnished: true, amenities: ["Parking", "Swimming Pool", "Furnished", "Wi-Fi", "24h Security", "Balcony"], categories: ["Beachfront & Coastal"], photos: [PH.bedroom[4]!, PH.living[11]!, PH.kitchen[2]!], desc: "A bright, fully equipped one-bedroom apartment three minutes' walk from Bamburi Beach. Pool, Netflix, fast Wi-Fi and secure parking. Perfect for couples and remote workers." },
  { lister: "coast", title: "Half-Acre Beach Plot, Vipingo", purpose: "SALE", type: "Land & Plots", price: 14_000_000, county: "Kilifi", town: "Vipingo", estate: "Vipingo Ridge", address: "Vipingo Ridge Phase 2, Plot 118", size: 0.5, unit: "ACRES", amenities: ["Gated Community", "Water (24/7)", "24h Security"], categories: ["Beachfront & Coastal", "Investment Picks"], photos: [PH.land[0]!, PH.resort[1]!], titleDeed: true, desc: "A ready-title half-acre plot within the gated Vipingo Ridge estate, minutes from the golf course and the ocean. Power and water on site; build your coastal home or holiday rental." },

  // ── Kiambu / landlords
  { lister: "kamau", title: "Spacious Bedsitters near Ruiru Bypass", purpose: "RENT", type: "Bedsitters", price: 9_500, period: "MONTH", county: "Kiambu", town: "Ruiru", estate: "Kimbo", address: "Kimbo, off Ruiru Bypass — Kamau Court", baths: 1, size: 280, amenities: ["Water (24/7)", "24h Security", "Parking", "Borehole"], photos: [PH.living[10]!, PH.kitchen[2]!, PH.bath[0]!], desc: "Clean, tiled bedsitters with a separate kitchenette and private bathroom, five minutes from Kimbo stage. Borehole water, a caretaker on site and secure gate. Deposit one month." },
  { lister: "kamau", title: "One-Bedroom Apartments, Juja — Near JKUAT", purpose: "RENT", type: "Apartments", price: 15_000, period: "MONTH", county: "Kiambu", town: "Juja", estate: "Gachororo", address: "Gachororo Road, Juja — Mwangaza Apartments", beds: 1, baths: 1, size: 450, amenities: ["Water (24/7)", "24h Security", "Parking", "Wi-Fi", "Balcony"], photos: [PH.living[2]!, PH.bedroom[3]!, PH.kitchen[1]!], desc: "Modern one-bedroom units 7 minutes' walk from JKUAT main gate, with balconies, Wi-Fi ready and reliable water." },
  { lister: "kamau", title: "Student Hostel Rooms — Kasarani, Near KU Ruaraka", purpose: "RENT", type: "Student Hostels", price: 7_000, period: "MONTH", county: "Nairobi", town: "Kasarani", estate: "Mwiki", address: "Mwiki Road, Kasarani — Scholars' Hostel", baths: 1, size: 180, furnished: true, amenities: ["Wi-Fi", "Water (24/7)", "24h Security", "Furnished", "CCTV"], photos: [PH.hostel[0]!, PH.living[11]!], desc: "Furnished single and shared rooms with study desks, unlimited Wi-Fi, CCTV and a resident warden. Shared kitchen and laundry area." },
  { lister: "kamau", title: "Single Rooms with Shared Facilities, Roysambu", purpose: "RENT", type: "Single Rooms", price: 5_000, period: "MONTH", county: "Nairobi", town: "Roysambu", estate: "TRM Drive", address: "TRM Drive, Roysambu — Plot 44", baths: 1, size: 120, amenities: ["Water (24/7)", "24h Security"], photos: [PH.bedroom[3]!, PH.porch[0]!], desc: "Affordable single rooms near Thika Road Mall with shared bathrooms, token electricity and constant water." },
  { lister: "kamau", title: "3-Bedroom Bungalow on 1/8 Acre, Kikuyu", purpose: "SALE", type: "Bungalows", price: 13_500_000, county: "Kiambu", town: "Kikuyu", estate: "Kidfarmaco", address: "Kidfarmaco Estate, Kikuyu — near Southern Bypass", beds: 3, baths: 2, size: 1600, amenities: [...sec, "Garden", "Borehole", "Electric Fence"], categories: ["Family Homes"], photos: [PH.house[5]!, PH.living[9]!, PH.kitchen[0]!, PH.bedroom[2]!], titleDeed: true, desc: "A charming three-bedroom bungalow with a mature garden and borehole, minutes from the Southern Bypass. Master en-suite and a separate store." },

  // ── Kajiado / Lucy (expired subscription → hidden)
  { lister: "njeri", title: "Affordable Bedsitters, Ongata Rongai", purpose: "RENT", type: "Bedsitters", price: 8_000, period: "MONTH", county: "Kajiado", town: "Ongata Rongai", estate: "Tumaini", address: "Tumaini, Ongata Rongai", baths: 1, size: 250, amenities: ["Water (24/7)", "24h Security"], photos: [PH.living[10]!, PH.bath[0]!], desc: "Bedsitters close to Rongai town and public transport." },
  { lister: "njeri", title: "2-Bedroom Apartment, Kitengela", purpose: "RENT", type: "Apartments", price: 22_000, period: "MONTH", county: "Kajiado", town: "Kitengela", estate: "Acacia", address: "Acacia Estate, Kitengela", beds: 2, baths: 1, size: 800, amenities: ["Parking", "Water (24/7)", "24h Security"], photos: [PH.living[7]!, PH.kitchen[2]!], desc: "Two-bedroom apartments with ample parking." },

  // ── Kisumu
  { lister: "lakeside", title: "4-Bedroom Lake-View Home, Riat Hills", purpose: "SALE", type: "Maisonettes", price: 32_000_000, county: "Kisumu", town: "Riat Hills", estate: "Riat Hills", address: "Riat Hills Drive, Kisumu", beds: 4, baths: 4, size: 3400, amenities: [...sec, "Garden", "Balcony", "Borehole", "DSQ", "Electric Fence"], categories: ["Luxury Homes", "Family Homes"], photos: [PH.house[3]!, PH.living[1]!, PH.kitchen[2]!, PH.bedroom[0]!], titleDeed: true, featured: true, desc: "A striking hillside maisonette with panoramic views over Lake Victoria and Kisumu city. Large balconies, a family lounge, DSQ and a terraced garden." },
  { lister: "lakeside", title: "Studio Apartments, Milimani Kisumu", purpose: "RENT", type: "Studios", price: 18_000, period: "MONTH", county: "Kisumu", town: "Milimani", estate: "Milimani", address: "Aga Khan Road, Milimani, Kisumu", baths: 1, size: 420, furnished: true, amenities: ["Parking", "Water (24/7)", "24h Security", "Furnished", "Wi-Fi"], photos: [PH.living[11]!, PH.bedroom[4]!, PH.kitchen[1]!], desc: "Furnished studios in Kisumu's most sought-after neighbourhood, close to the CBD and the lake front." },
  { lister: "lakeside", title: "Residential 50x100 Plots, Mamboleo", purpose: "SALE", type: "Land & Plots", price: 1_850_000, county: "Kisumu", town: "Mamboleo", estate: "Mamboleo Junction", address: "Mamboleo — 1.5 km off Kisumu–Kakamega Road", size: 0.125, unit: "ACRES", amenities: ["Water (24/7)"], categories: ["Investment Picks"], photos: [PH.land[1]!, PH.land[0]!], titleDeed: true, desc: "Ready-title eighth-acre plots in a fast-growing residential area with water and power on site. Flexible payment over 6 months." },

  // ── Rift Valley
  { lister: "rift", title: "50-Acre Mixed Farm with Farmhouse, Naivasha", purpose: "SALE", type: "Farms & Ranches", price: 75_000_000, county: "Nakuru", town: "Naivasha", estate: "Moi South Lake Road", address: "Moi South Lake Road, Naivasha — Kongoni area", beds: 3, baths: 2, size: 50, unit: "ACRES", amenities: ["Borehole", "Water (24/7)", "Garden", "Electric Fence"], categories: ["Investment Picks"], photos: [PH.land[1]!, PH.house[7]!, PH.living[14]!, PH.land[0]!], titleDeed: true, desc: "Fifty fertile acres on Moi South Lake Road with lake frontage rights, two boreholes, irrigation infrastructure, a three-bedroom farmhouse and staff housing. Currently under horticulture." },
  { lister: "rift", title: "Family Home in Milimani Estate, Nakuru", purpose: "RENT", type: "Bungalows", price: 65_000, period: "MONTH", county: "Nakuru", town: "Milimani (Nakuru)", estate: "Milimani", address: "Kenyatta Lane, Milimani, Nakuru", beds: 4, baths: 3, size: 2400, amenities: [...sec, "Garden", "DSQ", "Pet Friendly"], categories: ["Family Homes"], photos: [PH.house[8]!, PH.living[9]!, PH.kitchen[0]!, PH.bedroom[3]!], desc: "A four-bedroom bungalow on half an acre in leafy Milimani, close to Nakuru's best schools. DSQ, mature garden, pet-friendly." },
  { lister: "rift", title: "Quarter-Acre Plots, Elgon View Eldoret", purpose: "SALE", type: "Land & Plots", price: 4_500_000, county: "Uasin Gishu", town: "Elgon View", estate: "Elgon View", address: "Elgon View, Eldoret", size: 0.25, unit: "ACRES", amenities: ["Water (24/7)"], photos: [PH.land[0]!], titleDeed: true, desc: "Prime quarter-acre plots in Eldoret's prestigious Elgon View, perfect for a family home." },
  { lister: "rift", title: "Lakeside Cottage Getaway, Naivasha", purpose: "SHORT_STAY", type: "Bungalows", price: 14_000, period: "NIGHT", county: "Nakuru", town: "Naivasha", estate: "Kongoni", address: "Kongoni, Moi South Lake Road, Naivasha", beds: 2, baths: 2, size: 1100, furnished: true, amenities: ["Parking", "Furnished", "Wi-Fi", "Garden", "Pet Friendly"], photos: [PH.house[9]!, PH.living[14]!, PH.bedroom[0]!], desc: "A stone cottage with a fireplace and garden, a short walk from Lake Naivasha. Hippos at dusk, bonfires at night. Sleeps four." },
  { lister: "rift", title: "Ranch Land with Mount Kenya Views, Nanyuki", purpose: "SALE", type: "Farms & Ranches", price: 28_000_000, county: "Laikipia", town: "Nanyuki", estate: "Burguret", address: "Burguret, Nanyuki–Naro Moru Road", size: 20, unit: "ACRES", amenities: ["Borehole"], categories: ["Investment Picks"], photos: [PH.land[1]!, PH.land[0]!], titleDeed: true, desc: "Twenty acres of gently rolling land with uninterrupted views of Mount Kenya, a borehole and road frontage." },

  // ── Commercial
  { lister: "metro", title: "Grade-A Office Space, Upper Hill", purpose: "RENT", type: "Commercial", price: 609_000, period: "MONTH", county: "Nairobi", town: "Upper Hill", estate: "Upper Hill", address: "Matumbato Road, Upper Hill — Crescent Tower, 14th floor", size: 4200, amenities: ["Parking", "Lift", "Backup Generator", "24h Security", "CCTV", "Fibre Internet"], categories: ["Investment Picks"], photos: [PH.office[2]!, PH.office[0]!, PH.office[1]!], desc: "Fitted Grade-A office floor of 4,200 sq ft (KSh 145 per sq ft per month); smaller suites from 1,000 sq ft available. Raised floors, 1:250 parking, 100% backup power and fibre from three providers." },
  { lister: "metro", title: "Retail Shop on Ground Floor, Westlands", purpose: "RENT", type: "Commercial", price: 220_000, period: "MONTH", county: "Nairobi", town: "Westlands", estate: "Woodvale Grove", address: "Woodvale Grove, Westlands — Shop G4", size: 900, amenities: ["Parking", "24h Security", "CCTV", "Backup Generator"], photos: [PH.office[1]!, PH.office[0]!], desc: "High-footfall ground-floor retail unit in the heart of Westlands, suitable for a café, boutique or pharmacy." },
  { lister: "metro", title: "Godown / Warehouse, Mombasa Road (Athi River)", purpose: "RENT", type: "Commercial", price: 450_000, period: "MONTH", county: "Machakos", town: "Athi River", estate: "EPZ Area", address: "Off Namanga Road, Athi River EPZ", size: 15000, amenities: ["Parking", "24h Security", "CCTV", "Water (24/7)"], photos: [PH.office[0]!, PH.land[0]!], tour: "https://my.matterport.com/show/?m=7ffnfBNamei", desc: "A 15,000 sq ft warehouse with 9 m eaves, three roller-shutter docks, office mezzanine and a large yard. Ideal for logistics and light industry." },

  // ── Serviced / short stay Nairobi
  { lister: "amani", title: "Serviced 1-Bedroom Apartment, Westlands", purpose: "SHORT_STAY", type: "Serviced Apartments", price: 9_500, period: "NIGHT", county: "Nairobi", town: "Westlands", estate: "Brookside", address: "Brookside Drive, Westlands — The Brook Residences 5B", beds: 1, baths: 1, size: 700, furnished: true, amenities: ["Parking", "Furnished", "Wi-Fi", "Gym", "Swimming Pool", "Lift", "24h Security"], categories: ["Executive Rentals"], photos: [PH.bedroom[4]!, PH.living[6]!, PH.kitchen[1]!, PH.bath[0]!], featured: true, desc: "A stylish serviced apartment with weekly housekeeping, a rooftop pool and gym, and fast Wi-Fi. Walk to Sarit Centre and Westgate. Weekly and monthly rates available." },
  { lister: "amani", title: "Charming Studio in Parklands", purpose: "RENT", type: "Studios", price: 35_000, period: "MONTH", county: "Nairobi", town: "Parklands", estate: "3rd Parklands Avenue", address: "3rd Parklands Avenue — Aspen Court 2F", baths: 1, size: 480, furnished: true, amenities: ["Parking", "Water (24/7)", "24h Security", "Furnished", "Lift", "Wi-Fi"], photos: [PH.living[11]!, PH.kitchen[0]!, PH.bedroom[0]!], desc: "A furnished studio with a kitchenette, lift access and backup power, near the Aga Khan Hospital." },
  { lister: "vista", title: "Garden Maisonette with DSQ, Lang'ata", purpose: "RENT", type: "Maisonettes", price: 160_000, period: "MONTH", county: "Nairobi", town: "Lang'ata", estate: "Otiende", address: "Otiende Estate, Lang'ata Road", beds: 4, baths: 4, size: 2800, amenities: [...sec, "Gated Community", "Garden", "DSQ", "Borehole", "Children's Play Area"], categories: ["Family Homes", "Gated Communities"], photos: [PH.house[10]!, PH.living[13]!, PH.kitchen[2]!, PH.bedroom[3]!], desc: "A four-bedroom maisonette in a secure gated estate near Wilson Airport and the Galleria Mall. Large private garden and DSQ." },

  // ── Pending-KYC lister (not visible)
  { lister: "pending", title: "3-Bedroom Maisonette, Machakos Town", purpose: "SALE", type: "Maisonettes", price: 9_800_000, county: "Machakos", town: "Machakos Town", estate: "Kenya Israel", address: "Kenya Israel, Machakos", beds: 3, baths: 2, size: 1500, amenities: [...sec], photos: [PH.house[6]!, PH.living[9]!], desc: "A three-bedroom maisonette near Machakos People's Park." },
];

export const COMPANIES = [
  { name: "Vista Prime Realty", description: "Vista Prime is a boutique luxury agency representing exceptional homes in Karen, Runda, Muthaiga and Rosslyn. Our team of eight EARB-registered realtors offers discreet, white-glove service to local and diaspora buyers.", phone: "254722100200", email: "hello@vistaprime.example.co.ke", website: "https://vistaprime.example.co.ke", address: "Rosslyn Riviera Mall, Limuru Road, Nairobi", areas: ["Karen", "Runda", "Muthaiga", "Lavington", "Rosslyn"], verified: true, featured: true, founded: 2009, cover: PH.villa[2]! },
  { name: "Coastal Havens Properties", description: "From Nyali penthouses to Diani beach villas, Coastal Havens has matched families and investors with the best of the Kenyan coast for 15 years. We also manage 60+ holiday rentals.", phone: "254733200300", email: "stay@coastalhavens.example.co.ke", website: "https://coastalhavens.example.co.ke", address: "Nyali Centre, Links Road, Mombasa", areas: ["Nyali", "Diani", "Watamu", "Vipingo", "Kilifi"], verified: true, featured: true, founded: 2010, cover: PH.resort[1]! },
  { name: "Skyline Developers Ltd", description: "Skyline designs and builds modern apartments and gated townhouse communities across Nairobi Metro. Over 1,800 homes delivered on time since 2012.", phone: "254711300400", email: "sales@skyline.example.co.ke", website: "https://skyline.example.co.ke", address: "Rhapta Road, Westlands, Nairobi", areas: ["Westlands", "Tatu City", "Syokimau", "Kitengela"], verified: true, featured: true, founded: 2012, cover: PH.office[2]! },
  { name: "Metro Spaces Commercial", description: "Kenya's commercial property specialists — offices, retail and industrial space for SMEs and multinationals alike.", phone: "254734800900", email: "leasing@metrospaces.example.co.ke", website: "https://metrospaces.example.co.ke", address: "Upper Hill Road, Nairobi", areas: ["Upper Hill", "Westlands", "Mombasa Road", "Athi River"], verified: true, featured: false, founded: 2014, cover: PH.office[0]! },
  { name: "Lakeside Homes Agency", description: "Kisumu's most trusted agency for residential sales, rentals and land, with deep roots in the Lake Basin.", phone: "254799600700", email: "info@lakesidehomes.example.co.ke", website: null, address: "Oginga Odinga Street, Kisumu", areas: ["Kisumu", "Milimani", "Riat Hills", "Mamboleo"], verified: true, featured: false, founded: 2016, cover: PH.house[3]! },
  { name: "Rift Valley Land & Homes", description: "Land, farms and family homes in the Rift Valley — honest advice, clean titles and thorough due diligence.", phone: "254712700800", email: "info@riftvalleyland.example.co.ke", website: null, address: "Kenyatta Avenue, Nakuru", areas: ["Nakuru", "Naivasha", "Eldoret", "Nanyuki"], verified: false, featured: false, founded: 2018, cover: PH.land[1]! },
];

export const REALTORS = [
  { name: "Grace Wanjiru", company: "Vista Prime Realty", lister: "vista", photo: FACES.w1, bio: "Founder of Vista Prime with 16 years in Nairobi's luxury market. Grace has handled over KSh 6 billion in residential sales and is known for discreet, meticulous service.", phone: "254722100200", email: "grace@vistaprime.example.co.ke", specialties: ["Luxury homes", "Diaspora buyers", "Off-market sales"], areas: ["Karen", "Runda", "Muthaiga"], earb: "EARB/R/1024", years: 16, rating: 4.9, count: 58, featured: true },
  { name: "Amani Achieng", company: null, lister: "amani", photo: FACES.w2, bio: "Independent realtor and Kilimani local. Amani specialises in executive rentals and first-time-buyer apartments, and answers every enquiry within the hour.", phone: "254700400500", email: "amani.realtor@gmail.com", specialties: ["Executive rentals", "Apartments", "First-time buyers"], areas: ["Kilimani", "Kileleshwa", "Lavington", "Westlands"], earb: "EARB/R/2211", years: 7, rating: 4.8, count: 41, featured: true },
  { name: "Hassan Omar", company: "Coastal Havens Properties", lister: "coast", photo: FACES.m1, bio: "Born and raised in Old Town Mombasa, Hassan knows every beach road from Shanzu to Shimoni. He leads Coastal Havens' sales and holiday-rental teams.", phone: "254733200300", email: "hassan@coastalhavens.example.co.ke", specialties: ["Beachfront", "Holiday rentals", "Coastal land"], areas: ["Nyali", "Diani", "Watamu"], earb: "EARB/R/1532", years: 12, rating: 4.7, count: 36, featured: true },
  { name: "Brian Otieno", company: "Skyline Developers Ltd", lister: "skyline", photo: FACES.m2, bio: "Head of sales at Skyline Developers, guiding investors through off-plan purchases, payment plans and title processes.", phone: "254711300400", email: "brian@skyline.example.co.ke", specialties: ["Off-plan", "Investment", "Payment plans"], areas: ["Westlands", "Tatu City", "Syokimau"], earb: "EARB/R/1877", years: 9, rating: 4.6, count: 27, featured: true },
  { name: "Wairimu Gathoni", company: "Vista Prime Realty", lister: null, photo: FACES.w3, bio: "Wairimu manages Vista Prime's rental portfolio in Lavington and Kileleshwa and is a certified property manager.", phone: "254720222333", email: "wairimu@vistaprime.example.co.ke", specialties: ["Property management", "Rentals"], areas: ["Lavington", "Kileleshwa"], earb: "EARB/R/2450", years: 6, rating: 4.7, count: 19, featured: false },
  { name: "Samuel Mwangi", company: "Metro Spaces Commercial", lister: "metro", photo: FACES.m5, bio: "Commercial leasing expert advising corporates on office relocations, retail placement and warehousing.", phone: "254734800900", email: "samuel@metrospaces.example.co.ke", specialties: ["Office leasing", "Retail", "Industrial"], areas: ["Upper Hill", "Westlands", "Mombasa Road"], earb: "EARB/R/1610", years: 11, rating: 4.5, count: 22, featured: false },
  { name: "Daniel Kiprop", company: "Rift Valley Land & Homes", lister: "rift", photo: FACES.m4, bio: "Land and agricultural property specialist with a background in surveying. Daniel walks every boundary before he lists it.", phone: "254712700800", email: "daniel@riftvalleyland.example.co.ke", specialties: ["Land", "Farms", "Due diligence"], areas: ["Nakuru", "Naivasha", "Nanyuki", "Eldoret"], earb: "EARB/R/2033", years: 10, rating: 4.8, count: 31, featured: true },
  { name: "Otieno Ouma", company: "Lakeside Homes Agency", lister: null, photo: FACES.m3, bio: "Kisumu-based agent helping families and students find homes around the lake city.", phone: "254799611222", email: "otieno@lakesidehomes.example.co.ke", specialties: ["Residential", "Student housing"], areas: ["Kisumu", "Milimani", "Riat Hills"], earb: null, years: 4, rating: 4.4, count: 12, featured: false },
];

export const VIEWER_NAMES = [
  "Wanjiku Kariuki", "Ochieng Odhiambo", "Aisha Mohamed", "Kiprono Langat", "Njoki Muthoni", "Mutiso Musyoka", "Achieng Akinyi", "Kamau Njoroge",
  "Fatuma Ali", "Chebet Jepkosgei", "Omondi Otieno", "Wambui Ndungu", "Barasa Wekesa", "Nyambura Gitau", "Kibet Rotich", "Atieno Adhiambo",
  "Mwende Mutua", "Juma Bakari", "Wairimu Kimani", "Onyango Owino", "Zawadi Nyokabi", "Koech Kipkemboi", "Halima Abdi", "Githinji Maina",
  "Akoth Awino", "Ruto Kiplagat", "Muthoni Wangari", "Odera Ouma", "Saida Hassan", "Kirui Cheruiyot",
];

export const REVIEW_TEXTS: [number, string][] = [
  [5, "Viewed this last weekend — even better than the photos. The lister was punctual, honest about the service charge and very professional."],
  [5, "Exactly as described. Water is reliable and security is tight. Highly recommend."],
  [4, "Lovely place and a great location. Parking is a bit tight for visitors, but otherwise excellent."],
  [5, "The unlock was worth it — I called directly and viewed the same day. No middlemen games."],
  [4, "Beautiful finishes. The road in is a bit rough during the rains, but the neighbourhood is quiet and safe."],
  [3, "Decent unit, but the photos are flattering. The kitchen is smaller than it looks. Fair price for the area though."],
  [5, "We bought through this lister and the title transfer was smooth. Verified badge gave us confidence."],
  [4, "Responsive lister and the house is well kept. Would have loved a bigger garden."],
  [5, "Stunning views and very well maintained. The caretaker is friendly and helpful."],
  [4, "Great value for money. Close to shops and matatu stage."],
  [2, "The unit had already been taken when I called, although the listing was still up. The lister apologised and offered another unit."],
  [5, "A perfect weekend stay — clean, quiet and the host was very accommodating."],
];

export const REPLIES = [
  "Thank you so much for the kind words — it was a pleasure hosting your viewing!",
  "Asante sana! We're glad the process was smooth. Welcome to the neighbourhood.",
  "Thanks for the honest feedback — we've updated the photos and description to be clearer.",
  "We appreciate you taking the time to review. Do reach out if you need anything else.",
];

export const BLOG = [
  {
    title: "The Complete Guide to Buying Land in Kenya in 2026",
    tags: ["Buying", "Land", "Legal"],
    cover: PH.land[0]!,
    excerpt: "Searches, surveys, land control boards and Ardhisasa — everything you need to buy land in Kenya safely.",
    body: `Buying land is still the most popular investment in Kenya — and also the one most vulnerable to fraud. Here is a step-by-step checklist our verified listers follow.

## 1. Do an official search

Request a search on **Ardhisasa** (for Nairobi and other digitised registries) or at the relevant land registry. The search confirms the registered owner, the size, and any cautions, charges or restrictions on the title.

## 2. Visit the land — with a surveyor

Never buy a plot you haven't walked. A licensed surveyor will confirm the beacons match the Registry Index Map, and spot encroachments early.

## 3. Check the zoning and rates

- Confirm the land use (residential, agricultural, commercial) with the county.
- Ask for a rates clearance certificate.
- For agricultural land, the sale needs Land Control Board consent.

## 4. Use an advocate and a written agreement

Your advocate should draft the sale agreement, hold the deposit, and handle the transfer, stamp duty and registration.

## 5. Pay through traceable channels

Use bank transfers or M-Pesa to the advocate's client account — never cash. Keep every receipt.

On HomeVista Ke, listers display a gold **Verified** badge only after we check their national ID or company registration and proof of ownership. Look for the badge, and always do your own due diligence.`,
  },
  {
    title: "Nairobi Rental Market Report: Where Rents Are Rising Fastest",
    tags: ["Market", "Renting", "Nairobi"],
    cover: PH.living[4]!,
    excerpt: "Kilimani, Ruaka and Syokimau lead the pack. Here's what's driving demand and what tenants can expect.",
    body: `Demand for well-located apartments in Nairobi continues to outpace supply, but rents are rising unevenly across the city.

## Hotspots

- **Kilimani & Kileleshwa** — steady demand from young professionals; premium for gyms, pools and backup power.
- **Ruaka & Tatu City** — families moving north for space, new schools and the Northern Bypass.
- **Syokimau** — the SGR and expressway have made it a commuter favourite.

## What tenants value most

Our search data shows the top filters used by renters are *Water (24/7)*, *24h Security*, *Parking* and *Backup Generator*. Listings with clear photos and a video get roughly three times as many unlocks.

## Tips for tenants

1. Ask what the service charge covers.
2. Confirm the deposit terms in writing.
3. Visit at night to check security and noise.`,
  },
  {
    title: "Is Short-Stay (Airbnb) Still Profitable in Kenya?",
    tags: ["Investment", "Short Stay"],
    cover: PH.bedroom[4]!,
    excerpt: "Occupancy, regulation and the real numbers behind running a holiday let in Nairobi and the coast.",
    body: `Short-stay rentals have boomed in Westlands, Kilimani and along the coast. But are they still worth it?

## The numbers

A well-furnished one-bedroom in Westlands averaging KSh 8,500 a night at 60% occupancy grosses about KSh 155,000 a month — versus KSh 75,000 on a long let. Subtract cleaning, utilities, Wi-Fi, platform fees and furnishing depreciation, and net yields typically land 20–40% above a traditional lease.

## What's changed

- More supply means **quality wins**: professional photos, fast Wi-Fi and self check-in matter.
- Many buildings now regulate short stays — check the lease and by-laws.
- The Tourism Regulatory Authority has introduced registration for holiday lets.

## Our view

Short stay works best in walkable, well-connected locations with a strong management plan. Use our **Short Stay** filter to benchmark nightly rates before you buy.`,
  },
  {
    title: "Why Verified Listers Matter — and How Our KYC Works",
    tags: ["Safety", "HomeVista"],
    cover: PH.office[1]!,
    excerpt: "Every lister on HomeVista Ke completes identity checks before going live. Here's what we verify and why.",
    body: `Property scams cost Kenyans billions every year. Our verification process is designed to make HomeVista Ke the safest place to find a home.

## What we check

- Government ID (National ID or passport) with a live selfie
- For companies: certificate of registration and KRA PIN
- For realtors: EARB registration
- For landlords: proof of ownership where available

## The gold badge

Approved listers receive a gold **Verified** badge on their profile and listings, and rank higher in search. We can revoke a badge at any time if we receive credible complaints.

## Your part

Always view a property before paying any deposit, and never pay money to anyone claiming to "hold" a unit for you. Report suspicious listings with the **Report** button on any property page.`,
  },
];

export const FAQS: [string, string, string][] = [
  ["Seekers", "Is it free to browse HomeVista Ke?", "Yes. Creating an account, browsing, searching, saving favourites and reading reviews is completely free."],
  ["Seekers", "Why do I pay KSh 250 to unlock a property?", "Unlocking reveals the exact location and the lister's phone, WhatsApp and email. The small fee keeps time-wasters and scrapers away from listers, so genuine seekers get faster responses. It's a one-off payment per property, and the unlock stays in your account forever."],
  ["Seekers", "How do I pay?", "Click 'Unlock', enter your Safaricom number and approve the M-Pesa prompt on your phone with your PIN. The details appear instantly once the payment is confirmed, and you'll receive a receipt by email and SMS."],
  ["Seekers", "I was charged but the property didn't unlock. What now?", "This is rare and usually resolves within a minute as we confirm with Safaricom. If it doesn't, contact us with your M-Pesa reference from Account → Payments and we'll fix it or refund you."],
  ["Seekers", "What does the 'Verified Viewer' tag mean?", "Reviews from people who unlocked the property's contact details carry a Verified Viewer tag — they've genuinely engaged with the listing."],
  ["Listers", "Who can list on HomeVista Ke?", "Landlords, agents, realtors, real estate companies and developers. Every lister completes KYC (identity verification) before their listings go live."],
  ["Listers", "How much does it cost to list?", "A flat KSh 1,000 per month via M-Pesa with unlimited listings. If your subscription lapses your listings are hidden automatically, and they reappear the moment you renew."],
  ["Listers", "What documents do I need for KYC?", "Your National ID or passport (front and back) and a selfie holding it. Companies also upload a business registration certificate and KRA PIN, and realtors provide their EARB number. Landlords may upload a title deed or lease as proof of ownership."],
  ["Listers", "How do I get the gold Verified badge?", "The badge is awarded automatically when your KYC is approved. Verified listers rank higher in search and can be filtered for by seekers."],
  ["Listers", "Will I get a reminder before my subscription expires?", "Yes — by email, SMS and in-app notification 5 days, 2 days and 1 day before expiry."],
  ["Payments", "Are my payment details safe?", "We never see your M-Pesa PIN. Payments are processed by Safaricom through the official Daraja API, and we store only the transaction reference for your receipt."],
  ["Payments", "Can I get a receipt?", "Yes. Every successful payment has a downloadable PDF receipt under Account → Payments (or Lister → Subscription)."],
];

export const TESTIMONIALS = [
  { name: "Wanjiku Kariuki", role: "Bought a townhouse in Lavington", quote: "The verified badge made all the difference. We dealt directly with the realtor, viewed three homes in a weekend and closed within a month.", avatar: FACES.w3 },
  { name: "Ochieng Odhiambo", role: "Renting in Kilimani", quote: "KSh 250 to see the exact location and call the landlord directly — no more fake agents asking for viewing fees. Brilliant.", avatar: FACES.m2 },
  { name: "Hassan Omar", role: "Coastal Havens Properties", quote: "Our enquiries are fewer but far more serious. The analytics show exactly which listings perform, and M-Pesa renewals take seconds.", avatar: FACES.m1 },
  { name: "Grace Wanjiru", role: "Vista Prime Realty", quote: "HomeVista feels like a premium brand — it's where our luxury clients actually look. The presentation does our homes justice.", avatar: FACES.w1 },
];

export const PAGES = {
  about: {
    title: "About HomeVista Ke",
    body: `HomeVista Ke was founded on a simple idea: finding a home in Kenya should feel as good as living in one.

## Our promise

- **Verified listers.** Every landlord, agent, realtor and developer passes identity checks before their listings go live.
- **Honest listings.** Real photos, real prices in KES, and reviews from people who actually engaged with the property.
- **Direct contact.** Unlock a property for KSh 250 and speak to the lister directly — no viewing fees, no middlemen.
- **Secure payments.** All payments go through Safaricom M-Pesa's official Daraja API.

## Who we serve

From students looking for a hostel near campus to families searching for their forever home in Karen, from diaspora investors buying off-plan to companies leasing office space in Upper Hill, HomeVista Ke brings Kenya's finest properties together in one elegant place.`,
  },
  terms: {
    title: "Terms of Use",
    body: `*Last updated: October 2026.* These terms govern your use of HomeVista Ke ("we", "us"). By creating an account you agree to them.

## 1. Accounts

You must provide accurate information and keep your password secure. You are responsible for activity on your account. We may suspend or close accounts that breach these terms.

## 2. Property seekers

Browsing is free. Unlocking a property's exact location and contact details costs the fee shown at the time of payment (currently KSh 250) and gives you permanent access to those details for that property. Fees are non-refundable once details are revealed, except where a listing is proven fraudulent.

## 3. Listers

Listers must complete KYC and maintain an active subscription (currently KSh 1,000 per 30 days) for listings to be visible. You warrant that you are authorised to market each property, and that all information, photos and prices are accurate. We may edit, pause or remove any listing at our discretion.

## 4. Reviews

Reviews must be honest, relevant and respectful. We may remove reviews that are abusive, defamatory, or posted for a conflict of interest.

## 5. Payments

Payments are processed via Safaricom M-Pesa. We never ask for or store your M-Pesa PIN.

## 6. Liability

HomeVista Ke is a marketplace. We verify lister identities but do not own, inspect or guarantee any property. Always view a property and conduct due diligence (including official searches) before paying any deposit.

## 7. Governing law

These terms are governed by the laws of Kenya.`,
  },
  privacy: {
    title: "Privacy Policy",
    body: `*Last updated: October 2026.* We comply with the **Kenya Data Protection Act, 2019**.

## What we collect

- Account details: name, email, phone number.
- Lister KYC documents: ID, selfie, business registration, KRA PIN, proof of ownership.
- Payment records: amount, M-Pesa number and transaction reference (never your PIN).
- Usage data: pages viewed and searches, to improve the service.

## How we use it

To run your account, process payments, verify listers, prevent fraud, and send service notifications (receipts, KYC updates, subscription reminders and saved-search alerts you opt into).

## KYC documents

KYC documents are stored in encrypted private storage and are visible only to authorised HomeVista administrators. They are never shown publicly or shared with other users.

## Sharing

We share contact details of a lister only with seekers who unlock that lister's property. We do not sell personal data.

## Your rights

You may access, correct or delete your data, and object to processing, by emailing hello@homevista.co.ke.

## Retention

We keep payment records for seven years as required by law, and KYC documents for as long as a lister account is active plus two years.`,
  },
};
