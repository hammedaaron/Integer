import { IngestedFile, FileTreeNode, IngestionStats } from '../types';
import { formatBytes } from './fileScanner';

export function getLanguageForExtension(ext: string): string {
  const map: Record<string, string> = {
    '.ts': 'typescript',
    '.tsx': 'tsx',
    '.js': 'javascript',
    '.jsx': 'jsx',
    '.json': 'json',
    '.py': 'python',
    '.rs': 'rust',
    '.go': 'go',
    '.java': 'java',
    '.cpp': 'cpp',
    '.c': 'c',
    '.h': 'c',
    '.cs': 'csharp',
    '.php': 'php',
    '.rb': 'ruby',
    '.swift': 'swift',
    '.kt': 'kotlin',
    '.html': 'html',
    '.css': 'css',
    '.scss': 'scss',
    '.sass': 'sass',
    '.less': 'less',
    '.md': 'markdown',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.xml': 'xml',
    '.sql': 'sql',
    '.sh': 'bash',
    '.bash': 'bash',
    '.zsh': 'bash',
    '.dockerfile': 'dockerfile',
    '.env': 'shell',
    '.toml': 'toml',
    '.graphql': 'graphql',
  };
  return map[ext.toLowerCase()] || '';
}

export function generateAsciiTree(node: FileTreeNode): string {
  return generateFullAsciiTree(node);
}

export function buildAsciiTreeLines(node: FileTreeNode, prefix = '', isLast = true): string[] {
  const lines: string[] = [];
  const connector = isLast ? '└── ' : '├── ';
  const icon = node.type === 'directory' ? '📁 ' : '📄 ';
  const meta = node.type === 'directory'
    ? ` (${node.fileCount || 0} files, ${formatBytes(node.size)})`
    : ` (${formatBytes(node.size)})`;

  lines.push(prefix + connector + icon + node.name + meta);

  if (node.children && node.children.length > 0) {
    const childPrefix = prefix + (isLast ? '    ' : '│   ');
    for (let i = 0; i < node.children.length; i++) {
      const childIsLast = i === node.children.length - 1;
      lines.push(...buildAsciiTreeLines(node.children[i], childPrefix, childIsLast));
    }
  }

  return lines;
}

export function generateFullAsciiTree(rootNode: FileTreeNode): string {
  const lines = ['📦 [Project Root]'];
  for (let i = 0; i < rootNode.children.length; i++) {
    const isLast = i === rootNode.children.length - 1;
    lines.push(...buildAsciiTreeLines(rootNode.children[i], '', isLast));
  }
  return lines.join('\n');
}

export function generateConsolidatedTxt(
  files: IngestedFile[],
  stats: IngestionStats,
  tree: FileTreeNode
): string {
  const separator = '='.repeat(80);
  const subSeparator = '-'.repeat(80);
  const dateStr = new Date().toISOString();

  let out = `${separator}\n`;
  out += `CODEBASE & DOCUMENT INGESTION REPORT\n`;
  out += `Generated: ${dateStr}\n`;
  out += `Total Ingested Files: ${stats.totalFiles}\n`;
  out += `Total Size: ${formatBytes(stats.totalBytes)}\n`;
  out += `Total Code/Text Lines: ${stats.totalLines.toLocaleString()}\n`;
  out += `Estimated Tokens: ~${stats.totalTokens.toLocaleString()}\n`;
  out += `${separator}\n\n`;

  out += `DIRECTORY SCHEMATIC & ARRANGEMENT:\n`;
  out += `${subSeparator}\n`;
  out += generateFullAsciiTree(tree);
  out += `\n${subSeparator}\n\n`;

  out += `CONSOLIDATED FILE CONTENTS (${files.length} FILES):\n`;
  out += `${separator}\n\n`;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    out += `${separator}\n`;
    out += `[${i + 1}/${files.length}] FILE: ${file.path}\n`;
    out += `Path: ${file.path}\n`;
    out += `Size: ${formatBytes(file.size)} | Lines: ${file.linesCount} | Est. Tokens: ~${file.estimatedTokens.toLocaleString()}\n`;
    out += `${separator}\n`;
    out += file.content;
    out += `\n\n`;
  }

  out += `${separator}\n`;
  out += `END OF INGESTION - ${files.length} FILES PROCESSED\n`;
  out += `${separator}\n`;

  return out;
}

