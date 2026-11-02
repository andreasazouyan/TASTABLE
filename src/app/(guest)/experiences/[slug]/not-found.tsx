import Link from "next/link";

import { EmptyState } from "@/components/site/empty-state";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container-page py-20">
      <EmptyState title="This experience isn't available" description="It may have been unpublished or cancelled by the host.">
        <Button asChild>
          <Link href="/discover">Browse experiences</Link>
        </Button>
      </EmptyState>
    </div>
  );
}
