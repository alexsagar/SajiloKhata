import React from "react";

export interface DataTableColumn<T> {
  key: keyof T;
  label: string;
  render?: (value: any, row: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  rowKey: (row: T) => string | number;
  loading?: boolean;
  emptyMessage?: string;
}

function DataTable<T>({
  data,
  columns,
  rowKey,
  loading = false,
  emptyMessage = "No data available.",
}: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border">
        <thead>
          <tr>
            {columns.map(col => (
              <th key={String(col.key)} className="px-4 py-2 border-b bg-gray-100 text-left">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-4">Loading...</td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-4">{emptyMessage}</td>
            </tr>
          ) : (
            data.map(row => (
              <tr key={rowKey(row)} className="hover:bg-gray-50">
                {columns.map(col => (
                  <td key={String(col.key)} className="px-4 py-2 border-b">
                    {col.render ? col.render(row[col.key], row) : String(row[col.key])}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;