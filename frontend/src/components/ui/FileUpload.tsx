import React from 'react';
import { Upload, message } from 'antd';
import { UploadCloud, X, Download } from 'lucide-react';
import type { UploadProps } from 'antd';
import { Label } from './label';
import { Button } from './button';

interface FileUploadProps {
  label?: string;
  optional?: boolean;
  maxSizeMB?: number;
  value?: File | null;
  onChange?: (file: File | null) => void;
  existingUrl?: string;
  onRemoveExisting?: () => void;
  onDownload?: () => void;
}

const FileUpload: React.FC<FileUploadProps> = ({
  label = 'Upload File',
  optional = true,
  maxSizeMB = 10,
  value,
  onChange,
  existingUrl,
  onRemoveExisting,
  onDownload,
}) => {
  const props: UploadProps = {
    name: 'file',
    multiple: false,
    beforeUpload(file) {
      const isLtMaxSize = file.size / 1024 / 1024 < maxSizeMB;
      if (!isLtMaxSize) {
        message.error(`File must be smaller than ${maxSizeMB}MB!`);
        return Upload.LIST_IGNORE;
      }

      if (onChange) {
        onChange(file as any);
      }
      return false; // Prevent automatic upload
    },
    showUploadList: false,
  };

  const removeFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onChange) {
      onChange(null);
    }
  };

  const removeExisting = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRemoveExisting) {
      onRemoveExisting();
    }
  };

  const getFileNameFromUrl = (url: string) => {
    const parts = url.split('/');
    const fullName = parts[parts.length - 1];
    // S3 keys might be uuid-filename.ext
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i;
    return fullName.replace(uuidRegex, '');
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {label} {optional && <span className="text-muted-foreground font-normal">(Optional)</span>}
      </Label>

      {value ? (
        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-md shadow-sm shrink-0">
              <UploadCloud className="h-4 w-4 text-primary" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                {value.name}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {(value.size / 1024).toFixed(0)} KB
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
            onClick={removeFile}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : existingUrl ? (
        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg">
          <div
            className="flex items-center gap-3 overflow-hidden cursor-pointer group"
            onClick={() => onDownload?.()}
          >
            <div className="p-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-md shadow-sm shrink-0 group-hover:text-primary transition-colors">
              <UploadCloud className="h-4 w-4 text-primary" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate group-hover:text-primary transition-colors">
                {getFileNameFromUrl(existingUrl)}
              </p>
              <p className="text-xs text-blue-500 dark:text-blue-400">Click to download</p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
            onClick={removeExisting}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Upload.Dragger
          {...props}
          className="bg-slate-50/50 dark:bg-slate-900/20 border-1 border-slate-200 dark:border-slate-800 rounded-lg hover:border-primary/50 transition-colors"
        >
          <div className="flex flex-col items-center justify-center gap-1 py-2">
            <div className="p-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-full shadow-sm mb-1">
              <UploadCloud className="text-slate-400 dark:text-slate-500" />
            </div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Click to upload CV or documents
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-normal">
              PDF, DOC up to {maxSizeMB}MB
            </p>
          </div>
        </Upload.Dragger>
      )}
    </div>
  );
};

export default FileUpload;
