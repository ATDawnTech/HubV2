import React, { useRef, useState, useCallback } from 'react';
import { Upload, X, FileText, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { SupaApi } from '@/lib/supa';

interface FileUploadProps {
  onUpload: (path: string, file: File) => void;
  accept?: string;
  maxSize?: number; // in MB
  bucketId: string;
  folder?: string;
  children?: React.ReactNode;
  className?: string;
}

export function FileUpload({
  onUpload,
  accept = '*/*',
  maxSize = 10,
  bucketId,
  folder,
  children,
  className = '',
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = useCallback(async (file: File) => {
    if (file.size > maxSize * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: `File size must be less than ${maxSize}MB`,
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    setFileName(file.name);

    try {
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => setPreview(reader.result as string);
        reader.readAsDataURL(file);
      }

      // Generate unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = folder ? `${folder}/${fileName}` : fileName;

      // Upload to Supabase Storage
      const { error } = await SupaApi.client.storage
        .from(bucketId)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      onUpload(filePath, file);
      
      toast({
        title: 'Upload successful',
        description: 'File has been uploaded successfully',
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload file',
        variant: 'destructive',
      });
      setPreview(null);
      setFileName(null);
    } finally {
      setUploading(false);
    }
  }, [maxSize, bucketId, folder, onUpload, toast]);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const clearFile = () => {
    setPreview(null);
    setFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
        }}
        className="hidden"
      />
      
      {children ? (
        <div onClick={handleClick} className="cursor-pointer">
          {children}
        </div>
      ) : (
        <div
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
        >
          {preview && accept.includes('image') ? (
            <div className="relative">
              <img
                src={preview}
                alt="Preview"
                className="max-w-full max-h-48 mx-auto rounded"
              />
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                onClick={(e) => {
                  e.stopPropagation();
                  clearFile();
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : fileName ? (
            <div className="flex items-center justify-center gap-2">
              <FileText className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{fileName}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  clearFile();
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {accept.includes('image') ? (
                <Image className="h-8 w-8 mx-auto text-muted-foreground" />
              ) : (
                <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
              )}
              <p className="text-sm text-muted-foreground">
                {uploading ? 'Uploading...' : 'Click or drag file to upload'}
              </p>
              <p className="text-xs text-muted-foreground">
                Max size: {maxSize}MB
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}