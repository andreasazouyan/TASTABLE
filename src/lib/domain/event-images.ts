/**
 * Tastable's own event images (public/tastable-event-images), matched to the sample events by
 * filename. Each event can have a cover (cards and the top of the detail page) and detail images
 * (the rest of the detail-page gallery), always shown before any placeholder library photos.
 * Events without a good match keep their placeholder photos. Images are illustrative and don't
 * depict the fictional hosts.
 */
export const EVENT_IMAGE_DIR = "/tastable-event-images";

export type EventImage = { file: string; alt: string };

const IMG = {
  // First batch
  chefsTable: { file: "chefs-table-dinner.jpg", alt: "Guests at a long candlelit chef's table" },
  pasta: { file: "pasta-making-class.jpg", alt: "Hands lifting fresh pasta from a floured board" },
  themedDinner: { file: "themed-dinner-night.jpg", alt: "A dinner table set with flowers and candles for a themed night" },
  rooftopPopUp: { file: "rooftop-pop-up-dinner.jpg", alt: "A candlelit rooftop dinner at sunset" },
  meetPeople: { file: "meet-new-people-dinner.jpg", alt: "Guests laughing together around a dinner table" },
  pastry: { file: "pastry-dessert-class.jpg", alt: "A cake being decorated with fresh berries" },
  secretGarden: { file: "secret-garden-dinner.jpg", alt: "A dinner in a garden lit by string lights" },
  sunset: { file: "sunset-dining.jpg", alt: "Guests dining by the water at sunset" },
  mediterranean: { file: "mediterranean-cooking-class.jpg", alt: "Hands preparing tomatoes and herbs in a cooking class" },
  cheeseWine: { file: "cheese-wine-pairing.jpg", alt: "Cheese, grapes and glasses of wine on a board" },
  bread: { file: "bread-making-class.jpg", alt: "Hands kneading bread dough on a floured table" },
  guestChef: { file: "guest-chef-pop-up.jpg", alt: "A chef plating dishes in front of seated guests" },
  foodTour: { file: "food-tour-with-chef.jpg", alt: "A group on a food tour through a busy street" },
  marketTour: { file: "market-tour-local-tastings.jpg", alt: "Fresh produce stalls at a market" },
  supperClub: { file: "supper-club-private-dining.jpg", alt: "Elegant candlelit tables set for a private dinner" },
  // Second batch
  caribbean: { file: "caribbean-dinner.jpg", alt: "Grilled jerk chicken, rice and plantains on a platter with hibiscus flowers" },
  cocktails: { file: "cocktails-canapes-hosting.jpg", alt: "Cocktails in coupe glasses beside a tray of canapés" },
  dumplings: { file: "dumpling-folding-class.jpg", alt: "Hands folding dumplings on a floured counter" },
  greenmarket: { file: "greenmarket-plant-based-cooking-class.jpg", alt: "A chef with fresh vegetables at an outdoor market cooking station" },
  handsOn: { file: "hands-on-cooking-class.jpg", alt: "Guests cooking together around a kitchen counter" },
  kimchi: { file: "korean-fermentation-workshop.jpg", alt: "Jars of kimchi and pickles with a bowl of seasoning paste" },
  tacos: { file: "one-night-taco-pop-up.jpg", alt: "Three tacos with lime on a tray at a night market" },
  sake: { file: "sake-small-plates-tasting.jpg", alt: "Sake being poured beside small plates of sushi" },
  rooftop: { file: "social-rooftop.jpg", alt: "A long table under string lights on a rooftop at dusk" },
  walkingTour: { file: "social-walking-tour.jpg", alt: "A group walking past market stalls on a city street" },
  studio: { file: "studio-kitchen.jpg", alt: "A bright studio kitchen with an island and stools" },
  brunch: { file: "west-african-sunday-brunch.jpg", alt: "Stew, rice and fried plantains on a brunch table" },
  // Regina's Table (caption-free versions of first-batch images)
  reginaCover: { file: "reginas-table-supper-club.jpg", alt: "Guests laughing together over dinner at a warm, candlelit table" },
  reginaPasta: { file: "reginas-table-homemade-pasta.jpg", alt: "Fresh homemade pasta lifted from a floured board" },
  reginaSalad: { file: "reginas-table-fresh-salad.jpg", alt: "Fresh tomatoes, greens and herbs being prepared" },
} satisfies Record<string, EventImage>;