export function generateConsolidatedMarkdown(
  files: IngestedFile[],
  stats: IngestionStats,
  tree: FileTreeNode
): string {
  const dateStr = new Date().toISOString();

  let md = `# Codebase & Document Ingestion\n\n`;
  md += `> **Ingested on:** ${dateStr}  \n`;
  md += `> **Total Files:** ${stats.totalFiles} | **Total Size:** ${formatBytes(stats.totalBytes)} | **Total Lines:** ${stats.totalLines.toLocaleString()} | **Estimated Tokens:** ~${stats.totalTokens.toLocaleString()}\n\n`;

  md += `## 📊 Ingestion Summary\n\n`;
  md += `| Metric | Value |\n`;
  md += `| :--- | :--- |\n`;
  md += `| **Total Files** | ${stats.totalFiles} |\n`;
  md += `| **Total Directories** | ${stats.totalDirectories} |\n`;
  md += `| **Total Size** | ${formatBytes(stats.totalBytes)} |\n`;
  md += `| **Total Lines** | ${stats.totalLines.toLocaleString()} |\n`;
  md += `| **Estimated Tokens** | ~${stats.totalTokens.toLocaleString()} |\n`;
  md += `| **Binary Placeholders** | ${stats.binaryFilesCount} |\n\n`;

  md += `## 🌳 Schematic Architecture & Directory Arrangement\n\n`;
  md += `\`\`\`text\n`;
  md += generateFullAsciiTree(tree);
  md += `\n\`\`\`\n\n`;

  md += `## 📑 File Index\n\n`;
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const anchor = f.path.toLowerCase().replace(/[^a-z0-9]/g, '-');
    md += `${i + 1}. [\`${f.path}\`](#file-${anchor}) (${formatBytes(f.size)}, ${f.linesCount} lines)\n`;
  }
  md += `\n---\n\n`;

  md += `## 📁 Consolidated File Contents\n\n`;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const lang = getLanguageForExtension(file.extension);
    const anchor = file.path.toLowerCase().replace(/[^a-z0-9]/g, '-');

    md += `### <a id="file-${anchor}"></a>${i + 1}. \`${file.path}\`\n\n`;
    md += `* **Path:** \`${file.path}\`\n`;
    md += `* **Size:** ${formatBytes(file.size)} | **Lines:** ${file.linesCount} | **Est. Tokens:** ~${file.estimatedTokens.toLocaleString()}\n\n`;

    if (file.isImage) {
      md += `> 🖼️ *${file.content}*\n\n`;
    } else if (file.isBinary) {
      md += `> ⚠️ *${file.content}*\n\n`;
    } else {
      md += `\`\`\`${lang}\n`;
      md += file.content;
      md += `\n\`\`\`\n\n`;
    }
    md += `---\n\n`;
  }

  return md;
}

export function generateConsolidatedJson(
  files: IngestedFile[],
  stats: IngestionStats,
  tree: FileTreeNode
): string {
  const data = {
    metadata: {
      generatedAt: new Date().toISOString(),
      generator: 'Integer',
      stats,
    },
    schematicTree: tree,
    files: files.map((f) => ({
      path: f.path,
      name: f.name,
      directory: f.directory,
      extension: f.extension,
      size: f.size,
      sizeFormatted: formatBytes(f.size),
      linesCount: f.linesCount,
      estimatedTokens: f.estimatedTokens,
      isBinary: f.isBinary,
      isImage: !!f.isImage,
      content: f.content,
    })),
  };
  return JSON.stringify(data, null, 2);
}

export function generateSchematicJson(tree: FileTreeNode): string {
  return JSON.stringify(tree, null, 2);
}

export function generateMermaidTree(root: FileTreeNode): string {
  let lines: string[] = ['graph LR'];
  lines.push('  classDef dir fill:#1e293b,stroke:#3b82f6,stroke-width:1.5px,color:#f8fafc,font-weight:bold;');
  lines.push('  classDef file fill:#0f172a,stroke:#64748b,stroke-width:1px,color:#e2e8f0;');

  let idCounter = 0;
  function traverse(node: FileTreeNode, parentId?: string): string {
    const currentId = `node_${idCounter++}`;
    const cleanLabel = node.name.replace(/["\n]/g, '');

    if (node.type === 'directory') {
      lines.push(`  ${currentId}["📁 ${cleanLabel}/"]:::dir`);
    } else {
      lines.push(`  ${currentId}["📄 ${cleanLabel}"]:::file`);
    }

    if (parentId) {
      lines.push(`  ${parentId} --> ${currentId}`);
    }

    // Limit diagram depth or size for readability if vast
    if (node.children) {
      for (const child of node.children.slice(0, 40)) {
        traverse(child, currentId);
      }
      if (node.children.length > 40) {
        const moreId = `node_${idCounter++}`;
        lines.push(`  ${moreId}["... ${node.children.length - 40} more items"]:::file`);
        lines.push(`  ${currentId} --> ${moreId}`);
      }
    }

    return currentId;
  }

  traverse(root);
  return lines.join('\n');
}

export function generateSchematicSvg(tree: FileTreeNode): string {
  const width = 1200;
  const itemHeight = 30;
  const asciiLines = [
    '📦 [Project Root]',
    ...tree.children.map((c, idx) => buildAsciiTreeLines(c, '', idx === tree.children.length - 1)).flat()
  ];
  const height = Math.max(400, (asciiLines.length + 6) * itemHeight);

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#090d16" />
      <stop offset="100%" stop-color="#0f172a" />
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bgGrad)" rx="12" />
  <rect x="20" y="20" width="${width - 40}" height="50" rx="8" fill="#1e293b" stroke="#334155" />
  <text x="40" y="52" fill="#f8fafc" font-family="monospace, sans-serif" font-size="16" font-weight="bold">SCHEMATIC CODEBASE ARCHITECTURE &amp; DIRECTORY ARRANGEMENT</text>
  <text x="${width - 50}" y="52" text-anchor="end" fill="#94a3b8" font-family="monospace" font-size="12">Total: ${tree.fileCount || 0} files (${formatBytes(tree.size)})</text>
  <g transform="translate(30, 95)" font-family="monospace, Menlo, Consolas" font-size="13">`;

  asciiLines.forEach((line, index) => {
    const y = index * 24;
    const isDir = line.includes('📁') || line.includes('📦');
    const color = isDir ? '#60a5fa' : '#cbd5e1';
    const escaped = line
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    svg += `\n    <text x="10" y="${y}" fill="${color}">${escaped}</text>`;
  });

  svg += `\n  </g>\n</svg>`;
  return svg;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  downloadBlob(blob, filename);
}
