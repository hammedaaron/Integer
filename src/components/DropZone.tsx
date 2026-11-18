import React, { useRef, useState } from 'react';
import { Upload, FolderArchive, Folder, FileText, Sparkles } from 'lucide-react';
import { IngestionOptions } from '../types';
import { scanFileSystemEntry } from '../utils/fileScanner';

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  onLoadSample: () => void;
  isProcessing: boolean;
  progressPercent: number;
  progressStatus: string;
  options: IngestionOptions;
  onOptionsChange: (options: IngestionOptions) => void;
}

export const DropZone: React.FC<DropZoneProps> = ({
  onFilesSelected,
  onLoadSample,
  isProcessing,
  progressPercent,
  progressStatus,
  options,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (isProcessing) return;

    const items = e.dataTransfer.items;
    if (items && items.length > 0) {
      const scannedFiles: File[] = [];
      const entries: any[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (typeof item.webkitGetAsEntry === 'function') {
          const entry = item.webkitGetAsEntry();
          if (entry) entries.push(entry);
        }
      }

      if (entries.length > 0) {
        for (const entry of entries) {
          const files = await scanFileSystemEntry(entry, options);
          scannedFiles.push(...files);
        }
        if (scannedFiles.length > 0) {
          onFilesSelected(scannedFiles);
          return;
        }
      }
    }

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(Array.from(e.dataTransfer.files));
    }
  };

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Hidden file inputs */}
      <input
        id="input-all-files"
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFilesChange}
      />
      <input
        id="input-folder"
        ref={folderInputRef}
        type="file"
        {...({ webkitdirectory: '', directory: '', multiple: true } as React.InputHTMLAttributes<HTMLInputElement>)}
        className="hidden"
        onChange={handleFilesChange}
      />
      <input
        id="input-zip"
        ref={zipInputRef}
        type="file"
        accept=".zip,application/zip"
        className="hidden"
        onChange={handleFilesChange}
      />

      {/* Minimal Drop Area */}
      <div
        id="dropzone-container"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          if (!isProcessing) fileInputRef.current?.click();
        }}
        className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer select-none ${
          isDragOver
            ? 'border-neutral-900 bg-neutral-100 dark:border-neutral-200 dark:bg-neutral-900'
            : 'border-neutral-300 hover:border-neutral-400 bg-white dark:border-neutral-700 dark:hover:border-neutral-600 dark:bg-neutral-900/60'
        }`}
      >
        <div className="flex flex-col items-center justify-center space-y-4 pointer-events-none">
          <div className="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center">
            <Upload className="w-5 h-5" />
          </div>

          <div className="space-y-1">
            <p className="text-base font-medium text-neutral-900 dark:text-neutral-100">
              Drag & drop files, folders, or ZIP archives
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              100% local &amp; offline (no AI, no internet required) • .txt / .md / .docx / .json • Image embedding &amp; zero truncation
            </p>
          </div>

          {/* Action buttons */}
          <div
            className="pt-2 flex flex-wrap gap-2 justify-center pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              id="btn-upload-zip"
              type="button"
              onClick={() => zipInputRef.current?.click()}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-medium hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors shadow-xs"
            >
              <FolderArchive className="w-3.5 h-3.5" />
              Upload ZIP
            </button>

            <button
              id="btn-upload-folder"
              type="button"
              onClick={() => folderInputRef.current?.click()}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-medium hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors shadow-xs"
            >
              <Folder className="w-3.5 h-3.5" />
              Upload Folder
            </button>

            <button
              id="btn-upload-files"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-medium hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors shadow-xs"
            >
              <FileText className="w-3.5 h-3.5" />
              Upload Files
            </button>

            <button
              id="btn-load-sample"
              type="button"
              onClick={onLoadSample}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Try Sample
            </button>
          </div>
        </div>

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="absolute inset-0 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xs rounded-xl flex flex-col items-center justify-center p-6 z-10">
            <div className="w-full max-w-sm space-y-2.5">
              <div className="flex justify-between text-xs font-medium text-neutral-700 dark:text-neutral-300">
                <span>{progressStatus || 'Ingesting...'}</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-neutral-900 dark:bg-neutral-100 transition-all duration-200 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
