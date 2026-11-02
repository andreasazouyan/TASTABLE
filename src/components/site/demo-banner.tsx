import Link from "next/link";

/** Persistent disclosure: listings are fictional samples and payments are simulated. */
export function DemoBanner() {
  return (
    <div className="bg-foreground text-[12px] text-background/85">
      <p className="container-page flex min-h-8 items-center justify-center py-1.5 text-center">
        <span>
          Prototype preview. All hosts and experiences are fictional samples and payments are simulated.{" "}
          <Link href="/about" className="underline underline-offset-2 hover:text-background">
            Learn more
          </Link>
        </span>
      </p>
    </div>
  );
}
