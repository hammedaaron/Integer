import React, { useState, useMemo } from 'react';
import {
  Download,
  Copy,
  Check,
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  FileSpreadsheet,
  File,
  Image as ImageIcon,
  ChevronRight,
  ChevronDown,
  Search,
} from 'lucide-react';
import { FileTreeNode, IngestionStats, IngestedFile } from '../types';
import {
  generateFullAsciiTree,
  generateSchematicJson,
  downloadFile,
} from '../utils/formatter';
import { formatBytes } from '../utils/fileScanner';

interface SchematicViewProps {
  tree: FileTreeNode;
  files: IngestedFile[];
  stats: IngestionStats;
}

export const SchematicView: React.FC<SchematicViewProps> = ({
  tree,
  stats,
}) => {
  const [activeTab, setActiveTab] = useState<'visual' | 'json' | 'ascii'>('visual');
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    '': true,
    src: true,
  });

  const asciiTree = useMemo(() => generateFullAsciiTree(tree), [tree]);
  const jsonStructure = useMemo(() => generateSchematicJson(tree), [tree]);

  const toggleNode = (path: string) => {
    setExpandedNodes((prev) => ({
      ...prev,
      [path]: !prev[path],
    }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    function walk(node: FileTreeNode) {
      all[node.path] = true;
      node.children.forEach(walk);
    }
    walk(tree);
    setExpandedNodes(all);
  };

  const collapseAll = () => {
    setExpandedNodes({ '': true });
  };

  const handleCopy = async () => {
    let content = '';
    if (activeTab === 'visual' || activeTab === 'ascii') content = asciiTree;
    else content = jsonStructure;

    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement('textarea');
      el.value = content;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadSchematic = (format: 'txt' | 'md' | 'json') => {
    const timestamp = new Date().toISOString().slice(0, 10);
    if (format === 'txt') {
      const content = `================================================================================
SCHEMATIC FILE ARRANGEMENT ("WHAT GOES WHERE")
Generated: ${new Date().toISOString()}
Files: ${stats.totalFiles} | Folders: ${stats.totalDirectories} | Size: ${formatBytes(stats.totalBytes)}
================================================================================

${asciiTree}
`;
      downloadFile(
        content,
        `schematic-${timestamp}.txt`,
        'text/plain;charset=utf-8'
      );
    } else if (format === 'md') {
      const content = `# Codebase Schematic Arrangement

> ${stats.totalFiles} files in ${stats.totalDirectories} folders (${formatBytes(stats.totalBytes)})

\`\`\`text
${asciiTree}
\`\`\`
`;
      downloadFile(
        content,
        `schematic-${timestamp}.md`,
        'text/markdown;charset=utf-8'
      );
    } else if (format === 'json') {
      downloadFile(
        jsonStructure,
        `schematic-${timestamp}.json`,
        'application/json;charset=utf-8'
      );
    }
  };

  const renderFileIcon = (ext: string) => {
    const clean = ext.toLowerCase();
    if (['.ts', '.tsx', '.js', '.jsx', '.py', '.rs', '.go', '.java', '.cpp', '.c'].includes(clean)) {
      return <FileCode className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
    }
    if (['.json', '.yaml', '.yml', '.toml', '.xml'].includes(clean)) {
      return <FileSpreadsheet className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
    }
    if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.ico', '.svg', '.tiff'].includes(clean)) {
      return <ImageIcon className="w-3.5 h-3.5 text-purple-500 shrink-0" />;
    }
    if (['.md', '.txt', '.doc', '.pdf'].includes(clean)) {
      return <FileText className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
    }
    return <File className="w-3.5 h-3.5 text-neutral-400 shrink-0" />;
  };

  const renderVisualNode = (node: FileTreeNode, depth = 0) => {
    const isDir = node.type === 'directory';
    const isOpen = expandedNodes[node.path] ?? depth < 2;
    const isRoot = node.name === 'root';
    const matchesSearch =
      searchTerm &&
      node.name.toLowerCase().includes(searchTerm.toLowerCase());

    if (isRoot) {
      return (
        <div key="root" className="space-y-0.5">
          {node.children.map((child) => renderVisualNode(child, depth + 1))}
        </div>
      );
    }

    return (
      <div key={node.path || node.name} className="select-none text-xs">
        <div
          onClick={() => isDir && toggleNode(node.path)}
          className={`flex items-center justify-between py-1.5 px-2 rounded-lg transition-colors cursor-pointer ${
            matchesSearch
              ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200'
              : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200'
          }`}
          style={{ paddingLeft: `${Math.max(8, depth * 16)}px` }}
        >
          <div className="flex items-center gap-2 min-w-0">
            {isDir ? (
              <>
                <span className="text-neutral-400">
                  {isOpen ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </span>
                {isOpen ? (
                  <FolderOpen className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                ) : (
                  <Folder className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                )}
                <span className="font-mono font-medium truncate">{node.name}/</span>
              </>
            ) : (
              <>
                <span className="w-3.5 inline-block" />
                {renderFileIcon(node.file?.extension || '')}
                <span className="font-mono truncate">{node.name}</span>
              </>
            )}
          </div>

          <div className="text-[11px] text-neutral-400 dark:text-neutral-500 font-mono shrink-0 ml-3">
            {isDir ? `${node.fileCount} items` : formatBytes(node.size)}
          </div>
        </div>

        {isDir && isOpen && node.children.length > 0 && (
          <div className="border-l border-neutral-200 dark:border-neutral-800 ml-3.5 pl-1">
            {node.children.map((child) => renderVisualNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Minimalist Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
        {/* View Selector */}
        <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-xs font-medium">
          <button
            id="tab-schematic-visual"
            type="button"
            onClick={() => setActiveTab('visual')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'visual'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
            }`}
          >
            Diagram Tree
          </button>

          <button
            id="tab-schematic-json"
            type="button"
            onClick={() => setActiveTab('json')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'json'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
            }`}
          >
            JSON Schema
          </button>

          <button
            id="tab-schematic-ascii"
            type="button"
            onClick={() => setActiveTab('ascii')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'ascii'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
            }`}
          >
            ASCII Tree
          </button>
        </div>

        {/* Action Buttons: Copy & Direct Downloads */}
        <div className="flex items-center gap-2">
          <button
            id="btn-copy-schematic"
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-medium hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>

          <button
            id="btn-download-schematic-txt"
            type="button"
            onClick={() => handleDownloadSchematic('txt')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-medium hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .txt</span>
          </button>

          <button
            id="btn-download-schematic-md"
            type="button"
            onClick={() => handleDownloadSchematic('md')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-medium hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .md</span>
          </button>

          <button
            id="btn-download-schematic-json"
            type="button"
            onClick={() => handleDownloadSchematic('json')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-medium hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
          >
            <span>.json</span>
          </button>
        </div>
      </div>

      {/* Sub-bar: Search & Tree Controls (if Visual) */}
      {activeTab === 'visual' && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            <input
              id="input-search-tree"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Find file or folder..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-900"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-tree-expand-all"
              type="button"
              onClick={expandAll}
              className="px-2.5 py-1 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 font-medium"
            >
              Expand All
            </button>
            <button
              id="btn-tree-collapse-all"
              type="button"
              onClick={collapseAll}
              className="px-2.5 py-1 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 font-medium"
            >
              Collapse
            </button>
          </div>
        </div>
      )}

      {/* Schematic Container */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden">
        {activeTab === 'visual' && (
          <div
            id="schematic-visual-canvas"
            className="p-4 max-h-[600px] overflow-y-auto"
          >
            {renderVisualNode(tree)}
          </div>
        )}

        {activeTab === 'ascii' && (
          <div
            id="schematic-ascii-container"
            className="p-4 max-h-[600px] overflow-x-auto overflow-y-auto bg-neutral-950 text-neutral-200 font-mono text-xs leading-relaxed"
          >
            <pre className="whitespace-pre">{asciiTree}</pre>
          </div>
        )}

        {activeTab === 'json' && (
          <div
            id="schematic-json-container"
            className="p-4 max-h-[600px] overflow-x-auto overflow-y-auto bg-neutral-950 text-neutral-200 font-mono text-xs leading-relaxed"
          >
            <pre className="whitespace-pre">{jsonStructure}</pre>
          </div>
        )}
      </div>
    </div>
  );
};
