import React, { useState, useMemo, useRef } from 'react';
import {
  Copy,
  Check,
  Download,
  Search,
  FileText,
  Image as ImageIcon,
  Loader2,
  FileCode,
  Layers,
  Code,
  ChevronDown,
  ExternalLink,
} from 'lucide-react';
import { IngestedFile, IngestionStats, FileTreeNode } from '../types';
import {
  generateConsolidatedTxt,
  generateConsolidatedMarkdown,
  generateConsolidatedJson,
  downloadFile,
  downloadBlob,
} from '../utils/formatter';
import { formatBytes } from '../utils/fileScanner';
import { generateDocxDocument } from '../utils/docxExport';

interface ConsolidatedViewProps {
  files: IngestedFile[];
  stats: IngestionStats;
  tree: FileTreeNode;
}

export const ConsolidatedView: React.FC<ConsolidatedViewProps> = ({
  files,
  stats,
  tree,
}) => {
  const [viewMode, setViewMode] = useState<'document' | 'raw-txt' | 'raw-md' | 'raw-json'>('document');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [selectedFilterExt, setSelectedFilterExt] = useState<string>('all');
  const [isGeneratingDocx, setIsGeneratingDocx] = useState(false);
  const [docxError, setDocxError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const consolidatedTxt = useMemo(
    () => generateConsolidatedTxt(files, stats, tree),
    [files, stats, tree]
  );

  const consolidatedMd = useMemo(
    () => generateConsolidatedMarkdown(files, stats, tree),
    [files, stats, tree]
  );

  const consolidatedJson = useMemo(
    () => generateConsolidatedJson(files, stats, tree),
    [files, stats, tree]
  );

  const availableExtensions = useMemo(() => {
    const set = new Set<string>();
    files.forEach((f) => {
      if (f.extension) set.add(f.extension.toLowerCase());
    });
    return Array.from(set).sort();
  }, [files]);

  const filteredFiles = useMemo(() => {
    return files.filter((f) => {
      if (selectedFilterExt !== 'all' && f.extension.toLowerCase() !== selectedFilterExt) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return f.path.toLowerCase().includes(q) || f.content.toLowerCase().includes(q);
    });
  }, [files, selectedFilterExt, searchQuery]);

  const handleCopy = async () => {
    let contentToCopy = consolidatedTxt;
    if (viewMode === 'raw-md') contentToCopy = consolidatedMd;
    if (viewMode === 'raw-json') contentToCopy = consolidatedJson;

    try {
      await navigator.clipboard.writeText(contentToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement('textarea');
      el.value = contentToCopy;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = async (targetFormat: 'txt' | 'md' | 'docx' | 'json') => {
    const timestamp = new Date().toISOString().slice(0, 10);
    if (targetFormat === 'txt') {
      downloadFile(
        consolidatedTxt,
        `codebase-${timestamp}.txt`,
        'text/plain;charset=utf-8'
      );
    } else if (targetFormat === 'md') {
      downloadFile(
        consolidatedMd,
        `codebase-${timestamp}.md`,
        'text/markdown;charset=utf-8'
      );
    } else if (targetFormat === 'json') {
      downloadFile(
        consolidatedJson,
        `codebase-${timestamp}.json`,
        'application/json;charset=utf-8'
      );
    } else if (targetFormat === 'docx') {
      try {
        setDocxError(null);
        setIsGeneratingDocx(true);
        const docxBlob = await generateDocxDocument(files, stats, tree);
        downloadBlob(docxBlob, `codebase-${timestamp}.docx`);
      } catch (err) {
        console.error('Failed to export docx', err);
        setDocxError('Failed to generate DOCX document. Please try again.');
      } finally {
        setIsGeneratingDocx(false);
      }
    }
  };

  const scrollToAnchor = (fileId: string) => {
    const el = document.getElementById(`file-block-${fileId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="space-y-3">
      {/* Controls Header */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
        {/* Mode Selector */}
        <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-xs font-medium">
          <button
            id="tab-mode-document"
            type="button"
            onClick={() => setViewMode('document')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
              viewMode === 'document'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs font-semibold'
                : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
            }`}
            title="Unified document stream with code blocks and inline visual images"
          >
            <Layers className="w-3.5 h-3.5 text-blue-500" />
            <span>Document Flow (With Images)</span>
          </button>

          <button
            id="tab-mode-txt"
            type="button"
            onClick={() => setViewMode('raw-txt')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              viewMode === 'raw-txt'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs font-semibold'
                : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
            }`}
          >
            .TXT
          </button>

          <button
            id="tab-mode-md"
            type="button"
            onClick={() => setViewMode('raw-md')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              viewMode === 'raw-md'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs font-semibold'
                : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
            }`}
          >
            .MD
          </button>

          <button
            id="tab-mode-json"
            type="button"
            onClick={() => setViewMode('raw-json')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              viewMode === 'raw-json'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs font-semibold'
                : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
            }`}
          >
            .JSON
          </button>
        </div>

        {/* Action Buttons: Copy to Clipboard & Direct Downloads */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-copy-to-clipboard"
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-medium hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors shadow-xs"
            title="Copy entire consolidated text format to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  Copied to Clipboard!
                </span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy to Clipboard</span>
              </>
            )}
          </button>

          <button
            id="btn-download-txt"
            type="button"
            onClick={() => handleDownload('txt')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-medium hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors shadow-xs"
            title="Export pure consolidated plain text file (.txt)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export .txt</span>
          </button>

          <button
            id="btn-download-docx"
            type="button"
            disabled={isGeneratingDocx}
            onClick={() => handleDownload('docx')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors shadow-xs"
            title="Export Word Document (.docx) with embedded images and directory schematic"
          >
            {isGeneratingDocx ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Generating .docx...</span>
              </>
            ) : (
              <>
                <FileText className="w-3.5 h-3.5" />
                <span>Export .docx</span>
              </>
            )}
          </button>

          <button
            id="btn-download-md"
            type="button"
            onClick={() => handleDownload('md')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-medium hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
            title="Export Markdown (.md)"
          >
            <span>.md</span>
          </button>

          <button
            id="btn-download-json"
            type="button"
            onClick={() => handleDownload('json')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-medium hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
            title="Export JSON structure (.json)"
          >
            <span>.json</span>
          </button>
        </div>
      </div>

      {/* Inline Error Banner (if DOCX generation fails) */}
      {docxError && (
        <div className="px-3.5 py-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-center justify-between">
          <span>{docxError}</span>
          <button
            type="button"
            onClick={() => setDocxError(null)}
            className="underline ml-3"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Sub-bar: Search & Quick Navigation */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
          <input
            id="input-search-files"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search within all files & code..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-neutral-200"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {/* Extension filter */}
          <select
            id="select-ext-filter"
            value={selectedFilterExt}
            onChange={(e) => setSelectedFilterExt(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs focus:outline-none"
          >
            <option value="all">All File Types ({files.length})</option>
            {availableExtensions.map((ext) => (
              <option key={ext} value={ext}>
                {ext.toUpperCase()} files
              </option>
            ))}
          </select>

          {/* Quick jump to file in document */}
          {viewMode === 'document' && (
            <select
              id="select-jump-to-file"
              onChange={(e) => {
                if (e.target.value) scrollToAnchor(e.target.value);
              }}
              defaultValue=""
              className="w-full sm:w-56 px-2.5 py-1.5 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs focus:outline-none"
            >
              <option value="" disabled>
                Jump to file...
              </option>
              {filteredFiles.map((file) => (
                <option key={file.id} value={file.id}>
                  {file.isImage ? '🖼️ ' : file.isBinary ? '📦 ' : '📄 '}
                  {file.path}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Main Preview Frame - UNTRUNCATED WITH INLINE IMAGES AT APPROPRIATE PLACES */}
      {viewMode === 'document' ? (
        <div
          ref={containerRef}
          id="consolidated-document-container"
          className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-950 overflow-hidden shadow-xs"
        >
          {/* Top Status Bar */}
          <div className="flex items-center justify-between px-4 py-2 bg-neutral-900 border-b border-neutral-800 text-xs font-mono text-neutral-400">
            <span className="truncate">
              SHOWING ALL {filteredFiles.length} FILES IN SEQUENCE • {formatBytes(stats.totalBytes)} • ZERO TRUNCATION
            </span>
            <span className="text-[11px] text-emerald-400 font-sans font-medium flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" />
              Complete stream rendered
            </span>
          </div>

          {/* File Stream Container - Renders every file completely */}
          <div className="p-4 space-y-6 max-h-[720px] overflow-y-auto overflow-x-hidden">
            {filteredFiles.map((file, idx) => (
              <div
                key={file.id}
                id={`file-block-${file.id}`}
                className="rounded-lg border border-neutral-800 bg-neutral-900/50 overflow-hidden transition-all hover:border-neutral-700"
              >
                {/* File Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 bg-neutral-900 border-b border-neutral-800 text-xs font-mono">
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-neutral-500 font-bold">
                      [{idx + 1}/{filteredFiles.length}]
                    </span>
                    {file.isImage ? (
                      <span className="px-1.5 py-0.5 rounded bg-purple-900/50 text-purple-300 text-[10px] font-sans font-semibold flex items-center gap-1 border border-purple-800/60">
                        <ImageIcon className="w-3 h-3" />
                        IMAGE ASSET
                      </span>
                    ) : file.isBinary ? (
                      <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 text-[10px] font-sans">
                        BINARY
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-300 text-[10px] font-sans font-medium">
                        CODE / TEXT
                      </span>
                    )}
                    <span className="text-neutral-200 font-medium truncate">
                      {file.path}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-neutral-400">
                    <span>{formatBytes(file.size)}</span>
                    {file.linesCount > 0 && <span>• {file.linesCount} lines</span>}
                  </div>
                </div>

                {/* File Content Body */}
                {file.isImage ? (
                  /* IMAGE SEEN AT APPROPRIATE PLACE IN THE STREAM */
                  <div className="p-5 flex flex-col items-center justify-center bg-neutral-950/80 border-t border-neutral-800/40 space-y-3">
                    {file.imageBlobUrl ? (
                      <div className="p-2 bg-neutral-900 rounded-lg border border-neutral-800 max-w-full flex items-center justify-center">
                        <img
                          src={file.imageBlobUrl}
                          alt={file.name}
                          className="max-h-[320px] max-w-full object-contain rounded"
                        />
                      </div>
                    ) : (
                      <div className="p-8 text-center text-neutral-500 text-xs font-sans">
                        [Image data ready for DOCX embedding]
                      </div>
                    )}

                    <div className="text-center font-sans space-y-1">
                      <p className="text-xs text-neutral-300 font-medium">
                        {file.name} ({formatBytes(file.size)})
                      </p>
                      <p className="text-[11px] text-emerald-400">
                        ✅ Visually embedded in DOCX export • Pure text (.txt) safely excludes corrupted binary characters
                      </p>
                    </div>

                    {file.imageBlobUrl && (
                      <a
                        href={file.imageBlobUrl}
                        download={file.name}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-sans transition-colors"
                      >
                        <Download className="w-3 h-3" />
                        <span>Download Image</span>
                      </a>
                    )}
                  </div>
                ) : file.isBinary ? (
                  <div className="p-4 bg-neutral-950 text-xs font-mono text-neutral-400 italic">
                    {file.content}
                  </div>
                ) : (
                  /* FULL TEXT CONTENT RENDERED WITHOUT TRUNCATION */
                  <div className="p-4 bg-neutral-950 overflow-x-auto text-xs font-mono leading-relaxed text-neutral-200 select-text">
                    <pre className="whitespace-pre">{file.content}</pre>
                  </div>
                )}
              </div>
            ))}

            {filteredFiles.length === 0 && (
              <div className="p-12 text-center text-neutral-400 font-sans text-xs">
                No files match the query &quot;{searchQuery}&quot;
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Raw Consolidated Stream Viewer */
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-950 text-neutral-100 overflow-hidden shadow-xs">
          <div className="flex items-center justify-between px-4 py-2 bg-neutral-900 border-b border-neutral-800 text-xs font-mono text-neutral-400">
            <span className="truncate">
              RAW CONSOLIDATED {viewMode.replace('raw-', '').toUpperCase()} • {files.length} files • {formatBytes(stats.totalBytes)} • ZERO TRUNCATION
            </span>
            <div className="flex items-center gap-2">
              <button
                id="btn-quick-download-raw"
                type="button"
                onClick={() =>
                  handleDownload(
                    viewMode === 'raw-md'
                      ? 'md'
                      : viewMode === 'raw-json'
                      ? 'json'
                      : 'txt'
                  )
                }
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white transition-colors text-[11px]"
              >
                <Download className="w-3 h-3" />
                <span>Download .{viewMode.replace('raw-', '')}</span>
              </button>

              <button
                id="btn-quick-copy-raw"
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white transition-colors text-[11px]"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400 font-semibold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy to Clipboard</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div
            id="consolidated-raw-container"
            className="p-4 overflow-x-auto overflow-y-auto max-h-[650px] font-mono text-xs leading-relaxed text-neutral-200 select-text"
          >
            <pre className="whitespace-pre">
              {viewMode === 'raw-txt' && consolidatedTxt}
              {viewMode === 'raw-md' && consolidatedMd}
              {viewMode === 'raw-json' && consolidatedJson}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
