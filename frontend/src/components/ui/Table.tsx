import * as React from "react";
import { cn } from "../../lib/cn";

export interface ColumnDef<T> {
  header: React.ReactNode;
  accessorKey?: keyof T;
  cell?: (item: T) => React.ReactNode;
  className?: string;
}

export interface TableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  className?: string;
  pagination?: {
    currentPage: number;
    totalPages: number;
    onNext?: (() => void) | undefined;
    onPrevious?: (() => void) | undefined;
    showingText?: React.ReactNode | undefined;
  };
}

export function Table<T>({ data, columns, className, pagination }: TableProps<T>) {
  return (
    <div
      className={cn(
        "bg-white dark:bg-gray-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm",
        className
      )}
    >
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={cn(
                    "px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap",
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
              >
                {columns.map((col, colIndex) => (
                  <td key={colIndex} className="px-6 py-4 whitespace-nowrap">
                    {col.cell
                      ? col.cell(row)
                      : col.accessorKey
                      ? String(row[col.accessorKey] ?? "")
                      : null}
                  </td>
                ))}
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-8 text-center text-sm text-slate-500 dark:text-slate-400"
                >
                  No data available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="text-sm text-slate-500">
            {pagination.showingText ||
              `Page ${pagination.currentPage} of ${pagination.totalPages}`}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={pagination.onPrevious}
              disabled={pagination.currentPage <= 1 || !pagination.onPrevious}
              className="px-3 py-1 border border-slate-200 dark:border-slate-700 rounded text-sm hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:pointer-events-none transition-colors text-slate-700 dark:text-slate-300"
            >
              Previous
            </button>
            <button
              onClick={pagination.onNext}
              disabled={
                pagination.currentPage >= pagination.totalPages ||
                !pagination.onNext
              }
              className="px-3 py-1 border border-slate-200 dark:border-slate-700 rounded text-sm hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:pointer-events-none transition-colors text-slate-700 dark:text-slate-300"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
