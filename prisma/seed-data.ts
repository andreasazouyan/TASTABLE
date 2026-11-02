/**
 * FICTIONAL demo catalog for Tastable (New York City).
 * Every host, venue and experience below is invented. Names are not real people or businesses,
 * addresses are fictional, and photos are generic placeholders that do not depict them.
 */
import type {
  EventFormat,
  ExperienceCategory,
  HostType,
  SocialAtmosphere,
  VenueType,
} from "../src/generated/prisma/enums";
import type { PhotoKey } from "../src/lib/domain/photos";

export type HostSeed = {
  key: string;
  name: string;
  displayName: string;
  hostType: HostType;
  tagline: string;
  background: string;
  bio: string;
  neighborhood: string;
  cuisines: string[];
  credentials: string[];
  instagram?: string;
  followers: number;
  verified: boolean;
};

export const HOSTS: HostSeed[] = [
  { key: "maya-chen", name: "Maya Chen", displayName: "Maya Chen", hostType: "PRIVATE_CHEF", tagline: "Omakase-style dinners at a twelve-seat counter", background: "Trained in Osaka kitchens before cooking privately in Brooklyn", bio: "Fictional demo host. Maya runs intimate counter dinners built around seasonal fish and rice.", neighborhood: "williamsburg", cuisines: ["japanese"], credentials: ["Six years in Osaka kappo kitchens (fictional)", "Private chef since 2019 (fictional)"], instagram: "mayachen.demo", followers: 28400, verified: true },
  { key: "luca-moretti", name: "Luca Moretti", displayName: "Luca Moretti", hostType: "CULINARY_PROFESSIONAL", tagline: "Fresh pasta, taught by hand", background: "Former pasta lead at a Manhattan trattoria", bio: "Fictional demo host. Luca teaches beginner-friendly pasta classes in a Chelsea studio kitchen.", neighborhood: "chelsea", cuisines: ["italian"], credentials: ["Pasta lead, 8 years (fictional)", "Certified culinary instructor (fictional)"], followers: 6100, verified: true },
  { key: "ama-owusu", name: "Ama Owusu", displayName: "Ama Owusu", hostType: "SUPPER_CLUB_ORGANIZER", tagline: "West African supper club with a gallery twist", background: "Organises a monthly supper club with Harlem artists", bio: "Fictional demo host. Ama pairs West African menus with rotating art exhibitions.", neighborhood: "harlem", cuisines: ["west-african"], credentials: ["Supper club host since 2020 (fictional)"], instagram: "amaowusu.demo", followers: 15800, verified: true },
  { key: "priya-raman", name: "Priya Raman", displayName: "Priya Raman", hostType: "CREATOR_INFLUENCER", tagline: "Rooftop dinners from a food creator", background: "Food creator sharing home cooking with a large online audience", bio: "Fictional demo host. Priya hosts rooftop supper clubs with guest cooks from her community.", neighborhood: "long-island-city", cuisines: ["indian", "global"], credentials: ["Food creator (fictional audience figures)"], instagram: "priyaraman.demo", followers: 241000, verified: true },
  { key: "sofia-alvarez", name: "Sofía Alvarez", displayName: "Sofía Alvarez", hostType: "SUPPER_CLUB_ORGANIZER", tagline: "Dinners that turn strangers into friends", background: "Moved to NYC in 2018 and started a dinner series for newcomers", bio: "Fictional demo host. Sofía runs social dinners for people new to the city.", neighborhood: "bushwick", cuisines: ["mexican", "global"], credentials: ["Community dinner organiser (fictional)"], followers: 4200, verified: false },
  { key: "claire-dubois", name: "Claire Dubois", displayName: "Claire Dubois", hostType: "CULINARY_PROFESSIONAL", tagline: "French pastry, step by step", background: "Pastry chef with experience in Lyon and Manhattan", bio: "Fictional demo host. Claire teaches laminated dough and classic French pastry.", neighborhood: "west-village", cuisines: ["french"], credentials: ["Pastry diploma (fictional)", "Former pastry sous chef (fictional)"], followers: 9300, verified: true },
  { key: "jiwoo-park", name: "Ji-woo Park", displayName: "Ji-woo Park", hostType: "PRIVATE_CHEF", tagline: "Korean fermentation and banchan", background: "Grew up making kimchi with her grandmother in Jeonju", bio: "Fictional demo host. Ji-woo teaches fermentation workshops and hosts banchan dinners.", neighborhood: "flushing", cuisines: ["korean"], credentials: ["Private chef (fictional)", "Fermentation workshop leader (fictional)"], instagram: "jiwoopark.demo", followers: 12700, verified: true },
  { key: "the-hidden-table", name: "Theo Grant", displayName: "The Hidden Table", hostType: "OTHER", tagline: "Secret-location tasting dinners", background: "A small fictional collective of cooks and designers", bio: "Fictional demo host. The address is shared 24 hours before each dinner.", neighborhood: "lower-east-side", cuisines: ["new-american"], credentials: ["Collective founded 2021 (fictional)"], followers: 3100, verified: false },
  { key: "marcus-bell", name: "Marcus Bell", displayName: "Marcus Bell", hostType: "PRIVATE_CHEF", tagline: "Caribbean cookouts and fire cooking", background: "Private chef cooking Caribbean food over open fire", bio: "Fictional demo host. Marcus cooks Trinidadian and Jamaican dishes over live fire.", neighborhood: "red-hook", cuisines: ["caribbean"], credentials: ["Private chef, 10 years (fictional)"], followers: 8800, verified: true },
  { key: "noor-haddad", name: "Noor Haddad", displayName: "Noor Haddad", hostType: "CREATOR_INFLUENCER", tagline: "Levantine family recipes, shared", background: "Creator documenting family recipes from Beirut and Damascus", bio: "Fictional demo host. Noor hosts mezze workshops and long-table dinners.", neighborhood: "astoria", cuisines: ["middle-eastern"], credentials: ["Food creator (fictional)"], instagram: "noorhaddad.demo", followers: 67000, verified: true },
  { key: "green-fork", name: "Rosa Lindqvist", displayName: "Green Fork Collective", hostType: "OTHER", tagline: "Plant-based dinners from the market", background: "A fictional group of plant-based cooks and growers", bio: "Fictional demo host. Seasonal plant-based menus built from greenmarket produce.", neighborhood: "greenpoint", cuisines: ["plant-based"], credentials: ["Collective (fictional)"], followers: 5400, verified: false },
  { key: "sam-whitfield", name: "Sam Whitfield", displayName: "Sam Whitfield", hostType: "CULINARY_PROFESSIONAL", tagline: "Wine and cheese, without the pretension", background: "Sommelier turned cheesemonger", bio: "Fictional demo host. Sam runs tastings and pairing socials.", neighborhood: "fort-greene", cuisines: ["french", "global"], credentials: ["Sommelier certification (fictional)"], followers: 7600, verified: true },
];

