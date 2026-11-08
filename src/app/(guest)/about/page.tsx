import type { Metadata } from "next";
import Link from "next/link";

import { POLICY_EXAMPLES } from "./policies";

export const metadata: Metadata = { title: "About this prototype" };

export default function AboutPage() {
  return (
    <div className="container-page max-w-3xl pt-10 sm:pt-16">
      <p className="eyebrow mb-2">About</p>
      <h1 className="text-4xl sm:text-5xl">About this prototype</h1>
      <div className="mt-8 space-y-10 text-[15px] leading-relaxed">
        <section>
          <p>
            Tastable is a curated marketplace for unique culinary experiences: supper clubs and private dining, cooking classes and workshops,
            pop-ups and exclusive experiences, and social culinary experiences. This is an advanced prototype.
          </p>
          <ul className="mt-4 list-disc space-y-1.5 pl-5">
            <li>
              <strong>All hosts, venues and experiences are fictional sample data.</strong> Names, addresses, follower counts and credentials are
              invented and marked as samples.
            </li>
            <li>
              <strong>Payments are simulated.</strong> Tastable never asks for card numbers and no money moves. References starting with{" "}
              <code>sim_</code> are demo transactions.
            </li>
            <li>
              <strong>Anyone can create a real account</strong> with an email and password. <Link href="/sign-up" className="text-brand underline">Create one</Link>, or explore as a fictional demo persona from <Link href="/sign-in" className="text-brand underline">Log in</Link>.
            </li>
          </ul>
        </section>
        <section id="cancellations">
          <h2 className="mb-3 text-2xl">Cancellation policies</h2>
          <p className="mb-4">Hosts choose terms per experience. The exact refund is always shown before you confirm a cancellation.</p>
          <ul className="space-y-3">
            {POLICY_EXAMPLES.map((p) => (
              <li key={p.name} className="rounded-xl border bg-card p-4">
                <p className="font-medium">{p.name}</p>
                <p className="text-sm text-muted-foreground">{p.summary}</p>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-muted-foreground">The 6% service fee is non-refundable unless the host cancels, in which case everything is refunded.</p>
        </section>
        <section id="hosting">
          <h2 className="mb-3 text-2xl">Hosting on Tastable</h2>
          <p>
            Hosts get discovery beyond their followers, ticketing with QR check-in, guest dietary lists, venue support requests and simple
            finance and trend dashboards. Venue support is a request only: Tastable does not claim to secure venues.
          </p>
        </section>
        <section id="photography">
          <h2 className="mb-3 text-2xl">Photo credits</h2>
          <p>
            Placeholder culinary photography is loaded from Unsplash under the Unsplash License. Photos are illustrative and do not depict the
            fictional hosts or events. If an image can&apos;t load, a styled placeholder is shown instead.
          </p>
        </section>
      </div>
    </div>
  );
}
