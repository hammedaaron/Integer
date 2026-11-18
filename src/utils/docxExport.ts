import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  ImageRun,
} from 'docx';
import { IngestedFile, FileTreeNode, IngestionStats } from '../types';
import { formatBytes } from './fileScanner';
import { generateFullAsciiTree } from './formatter';

function getDocxImageType(ext: string): 'png' | 'jpg' | 'gif' | 'bmp' | null {
  const clean = ext.replace(/^\./, '').toLowerCase();
  if (clean === 'png') return 'png';
  if (clean === 'jpg' || clean === 'jpeg') return 'jpg';
  if (clean === 'gif') return 'gif';
  if (clean === 'bmp') return 'bmp';
  return null;
}

export async function generateDocxDocument(
  files: IngestedFile[],
  stats: IngestionStats,
  tree: FileTreeNode
): Promise<Blob> {
  const children: Paragraph[] = [];

  // Document Title
  children.push(
    new Paragraph({
      text: 'Codebase & Document Ingestion Report',
      heading: HeadingLevel.TITLE,
      spacing: { after: 200 },
    })
  );

  // Metadata Paragraph
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'Generated: ', bold: true }),
        new TextRun(new Date().toLocaleString()),
        new TextRun({ text: ' | Total Files: ', bold: true }),
        new TextRun(`${stats.totalFiles}`),
        new TextRun({ text: ' | Total Size: ', bold: true }),
        new TextRun(formatBytes(stats.totalBytes)),
        new TextRun({ text: ' | Total Lines: ', bold: true }),
        new TextRun(`${stats.totalLines.toLocaleString()}`),
      ],
      spacing: { after: 300 },
    })
  );

  // Directory Tree Section
  children.push(
    new Paragraph({
      text: 'Directory Schematic & Arrangement',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 200, after: 150 },
    })
  );

  const treeLines = generateFullAsciiTree(tree).split('\n');
  for (const line of treeLines) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: line,
            font: 'Courier New',
            size: 18, // 9pt
          }),
        ],
        spacing: { after: 30 },
      })
    );
  }

  // File Index Heading
  children.push(
    new Paragraph({
      text: 'File Contents',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 300, after: 200 },
    })
  );

  // Add each file
  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    children.push(
      new Paragraph({
        text: `[${i + 1}/${files.length}] ${file.path}`,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 100 },
      })
    );

    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Path: ', bold: true }),
          new TextRun(file.path),
          new TextRun({ text: ' | Size: ', bold: true }),
          new TextRun(formatBytes(file.size)),
          new TextRun({ text: ' | Type: ', bold: true }),
          new TextRun(file.isImage ? 'Image Asset' : file.isBinary ? 'Binary File' : 'Source Code / Text'),
        ],
        spacing: { after: 120 },
      })
    );

    const docxImgType = getDocxImageType(file.extension);

    // If file is a supported image, embed the actual visual image into the DOCX!
    if (file.isImage && docxImgType && file.imageData && file.imageData.length > 0) {
      try {
        children.push(
          new Paragraph({
            children: [
              new ImageRun({
                type: docxImgType,
                data: file.imageData,
                transformation: {
                  width: 450,
                  height: 300,
                },
              }),
            ],
            spacing: { after: 200 },
          })
        );
      } catch (err) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `[Embedded Image: ${file.name} (${formatBytes(file.size)})]`,
                italics: true,
                color: '666666',
              }),
            ],
            spacing: { after: 120 },
          })
        );
      }
    } else if (file.isBinary) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `[Binary content omitted: ${file.name} (${formatBytes(file.size)})]`,
              italics: true,
              color: '888888',
            }),
          ],
          spacing: { after: 120 },
        })
      );
    } else {
      // Source code / text file content
      const lines = file.content.split('\n');
      for (const line of lines) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: line || ' ',
                font: 'Courier New',
                size: 18,
              }),
            ],
            spacing: { after: 20 },
          })
        );
      }
    }

    // Divider between files
    children.push(
      new Paragraph({
        text: '--------------------------------------------------------------------------------',
        spacing: { after: 200 },
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  return await Packer.toBlob(doc);
}
