import type { ReactNode } from 'react';

export type FinanceTableSortDirection = 'ascending' | 'descending' | 'none';

export type FinanceTableColumn<Row> = {
  id: string;
  header: ReactNode;
  render: (row: Row) => ReactNode;
  align?: 'left' | 'right';
  sortDirection?: FinanceTableSortDirection;
  sortLabel?: string;
  onSort?: () => void;
};

type FinanceTableProps<Row> = {
  ariaLabel: string;
  columns: FinanceTableColumn<Row>[];
  rows: Row[];
  getRowKey: (row: Row) => string;
  emptyState?: ReactNode;
  caption?: ReactNode;
  className?: string;
};

const alignClass = (align: FinanceTableColumn<unknown>['align']) =>
  align === 'right' ? 'text-right' : 'text-left';

export const FinanceTable = <Row,>({
  ariaLabel,
  columns,
  rows,
  getRowKey,
  emptyState,
  caption,
  className = '',
}: FinanceTableProps<Row>) => (
  <div
    className={[
      'overflow-x-auto rounded-[1.5rem] border border-border/70 bg-white/85 shadow-card',
      className,
    ].join(' ')}
  >
    <table aria-label={ariaLabel} className="min-w-full border-collapse text-sm">
      {caption && (
        <caption className="px-4 py-3 text-left text-sm font-bold text-muted-foreground">
          {caption}
        </caption>
      )}
      <thead className="bg-[#FFFDF9] text-xs font-black uppercase tracking-wide text-muted-foreground">
        <tr>
          {columns.map((column) => {
            const isSortable = Boolean(column.onSort);

            return (
              <th
                aria-sort={isSortable ? column.sortDirection ?? 'none' : undefined}
                className={`border-b border-border/70 px-4 py-3 ${alignClass(column.align)}`}
                key={column.id}
                scope="col"
              >
                {isSortable ? (
                  <button
                    aria-label={column.sortLabel}
                    className="inline-flex items-center gap-1 rounded-full font-black text-inherit transition hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    onClick={column.onSort}
                    type="button"
                  >
                    {column.header}
                  </button>
                ) : (
                  column.header
                )}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody className="divide-y divide-border/60 bg-white/70 text-foreground">
        {rows.length > 0 ? (
          rows.map((row) => (
            <tr className="transition hover:bg-background/70" key={getRowKey(row)}>
              {columns.map((column) => (
                <td className={`px-4 py-3 ${alignClass(column.align)}`} key={column.id}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))
        ) : (
          <tr>
            <td
              className="px-4 py-8 text-center text-sm font-semibold text-muted-foreground"
              colSpan={columns.length}
            >
              {emptyState ?? 'No records to show.'}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);