/** Cover image per event (by slug). */
export const EVENT_IMAGES: Record<string, EventImage> = {
  "brooklyn-japanese-chefs-table": IMG.chefsTable,
  "italian-pasta-making-workshop": IMG.pasta,
  "harlem-art-gallery-dinner": IMG.themedDinner,
  "rooftop-creator-supper-club": IMG.rooftopPopUp,
  "international-newcomers-social-dinner": IMG.meetPeople,
  "french-pastry-workshop": IMG.pastry,
  "secret-location-tasting-dinner": IMG.secretGarden,
  "red-hook-fire-cookout": IMG.sunset,
  "levantine-mezze-workshop": IMG.mediterranean,
  "wine-and-cheese-social": IMG.cheeseWine,
  "bread-and-butter-workshop": IMG.bread,
  "soho-loft-chefs-dinner": IMG.guestChef,
  "spice-market-walk": IMG.foodTour,
  "greenmarket-cooking-class": IMG.greenmarket,
  "anniversary-tasting-for-two": IMG.supperClub,
  "bronx-supper-for-strangers": IMG.caribbean,
  "cocktail-and-canape-class": IMG.cocktails,
  "dumbo-dumpling-class": IMG.dumplings,
  "korean-fermentation-workshop": IMG.kimchi,
  "east-village-taco-pop-up": IMG.tacos,
  "sake-and-small-plates-tasting": IMG.sake,
  // The greenhouse venue is a Greenpoint rooftop.
  "greenhouse-plant-based-supper": IMG.rooftop,
  "harlem-brunch-supper-club": IMG.brunch,
  "reginas-table-supper-club": IMG.reginaCover,
};

/**
 * Detail images by event, from the event's details: hands-on classes get the class photo, studio
 * kitchen venues the studio photo, the walking tour the street photo.
 */
export const EVENT_DETAIL_IMAGES: Record<string, EventImage[]> = {
  "italian-pasta-making-workshop": [IMG.handsOn, IMG.studio],
  "french-pastry-workshop": [IMG.handsOn, IMG.studio],
  "korean-fermentation-workshop": [IMG.handsOn, IMG.studio],
  "dumbo-dumpling-class": [IMG.handsOn, IMG.studio],
  "bread-and-butter-workshop": [IMG.handsOn, IMG.studio],
  "levantine-mezze-workshop": [IMG.handsOn],
  "greenmarket-cooking-class": [IMG.marketTour, IMG.handsOn],
  "spice-market-walk": [IMG.walkingTour],
  "reginas-table-supper-club": [IMG.reginaPasta, IMG.reginaSalad],
};

/** Images in the folder with no close match among the current sample events (kept for future events). */
export const UNMATCHED_EVENT_IMAGES = ["chocolate-tasting.jpg", "coffee-tasting.jpg", "foraging-experience.jpg", "sushi-making-workshop.jpg", "wine-tasting.jpg"];

const toPhoto = (img: EventImage) => ({ url: `${EVENT_IMAGE_DIR}/${img.file}`, alt: img.alt });

export function eventImageFor(slug: string) {
  const img = EVENT_IMAGES[slug];
  return img ? toPhoto(img) : null;
}

/** All of an event's own images in display order: cover first, then detail images. */
export function eventImagesFor(slug: string) {
  return [...(EVENT_IMAGES[slug] ? [EVENT_IMAGES[slug]] : []), ...(EVENT_DETAIL_IMAGES[slug] ?? [])].map(toPhoto);
}

/** Every event-specific image file referenced above (for checks). */
export const ALL_EVENT_IMAGE_FILES = [...new Set(Object.values(IMG).map((i) => i.file))];

export const EVENT_IMAGE_CREDIT = "Tastable event image";
