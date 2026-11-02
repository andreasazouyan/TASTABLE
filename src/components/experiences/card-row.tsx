import { cn } from "@/lib/utils";

/** Horizontal snap-scrolling row on small screens, a grid from md up. */
export function CardRow({ children, className, label }: { children: React.ReactNode; className?: string; label: string }) {
  return (
    <ul
      aria-label={label}
      className={cn(
        "-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:-mx-6 sm:px-6 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {children}
    </ul>
  );
}

export function CardRowItem({ children }: { children: React.ReactNode }) {
  return <li className="w-[78%] shrink-0 snap-start sm:w-[44%] md:w-auto">{children}</li>;
}
