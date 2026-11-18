import JSZip from 'jszip';
import { IngestedFile, IngestionOptions, IngestionStats, FileTreeNode } from '../types';

export const KNOWN_IMAGE_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'ico', 'svg', 'tiff', 'tif', 'avif', 'heic', 'heif'
]);

export const KNOWN_BINARY_EXTENSIONS = new Set([
  // Images
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'ico', 'tiff', 'tif', 'avif', 'heic', 'heif',
  // Documents / Archives
  'pdf', 'zip', 'tar', 'gz', '7z', 'rar', 'bz2', 'xz', 'dmg', 'iso', 'pkg',
  // Executables / Libraries
  'exe', 'dll', 'so', 'dylib', 'bin', 'wasm', 'node', 'app',
  // Compiled code
  'pyc', 'pyo', 'class', 'jar', 'apk', 'aar',
  // Fonts
  'woff', 'woff2', 'ttf', 'otf', 'eot',
  // Audio / Video
  'mp3', 'mp4', 'wav', 'ogg', 'mov', 'avi', 'mkv', 'flac', 'm4a', 'webm', '3gp',
  // Databases / Locks / Data
  'db', 'sqlite', 'sqlite3', 'lockb', 'dat', 'rdata', 'rds',
  // Proprietary docs (binary)
  'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'
]);

export function isImageExtension(ext: string): boolean {
  const cleanExt = ext.replace(/^\./, '').toLowerCase();
  return KNOWN_IMAGE_EXTENSIONS.has(cleanExt);
}

export function isBinaryExtension(ext: string): boolean {
  const cleanExt = ext.replace(/^\./, '').toLowerCase();
  return KNOWN_BINARY_EXTENSIONS.has(cleanExt);
}

export function getMimeType(ext: string): string {
  const clean = ext.replace(/^\./, '').toLowerCase();
  switch (clean) {
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'gif': return 'image/gif';
    case 'webp': return 'image/webp';
    case 'svg': return 'image/svg+xml';
    case 'bmp': return 'image/bmp';
    case 'ico': return 'image/x-icon';
    case 'avif': return 'image/avif';
    case 'pdf': return 'application/pdf';
    default: return 'application/octet-stream';
  }
}

