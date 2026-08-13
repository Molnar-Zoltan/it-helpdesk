import { Select } from "@/components/ui/select";
import {
  TICKET_QUEUE_FILTERS_TEXT,
  TICKET_STATUS_LABELS,
  TICKET_PRIORITY_LABELS,
} from "@/lib/constants/text/tickets.text";
import type { TicketQueueFiltersProps } from "./ticket-queue-filters.types";

/**
 * Three independent Selects, each with an "All"/"Everyone" option
 * represented by the empty string — mirrors how TicketQueueView's
 * readQueryParams treats a missing/unrecognized query param as "no
 * filter" rather than needing a separate sentinel value to track.
 */
export function TicketQueueFilters({
  status,
  priority,
  assignedTo,
  onStatusChange,
  onPriorityChange,
  onAssignedToChange,
}: TicketQueueFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        aria-label={TICKET_QUEUE_FILTERS_TEXT.STATUS_LABEL}
        value={status ?? ""}
        onChange={(event) =>
          onStatusChange((event.target.value || undefined) as typeof status)
        }
        className="w-auto"
      >
        <option value="">{TICKET_QUEUE_FILTERS_TEXT.ALL_STATUSES}</option>
        {Object.entries(TICKET_STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>

      <Select
        aria-label={TICKET_QUEUE_FILTERS_TEXT.PRIORITY_LABEL}
        value={priority ?? ""}
        onChange={(event) =>
          onPriorityChange((event.target.value || undefined) as typeof priority)
        }
        className="w-auto"
      >
        <option value="">{TICKET_QUEUE_FILTERS_TEXT.ALL_PRIORITIES}</option>
        {Object.entries(TICKET_PRIORITY_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>

      <Select
        aria-label={TICKET_QUEUE_FILTERS_TEXT.ASSIGNED_TO_LABEL}
        value={assignedTo ?? ""}
        onChange={(event) =>
          onAssignedToChange(event.target.value || undefined)
        }
        className="w-auto"
      >
        <option value="">{TICKET_QUEUE_FILTERS_TEXT.ALL_ASSIGNEES}</option>
        <option value="me">{TICKET_QUEUE_FILTERS_TEXT.ME}</option>
        <option value="unassigned">
          {TICKET_QUEUE_FILTERS_TEXT.UNASSIGNED}
        </option>
      </Select>
    </div>
  );
}
