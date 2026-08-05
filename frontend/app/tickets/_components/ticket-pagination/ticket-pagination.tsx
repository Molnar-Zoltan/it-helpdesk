import { Button } from "@/components/ui/button";
import type { TicketPaginationProps } from "./ticket-pagination.types";

/**
 * Plain Prev/Next -- no page-number buttons. With DEFAULT_LIMIT=20/page
 * and a portfolio-scale demo dataset, a numbered page strip would be
 * more chrome than it's worth; revisit if a real deployment's ticket
 * volume ever makes jumping more than one page at a time matter.
 */
export function TicketPagination({ page, totalPages, total, onPageChange }: TicketPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Ticket list pagination"
      className="flex items-center justify-between border-t border-border pt-4"
    >
      <p className="text-sm text-text-secondary">
        Page {page} of {totalPages} &middot; {total} ticket{total === 1 ? "" : "s"}
      </p>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </nav>
  );
}
