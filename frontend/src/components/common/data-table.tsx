import React from "react";

export interface DataTableColumn<T> {
  key: keyof T;
  label: string;
  render?: (value: any, row: T) => React.ReactNode;
}

// Compatibility with admin table configs
type LegacyColumn<T> = {
  header: string;
  accessorKey: keyof T | string;
  cell?: ({ row }: any) => React.ReactNode;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Array<DataTableColumn<T> | LegacyColumn<T>>;
  rowKey?: (row: T) => string | number;
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
  const getKeyAndLabel = (col: DataTableColumn<T> | LegacyColumn<T>) => {
    if ("label" in col) {
      return { key: col.key as keyof T, label: col.label }
    }
    return { key: col.accessorKey as keyof T, label: col.header }
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border">
        <thead>
          <tr>
            {columns.map(col => {
              const { key, label } = getKeyAndLabel(col)
              return (
                <th key={String(key)} className="px-4 py-2 border-b bg-gray-100 text-left">
                  {label}
                </th>
              )
            })}
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
            data.map((row, idx) => (
              <tr key={rowKey ? rowKey(row) : idx} className="hover:bg-gray-50">
                {columns.map((col) => {
                  if ("label" in col) {
                    const c = col as DataTableColumn<T>
                    return (
                      <td key={String(c.key)} className="px-4 py-2 border-b">
                        {c.render ? c.render((row as any)[c.key], row) : String((row as any)[c.key])}
                      </td>
                    )
                  } else {
                    const c = col as LegacyColumn<T>
                    return (
                      <td key={String(c.accessorKey)} className="px-4 py-2 border-b">
                        {c.cell ? c.cell({ row: { original: row } }) : String((row as any)[c.accessorKey as any])}
                      </td>
                    )
                  }
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;