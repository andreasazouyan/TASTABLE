/**
 * Placeholder culinary photography from Unsplash (free to use under the Unsplash License,
 * https://unsplash.com/license). Photos are illustrative only: they do not depict the
 * sample hosts or sample events in the demo data.
 *
 * Every photo is rendered through <Photo>, which shows a styled fallback if a URL fails.
 */
const UNSPLASH = "https://images.unsplash.com";

function unsplash(id: string) {
  return `${UNSPLASH}/${id}?auto=format&fit=crop&w=1600&q=80`;
}

export const PHOTOS = {
  heroTable: { src: unsplash("photo-1414235077428-338989a2e8c0"), alt: "Plated dishes on a candlelit dining table" },
  restaurantInterior: { src: unsplash("photo-1517248135467-4c7edcad34c4"), alt: "Warmly lit restaurant interior" },
  diningRoom: { src: unsplash("photo-1555396273-367ea4eb4db5"), alt: "Dining room with wooden tables and soft light" },
  kitchenClass: { src: unsplash("photo-1556910103-1c02745aae4d"), alt: "Hands preparing food on a kitchen counter" },
  ingredients: { src: unsplash("photo-1466637574441-749b8f19452f"), alt: "Fresh ingredients laid out for cooking" },
  platedDish: { src: unsplash("photo-1504674900247-0877df9cc836"), alt: "A carefully plated dish seen from above" },
  feast: { src: unsplash("photo-1543353071-873f17a7a088"), alt: "A table filled with shared dishes" },
  toast: { src: unsplash("photo-1528605248644-14dd04022da1"), alt: "Friends raising glasses at a dinner" },
  evening: { src: unsplash("photo-1559339352-11d035aa65de"), alt: "Restaurant terrace in the evening" },
  wine: { src: unsplash("photo-1510812431401-41d2bd2722f3"), alt: "Glasses of red wine on a table" },
  steak: { src: unsplash("photo-1600891964599-f61ba0e24092"), alt: "A grilled dish with vegetables" },
  bowl: { src: unsplash("photo-1490645935967-10de6ba17061"), alt: "A colourful bowl of food" },
  pizza: { src: unsplash("photo-1565299624946-b28f40a0ae38"), alt: "A wood-fired pizza" },
  tables: { src: unsplash("photo-1551218808-94e220e084d2"), alt: "Set restaurant tables" },
  sushi: { src: unsplash("photo-1579584425555-c3ce17fd4351"), alt: "Pieces of nigiri on a wooden counter" },
  pastry: { src: unsplash("photo-1509440159596-0249088772ff"), alt: "Freshly baked bread and pastries" },
  dessert: { src: unsplash("photo-1551024601-bec78aea704b"), alt: "A plated dessert" },
  cocktails: { src: unsplash("photo-1514362545857-3bc16c4c7d1b"), alt: "Cocktails on a bar counter" },
  market: { src: unsplash("photo-1488459716781-31db52582fe9"), alt: "Fresh produce at a market stall" },
  tacos: { src: unsplash("photo-1565299585323-38d6b0865b47"), alt: "Tacos on a plate" },
  noodles: { src: unsplash("photo-1569718212165-3a8278d5f624"), alt: "A bowl of noodle soup" },
  spices: { src: unsplash("photo-1596040033229-a9821ebd058d"), alt: "Bowls of colourful spices" },
} as const;

export type PhotoKey = keyof typeof PHOTOS;
