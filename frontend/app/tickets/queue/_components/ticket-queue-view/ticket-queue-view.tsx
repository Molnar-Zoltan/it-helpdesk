"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  DEFAULT_SORT_ORDER,
  DEFAULT_TICKET_SORT_BY,
  SORT_ORDERS,
  TICKET_SORTABLE_FIELDS,
  type SortOrder,
  type TicketPriority,
  type TicketSortableField,
  type TicketStatus,
} from "@helpdesk/shared";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Alert } from "@/components/ui/alert";
import { useProfile } from "@/lib/queries/use-profile";
import { useTicketQueue } from "@/lib/queries/use-ticket-queue";
import { TICKET_QUEUE_TEXT } from "@/lib/constants/text/tickets.text";
import { TicketRow } from "@/app/tickets/_components/ticket-row";
import { TicketPagination } from "@/app/tickets/_components/ticket-pagination";
import { TicketSortControls } from "@/app/tickets/_components/ticket-sort-controls";
import { TicketQueueFilters } from "../ticket-queue-filters";

const SORTABLE_FIELD_SET = new Set<string>(TICKET_SORTABLE_FIELDS);
const SORT_ORDER_SET = new Set<string>(SORT_ORDERS);
const STATUS_VALUES = new Set(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]);
const PRIORITY_VALUES = new Set(["LOW", "MEDIUM", "HIGH", "URGENT"]);
const ASSIGNED_TO_VALUES = new Set(["me", "unassigned"]);

/** Same URL-driven pattern as TicketListView's readQueryParams, extended
 * with the three queue-only filters — an unrecognized or missing value
 * for any of them just means "no filter", same as the backend treats an
 * omitted query param. */
function readQueryParams(searchParams: URLSearchParams) {
  const rawPage = Number(searchParams.get("page"));
  const page =
    Number.isInteger(rawPage) && rawPage > 0 ? rawPage : DEFAULT_PAGE;

  const rawSortBy = searchParams.get("sortBy");
  const sortBy: TicketSortableField = SORTABLE_FIELD_SET.has(rawSortBy ?? "")
    ? (rawSortBy as TicketSortableField)
    : DEFAULT_TICKET_SORT_BY;

  const rawSortOrder = searchParams.get("sortOrder");
  const sortOrder: SortOrder = SORT_ORDER_SET.has(rawSortOrder ?? "")
    ? (rawSortOrder as SortOrder)
    : DEFAULT_SORT_ORDER;

  const rawStatus = searchParams.get("status");
  const status: TicketStatus | undefined = STATUS_VALUES.has(rawStatus ?? "")
    ? (rawStatus as TicketStatus)
    : undefined;

  const rawPriority = searchParams.get("priority");
  const priority: TicketPriority | undefined = PRIORITY_VALUES.has(
    rawPriority ?? "",
  )
    ? (rawPriority as TicketPriority)
    : undefined;

  const rawAssignedTo = searchParams.get("assignedTo");
  const assignedTo: string | undefined = ASSIGNED_TO_VALUES.has(
    rawAssignedTo ?? "",
  )
    ? rawAssignedTo!
    : undefined;

  return { page, sortBy, sortOrder, status, priority, assignedTo };
}

export function TicketQueueView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: profile, isLoading: isProfileLoading } = useProfile();
  const { page, sortBy, sortOrder, status, priority, assignedTo } =
    readQueryParams(searchParams);
  const limit = DEFAULT_LIMIT;

  const updateParams = (
    updates: Record<string, string | undefined>,
    resetPage = false,
  ) => {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }
    if (resetPage) params.set("page", String(DEFAULT_PAGE));
    router.replace(`/tickets/queue?${params.toString()}`, { scroll: false });
  };

  // Plain client-side check against the already-loaded profile query --
  // no JWT decoding in proxy.ts (which is presence-only by design, see
  // architecture.md's "UX redirect only, not the real authorization
  // boundary") and no wasted request: the backend's RolesGuard would 403
  // a CUSTOMER regardless, but there's no reason to fire that request
  // when the profile already answers the question.
  const canViewQueue = profile?.role === "AGENT" || profile?.role === "ADMIN";

  const queueQuery = useTicketQueue(
    { page, limit, sortBy, sortOrder, status, priority, assignedTo },
    { enabled: canViewQueue },
  );

  if (isProfileLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label={TICKET_QUEUE_TEXT.LOADING} />
      </div>
    );
  }

  if (!canViewQueue) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-text-secondary">{TICKET_QUEUE_TEXT.NOT_AVAILABLE}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-text">
          {TICKET_QUEUE_TEXT.HEADING}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          {TICKET_QUEUE_TEXT.SUBHEADING}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <TicketQueueFilters
          status={status}
          priority={priority}
          assignedTo={assignedTo}
          onStatusChange={(next) => updateParams({ status: next }, true)}
          onPriorityChange={(next) => updateParams({ priority: next }, true)}
          onAssignedToChange={(next) =>
            updateParams({ assignedTo: next }, true)
          }
        />

        <TicketSortControls
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortByChange={(nextSortBy) =>
            updateParams({ sortBy: nextSortBy }, true)
          }
          onSortOrderChange={(nextSortOrder) =>
            updateParams({ sortOrder: nextSortOrder }, true)
          }
        />
      </div>

      <Card>
        {queueQuery.isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner label={TICKET_QUEUE_TEXT.LOADING} />
          </div>
        ) : queueQuery.isError ? (
          <Alert tone="danger">{queueQuery.error.message}</Alert>
        ) : !queueQuery.data ? null : queueQuery.data.data.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-text-secondary">
              {TICKET_QUEUE_TEXT.NO_RESULTS}
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-col">
              {queueQuery.data.data.map((ticket) => (
                <TicketRow
                  key={ticket.id}
                  ticket={ticket}
                  currentUserId={profile.id}
                />
              ))}
            </div>

            <TicketPagination
              page={queueQuery.data.page}
              totalPages={queueQuery.data.totalPages}
              total={queueQuery.data.total}
              onPageChange={(nextPage) =>
                updateParams({ page: String(nextPage) })
              }
            />
          </>
        )}
      </Card>
    </div>
  );
}
