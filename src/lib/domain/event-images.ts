/**
 * Tastable's own event images (public/tastable-event-images), matched to the sample events by
 * filename. Each matched image becomes the event's cover (cards and the detail page); the
 * placeholder library photos stay as the rest of the gallery. Events without a good match keep
 * their placeholder cover. Images are illustrative and don't depict the fictional hosts.
 */
export const EVENT_IMAGE_DIR = "/tastable-event-images";

export type EventImage = { file: string; alt: string };

export const EVENT_IMAGES: Record<string, EventImage> = {
  "brooklyn-japanese-chefs-table": { file: "chefs-table-dinner.jpg", alt: "Guests at a long candlelit chef's table" },
  "italian-pasta-making-workshop": { file: "pasta-making-class.jpg", alt: "Hands lifting fresh pasta from a floured board" },
  "harlem-art-gallery-dinner": { file: "themed-dinner-night.jpg", alt: "A dinner table set with flowers and candles for a themed night" },
  "rooftop-creator-supper-club": { file: "rooftop-pop-up-dinner.jpg", alt: "A candlelit rooftop dinner at sunset" },
  "international-newcomers-social-dinner": { file: "meet-new-people-dinner.jpg", alt: "Guests laughing together around a dinner table" },
  "french-pastry-workshop": { file: "pastry-dessert-class.jpg", alt: "A cake being decorated with fresh berries" },
  "secret-location-tasting-dinner": { file: "secret-garden-dinner.jpg", alt: "A dinner in a garden lit by string lights" },
  "red-hook-fire-cookout": { file: "sunset-dining.jpg", alt: "Guests dining by the water at sunset" },
  "levantine-mezze-workshop": { file: "mediterranean-cooking-class.jpg", alt: "Hands preparing tomatoes and herbs in a cooking class" },
  "wine-and-cheese-social": { file: "cheese-wine-pairing.jpg", alt: "Cheese, grapes and glasses of wine on a board" },
  "bread-and-butter-workshop": { file: "bread-making-class.jpg", alt: "Hands kneading bread dough on a floured table" },
  "soho-loft-chefs-dinner": { file: "guest-chef-pop-up.jpg", alt: "A chef plating dishes in front of seated guests" },
  "spice-market-walk": { file: "food-tour-with-chef.jpg", alt: "A group on a food tour through a busy street" },
  "greenmarket-cooking-class": { file: "market-tour-local-tastings.jpg", alt: "Fresh produce stalls at a market" },
  "anniversary-tasting-for-two": { file: "supper-club-private-dining.jpg", alt: "Elegant candlelit tables set for a private dinner" },
};

/** Images in the folder with no close match among the current sample events (kept for future events). */
export const UNMATCHED_EVENT_IMAGES = ["chocolate-tasting.jpg", "coffee-tasting.jpg", "foraging-experience.jpg", "sushi-making-workshop.jpg", "wine-tasting.jpg"];

export function eventImageFor(slug: string) {
  const img = EVENT_IMAGES[slug];
  return img ? { url: `${EVENT_IMAGE_DIR}/${img.file}`, alt: img.alt } : null;
}

export const EVENT_IMAGE_CREDIT = "Tastable event image";