export type VenueSeed = {
  key: string;
  name: string;
  type: VenueType;
  neighborhood: string;
  address: string;
  capacity: number;
  secret?: boolean;
  host?: string;
  accessibility?: string;
};

export const VENUES: VenueSeed[] = [
  { key: "kiln-counter", name: "Kiln Counter", type: "RESTAURANT", neighborhood: "williamsburg", address: "101 Example St (fictional)", capacity: 12, host: "maya-chen", accessibility: "Step-free entrance, counter seating" },
  { key: "chelsea-studio", name: "The Chelsea Studio Kitchen", type: "STUDIO_KITCHEN", neighborhood: "chelsea", address: "202 Sample Ave (fictional)", capacity: 14, accessibility: "Elevator access" },
  { key: "lenox-gallery", name: "Lenox Room Gallery", type: "GALLERY", neighborhood: "harlem", address: "303 Demo Blvd (fictional)", capacity: 30, accessibility: "Step-free, accessible restroom" },
  { key: "lic-rooftop", name: "Skyline Rooftop LIC", type: "ROOFTOP", neighborhood: "long-island-city", address: "404 Placeholder Rd (fictional)", capacity: 36, accessibility: "Elevator to roof" },
  { key: "bushwick-loft", name: "Jefferson Loft", type: "LOFT", neighborhood: "bushwick", address: "505 Mock St (fictional)", capacity: 28, accessibility: "Two flights of stairs" },
  { key: "village-pastry", name: "Bleecker Pastry Lab", type: "STUDIO_KITCHEN", neighborhood: "west-village", address: "606 Fiction Ln (fictional)", capacity: 10, accessibility: "One step at entrance" },
  { key: "flushing-kitchen", name: "Main Street Community Kitchen", type: "STUDIO_KITCHEN", neighborhood: "flushing", address: "707 Example Ave (fictional)", capacity: 16, accessibility: "Step-free" },
  { key: "hidden-les", name: "Undisclosed Lower East Side space", type: "SECRET_LOCATION", neighborhood: "lower-east-side", address: "Shared 24 hours before (fictional)", capacity: 18, secret: true },
  { key: "red-hook-yard", name: "Pier Yard", type: "OUTDOOR", neighborhood: "red-hook", address: "808 Harbor Way (fictional)", capacity: 40, accessibility: "Gravel yard, step-free" },
  { key: "astoria-home", name: "Ditmars Apartment Dining Room", type: "PRIVATE_HOME", neighborhood: "astoria", address: "Shared after booking (fictional)", capacity: 14 },
  { key: "greenpoint-greenhouse", name: "Franklin Street Greenhouse", type: "ROOFTOP", neighborhood: "greenpoint", address: "909 Garden St (fictional)", capacity: 24, accessibility: "Elevator access" },
  { key: "fort-greene-bar", name: "Cellar Room at Dekalb", type: "BAR", neighborhood: "fort-greene", address: "110 Cellar Pl (fictional)", capacity: 26, accessibility: "Stairs down to cellar" },
  { key: "soho-loft", name: "Greene Street Loft", type: "LOFT", neighborhood: "soho", address: "120 Loft Row (fictional)", capacity: 20, accessibility: "Freight elevator" },
  { key: "dumbo-studio", name: "Archway Studio", type: "STUDIO_KITCHEN", neighborhood: "dumbo", address: "130 Arch St (fictional)", capacity: 16, accessibility: "Step-free" },
  { key: "east-village-room", name: "Avenue B Back Room", type: "RESTAURANT", neighborhood: "east-village", address: "140 Avenue Sample (fictional)", capacity: 22 },
  { key: "mott-haven-hall", name: "Bruckner Hall", type: "LOFT", neighborhood: "mott-haven", address: "150 Hall St (fictional)", capacity: 40, accessibility: "Step-free" },
];

