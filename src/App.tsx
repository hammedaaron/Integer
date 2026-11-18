import React, { useState, useMemo, useEffect } from 'react';
import {
  FileText,
  Network,
  RotateCcw,
  Sun,
  Moon,
} from 'lucide-react';
import { DropZone } from './components/DropZone';
import { ConsolidatedView } from './components/ConsolidatedView';
import { SchematicView } from './components/SchematicView';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { IngestedFile, IngestionOptions } from './types';
import {
  processFileList,
  processZipFile,
  buildFileTree,
  calculateStats,
  formatBytes,
} from './utils/fileScanner';
import { SAMPLE_CODEBASE_FILES } from './utils/sampleData';

export default function App() {
  const [files, setFiles] = useState<IngestedFile[]>([]);
  const [activeView, setActiveView] = useState<'consolidated' | 'schematic'>('consolidated');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const [options, setOptions] = useState<IngestionOptions>({
    ignoreNodeModules: true,
    ignoreGit: true,
    ignoreBuildDist: true,
    ignoreHiddenFiles: false,
    includeBinaryPlaceholders: true,
    maxFileSizeMB: 50,
  });

  // Dark mode handler
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Derived tree and statistics
  const tree = useMemo(() => buildFileTree(files), [files]);
  const stats = useMemo(() => calculateStats(files), [files]);

  const handleFilesSelected = async (selectedFiles: File[]) => {
    if (!selectedFiles.length) return;
    setIsProcessing(true);
    setProgressPercent(5);
    setProgressStatus('Reading files...');

    try {
      if (selectedFiles.length === 1 && selectedFiles[0].name.toLowerCase().endsWith('.zip')) {
        const ingested = await processZipFile(
          selectedFiles[0],
          options,
          (percent, status) => {
            setProgressPercent(percent);
            setProgressStatus(status);
          }
        );
        setFiles(ingested);
      } else {
        const ingested = await processFileList(
          selectedFiles,
          options,
          (percent, status) => {
            setProgressPercent(percent);
            setProgressStatus(status);
          }
        );
        setFiles(ingested);
      }
    } catch (err: any) {
      console.error('Ingestion error:', err);
    } finally {
      setIsProcessing(false);
      setProgressPercent(0);
      setProgressStatus('');
    }
  };

  const handleLoadSample = () => {
    setIsProcessing(true);
    setProgressPercent(20);
    setProgressStatus('Loading sample codebase...');

    setTimeout(() => {
      setFiles(SAMPLE_CODEBASE_FILES);
      setIsProcessing(false);
      setProgressPercent(0);
      setProgressStatus('');
    }, 300);
  };

  const handleReset = () => {
    setFiles([]);
    setActiveView('consolidated');
  };

  return (
    <div className="min-h-screen bg-neutral-100/60 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 transition-colors">
      {/* Header */}
      <header className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 flex items-center justify-center font-mono font-bold text-xs">
              IN
            </div>
            <h1 className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
              Integer
            </h1>
            {files.length > 0 && (
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-[11px] font-mono text-neutral-600 dark:text-neutral-400">
                {stats.totalFiles} files • {formatBytes(stats.totalBytes)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <PWAInstallButton />

            {files.length > 0 && (
              <button
                id="btn-reset-ingestion"
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-medium hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                title="Ingest new files"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>New Ingest</span>
              </button>
            )}

            <button
              id="btn-toggle-theme"
              type="button"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <Moon className="w-4 h-4" />
              ) : (
                <Sun className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {files.length === 0 ? (
          /* Empty / Upload View */
          <div className="pt-8 sm:pt-14">
            <DropZone
              onFilesSelected={handleFilesSelected}
              onLoadSample={handleLoadSample}
              isProcessing={isProcessing}
              progressPercent={progressPercent}
              progressStatus={progressStatus}
              options={options}
              onOptionsChange={setOptions}
            />
          </div>
        ) : (
          /* Ingested View */
          <div className="space-y-4">
            {/* Primary View Switcher: Consolidated Text vs. Schematic Diagram */}
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2">
              <div className="flex items-center gap-2">
                <button
                  id="tab-view-consolidated"
                  type="button"
                  onClick={() => setActiveView('consolidated')}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeView === 'consolidated'
                      ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-neutral-800'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Consolidated Text</span>
                </button>

                <button
                  id="tab-view-schematic"
                  type="button"
                  onClick={() => setActiveView('schematic')}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeView === 'schematic'
                      ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-neutral-800'
                  }`}
                >
                  <Network className="w-3.5 h-3.5" />
                  <span>Schematic Diagram & JSON</span>
                </button>
              </div>

              <div className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
                {stats.totalLines.toLocaleString()} lines • ~{stats.totalTokens.toLocaleString()} tokens
              </div>
            </div>

            {/* Active View */}
            {activeView === 'consolidated' ? (
              <ConsolidatedView
                files={files}
                stats={stats}
                tree={tree}
              />
            ) : (
              <SchematicView
                tree={tree}
                files={files}
                stats={stats}
              />
            )}
          </div>
        )}
      </main>
      <OfflineIndicator />
    </div>
  );
}
