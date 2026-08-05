import { TICKET_SORTABLE_FIELDS } from "@helpdesk/shared";
import { Select } from "@/components/ui/select";
import type { TicketSortControlsProps } from "./ticket-sort-controls.types";

const SORT_FIELD_LABELS: Record<(typeof TICKET_SORTABLE_FIELDS)[number], string> = {
  createdAt: "Created",
  updatedAt: "Updated",
  priority: "Priority",
  status: "Status",
};

export function TicketSortControls({
  sortBy,
  sortOrder,
  onSortByChange,
  onSortOrderChange,
}: TicketSortControlsProps) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="ticket-sort-by" className="text-sm text-text-secondary">
        Sort
      </label>
      <Select
        id="ticket-sort-by"
        value={sortBy}
        onChange={(event) => onSortByChange(event.target.value as typeof sortBy)}
        className="w-auto"
      >
        {TICKET_SORTABLE_FIELDS.map((field) => (
          <option key={field} value={field}>
            {SORT_FIELD_LABELS[field]}
          </option>
        ))}
      </Select>

      <button
        type="button"
        aria-label={sortOrder === "asc" ? "Sort ascending" : "Sort descending"}
        onClick={() => onSortOrderChange(sortOrder === "asc" ? "desc" : "asc")}
        className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-text transition-colors hover:border-text-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-secondary"
      >
        <span aria-hidden="true">{sortOrder === "asc" ? "↑" : "↓"}</span>
        {sortOrder === "asc" ? "Asc" : "Desc"}
      </button>
    </div>
  );
}