export type ExperienceSeed = {
  slug: string;
  title: string;
  summary: string;
  description: string;
  category: ExperienceCategory;
  cuisine: string;
  tags: string[];
  dietary: string[];
  atmosphere: SocialAtmosphere;
  format: EventFormat;
  occasions: string[];
  highlights: string[];
  menu: { title: string; description: string }[];
  inclusions: string[];
  host: string;
  venue: string;
  priceDollars: number;
  durationMinutes: number;
  capacity: number;
  policy: "STANDARD_48H" | "FLEXIBLE_24H" | "STRICT_7D";
  photos: PhotoKey[];
  featured?: boolean;
  /** Preferred weekdays (0 = Sunday) and start hour in New York time. */
  weekdays: number[];
  hour: number;
  /** Availability pattern for upcoming sessions. */
  fill: "sold-out" | "nearly" | "busy" | "open";
  /** Simulated listing popularity (affects daily views). */
  popularity: number;
};

const course = (title: string, description: string) => ({ title, description });

export const EXPERIENCES: ExperienceSeed[] = [
  {
    slug: "brooklyn-japanese-chefs-table", title: "Japanese Chef's Table in Brooklyn",
    summary: "Twelve seats, one counter and a seasonal omakase-style menu.",
    description: "Sit at the counter while the chef prepares each course in front of you. The menu follows the market, with fish, rice and pickles at its centre. Conversation with the chef is part of the evening.",
    category: "SUPPER_CLUB_PRIVATE_DINING", cuisine: "japanese", tags: ["omakase", "counter seating", "seasonal"], dietary: ["pescatarian", "gluten-free"],
    atmosphere: "BRING_YOUR_PEOPLE", format: "CHEFS_TABLE", occasions: ["DATE_NIGHT", "SPECIAL_OCCASION"],
    highlights: ["Only twelve counter seats", "Courses explained by the chef as they're plated", "Optional sake pairing"],
    menu: [course("Sakizuke", "Seasonal small bites"), course("Sashimi", "Three fish, aged in-house"), course("Nigiri", "Eight pieces"), course("Miso soup and pickles", ""), course("Dessert", "Hojicha panna cotta")],
    inclusions: ["Nine courses", "Welcome tea", "Recipe card for the pickles"],
    host: "maya-chen", venue: "kiln-counter", priceDollars: 165, durationMinutes: 150, capacity: 12, policy: "STRICT_7D",
    photos: ["sushi", "platedDish", "restaurantInterior"], featured: true, weekdays: [5, 6], hour: 19, fill: "nearly", popularity: 1.6,
  },
  {
    slug: "italian-pasta-making-workshop", title: "Italian Pasta-Making Workshop",
    summary: "Mix, roll and shape three pasta shapes, then sit down to eat them.",
    description: "A hands-on class for beginners. You'll make egg dough by hand, roll it out, and shape tagliatelle, tortelli and orecchiette before a relaxed shared meal.",
    category: "COOKING_CLASS_WORKSHOP", cuisine: "italian", tags: ["hands-on", "beginner friendly", "pasta"], dietary: ["vegetarian"],
    atmosphere: "EITHER_WAY", format: "HANDS_ON_CLASS", occasions: ["LEARN_SOMETHING_NEW", "BRING_A_FRIEND", "DATE_NIGHT"],
    highlights: ["Everyone gets their own station", "Take home extra pasta", "Small group of 14"],
    menu: [course("Make the dough", "Flour, eggs and technique"), course("Shape three pastas", "Tagliatelle, tortelli, orecchiette"), course("Shared dinner", "Your pasta with two sauces")],
    inclusions: ["All ingredients and equipment", "A glass of wine", "Printed recipes", "Pasta to take home"],
    host: "luca-moretti", venue: "chelsea-studio", priceDollars: 95, durationMinutes: 180, capacity: 14, policy: "STANDARD_48H",
    photos: ["kitchenClass", "ingredients", "bowl"], featured: true, weekdays: [3, 6], hour: 18, fill: "busy", popularity: 1.5,
  },
  {
    slug: "harlem-art-gallery-dinner", title: "Art Gallery Dinner Collaboration",
    summary: "A West African tasting menu served among a new exhibition.",
    description: "A supper club dinner inside a Harlem gallery, with each course inspired by a piece in the current show. The artists join for a short talk between courses.",
    category: "POPUP_EXCLUSIVE", cuisine: "west-african", tags: ["art", "gallery", "tasting menu"], dietary: ["vegetarian", "dairy-free", "halal"],
    atmosphere: "EITHER_WAY", format: "SEATED_DINNER", occasions: ["DATE_NIGHT", "SPECIAL_OCCASION", "BRING_A_FRIEND"],
    highlights: ["Dinner inside a working gallery", "Artist talk between courses", "Menu changes with each exhibition"],
    menu: [course("Suya skewers", "With yaji spice"), course("Jollof risotto", "Smoked tomato"), course("Grilled fish with pepper sauce", ""), course("Puff-puff", "With hibiscus syrup")],
    inclusions: ["Four courses", "Hibiscus welcome drink", "Exhibition guide"],
    host: "ama-owusu", venue: "lenox-gallery", priceDollars: 120, durationMinutes: 180, capacity: 30, policy: "STANDARD_48H",
    photos: ["feast", "diningRoom", "spices"], featured: true, weekdays: [5], hour: 19, fill: "busy", popularity: 1.3,
  },
  {
    slug: "rooftop-creator-supper-club", title: "Rooftop Creator Supper Club",
    summary: "A sunset supper club on a Queens rooftop, hosted by a food creator.",
    description: "A long table on a rooftop with skyline views. The host and two guest cooks serve a family-style menu inspired by home cooking from across India.",
    category: "SUPPER_CLUB_PRIVATE_DINING", cuisine: "indian", tags: ["rooftop", "skyline views", "family style"], dietary: ["vegetarian", "vegan", "gluten-free"],
    atmosphere: "MEET_NEW_PEOPLE", format: "SEATED_DINNER", occasions: ["BRING_A_FRIEND", "MEET_NEW_PEOPLE", "SPECIAL_OCCASION"],
    highlights: ["Skyline views at sunset", "Meet the creator and guest cooks", "Shared long table"],
    menu: [course("Chaat", "Three kinds"), course("Dal and breads", ""), course("Biryani", "Slow-cooked, family style"), course("Kulfi", "Pistachio and cardamom")],
    inclusions: ["Family-style dinner", "Welcome cocktail or mocktail", "Photo moment with the host"],
    host: "priya-raman", venue: "lic-rooftop", priceDollars: 110, durationMinutes: 180, capacity: 36, policy: "STANDARD_48H",
    photos: ["evening", "feast", "spices"], featured: true, weekdays: [6], hour: 18, fill: "sold-out", popularity: 2.2,
  },
  {
    slug: "international-newcomers-social-dinner", title: "International Newcomers Social Dinner",
    summary: "New to New York? Share a table with people who just arrived too.",
    description: "A relaxed dinner designed for meeting people. Guests are seated in small mixed groups and the host makes introductions. Come solo: most people do.",
    category: "SOCIAL_CULINARY", cuisine: "global", tags: ["meet people", "newcomers", "communal"], dietary: ["vegetarian", "vegan", "halal"],
    atmosphere: "MEET_NEW_PEOPLE", format: "SEATED_DINNER", occasions: ["MEET_NEW_PEOPLE"],
    highlights: ["Most guests come solo", "Host-led introductions", "Mixed small-group seating"],
    menu: [course("Shared starters", "From the host's travels"), course("Main", "Tacos al pastor or mushroom tacos"), course("Dessert", "Churros")],
    inclusions: ["Three courses", "One drink", "Conversation cards"],
    host: "sofia-alvarez", venue: "bushwick-loft", priceDollars: 45, durationMinutes: 150, capacity: 28, policy: "FLEXIBLE_24H",
    photos: ["toast", "tacos", "tables"], featured: true, weekdays: [4], hour: 19, fill: "open", popularity: 1.2,
  },
  {
    slug: "french-pastry-workshop", title: "French Pastry Workshop",
    summary: "Laminate dough and bake croissants and pain au chocolat from scratch.",
    description: "A morning class on laminated dough. You'll fold butter into dough, shape croissants and pain au chocolat, and take home a box of what you bake.",
    category: "COOKING_CLASS_WORKSHOP", cuisine: "french", tags: ["baking", "hands-on", "morning"], dietary: ["vegetarian"],
    atmosphere: "EITHER_WAY", format: "HANDS_ON_CLASS", occasions: ["LEARN_SOMETHING_NEW", "BRING_A_FRIEND"],
    highlights: ["Ten students maximum", "Take home a box of pastries", "Pre-laminated dough so you can bake on the day"],
    menu: [course("Lamination", "Butter block and folds"), course("Shaping", "Croissants and pain au chocolat"), course("Bake and taste", "With coffee")],
    inclusions: ["All ingredients", "Coffee and tea", "Box of pastries to take home"],
    host: "claire-dubois", venue: "village-pastry", priceDollars: 120, durationMinutes: 210, capacity: 10, policy: "STANDARD_48H",
    photos: ["pastry", "kitchenClass", "dessert"], featured: true, weekdays: [0, 6], hour: 10, fill: "nearly", popularity: 1.4,
  },
  {
    slug: "korean-fermentation-workshop", title: "Korean Fermentation Workshop",
    summary: "Make napa cabbage kimchi and two quick banchan to take home.",
    description: "Learn the basics of Korean fermentation: salting, seasoning and storing kimchi. You'll leave with a jar of your own kimchi and two banchan.",
    category: "COOKING_CLASS_WORKSHOP", cuisine: "korean", tags: ["fermentation", "take home", "hands-on"], dietary: ["vegan", "gluten-free"],
    atmosphere: "EITHER_WAY", format: "HANDS_ON_CLASS", occasions: ["LEARN_SOMETHING_NEW", "BRING_A_FRIEND"],
    highlights: ["Take home a full jar of kimchi", "Vegan fish-sauce alternative available", "Family techniques"],
    menu: [course("Salting the cabbage", ""), course("Seasoning paste", "Gochugaru, garlic, ginger"), course("Two quick banchan", "Spinach and radish"), course("Tasting", "Aged kimchi comparison")],
    inclusions: ["Ingredients and jars", "Tasting plate", "Fermentation guide"],
    host: "jiwoo-park", venue: "flushing-kitchen", priceDollars: 70, durationMinutes: 150, capacity: 16, policy: "FLEXIBLE_24H",
    photos: ["ingredients", "noodles", "spices"], weekdays: [0], hour: 13, fill: "open", popularity: 1.1,
  },
  {
    slug: "secret-location-tasting-dinner", title: "Secret-Location Tasting Dinner",
    summary: "Seven courses somewhere on the Lower East Side. Address revealed 24 hours before.",
    description: "A tasting dinner in a different hidden space each month. You'll receive the address the day before. Expect candlelight, a single seating and a menu built around the room.",
    category: "POPUP_EXCLUSIVE", cuisine: "new-american", tags: ["secret location", "tasting menu", "candlelight"], dietary: ["vegetarian", "pescatarian"],
    atmosphere: "EITHER_WAY", format: "SEATED_DINNER", occasions: ["DATE_NIGHT", "SPECIAL_OCCASION"],
    highlights: ["Location revealed 24 hours before", "Single seating", "A new space every month"],
    menu: [course("Seven courses", "Seasonal, announced on the night")],
    inclusions: ["Seven courses", "Welcome drink", "Address and arrival notes"],
    host: "the-hidden-table", venue: "hidden-les", priceDollars: 150, durationMinutes: 180, capacity: 18, policy: "STRICT_7D",
    photos: ["platedDish", "evening", "wine"], featured: true, weekdays: [5, 6], hour: 20, fill: "sold-out", popularity: 1.9,
  },
  {
    slug: "red-hook-fire-cookout", title: "Caribbean Fire Cookout",
    summary: "Jerk, doubles and fire-roasted corn at a waterfront yard.",
    description: "Everything is cooked over live fire. Long tables, waterfront views, and plenty of food passed around family style.",
    category: "SOCIAL_CULINARY", cuisine: "caribbean", tags: ["outdoor", "live fire", "family style"], dietary: ["gluten-free", "dairy-free"],
    atmosphere: "EITHER_WAY", format: "SEATED_DINNER", occasions: ["BRING_A_FRIEND", "MEET_NEW_PEOPLE"],
    highlights: ["Waterfront yard", "Cooked entirely over fire", "Family-style platters"],
    menu: [course("Doubles", "With tamarind"), course("Jerk chicken or jackfruit", ""), course("Fire-roasted corn", ""), course("Rum cake", "")],
    inclusions: ["Family-style meal", "Sorrel punch", "Lawn games"],
    host: "marcus-bell", venue: "red-hook-yard", priceDollars: 65, durationMinutes: 180, capacity: 40, policy: "STANDARD_48H",
    photos: ["steak", "feast", "toast"], weekdays: [6, 0], hour: 15, fill: "busy", popularity: 1.3,
  },
  {
    slug: "levantine-mezze-workshop", title: "Levantine Mezze Workshop",
    summary: "Make hummus, muhammara and flatbread in a home kitchen in Astoria.",
    description: "A small, warm class in the host's own dining room. You'll make five mezze, bake flatbread and share everything at the table.",
    category: "COOKING_CLASS_WORKSHOP", cuisine: "middle-eastern", tags: ["mezze", "home kitchen", "vegetarian"], dietary: ["vegetarian", "vegan", "halal"],
    atmosphere: "EITHER_WAY", format: "HANDS_ON_CLASS", occasions: ["LEARN_SOMETHING_NEW", "BRING_A_FRIEND"],
    highlights: ["Cooked in a real home kitchen", "Family recipes", "Fourteen guests maximum"],
    menu: [course("Hummus and muhammara", ""), course("Fattoush", ""), course("Flatbread", "Baked to order"), course("Shared table", "")],
    inclusions: ["Ingredients", "Mint tea", "Recipe booklet"],
    host: "noor-haddad", venue: "astoria-home", priceDollars: 75, durationMinutes: 150, capacity: 14, policy: "FLEXIBLE_24H",
    photos: ["bowl", "spices", "feast"], weekdays: [0, 3], hour: 18, fill: "open", popularity: 1.2,
  },
  {
    slug: "levantine-long-table-dinner", title: "A Levantine Long-Table Dinner",
    summary: "Mezze, slow-cooked lamb and stories behind each family recipe.",
    description: "A communal dinner where every dish comes with a story. Come alone or with friends: the table is shared and conversation is part of the menu.",
    category: "SUPPER_CLUB_PRIVATE_DINING", cuisine: "middle-eastern", tags: ["family recipes", "communal", "mezze"], dietary: ["vegetarian", "halal"],
    atmosphere: "MEET_NEW_PEOPLE", format: "SEATED_DINNER", occasions: ["MEET_NEW_PEOPLE", "BRING_A_FRIEND"],
    highlights: ["Shared long table", "Stories behind every dish", "Creator-hosted"],
    menu: [course("Mezze", "Six dishes"), course("Lamb shoulder", "Or stuffed eggplant"), course("Knafeh", "")],
    inclusions: ["Three courses", "Arak or mocktail welcome"],
    host: "noor-haddad", venue: "soho-loft", priceDollars: 95, durationMinutes: 180, capacity: 20, policy: "STANDARD_48H",
    photos: ["feast", "diningRoom", "wine"], weekdays: [5], hour: 19, fill: "nearly", popularity: 1.4,
  },
  {
    slug: "greenhouse-plant-based-supper", title: "Greenhouse Plant-Based Supper",
    summary: "A five-course plant-based dinner among the tomato vines.",
    description: "Dinner in a rooftop greenhouse in Greenpoint. Five courses built from that week's greenmarket haul, served at tables for two to six.",
    category: "SUPPER_CLUB_PRIVATE_DINING", cuisine: "plant-based", tags: ["greenhouse", "seasonal", "plant-based"], dietary: ["vegan", "vegetarian", "gluten-free", "nut-free"],
    atmosphere: "BRING_YOUR_PEOPLE", format: "SEATED_DINNER", occasions: ["DATE_NIGHT", "BRING_A_FRIEND"],
    highlights: ["Rooftop greenhouse", "Fully plant-based", "Tables for two to six"],
    menu: [course("Garden crudo", ""), course("Charred greens", ""), course("Squash agnolotti", ""), course("Mushroom main", ""), course("Stone fruit", "")],
    inclusions: ["Five courses", "Herbal welcome drink"],
    host: "green-fork", venue: "greenpoint-greenhouse", priceDollars: 85, durationMinutes: 150, capacity: 24, policy: "STANDARD_48H",
    photos: ["bowl", "market", "evening"], weekdays: [4, 5], hour: 19, fill: "open", popularity: 1.0,
  },
  {
    slug: "wine-and-cheese-social", title: "Natural Wine & Cheese Social",
    summary: "Six wines, six cheeses and a room full of people to talk to.",
    description: "A standing tasting in a cellar bar. The host introduces each pairing and keeps the room mixing. Ideal for meeting people or bringing a friend.",
    category: "SOCIAL_CULINARY", cuisine: "french", tags: ["wine", "cheese", "tasting"], dietary: ["vegetarian"],
    atmosphere: "MEET_NEW_PEOPLE", format: "TASTING", occasions: ["MEET_NEW_PEOPLE", "BRING_A_FRIEND", "DATE_NIGHT"],
    highlights: ["Six pairings", "Host keeps the room mixing", "Cellar bar setting"],
    menu: [course("Six pairings", "From fresh to funky")],
    inclusions: ["Six wine pours", "Cheese board", "Tasting notes"],
    host: "sam-whitfield", venue: "fort-greene-bar", priceDollars: 55, durationMinutes: 120, capacity: 26, policy: "FLEXIBLE_24H",
    photos: ["wine", "cocktails", "tables"], weekdays: [4], hour: 19, fill: "busy", popularity: 1.3,
  },
  {
    slug: "dumbo-dumpling-class", title: "Dumpling Folding Class",
    summary: "Fold three styles of dumplings and learn a dipping sauce from scratch.",
    description: "A relaxed class covering pleats, crescents and wontons. Everything gets steamed or pan-fried at the end and shared together.",
    category: "COOKING_CLASS_WORKSHOP", cuisine: "global", tags: ["dumplings", "hands-on", "beginner friendly"], dietary: ["vegetarian", "dairy-free"],
    atmosphere: "EITHER_WAY", format: "HANDS_ON_CLASS", occasions: ["LEARN_SOMETHING_NEW", "BRING_A_FRIEND", "DATE_NIGHT"],
    highlights: ["Three folding styles", "Vegetarian filling available", "Bridge views from the studio"],
    menu: [course("Fillings", "Pork and chive or mushroom"), course("Folding", "Three styles"), course("Cook and share", "")],
    inclusions: ["Ingredients", "Tea", "Recipe card"],
    host: "jiwoo-park", venue: "dumbo-studio", priceDollars: 65, durationMinutes: 150, capacity: 16, policy: "STANDARD_48H",
    photos: ["noodles", "kitchenClass", "ingredients"], weekdays: [3, 6], hour: 18, fill: "nearly", popularity: 1.2,
  },
  {
    slug: "harlem-brunch-supper-club", title: "Sunday Brunch Supper Club",
    summary: "A slow Sunday brunch with live music in a Harlem gallery.",
    description: "Waakye bowls, fried plantains and pancakes with live music in the gallery. Bring a friend or come meet some new ones.",
    category: "SUPPER_CLUB_PRIVATE_DINING", cuisine: "west-african", tags: ["brunch", "live music", "gallery"], dietary: ["vegetarian", "halal"],
    atmosphere: "EITHER_WAY", format: "BRUNCH", occasions: ["BRING_A_FRIEND", "SPECIAL_OCCASION"],
    highlights: ["Live music", "Gallery setting", "Bottomless coffee"],
    menu: [course("Waakye bowl", ""), course("Plantains", ""), course("Sweet bites", "")],
    inclusions: ["Brunch", "Coffee and juice"],
    host: "ama-owusu", venue: "lenox-gallery", priceDollars: 55, durationMinutes: 150, capacity: 30, policy: "FLEXIBLE_24H",
    photos: ["toast", "feast", "dessert"], weekdays: [0], hour: 11, fill: "open", popularity: 1.0,
  },
  {
    slug: "east-village-taco-pop-up", title: "One-Night Taco Pop-Up",
    summary: "A single night of regional tacos in a back room on Avenue B.",
    description: "A one-off pop-up with three guest cooks, regional salsas and a mezcal bar. Limited tickets.",
    category: "POPUP_EXCLUSIVE", cuisine: "mexican", tags: ["one night only", "tacos", "mezcal"], dietary: ["vegetarian", "gluten-free"],
    atmosphere: "MEET_NEW_PEOPLE", format: "STANDING_RECEPTION", occasions: ["BRING_A_FRIEND", "MEET_NEW_PEOPLE"],
    highlights: ["One night only", "Three guest cooks", "Regional salsas"],
    menu: [course("Five tacos", "Rotating regional fillings"), course("Esquites", ""), course("Paletas", "")],
    inclusions: ["Five tacos", "One mezcal or agua fresca"],
    host: "sofia-alvarez", venue: "east-village-room", priceDollars: 40, durationMinutes: 180, capacity: 22, policy: "STANDARD_48H",
    photos: ["tacos", "cocktails", "toast"], weekdays: [5], hour: 20, fill: "sold-out", popularity: 1.5,
  },
  {
    slug: "sake-and-small-plates-tasting", title: "Sake & Small Plates Tasting",
    summary: "Five sakes paired with small plates at the chef's counter.",
    description: "An earlier, lighter evening at the counter: five sakes from different regions with matching small plates and plenty of explanation.",
    category: "SOCIAL_CULINARY", cuisine: "japanese", tags: ["sake", "tasting", "counter seating"], dietary: ["pescatarian"],
    atmosphere: "EITHER_WAY", format: "TASTING", occasions: ["DATE_NIGHT", "LEARN_SOMETHING_NEW"],
    highlights: ["Five sake styles", "Small plates by the chef", "Early evening seating"],
    menu: [course("Five pairings", "Junmai to nigori")],
    inclusions: ["Five pours", "Five small plates", "Tasting sheet"],
    host: "maya-chen", venue: "kiln-counter", priceDollars: 80, durationMinutes: 90, capacity: 12, policy: "STANDARD_48H",
    photos: ["sushi", "wine", "cocktails"], weekdays: [3], hour: 18, fill: "busy", popularity: 1.1,
  },
  {
    slug: "bread-and-butter-workshop", title: "Sourdough & Cultured Butter Workshop",
    summary: "Shape a sourdough loaf and churn cultured butter to take home.",
    description: "A practical bread class: starter care, shaping and scoring. You'll churn butter while your loaf proofs and leave with both.",
    category: "COOKING_CLASS_WORKSHOP", cuisine: "french", tags: ["baking", "sourdough", "take home"], dietary: ["vegetarian"],
    atmosphere: "EITHER_WAY", format: "HANDS_ON_CLASS", occasions: ["LEARN_SOMETHING_NEW"],
    highlights: ["Take home a loaf and starter", "Butter churning", "Small class"],
    menu: [course("Starter care", ""), course("Shaping and scoring", ""), course("Butter", "Cultured and salted")],
    inclusions: ["Ingredients", "Starter to take home", "Loaf and butter"],
    host: "claire-dubois", venue: "village-pastry", priceDollars: 85, durationMinutes: 180, capacity: 10, policy: "STANDARD_48H",
    photos: ["pastry", "ingredients", "kitchenClass"], weekdays: [6], hour: 13, fill: "open", popularity: 0.9,
  },
  {
    slug: "bronx-supper-for-strangers", title: "Supper for Strangers in the Bronx",
    summary: "Forty seats, long tables and a menu from the host's Caribbean family.",
    description: "A big, warm supper designed for meeting people. Long tables, rotating seats between courses and a menu that changes every month.",
    category: "SOCIAL_CULINARY", cuisine: "caribbean", tags: ["communal", "meet people", "long table"], dietary: ["gluten-free", "dairy-free"],
    atmosphere: "MEET_NEW_PEOPLE", format: "SEATED_DINNER", occasions: ["MEET_NEW_PEOPLE"],
    highlights: ["Seats rotate between courses", "Forty guests", "Monthly menu"],
    menu: [course("Saltfish fritters", ""), course("Curry goat or chickpea curry", ""), course("Black cake", "")],
    inclusions: ["Three courses", "Sorrel punch"],
    host: "marcus-bell", venue: "mott-haven-hall", priceDollars: 50, durationMinutes: 150, capacity: 40, policy: "FLEXIBLE_24H",
    photos: ["feast", "tables", "toast"], weekdays: [4], hour: 19, fill: "open", popularity: 0.9,
  },
  {
    slug: "soho-loft-chefs-dinner", title: "Loft Dinner with a Visiting Chef",
    summary: "A rare SoHo loft dinner cooked by a chef in town for one weekend.",
    description: "A visiting chef cooks a single weekend of dinners in a SoHo loft. Expect an ambitious menu and a quiet, design-led room.",
    category: "POPUP_EXCLUSIVE", cuisine: "new-american", tags: ["visiting chef", "loft", "limited run"], dietary: ["vegetarian", "pescatarian", "nut-free"],
    atmosphere: "BRING_YOUR_PEOPLE", format: "CHEFS_TABLE", occasions: ["SPECIAL_OCCASION", "DATE_NIGHT"],
    highlights: ["One weekend only", "Design-led loft", "Chef talks through the menu"],
    menu: [course("Six courses", "Announced the week before")],
    inclusions: ["Six courses", "Welcome champagne"],
    host: "the-hidden-table", venue: "soho-loft", priceDollars: 180, durationMinutes: 180, capacity: 20, policy: "STRICT_7D",
    photos: ["platedDish", "diningRoom", "dessert"], weekdays: [5, 6], hour: 19, fill: "nearly", popularity: 1.4,
  },
  {
    slug: "spice-market-walk", title: "Jackson Heights Spice Walk & Tasting",
    summary: "A guided walk through spice shops and sweet stalls, tasting as you go.",
    description: "A small-group walk with ten tasting stops, finishing with chai and sweets. Good for solo guests and new arrivals.",
    category: "SOCIAL_CULINARY", cuisine: "indian", tags: ["walking tour", "tasting", "meet people"], dietary: ["vegetarian"],
    atmosphere: "MEET_NEW_PEOPLE", format: "WALKING_TOUR", occasions: ["MEET_NEW_PEOPLE", "LEARN_SOMETHING_NEW", "BRING_A_FRIEND"],
    highlights: ["Ten tasting stops", "Small group of 14", "Ends with chai and sweets"],
    menu: [course("Ten tastings", "Chaat, momos, sweets")],
    inclusions: ["All tastings", "Chai", "Map of stops"],
    host: "priya-raman", venue: "lic-rooftop", priceDollars: 35, durationMinutes: 150, capacity: 14, policy: "FLEXIBLE_24H",
    photos: ["market", "spices", "noodles"], weekdays: [0], hour: 12, fill: "busy", popularity: 1.1,
  },
  {
    slug: "cocktail-and-canape-class", title: "Cocktails & Canapés for Hosting",
    summary: "Learn three cocktails and four canapés for your next dinner party.",
    description: "A practical class on hosting at home: batch cocktails, easy canapés and timing. Great with a partner or friend.",
    category: "COOKING_CLASS_WORKSHOP", cuisine: "new-american", tags: ["cocktails", "entertaining", "hands-on"], dietary: ["vegetarian", "gluten-free"],
    atmosphere: "BRING_YOUR_PEOPLE", format: "DEMONSTRATION", occasions: ["DATE_NIGHT", "LEARN_SOMETHING_NEW", "BRING_A_FRIEND"],
    highlights: ["Batch cocktail techniques", "Four make-ahead canapés", "Hosting timeline to take home"],
    menu: [course("Three cocktails", ""), course("Four canapés", "")],
    inclusions: ["All drinks and food", "Hosting guide"],
    host: "sam-whitfield", venue: "fort-greene-bar", priceDollars: 90, durationMinutes: 120, capacity: 18, policy: "STANDARD_48H",
    photos: ["cocktails", "platedDish", "toast"], weekdays: [3], hour: 19, fill: "open", popularity: 0.8,
  },
  {
    slug: "greenmarket-cooking-class", title: "Greenmarket Cooking Class",
    summary: "Shop the market with the hosts, then cook a seasonal lunch together.",
    description: "Start at the greenmarket choosing produce, then cook a plant-based lunch together in the greenhouse kitchen.",
    category: "COOKING_CLASS_WORKSHOP", cuisine: "plant-based", tags: ["market", "seasonal", "plant-based"], dietary: ["vegan", "vegetarian", "gluten-free", "nut-free"],
    atmosphere: "EITHER_WAY", format: "HANDS_ON_CLASS", occasions: ["LEARN_SOMETHING_NEW", "BRING_A_FRIEND"],
    highlights: ["Market shop with the hosts", "Fully plant-based", "Lunch in a greenhouse"],
    menu: [course("Market walk", ""), course("Cook together", "Three dishes"), course("Lunch", "")],
    inclusions: ["Produce", "Lunch", "Seasonal recipe zine"],
    host: "green-fork", venue: "greenpoint-greenhouse", priceDollars: 60, durationMinutes: 210, capacity: 12, policy: "FLEXIBLE_24H",
    photos: ["market", "ingredients", "bowl"], weekdays: [6], hour: 10, fill: "busy", popularity: 0.9,
  },
  {
    slug: "anniversary-tasting-for-two", title: "Candlelit Tasting for Two",
    summary: "A six-course tasting with tables for two only, for anniversaries and celebrations.",
    description: "Every table is a two-top. Six courses, candlelight, and a handwritten card for your occasion if you tell us about it.",
    category: "SUPPER_CLUB_PRIVATE_DINING", cuisine: "french", tags: ["tables for two", "candlelight", "celebration"], dietary: ["vegetarian", "pescatarian", "gluten-free"],
    atmosphere: "BRING_YOUR_PEOPLE", format: "SEATED_DINNER", occasions: ["DATE_NIGHT", "SPECIAL_OCCASION"],
    highlights: ["Tables for two only", "Handwritten occasion card", "Six courses"],
    menu: [course("Six courses", "French, seasonal")],
    inclusions: ["Six courses", "Glass of crémant", "Occasion card"],
    host: "claire-dubois", venue: "east-village-room", priceDollars: 140, durationMinutes: 150, capacity: 16, policy: "STRICT_7D",
    photos: ["dessert", "wine", "restaurantInterior"], featured: true, weekdays: [5, 6], hour: 19, fill: "busy", popularity: 1.3,
  },
];

