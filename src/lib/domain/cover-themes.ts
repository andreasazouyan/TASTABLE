/**
 * Warm, restrained fallback palettes. Shown while a photo loads and whenever a remote
 * photo is unavailable, so layouts never collapse or show broken images.
 */
export const COVER_THEMES = {
  terracotta: { surface: "bg-[#b0583a]", ink: "text-[#fbe9dd]" },
  burgundy: { surface: "bg-[#6e2433]", ink: "text-[#f6dfe2]" },
  olive: { surface: "bg-[#5f6b45]", ink: "text-[#eef0df]" },
  sand: { surface: "bg-[#d8c3a5]", ink: "text-[#4a3b2a]" },
  charcoal: { surface: "bg-[#2b2826]", ink: "text-[#efe8dd]" },
  saffron: { surface: "bg-[#c98a2e]", ink: "text-[#fff3dc]" },
} as const;

export type CoverTheme = keyof typeof COVER_THEMES;

export function coverTheme(theme: string | null | undefined) {
  return COVER_THEMES[(theme ?? "terracotta") as CoverTheme] ?? COVER_THEMES.terracotta;
}