export function isImageMagicBytes(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false;
  // PNG: 0x89 'P' 'N' 'G'
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return true;
  // JPEG: 0xFF 0xD8 0xFF
  if (bytes.length >= 3 && bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return true;
  // GIF: 'GIF8'
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return true;
  // WEBP: 'RIFF'....'WEBP'
  if (bytes.length >= 12 &&
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return true;
  }
  return false;
}

export function isBinaryData(bytes: Uint8Array): boolean {
  const len = Math.min(bytes.length, 4096);
  if (len === 0) return false;

  // Check magic bytes for known binaries
  if (isImageMagicBytes(bytes)) return true;
  // PDF: '%PDF'
  if (bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return true;
  // ZIP: 'PK\x03\x04'
  if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04) return true;

  let nullCount = 0;
  let controlCount = 0;
  for (let i = 0; i < len; i++) {
    const b = bytes[i];
    if (b === 0) {
      nullCount++;
    } else if ((b < 7 || (b > 13 && b < 32)) && b !== 27) {
      controlCount++;
    }
  }

  // Null byte is a definitive indicator of binary content (PNG chunks, compiled objects, etc.)
  if (nullCount > 0) return true;
  // High percentage of non-text control characters
  if (controlCount / len > 0.1) return true;

  return false;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

export function normalizePath(rawPath: string): string {
  return rawPath.replace(/\\/g, '/').replace(/^\/+/, '');
}

export function shouldIgnore(filePath: string, options: IngestionOptions): boolean {
  const parts = filePath.split('/');
  for (const part of parts) {
    if (options.ignoreNodeModules && part === 'node_modules') return true;
    if (options.ignoreGit && (part === '.git' || part === '.gitignore' || part === '.gitattributes')) return true;
    if (options.ignoreBuildDist && (part === 'dist' || part === 'build' || part === '.next' || part === 'out' || part === 'target')) return true;
    if (options.ignoreHiddenFiles && part.startsWith('.') && part !== '.' && part !== '..') return true;
    if (part === '.DS_Store' || part === 'Thumbs.db') return true;
  }
  return false;
}

export async function processZipFile(
  file: File,
  options: IngestionOptions,
  onProgress?: (percent: number, status: string) => void
): Promise<IngestedFile[]> {
  onProgress?.(10, 'Opening ZIP archive...');
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(file);
  const fileEntries = Object.keys(loadedZip.files).filter((path) => !loadedZip.files[path].dir);

  const total = fileEntries.length;
  const results: IngestedFile[] = [];
  let processed = 0;

  for (const relativePath of fileEntries) {
    const zipEntry = loadedZip.files[relativePath];
    const normPath = normalizePath(relativePath);

    if (shouldIgnore(normPath, options)) {
      processed++;
      continue;
    }

    const lastSlash = normPath.lastIndexOf('/');
    const dir = lastSlash === -1 ? '' : normPath.substring(0, lastSlash);
    const fileName = lastSlash === -1 ? normPath : normPath.substring(lastSlash + 1);
    const dotIdx = fileName.lastIndexOf('.');
    const ext = dotIdx === -1 ? '' : fileName.substring(dotIdx).toLowerCase();

    try {
      const uint8 = await zipEntry.async('uint8array');
      const isImg = isImageExtension(ext) || isImageMagicBytes(uint8);
      const isBin = isImg || isBinaryExtension(ext) || isBinaryData(uint8);

      if (isImg) {
        let blobUrl: string | undefined;
        try {
          blobUrl = URL.createObjectURL(new Blob([uint8], { type: getMimeType(ext) }));
        } catch {}

        results.push({
          id: `${normPath}-${Date.now()}-${Math.random()}`,
          path: normPath,
          name: fileName,
          directory: dir,
          extension: ext || '(none)',
          size: uint8.length,
          isBinary: true,
          isImage: true,
          imageData: uint8,
          imageBlobUrl: blobUrl,
          content: `[Image File: ${fileName} (${formatBytes(uint8.length)}) - Binary data excluded from plain text. Embedded in DOCX export]`,
          linesCount: 0,
          estimatedTokens: 0,
        });
      } else if (isBin) {
        results.push({
          id: `${normPath}-${Date.now()}-${Math.random()}`,
          path: normPath,
          name: fileName,
          directory: dir,
          extension: ext || '(none)',
          size: uint8.length,
          isBinary: true,
          isImage: false,
          content: `[Binary File: ${fileName} (${formatBytes(uint8.length)}) - Binary content excluded from plain text]`,
          linesCount: 0,
          estimatedTokens: 0,
        });
      } else {
        // Pure text file
        const textContent = new TextDecoder('utf-8', { fatal: false }).decode(uint8);
        const lines = textContent.split('\n').length;
        const tokens = estimateTokenCount(textContent);

        results.push({
          id: `${normPath}-${Date.now()}-${Math.random()}`,
          path: normPath,
          name: fileName,
          directory: dir,
          extension: ext || '(none)',
          size: uint8.length,
          isBinary: false,
          isImage: false,
          content: textContent,
          linesCount: lines,
          estimatedTokens: tokens,
        });
      }
    } catch {
      results.push({
        id: `${normPath}-${Date.now()}-${Math.random()}`,
        path: normPath,
        name: fileName,
        directory: dir,
        extension: ext || '(none)',
        size: 0,
        isBinary: true,
        isImage: false,
        content: `[Unreadable File: ${fileName}]`,
        linesCount: 0,
        estimatedTokens: 0,
      });
    }

    processed++;
    if (processed % 15 === 0 || processed === total) {
      onProgress?.(
        Math.round(10 + (processed / total) * 85),
        `Extracting ${processed}/${total} files...`
      );
    }
  }

  onProgress?.(100, 'Processing complete');
  return results.sort((a, b) => a.path.localeCompare(b.path));
}

export async function processFileList(
  files: File[],
  options: IngestionOptions,
  onProgress?: (percent: number, status: string) => void
): Promise<IngestedFile[]> {
  const total = files.length;
  const results: IngestedFile[] = [];

  for (let i = 0; i < total; i++) {
    const file = files[i];
    const path = normalizePath(file.webkitRelativePath || file.name);

    if (shouldIgnore(path, options)) {
      continue;
    }

    // Check if user uploaded a zip via normal file select
    if (file.name.toLowerCase().endsWith('.zip')) {
      const zipResults = await processZipFile(file, options, onProgress);
      results.push(...zipResults);
      continue;
    }

    const lastSlash = path.lastIndexOf('/');
    const dir = lastSlash === -1 ? '' : path.substring(0, lastSlash);
    const fileName = lastSlash === -1 ? path : path.substring(lastSlash + 1);
    const dotIdx = fileName.lastIndexOf('.');
    const ext = dotIdx === -1 ? '' : fileName.substring(dotIdx).toLowerCase();

    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      const isImg = isImageExtension(ext) || isImageMagicBytes(uint8);
      const isBin = isImg || isBinaryExtension(ext) || isBinaryData(uint8);

      if (isImg) {
        let blobUrl: string | undefined;
        try {
          blobUrl = URL.createObjectURL(new Blob([uint8], { type: getMimeType(ext) }));
        } catch {}

        results.push({
          id: `${path}-${i}`,
          path,
          name: fileName,
          directory: dir,
          extension: ext || '(none)',
          size: file.size,
          isBinary: true,
          isImage: true,
          imageData: uint8,
          imageBlobUrl: blobUrl,
          content: `[Image File: ${fileName} (${formatBytes(file.size)}) - Binary data excluded from plain text. Embedded in DOCX export]`,
          linesCount: 0,
          estimatedTokens: 0,
        });
      } else if (isBin) {
        results.push({
          id: `${path}-${i}`,
          path,
          name: fileName,
          directory: dir,
          extension: ext || '(none)',
          size: file.size,
          isBinary: true,
          isImage: false,
          content: `[Binary File: ${fileName} (${formatBytes(file.size)}) - Binary content excluded from plain text]`,
          linesCount: 0,
          estimatedTokens: 0,
        });
      } else {
        // Pure text file
        const text = new TextDecoder('utf-8', { fatal: false }).decode(uint8);
        const lines = text.split('\n').length;
        const tokens = estimateTokenCount(text);

        results.push({
          id: `${path}-${i}`,
          path,
          name: fileName,
          directory: dir,
          extension: ext || '(none)',
          size: file.size,
          isBinary: false,
          isImage: false,
          content: text,
          linesCount: lines,
          estimatedTokens: tokens,
        });
      }
    } catch {
      results.push({
        id: `${path}-${i}`,
        path,
        name: fileName,
        directory: dir,
        extension: ext || '(none)',
        size: file.size,
        isBinary: true,
        isImage: false,
        content: `[Unreadable File: ${fileName}]`,
        linesCount: 0,
        estimatedTokens: 0,
      });
    }

    if (i % 20 === 0 || i === total - 1) {
      onProgress?.(
        Math.round(((i + 1) / total) * 100),
        `Ingested ${i + 1} of ${total} files...`
      );
    }
  }

  return results.sort((a, b) => a.path.localeCompare(b.path));
}

// Traverse dropped filesystem entries recursively (supporting directories dropped directly)
export async function scanFileSystemEntry(
  entry: any,
  options: IngestionOptions,
  path = ''
): Promise<File[]> {
  const currentPath = path ? `${path}/${entry.name}` : entry.name;

  if (entry.isFile) {
    return new Promise((resolve) => {
      entry.file(
        (file: File) => {
          Object.defineProperty(file, 'webkitRelativePath', {
            value: currentPath,
            writable: false,
          });
          resolve([file]);
        },
        () => resolve([])
      );
    });
  } else if (entry.isDirectory) {
    if (shouldIgnore(currentPath, options)) {
      return [];
    }
    const dirReader = entry.createReader();
    const entries: any[] = [];

    const readEntries = async (): Promise<any[]> => {
      return new Promise((resolve) => {
        dirReader.readEntries(
          (results: any[]) => {
            if (!results.length) {
              resolve(entries);
            } else {
              entries.push(...results);
              readEntries().then(resolve);
            }
          },
          () => resolve(entries)
        );
      });
    };

    const allEntries = await readEntries();
    const filesArrays = await Promise.all(
      allEntries.map((childEntry) => scanFileSystemEntry(childEntry, options, currentPath))
    );
    return filesArrays.flat();
  }

  return [];
}

export function buildFileTree(files: IngestedFile[]): FileTreeNode {
  const root: FileTreeNode = {
    name: 'root',
    path: '',
    type: 'directory',
    size: 0,
    children: [],
  };

  for (const file of files) {
    const parts = file.path.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      const partPath = parts.slice(0, i + 1).join('/');

      let existing = current.children.find((c) => c.name === part);

      if (!existing) {
        existing = {
          name: part,
          path: partPath,
          type: isFile ? 'file' : 'directory',
          size: isFile ? file.size : 0,
          file: isFile ? file : undefined,
          children: [],
        };
        current.children.push(existing);
      }

      if (!isFile) {
        current = existing;
      }
    }
  }

  function rollup(node: FileTreeNode): { size: number; count: number } {
    if (node.type === 'file') {
      return { size: node.size, count: 1 };
    }
    let totalSize = 0;
    let totalCount = 0;
    for (const child of node.children) {
      const res = rollup(child);
      totalSize += res.size;
      totalCount += res.count;
    }
    node.size = totalSize;
    node.fileCount = totalCount;
    node.children.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    return { size: totalSize, count: totalCount };
  }

  rollup(root);
  return root;
}

export function calculateStats(files: IngestedFile[]): IngestionStats {
  const dirs = new Set<string>();
  let totalBytes = 0;
  let totalLines = 0;
  let totalTokens = 0;
  let binaryFilesCount = 0;
  const extensionBreakdown: Record<string, { count: number; size: number }> = {};

  for (const file of files) {
    if (file.directory) {
      dirs.add(file.directory);
      let curr = file.directory;
      while (curr.includes('/')) {
        curr = curr.substring(0, curr.lastIndexOf('/'));
        dirs.add(curr);
      }
    }
    totalBytes += file.size;
    totalLines += file.linesCount;
    totalTokens += file.estimatedTokens;
    if (file.isBinary) binaryFilesCount++;

    const ext = file.extension || '(none)';
    if (!extensionBreakdown[ext]) {
      extensionBreakdown[ext] = { count: 0, size: 0 };
    }
    extensionBreakdown[ext].count++;
    extensionBreakdown[ext].size += file.size;
  }

  return {
    totalFiles: files.length,
    totalDirectories: dirs.size,
    totalBytes,
    totalLines,
    totalTokens,
    binaryFilesCount,
    extensionBreakdown,
  };
}
