export interface IngestedFile {
  id: string;
  path: string; // e.g. "src/components/App.tsx"
  name: string; // e.g. "App.tsx"
  directory: string; // e.g. "src/components"
  extension: string; // e.g. ".tsx"
  size: number; // in bytes
  isBinary: boolean;
  isImage?: boolean;
  imageData?: Uint8Array; // Raw image data for DOCX embedding
  imageBlobUrl?: string; // Preview URL for displaying image
  content: string; // text content or placeholder for binary
  linesCount: number;
  estimatedTokens: number;
}

export interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
  file?: IngestedFile;
  children: FileTreeNode[];
  fileCount?: number;
  isOpen?: boolean;
}

export interface IngestionStats {
  totalFiles: number;
  totalDirectories: number;
  totalBytes: number;
  totalLines: number;
  totalTokens: number;
  binaryFilesCount: number;
  extensionBreakdown: Record<string, { count: number; size: number }>;
}

export interface IngestionOptions {
  ignoreNodeModules: boolean;
  ignoreGit: boolean;
  ignoreBuildDist: boolean;
  ignoreHiddenFiles: boolean;
  includeBinaryPlaceholders: boolean;
  maxFileSizeMB: number;
}
