"use client";

import { useRef } from "react";
import { ImagePlus, X, Film, Upload } from "lucide-react";
import type { MediaFile } from "@/lib/media";
import { getMediaPreviewUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

interface MediaDropzoneProps {
  files: MediaFile[];
  isUploading?: boolean;
  accept?: string;
  multiple?: boolean;
  maxSizeLabel?: string;
  onFilesSelected: (files: FileList | File[]) => void;
  onRemove: (index: number) => void;
}

export function MediaDropzone({
  files,
  isUploading,
  accept = "image/*,video/*",
  multiple = true,
  maxSizeLabel = "JPG, PNG, GIF, MP4. Max 100MB.",
  onFilesSelected,
  onRemove,
}: MediaDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) onFilesSelected(e.dataTransfer.files);
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => e.target.files && onFilesSelected(e.target.files)}
      />

      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((file, index) => (
            <div key={index} className="relative group size-20 rounded-md overflow-hidden bg-muted">
              {file.mimetype.startsWith("image/") ? (
                <img
                  src={getMediaPreviewUrl(file)}
                  alt={file.originalname}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <Film className="h-8 w-8" />
                </div>
              )}
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="absolute top-1 right-1 size-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border p-6 cursor-pointer transition-colors hover:border-primary/50 hover:bg-accent/30",
          isUploading && "opacity-50 pointer-events-none"
        )}
      >
        {isUploading ? (
          <Upload className="h-6 w-6 text-muted-foreground animate-bounce" />
        ) : (
          <ImagePlus className="h-6 w-6 text-muted-foreground" />
        )}
        <p className="text-sm text-muted-foreground">
          {isUploading ? "Uploading…" : "Click or drag & drop to upload"}
        </p>
        <p className="text-xs text-muted-foreground">{maxSizeLabel}</p>
      </div>
    </div>
  );
}
