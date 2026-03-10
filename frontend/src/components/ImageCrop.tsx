import React, { useState, useCallback, useRef } from 'react';
import ReactCrop, { Crop, centerCrop, makeAspectCrop } from 'react-image-crop';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import 'react-image-crop/dist/ReactCrop.css';

interface ImageCropProps {
  src: string;
  onCrop: (croppedImageBlob: Blob) => void;
  onCancel: () => void;
  isOpen: boolean;
  aspectRatio?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export function ImageCrop({
  src,
  onCrop,
  onCancel,
  isOpen,
  aspectRatio = 1,
  maxWidth = 512,
  maxHeight = 512,
}: ImageCropProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop>();
  const imgRef = useRef<HTMLImageElement>(null);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const centerAspectCrop = centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 90,
        },
        aspectRatio,
        width,
        height
      ),
      width,
      height
    );
    setCrop(centerAspectCrop);
  }, [aspectRatio]);

  const getCroppedImg = useCallback(() => {
    if (!completedCrop || !imgRef.current) return;

    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    const pixelCrop = {
      x: completedCrop.x * scaleX,
      y: completedCrop.y * scaleY,
      width: completedCrop.width * scaleX,
      height: completedCrop.height * scaleY,
    };

    // Calculate canvas size maintaining aspect ratio
    let { width, height } = pixelCrop;
    if (width > maxWidth) {
      height = (height * maxWidth) / width;
      width = maxWidth;
    }
    if (height > maxHeight) {
      width = (width * maxHeight) / height;
      height = maxHeight;
    }

    canvas.width = width;
    canvas.height = height;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      width,
      height
    );

    canvas.toBlob((blob) => {
      if (blob) {
        onCrop(blob);
      }
    }, 'image/jpeg', 0.8);
  }, [completedCrop, maxWidth, maxHeight, onCrop]);

  return (
    <Dialog open={isOpen} onOpenChange={() => onCancel()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Crop Image</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex justify-center">
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspectRatio}
              minWidth={50}
              minHeight={50}
            >
              <img
                ref={imgRef}
                src={src}
                onLoad={onImageLoad}
                style={{ maxWidth: '100%', maxHeight: '400px' }}
                alt="Crop preview"
              />
            </ReactCrop>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={getCroppedImg} disabled={!completedCrop}>
              Crop & Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}