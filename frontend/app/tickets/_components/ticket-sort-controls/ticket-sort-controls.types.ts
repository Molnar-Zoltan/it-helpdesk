import type { SortOrder, TicketSortableField } from "@helpdesk/shared";

export interface TicketSortControlsProps {
  sortBy: TicketSortableField;
  sortOrder: SortOrder;
  onSortByChange: (sortBy: TicketSortableField) => void;
  onSortOrderChange: (sortOrder: SortOrder) => void;
}
