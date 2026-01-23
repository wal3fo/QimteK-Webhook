import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, X, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: string;
  header: string;
  accessor?: (item: T) => any; // Function to get value if key is not direct property
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  filterType?: 'text' | 'number' | 'date' | 'select';
  width?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  className?: string;
  pagination?: boolean;
  pageSize?: number;
}

type SortDirection = 'asc' | 'desc' | null;

interface SortConfig {
  key: string;
  direction: SortDirection;
}

export function DataTable<T extends { id?: string | number } & Record<string, any>>({
  columns,
  data,
  isLoading = false,
  emptyMessage = 'No data available',
  onRowClick,
  className,
  pagination = true,
  pageSize = 10,
}: DataTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<SortConfig[]>([]);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);

  // Helper to access value
  const getValue = (item: T, column: Column<T>) => {
    if (column.accessor) {
      return column.accessor(item);
    }
    return item[column.key];
  };

  // Handle sorting
  const handleSort = (key: string, multi: boolean) => {
    setSortConfig((current) => {
      const existingIndex = current.findIndex((s) => s.key === key);
      let newConfig = [...current];

      if (existingIndex > -1) {
        // Cycle: asc -> desc -> null (remove)
        const currentDir = current[existingIndex].direction;
        if (currentDir === 'asc') {
          newConfig[existingIndex].direction = 'desc';
        } else {
          newConfig.splice(existingIndex, 1);
        }
      } else {
        const newItem: SortConfig = { key, direction: 'asc' };
        if (multi) {
          newConfig.push(newItem);
        } else {
          newConfig = [newItem];
        }
      }
      return newConfig;
    });
  };

  // Handle filtering
  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
    setCurrentPage(1); // Reset to first page on filter change
  };

  const clearFilters = () => {
    setFilters({});
    setCurrentPage(1);
  };

  // Process data
  const processedData = useMemo(() => {
    let result = [...data];

    // Filter
    Object.keys(filters).forEach((key) => {
      const value = filters[key].toLowerCase();
      if (!value) return;

      const column = columns.find((c) => c.key === key);
      if (!column) return;

      result = result.filter((item) => {
        const itemValue = String(getValue(item, column) ?? '').toLowerCase();
        return itemValue.includes(value);
      });
    });

    // Sort
    if (sortConfig.length > 0) {
      result.sort((a, b) => {
        for (const sort of sortConfig) {
          const column = columns.find((c) => c.key === sort.key);
          if (!column) continue;

          const aValue = getValue(a, column);
          const bValue = getValue(b, column);

          if (aValue === bValue) continue;

          // Handle nulls/undefined
          if (aValue === null || aValue === undefined) return sort.direction === 'asc' ? 1 : -1;
          if (bValue === null || bValue === undefined) return sort.direction === 'asc' ? -1 : 1;

          const compareResult = aValue < bValue ? -1 : 1;
          return sort.direction === 'asc' ? compareResult : -compareResult;
        }
        return 0;
      });
    }

    return result;
  }, [data, filters, sortConfig, columns]);

  // Pagination
  const totalPages = Math.ceil(processedData.length / pageSize);
  const paginatedData = useMemo(() => {
    if (!pagination) return processedData;
    const start = (currentPage - 1) * pageSize;
    return processedData.slice(start, start + pageSize);
  }, [processedData, currentPage, pageSize, pagination]);

  // Generate page numbers
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <div className={cn("flex flex-col gap-4 w-full max-w-full overflow-hidden", className)}>
      {/* Table Container */}
      <div className="bg-qimtek-bg-secondary rounded-xl border border-qimtek-border overflow-hidden flex flex-col w-full shadow-sm">
        
        {/* Loading State */}
        {isLoading && (
          <div className="absolute inset-0 bg-qimtek-bg/50 backdrop-blur-sm z-10 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#82c91e]"></div>
          </div>
        )}

        <div className="overflow-x-auto w-full scrollbar-thin scrollbar-thumb-qimtek-border scrollbar-track-transparent">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-qimtek-border bg-qimtek-bg/50">
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={cn(
                      "px-6 py-4 text-xs font-semibold text-qimtek-text-secondary uppercase tracking-wider align-top group transition-colors hover:bg-qimtek-bg/80",
                      column.width && `w-[${column.width}]`,
                      column.align === 'center' && "text-center",
                      column.align === 'right' && "text-right",
                      column.sortable && "cursor-pointer select-none",
                      column.className
                    )}
                    onClick={(e) => {
                      if (column.sortable) {
                        handleSort(column.key, e.shiftKey);
                      }
                    }}
                  >
                    <div className={cn(
                      "flex items-center gap-2 mb-2",
                      column.align === 'center' && "justify-center",
                      column.align === 'right' && "justify-end"
                    )}>
                      <span>{column.header}</span>
                      {column.sortable && (
                        <div className="flex flex-col text-qimtek-text-secondary/50">
                          {(() => {
                            const sort = sortConfig.find(s => s.key === column.key);
                            if (sort?.direction === 'asc') return <ChevronUp className="w-3 h-3 text-[#82c91e]" />;
                            if (sort?.direction === 'desc') return <ChevronDown className="w-3 h-3 text-[#82c91e]" />;
                            return <ChevronsUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />;
                          })()}
                        </div>
                      )}
                    </div>
                    
                    {/* Filter Input */}
                    {column.filterable && (
                      <div className="mt-1" onClick={(e) => e.stopPropagation()}>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder={`Filter...`}
                            value={filters[column.key] || ''}
                            onChange={(e) => handleFilterChange(column.key, e.target.value)}
                            className="w-full px-2 py-1 text-xs bg-qimtek-bg border border-qimtek-border rounded text-qimtek-text placeholder:text-qimtek-text-secondary/50 focus:outline-none focus:border-[#82c91e] transition-colors"
                          />
                          {filters[column.key] && (
                            <button
                              onClick={() => handleFilterChange(column.key, '')}
                              className="absolute right-1 top-1/2 -translate-y-1/2 text-qimtek-text-secondary hover:text-qimtek-text"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-qimtek-border">
              {paginatedData.length > 0 ? (
                paginatedData.map((item, index) => (
                  <tr
                    key={item.id || index}
                    onClick={() => onRowClick?.(item)}
                    className={cn(
                      "group hover:bg-qimtek-bg transition-colors",
                      onRowClick && "cursor-pointer"
                    )}
                  >
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={cn(
                          "px-6 py-4 whitespace-nowrap text-sm text-qimtek-text-secondary",
                          column.align === 'center' && "text-center",
                          column.align === 'right' && "text-right"
                        )}
                      >
                        {column.render ? column.render(item) : getValue(item, column)}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-6 py-12 text-center text-qimtek-text-secondary"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Filter className="w-8 h-8 opacity-20" />
                      <p>{emptyMessage}</p>
                      {Object.keys(filters).length > 0 && (
                        <button
                          onClick={clearFilters}
                          className="text-xs text-[#82c91e] hover:underline mt-2"
                        >
                          Clear all filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {pagination && totalPages > 1 && (
          <div className="border-t border-qimtek-border p-4 flex items-center justify-between bg-qimtek-bg/30">
            <div className="text-xs text-qimtek-text-secondary">
              Showing <span className="font-medium text-qimtek-text">{(currentPage - 1) * pageSize + 1}</span> to <span className="font-medium text-qimtek-text">{Math.min(currentPage * pageSize, processedData.length)}</span> of <span className="font-medium text-qimtek-text">{processedData.length}</span> results
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded-md hover:bg-qimtek-bg border border-transparent hover:border-qimtek-border text-qimtek-text-secondary disabled:opacity-50 disabled:pointer-events-none transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              {getPageNumbers().map((page, i) => (
                typeof page === 'number' ? (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(page)}
                    className={cn(
                      "w-8 h-8 flex items-center justify-center rounded-md text-xs font-medium transition-all",
                      currentPage === page
                        ? "bg-[#82c91e] text-black shadow-sm"
                        : "text-qimtek-text-secondary hover:bg-qimtek-bg hover:text-qimtek-text border border-transparent hover:border-qimtek-border"
                    )}
                  >
                    {page}
                  </button>
                ) : (
                  <span key={i} className="px-2 text-qimtek-text-secondary">...</span>
                )
              ))}

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded-md hover:bg-qimtek-bg border border-transparent hover:border-qimtek-border text-qimtek-text-secondary disabled:opacity-50 disabled:pointer-events-none transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