export const POLICIES = [
  {
    key: "STANDARD_48H",
    name: "Standard (48 hours)",
    summary: "Full refund more than 48 hours before. 50% refund 24–48 hours before. No refund within 24 hours.",
    fullRefundHours: 48,
    partialRefundHours: 24,
    partialRefundPercent: 50,
  },
  {
    key: "FLEXIBLE_24H",
    name: "Flexible (24 hours)",
    summary: "Full refund more than 24 hours before. No refund within 24 hours.",
    fullRefundHours: 24,
    partialRefundHours: null,
    partialRefundPercent: 0,
  },
  {
    key: "STRICT_7D",
    name: "Strict (7 days)",
    summary: "Full refund more than 7 days before. 50% refund 2–7 days before. No refund within 48 hours.",
    fullRefundHours: 168,
    partialRefundHours: 48,
    partialRefundPercent: 50,
  },
] as const;

/** Demo guests. Alex has not onboarded (to try onboarding); Jordan has. */
export const DEMO_GUESTS = [
  // Fictional personas for the 20–35 NYC audience (see src/lib/domain/personas.ts).
  { key: "alex", name: "Alex Rivera", email: "alex.guest@example.com", neighborhood: "east-village" },
  { key: "jordan", name: "Jordan Lee", email: "jordan.guest@example.com", neighborhood: "williamsburg" },
  { key: "zoe", name: "Zoe Park", email: "zoe.guest@example.com", neighborhood: "east-village" },
  { key: "sofia", name: "Sofia Marin", email: "sofia.guest@example.com", neighborhood: "soho" },
];

const FIRST = ["Ava", "Ben", "Chloe", "Dev", "Elena", "Femi", "Grace", "Hugo", "Ines", "Jamal", "Kai", "Lena", "Mateo", "Nia", "Omar", "Pia", "Quinn", "Rae", "Sana", "Theo", "Uma", "Vik", "Wren", "Yara", "Zoe", "Ari", "Bea", "Cal", "Dina", "Eli"];
const LAST = ["Adams", "Brooks", "Cruz", "Diaz", "Evans", "Fox", "Gupta", "Hall", "Ito", "James", "Khan", "Lopez", "Mori", "Nash", "Ortiz"];

/** Background demo guests that make the marketplace feel populated (all fictional). */
export const BACKGROUND_GUESTS = FIRST.map((first, i) => ({
  key: `bg-${i}`,
  name: `${first} ${LAST[i % LAST.length]}`,
  email: `${first.toLowerCase()}.${LAST[i % LAST.length].toLowerCase()}@example.com`,
}));
