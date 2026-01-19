import { Column, Row, Table as ReactTable, flexRender } from '@tanstack/react-table';
import { CSSProperties } from 'react';
import { Loading } from '@sealos/shadcn-ui/loading';
import { cn } from '@sealos/shadcn-ui';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell
} from '@sealos/shadcn-ui/table';

const getCommonPinningStyles = <T,>(column: Column<T, unknown>): CSSProperties => {
  const isPinned = column.getIsPinned();

  return {
    position: isPinned ? 'sticky' : 'relative',
    left: isPinned === 'left' ? 0 : undefined,
    right: isPinned === 'right' ? 0 : undefined,
    zIndex: isPinned ? 10 : 0
  };
};

export function BaseTable<T extends unknown>({
  table,
  isLoading,
  isHeaderFixed = false,
  className,
  rowClassName,
  ...props
}: {
  table: ReactTable<T>;
  isLoading: boolean;
  isHeaderFixed?: boolean;
  className?: string;
  rowClassName?: (row: Row<T>, rowIndex: number) => string;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('relative w-full h-full overflow-auto scrollbar-default', className)}
      {...props}
    >
      <Table>
        <TableHeader className={cn('z-10', isHeaderFixed && 'sticky top-0')}>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="bg-zinc-50 hover:bg-zinc-50">
              {headerGroup.headers.map((header, i) => (
                <TableHead
                  key={header.id}
                  className={cn(
                    'h-10 text-sm font-normal text-zinc-500 px-4 py-2 border-none',
                    i === 0 && 'rounded-l-lg',
                    i === headerGroup.headers.length - 1 && 'rounded-r-lg'
                  )}
                  style={getCommonPinningStyles(header.column)}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={table.getAllColumns().length}
                className="h-[300px] text-center py-4"
              >
                <div className="flex items-center justify-center">
                  <Loading />
                </div>
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row, rowIndex) => (
              <TableRow
                key={row.id}
                className={cn('text-sm !border-b border-zinc-100', rowClassName?.(row, rowIndex))}
              >
                {row.getVisibleCells().map((cell) => {
                  const isPinned = cell.column.getIsPinned();
                  return (
                    <TableCell
                      key={cell.id}
                      className="px-4 py-2 text-zinc-900"
                      style={{
                        ...getCommonPinningStyles(cell.column),
                        backgroundColor: isPinned ? 'inherit' : undefined
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
