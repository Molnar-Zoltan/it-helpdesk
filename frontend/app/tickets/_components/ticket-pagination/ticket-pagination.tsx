import { Button } from "@/components/ui/button";
import { TICKET_PAGINATION_TEXT } from "@/lib/constants/text/tickets.text";
import type { TicketPaginationProps } from "./ticket-pagination.types";

/**
 * Plain Prev/Next -- no page-number buttons. With DEFAULT_LIMIT=10/page
 * and a portfolio-scale demo dataset, a numbered page strip would be
 * more chrome than it's worth; revisit if a real deployment's ticket
 * volume ever makes jumping more than one page at a time matter.
 */
export function TicketPagination({ page, totalPages, total, onPageChange }: TicketPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label={TICKET_PAGINATION_TEXT.ARIA_LABEL}
      className="flex items-center justify-between border-t border-border pt-4"
    >
      <p className="text-sm text-text-secondary">
        {TICKET_PAGINATION_TEXT.summary(page, totalPages, total)}
      </p>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          {TICKET_PAGINATION_TEXT.PREVIOUS}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          {TICKET_PAGINATION_TEXT.NEXT}
        </Button>
      </div>
    </nav>
  );
}
