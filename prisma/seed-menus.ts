import type { PhotoKey } from "../src/lib/domain/photos";

/**
 * Structured menus for the fictional sample events: courses (sections) with dishes, short
 * descriptions, dietary labels and an occasional photo. Cooking classes describe what guests
 * cook; socials describe what they taste. The flat legacy `Experience.menu` is derived from these.
 */
type Item = { name: string; description?: string; dietary?: string[]; dish?: string; photo?: PhotoKey };
type Section = { title: string; description?: string; items: Item[] };
export type SeedMenu = { status?: "FINAL" | "SUBJECT_TO_CHANGE" | "TO_BE_ANNOUNCED"; sections: Section[] };

const V = "vegetarian";
const VG = "vegan";
const GF = "gluten-free";
const DF = "dairy-free";
const P = "pescatarian";
const H = "halal";

export const SEED_MENUS: Record<string, SeedMenu> = {
  "brooklyn-japanese-chefs-table": {
    sections: [
      { title: "Sakizuke", items: [{ name: "Seasonal small bites", description: "Three bites that change with the market", dietary: [P] }] },
      { title: "Sashimi", items: [{ name: "Three fish, aged in-house", description: "Served with fresh wasabi", dietary: [P, GF, DF] }] },
      { title: "Nigiri", items: [{ name: "Eight-piece nigiri", description: "Edomae style, one piece at a time", dietary: [P, DF], dish: "sushi", photo: "sushi" }] },
      { title: "To finish", items: [{ name: "Miso soup and pickles", dietary: [P, DF] }, { name: "Hojicha panna cotta", description: "Roasted green tea cream", dietary: [V, GF] }] },
    ],
  },
  "italian-pasta-making-workshop": {
    sections: [
      { title: "What you'll make", items: [{ name: "Fresh egg dough", description: "Flour, eggs and technique, by hand", dietary: [V] }, { name: "Three pasta shapes", description: "Tagliatelle, tortelli and orecchiette", dietary: [V], dish: "pasta" }] },
      { title: "What you'll eat", items: [{ name: "Your pasta, two sauces", description: "Brown butter and sage, slow tomato", dietary: [V] }, { name: "Tiramisu", description: "Made by the host the night before", dietary: [V], dish: "tiramisu" }] },
    ],
  },
  "harlem-art-gallery-dinner": {
    sections: [
      { title: "Starter", items: [{ name: "Suya skewers", description: "Beef with yaji spice and red onion", dietary: [GF, DF, H], dish: "suya" }] },
      { title: "Mains", items: [{ name: "Jollof risotto", description: "Smoked tomato, crispy shallots", dietary: [V, GF], dish: "jollof-rice" }, { name: "Grilled fish with pepper sauce", dietary: [P, GF, DF] }] },
      { title: "Dessert", items: [{ name: "Puff-puff", description: "With hibiscus syrup", dietary: [V, DF] }] },
    ],
  },
  "rooftop-creator-supper-club": {
    sections: [
      { title: "To start", items: [{ name: "Three kinds of chaat", description: "Crunchy, tangy, sweet", dietary: [V] }] },
      { title: "Family style", items: [{ name: "Dal and fresh breads", dietary: [V] }, { name: "Slow-cooked biryani", description: "Chicken or jackfruit", dietary: [GF, H], dish: "biryani" }, { name: "Seasonal vegetable curry", dietary: [VG, GF], dish: "curry" }] },
      { title: "Dessert", items: [{ name: "Kulfi", description: "Pistachio and cardamom", dietary: [V, GF] }] },
    ],
  },
  "international-newcomers-social-dinner": {
    sections: [
      { title: "Shared starters", description: "Small plates from the host's travels", items: [{ name: "Mezze board", dietary: [V], dish: "mezze" }, { name: "Pork and chive dumplings", description: "Or mushroom, on request", dish: "dumplings" }] },
      { title: "Main", items: [{ name: "Tacos al pastor or mushroom tacos", dietary: [DF] }] },
      { title: "Dessert", items: [{ name: "Churros", description: "With dark chocolate", dietary: [V] }] },
    ],
  },
  "french-pastry-workshop": {
    sections: [
      { title: "What you'll learn", items: [{ name: "Lamination", description: "Butter block and three folds", dietary: [V] }, { name: "Croissants and pain au chocolat", description: "Shaping and proofing", dietary: [V], dish: "croissant" }] },
      { title: "What you'll taste", items: [{ name: "Your bake, warm", description: "With coffee and jam", dietary: [V], dish: "pastries", photo: "pastry" }] },
    ],
  },
  "korean-fermentation-workshop": {
    sections: [
      { title: "What you'll make", items: [{ name: "Salted napa cabbage", dietary: [VG, GF] }, { name: "Kimchi paste", description: "Gochugaru, garlic, ginger", dietary: [VG, GF], dish: "kimchi" }, { name: "Two quick banchan", description: "Spinach and radish", dietary: [VG, GF] }] },
      { title: "Tasting", items: [{ name: "Aged kimchi comparison", description: "Fresh, two weeks and six months", dietary: [VG, GF] }, { name: "Bibimbap lunch", dietary: [V], dish: "bibimbap" }] },
    ],
  },
  "secret-location-tasting-dinner": {
    status: "TO_BE_ANNOUNCED",
    sections: [{ title: "Seven courses", items: [{ name: "Seasonal tasting menu", description: "Announced on the night", dish: "tasting-menu" }] }],
  },
  "red-hook-fire-cookout": {
    sections: [
      { title: "Off the fire", items: [{ name: "Jerk chicken or jackfruit", description: "Pimento wood smoke", dietary: [GF, DF], dish: "jerk-chicken" }, { name: "Fire-roasted corn", dietary: [V, GF] }] },
      { title: "On the side", items: [{ name: "Doubles", description: "With tamarind", dietary: [VG] }, { name: "Oxtail stew", dietary: [GF, DF], dish: "oxtail" }] },
      { title: "Sweet", items: [{ name: "Rum cake", dietary: [V] }] },
    ],
  },
  "levantine-mezze-workshop": {
    sections: [
      { title: "What you'll cook", items: [{ name: "Hummus and muhammara", dietary: [VG], dish: "hummus" }, { name: "Fattoush", dietary: [VG] }, { name: "Flatbread, baked to order", dietary: [VG] }] },
      { title: "Shared table", items: [{ name: "Everything you made, with pickles and olives", dietary: [VG], dish: "mezze" }] },
    ],
  },
  "levantine-long-table-dinner": {
    sections: [
      { title: "Mezze", items: [{ name: "Six dishes to share", description: "Hummus, labneh, tabbouleh and more", dietary: [V], dish: "mezze" }] },
      { title: "Main", items: [{ name: "Slow-roasted lamb shoulder", dietary: [GF, DF, H] }, { name: "Stuffed eggplant", dietary: [VG, GF] }] },
      { title: "Dessert", items: [{ name: "Knafeh", description: "Warm, with orange blossom", dietary: [V] }] },
    ],
  },
  "greenhouse-plant-based-supper": {
    sections: [
      { title: "First", items: [{ name: "Garden crudo", dietary: [VG, GF] }, { name: "Charred greens", dietary: [VG, GF] }] },
      { title: "Second", items: [{ name: "Squash agnolotti", dietary: [V] }, { name: "Mushroom main", description: "Roasted maitake, grain and herbs", dietary: [VG], dish: "grain-bowl" }] },
      { title: "Last", items: [{ name: "Stone fruit", description: "Whatever the market has", dietary: [VG, GF] }] },
    ],
  },
  "wine-and-cheese-social": {
    sections: [{ title: "What you'll taste", items: [{ name: "Six wine and cheese pairings", description: "From fresh to funky", dietary: [V, GF], dish: "cheese-board" }, { name: "Bread and accompaniments", dietary: [VG] }] }],
  },
  "dumbo-dumpling-class": {
    sections: [
      { title: "What you'll make", items: [{ name: "Two fillings", description: "Pork and chive, or mushroom", dish: "dumplings" }, { name: "Three folds", description: "Pleated, half-moon and gyoza", dish: "gyoza" }] },
      { title: "Cook and share", items: [{ name: "Steamed and pan-fried, with dipping sauces", dietary: [DF] }] },
    ],
  },
  "harlem-brunch-supper-club": {
    sections: [
      { title: "Brunch", items: [{ name: "Waakye bowl", description: "Rice and beans, shito, boiled egg", dietary: [V, GF] }, { name: "Fried plantains", dietary: [VG, GF] }, { name: "Jollof with brunch plates", dish: "jollof-rice" }] },
      { title: "Sweet bites", items: [{ name: "Chin chin and fruit", dietary: [V] }] },
    ],
  },
  "east-village-taco-pop-up": {
    status: "SUBJECT_TO_CHANGE",
    sections: [
      { title: "Tacos", description: "Fillings rotate with what's good that week", items: [{ name: "Five regional tacos", description: "Two vegetarian", dietary: [GF], dish: "tacos", photo: "tacos" }, { name: "Mole negro", dietary: [GF], dish: "mole" }] },
      { title: "On the side", items: [{ name: "Esquites", dietary: [V, GF] }] },
      { title: "Dessert", items: [{ name: "Paletas", description: "Mango chile and hibiscus", dietary: [VG, GF] }] },
    ],
  },
  "sake-and-small-plates-tasting": {
    sections: [
      { title: "What you'll taste", items: [{ name: "Five sake pairings", description: "Junmai to nigori", dietary: [VG, GF] }, { name: "Small plates", description: "Gyoza, pickles and a little sushi", dietary: [P], dish: "sushi" }] },
    ],
  },
  "bread-and-butter-workshop": {
    sections: [
      { title: "What you'll learn", items: [{ name: "Starter care", dietary: [VG] }, { name: "Shaping and scoring", dietary: [VG] }, { name: "Cultured butter", description: "Churned and salted by hand", dietary: [V, GF] }] },
      { title: "What you'll take home", items: [{ name: "A loaf and a jar of starter", dietary: [VG], dish: "pastries" }] },
    ],
  },
  "bronx-supper-for-strangers": {
    sections: [
      { title: "Starter", items: [{ name: "Saltfish fritters", dietary: [P, DF] }] },
      { title: "Main", items: [{ name: "Curry goat or chickpea curry", dietary: [GF, DF] }] },
      { title: "Dessert", items: [{ name: "Black cake", dietary: [V] }] },
    ],
  },
  "soho-loft-chefs-dinner": {
    status: "SUBJECT_TO_CHANGE",
    sections: [{ title: "Six courses", description: "Final menu shared the week before", items: [{ name: "Visiting chef's tasting menu", dish: "tasting-menu" }, { name: "Dry-aged steak course", dietary: [GF], dish: "steak", photo: "steak" }] }],
  },
  "spice-market-walk": {
    sections: [{ title: "Ten tastings along the way", items: [{ name: "Chaat", dietary: [V], dish: "chaat" }, { name: "Momos", dish: "dumplings" }, { name: "Dosa", dietary: [VG, GF], dish: "dosa" }, { name: "Sweets from two bakeries", dietary: [V] }] }],
  },
  "cocktail-and-canape-class": {
    sections: [
      { title: "What you'll shake", items: [{ name: "Three cocktails", description: "A sour, a spritz and a stirred classic", dietary: [VG, GF] }] },
      { title: "What you'll make", items: [{ name: "Four canapés", description: "Oysters, cheese gougères and two more", dish: "oysters" }] },
    ],
  },
  "greenmarket-cooking-class": {
    sections: [
      { title: "What you'll cook", items: [{ name: "Market grain bowl", dietary: [VG], dish: "grain-bowl" }, { name: "Two seasonal sides", dietary: [VG, GF] }] },
      { title: "Lunch", items: [{ name: "Everything you cooked, together", dietary: [VG] }] },
    ],
  },
  "anniversary-tasting-for-two": {
    status: "SUBJECT_TO_CHANGE",
    sections: [
      { title: "Six French courses", items: [{ name: "Steak frites, done properly", dietary: [GF], dish: "steak-frites" }, { name: "Chocolate soufflé", description: "Made to order", dietary: [V], dish: "souffle", photo: "dessert" }] },
    ],
  },
};
