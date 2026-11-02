"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import { UtensilsCrossed } from "lucide-react";

import { coverTheme } from "@/lib/domain/cover-themes";
import { cn } from "@/lib/utils";

type PhotoProps = Omit<ImageProps, "src" | "alt" | "fill"> & {
  src?: string | null;
  alt: string;
  /** Fallback palette key from COVER_THEMES. */
  theme?: string | null;
  /** Classes for the positioned wrapper. The image always fills it. */
  className?: string;
  imageClassName?: string;
};

/**
 * Fills its wrapper with a photo. While loading, and if the image fails or is missing,
 * a warm textured fallback keeps the layout intact. Always pass meaningful alt text.
 */
export function Photo({ src, alt, theme, className, imageClassName, sizes = "100vw", ...props }: PhotoProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(src ? "loading" : "error");
  const palette = coverTheme(theme);

  return (
    <div className={cn("relative overflow-hidden", palette.surface, className)}>
      <div
        aria-hidden
        className={cn(
          "absolute inset-0 flex items-center justify-center transition-opacity duration-500",
          status === "loaded" ? "opacity-0" : "opacity-100",
        )}
        style={{
          backgroundImage:
            "radial-gradient(120% 80% at 20% 10%, rgb(255 255 255 / 0.18), transparent 60%), radial-gradient(90% 70% at 90% 100%, rgb(0 0 0 / 0.22), transparent 60%)",
        }}
      >
        {status === "error" && <UtensilsCrossed className={cn("size-8 opacity-60", palette.ink)} strokeWidth={1.25} />}
      </div>
      {src && status !== "error" && (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
          className={cn(
            "object-cover transition-[opacity,transform] duration-700 ease-soft",
            status === "loaded" ? "opacity-100" : "opacity-0",
            imageClassName,
          )}
          {...props}
        />
      )}
      {status === "error" && <span className="sr-only">{alt}</span>}
    </div>
  );
}
