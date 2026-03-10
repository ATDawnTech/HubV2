import { Table as AntdTable, TableProps } from 'antd';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface DataTableProps<T> extends TableProps<T> {
  pageSize?: number;
  orangeHeader?: boolean;
}

const DataTable = <T extends object>({
  pageSize = 25,
  pagination,
  orangeHeader,
  className,
  ...props
}: DataTableProps<T>) => {
  return (
    <div className="w-full border rounded-xl bg-white dark:bg-gray-900 border-slate-200 dark:border-slate-800 overflow-hidden">
      <AntdTable
        {...props}
        className={cn(
          "w-full custom-antd-table",
          orangeHeader && "orange-header",
          className
        )}
        scroll={props.scroll ?? { x: 'max-content' }}
        pagination={
          pagination !== false
            ? {
              pageSize,
              showTotal: (total, range) =>
                `Showing ${range[1] - range[0] + 1} of ${total} results`,
              showSizeChanger: false,
              itemRender: (page, type, originalElement) => {
                if (type === 'prev') {
                  return (
                    <Button variant="outline" className="h-8 px-3">
                      Previous
                    </Button>
                  );
                }
                if (type === 'next') {
                  return (
                    <Button variant="outline" className="h-8 px-3">
                      Next
                    </Button>
                  );
                }
                if (type === 'page') {
                  return null;
                }
                return originalElement;
              },
              className: 'custom-ant-pagination',
              ...pagination,
            }
            : false
        }
      />
    </div>
  );
};

export default DataTable;
