import { Info, Leaf } from "lucide-react";

import { Photo } from "@/components/site/photo";
import { dietaryLabel } from "@/lib/domain/taxonomy";
import { cn } from "@/lib/utils";

export type MenuView = {
  status: "FINAL" | "SUBJECT_TO_CHANGE" | "TO_BE_ANNOUNCED";
  sections: {
    title: string;
    description: string;
    items: { name: string; description: string; dietaryTags: string[]; imageUrl?: string | null; imageAlt?: string | null }[];
  }[];
};

/** Heading by category: dinners have a menu, classes have what you cook, socials what you taste. */
export function menuHeading(category: string) {
  if (category === "COOKING_CLASS_WORKSHOP") return "What You'll Cook";
  if (category === "SOCIAL_CULINARY") return "What You'll Enjoy";
  return "The Menu";
}

/**
 * The structured menu: courses (sections) with dishes, descriptions, dietary labels and optional
 * photos. Shared by the event page and the host's preview, so both always look the same.
 */
export function EventMenu({ menu, className }: { menu: MenuView; className?: string }) {
  if (menu.status === "TO_BE_ANNOUNCED" || !menu.sections.length) {
    return (
      <p className={cn("rounded-2xl border border-dashed bg-muted/40 p-5 text-sm", className)}>
        <span className="block font-display text-lg">Menu to be announced</span>
        <span className="text-muted-foreground">The host will share the menu before the event. Dietary needs can be added at checkout.</span>
      </p>
    );
  }
  return (
    <div className={cn("space-y-7", className)}>
      {menu.status === "SUBJECT_TO_CHANGE" && (
        <p className="flex items-start gap-2 rounded-xl bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden /> Menu subject to change: the host may adjust dishes to what&apos;s in season.
        </p>
      )}
      {menu.sections.map((section, si) => (
        <section key={`${section.title}-${si}`} aria-label={section.title}>
          <h3 className="eyebrow mb-1">{section.title}</h3>
          {section.description && <p className="mb-2 text-sm text-muted-foreground">{section.description}</p>}
          <ul className="divide-y">
            {section.items.map((item, ii) => (
              <li key={`${item.name}-${ii}`} className="flex gap-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{item.name}</p>
                  {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
                  {item.dietaryTags.length > 0 && (
                    <ul className="mt-1.5 flex flex-wrap gap-1.5" aria-label="Dietary labels">
                      {item.dietaryTags.map((t) => (
                        <li key={t} className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                          <Leaf className="size-3 text-brand" aria-hidden /> {dietaryLabel(t)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {item.imageUrl && (
                  <Photo src={item.imageUrl} alt={item.imageAlt ?? item.name} theme="terracotta" sizes="96px" className="aspect-square w-20 shrink-0 rounded-xl sm:w-24" />
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
