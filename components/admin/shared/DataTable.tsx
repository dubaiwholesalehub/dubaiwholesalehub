import type {
  ReactNode,
} from "react";

import { cn } from "@/lib/utils";

export interface DataTableColumn<
  T,
> {
  key: string;
  header: ReactNode;

  render: (
    row: T,
    rowIndex: number,
  ) => ReactNode;

  align?: "left" | "center" | "right";

  headerClassName?: string;
  cellClassName?: string;

  width?: string;
}

interface DataTableProps<T> {
  rows: T[];
  columns: DataTableColumn<T>[];

  getRowKey: (
    row: T,
    rowIndex: number,
  ) => string;

  emptyState?: ReactNode;

  minimumWidth?: string;

  className?: string;

  tableClassName?: string;

  rowClassName?:
    | string
    | ((
        row: T,
        rowIndex: number,
      ) => string | undefined);

  onRowClick?: (
    row: T,
    rowIndex: number,
  ) => void;
}

export default function DataTable<T>({
  rows,
  columns,
  getRowKey,
  emptyState,
  minimumWidth = "900px",
  className,
  tableClassName,
  rowClassName,
  onRowClick,
}: DataTableProps<T>) {
  const hasClickableRows =
    typeof onRowClick === "function";

  function getRowClassName(
    row: T,
    rowIndex: number,
  ): string | undefined {
    if (typeof rowClassName === "function") {
      return rowClassName(
        row,
        rowIndex,
      );
    }

    return rowClassName;
  }

  if (rows.length === 0) {
    return (
      <div className={className}>
        {emptyState ?? (
          <div className="flex min-h-48 items-center justify-center px-6 py-12 text-center text-sm text-muted-foreground">
            No records found.
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-x-auto",
        className,
      )}
    >
      <table
        className={cn(
          "w-full border-collapse text-left",
          tableClassName,
        )}
        style={{
          minWidth: minimumWidth,
        }}
      >
        <thead className="border-b bg-muted/40">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  "whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                  getAlignmentClass(
                    column.align,
                  ),
                  column.headerClassName,
                )}
                style={{
                  width: column.width,
                }}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y">
          {rows.map((row, rowIndex) => {
            const key = getRowKey(
              row,
              rowIndex,
            );

            const customRowClass =
              getRowClassName(
                row,
                rowIndex,
              );

            return (
              <tr
                key={key}
                tabIndex={
                  hasClickableRows
                    ? 0
                    : undefined
                }
                role={
                  hasClickableRows
                    ? "button"
                    : undefined
                }
                onClick={
                  hasClickableRows
                    ? () =>
                        onRowClick(
                          row,
                          rowIndex,
                        )
                    : undefined
                }
                onKeyDown={
                  hasClickableRows
                    ? (event) => {
                        if (
                          event.key ===
                            "Enter" ||
                          event.key === " "
                        ) {
                          event.preventDefault();

                          onRowClick(
                            row,
                            rowIndex,
                          );
                        }
                      }
                    : undefined
                }
                className={cn(
                  "transition-colors hover:bg-muted/40",
                  hasClickableRows &&
                    "cursor-pointer focus:bg-muted/40 focus:outline-none",
                  customRowClass,
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      "px-4 py-4 text-sm text-foreground",
                      getAlignmentClass(
                        column.align,
                      ),
                      column.cellClassName,
                    )}
                  >
                    {column.render(
                      row,
                      rowIndex,
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function getAlignmentClass(
  align:
    | "left"
    | "center"
    | "right"
    | undefined,
): string {
  switch (align) {
    case "center":
      return "text-center";

    case "right":
      return "text-right";

    default:
      return "text-left";
  }
}