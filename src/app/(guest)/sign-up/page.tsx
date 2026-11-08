import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { SignUpForm } from "@/components/auth/account-forms";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/auth/demo";

export const metadata: Metadata = { title: "Create your account" };

export default function SignUpPage(props: PageProps<"/sign-up">) {
  return (
    <div className="container-page max-w-lg pt-10 pb-16 sm:pt-16">
      <p className="eyebrow mb-2">Join Tastable</p>
      <h1 className="text-4xl sm:text-5xl">Create your account</h1>
      <p className="mt-3 text-muted-foreground">Save experiences, book seats and get recommendations that fit your taste and budget.</p>
      <div className="mt-8 rounded-2xl border bg-card p-5 shadow-soft sm:p-6">
        <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
          <Form {...props} />
        </Suspense>
      </div>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-brand underline-offset-4 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}

async function Form({ searchParams }: PageProps<"/sign-up">) {
  const [sp, user] = await Promise.all([searchParams, getCurrentUser()]);
  if (user && !user.isDemo) redirect("/profile");
  return <SignUpForm as={sp.as === "host" ? "host" : "guest"} />;
}
