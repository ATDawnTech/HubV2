import { useGetAuditLogs } from '@/services/AuditLog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Skeleton } from '../ui/skeleton';
import { getUserById } from '@/services/getUserById';
import { useState, useEffect } from 'react';
import { diffObjects } from '@/utils/diffObject';
import { supabase } from '@/integrations/supabase/client';

const ACTIONS = {
  CREATE: 'Created',
  UPDATE: 'Updated',
};

const TEXTS = {
  category: 'Category',
  model: 'Model',
  procurement_date: 'Procurement Date',
  vendor: 'Vendor',
  warranty_start_date: 'Warranty Start Date',
  warranty_end_date: 'Warranty End Date',
  assigned_to: 'Assigned To',
  asset_tag: 'Asset ID',
  location: 'Location',
  status: 'Status',
  notes: 'Notes',
  attachments: 'Attachments',
};

interface AuditLogWithAsset {
  action: string;
  old_value?: string;
  new_value: string;
  record_updated_at: string;
  id: string;
}

function CategoryValue({ id }: { id: string }) {
  const [name, setName] = useState('Loading...');

  useEffect(() => {
    const fetchCategory = async () => {
      if (!id) {
        setName('-');
        return;
      }
      const { data } = await supabase
        .from('asset_categories')
        .select('name')
        .eq('id', id)
        .single();
      setName(data?.name || 'Unknown');
    };

    fetchCategory();
  }, [id]);

  return <div>{name}</div>;
}

function CategoryDiff({ oldId, newId }: { oldId: string; newId: string }) {
  return (
    <div className="flex items-center gap-2">
      <Label>{TEXTS.category}: </Label>
      <div className="flex gap-4">
        <CategoryValue id={oldId} />
        <div>→</div>
        <CategoryValue id={newId} />
      </div>
    </div>
  );
}

type DiffResult = Record<string, { obj1: any; obj2: any }>;

function HistoryRow({ log }: { log: AuditLogWithAsset }) {
  const newValue = JSON.parse(log.new_value);
  const diffValue: DiffResult = diffObjects(
    log.old_value ? JSON.parse(log.old_value) : {},
    JSON.parse(log.new_value),
  );
  return (
    <TableRow key={log.id}>
      <TableCell>{ACTIONS[log.action as keyof typeof ACTIONS]}</TableCell>
      <TableCell>
        {log.action === 'CREATE' ? (
          <div>
            {Object.entries(newValue).map(([key, value], index) => {
              if (key === 'category') {
                return (
                  <div key={index} className="flex items-center gap-2">
                    <Label>{TEXTS[key as keyof typeof TEXTS]}: </Label>
                    <div className="flex gap-4">
                      <CategoryValue id={value as string} />
                    </div>
                  </div>
                );
              }
              return (
                <div key={index} className="flex items-center gap-2">
                  <Label>{TEXTS[key as keyof typeof TEXTS]}: </Label>
                  <div className="flex gap-4">
                    <div>{value as React.ReactNode}</div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className='flex flex-col gap-4'>
            {Object.entries(diffValue).map(([key, value], index) => {
              const obj1 = (value as { obj1: any; obj2: any }).obj1;
              const obj2 = (value as { obj1: any; obj2: any }).obj2;
              if (
                key === 'attachments' &&
                JSON.stringify(obj1) === '[]' &&
                JSON.stringify(obj2) === '[]'
              )
                return null;

              if (key === 'category') {
                return <CategoryDiff key={index} oldId={obj1} newId={obj2} />;
              }
              if (key === 'assigned_to') {
                const [oldUserName, setOldUserName] = useState('Loading...');
                const [newUserName, setNewUserName] = useState('Loading...');

                useEffect(() => {
                  let isMounted = true;

                  if (!obj1) {
                    setOldUserName('Unassigned');
                  } else {
                    getUserById(obj1)
                      .then((user) => {
                        if (isMounted) setOldUserName(user ? user.full_name : 'Unassigned');
                      })
                      .catch(() => {
                        if (isMounted) setOldUserName('Error fetching user');
                      });
                  }

                  if (!obj2) {
                    setNewUserName('Unassigned');
                  } else {
                    getUserById(obj2)
                      .then((user) => {
                        if (isMounted) setNewUserName(user ? user.full_name : 'Unassigned');
                      })
                      .catch(() => {
                        if (isMounted) setNewUserName('Error fetching user');
                      });
                  }

                  return () => {
                    isMounted = false;
                  };
                }, [obj1, obj2]);
                return (
                  <div key={index} className='flex items-center gap-2'>
                    <Label>{TEXTS[key as keyof typeof TEXTS]}: </Label>
                    <div className='flex gap-4'>
                      <div>{oldUserName}</div>
                      <div>→</div>
                      <div>{newUserName}</div>
                    </div>
                  </div>
                );
              }
              return (
                <div key={index} className='flex items-center gap-2'>
                  <Label>{TEXTS[key as keyof typeof TEXTS]}: </Label>
                  <div className='flex gap-4'>
                    <div>{obj1}</div>
                    <div>→</div>
                    <div>{obj2}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </TableCell>
      <TableCell>{new Date(log.record_updated_at).toLocaleString()}</TableCell>
    </TableRow>
  );
}

export function AssetChangeHistory({
  id,
  open,
  onOpenChange,
}: {
  id: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const { data, isFetching } = useGetAuditLogs({
    query: {
      table_name: 'assets',
      record_id: id,
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-[80vw] overflow-auto max-h-[80vh]'>
        <DialogHeader>
          <DialogTitle>Asset History</DialogTitle>
        </DialogHeader>
        {isFetching ? (
          <Skeleton />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Change</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.map((log) => (
                <HistoryRow key={log.id} log={log as unknown as AuditLogWithAsset} />
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
