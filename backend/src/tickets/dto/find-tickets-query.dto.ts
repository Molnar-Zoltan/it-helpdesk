import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  DEFAULT_SORT_ORDER,
  DEFAULT_TICKET_SORT_BY,
  MAX_LIMIT,
  SORT_ORDERS,
  TICKET_SORTABLE_FIELDS,
} from '@helpdesk/shared';
import type { SortOrder, TicketSortableField } from '@helpdesk/shared';

export class FindTicketsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = DEFAULT_PAGE;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_LIMIT)
  limit: number = DEFAULT_LIMIT;

  @IsOptional()
  @IsIn(TICKET_SORTABLE_FIELDS)
  sortBy: TicketSortableField = DEFAULT_TICKET_SORT_BY;

  @IsOptional()
  @IsIn(SORT_ORDERS)
  sortOrder: SortOrder = DEFAULT_SORT_ORDER;
}
