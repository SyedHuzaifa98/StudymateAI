import fs from 'fs';
import pdfParse from 'pdf-parse';

/**
 * Extracts text from PDF with per-page breakdown and scanned-PDF detection
 * @param {string} filePath
 * @returns {Promise<{ pages: Array<{ pageNumber: number, text: string }>, totalPages: number, rawText: string }>}
 */
export const extractPdfContent = async (filePath) => {
  const dataBuffer = fs.readFileSync(filePath);
  
  const pages = [];
  let pageCounter = 0;

  // Custom pager render to capture individual pages
  const options = {
    pagerender: (pageData) => {
      pageCounter++;
      const currentNumber = pageCounter;
      return pageData.getTextContent().then((textContent) => {
        let lastY, text = '';
        for (const item of textContent.items) {
          if (lastY === item.transform[5] || !lastY) {
            text += item.str;
          } else {
            text += '\n' + item.str;
          }
          lastY = item.transform[5];
        }
        pages.push({
          pageNumber: currentNumber,
          text: text.trim()
        });
        return text;
      });
    }
  };

  const parsed = await pdfParse(dataBuffer, options);

  // Validate if document is a scanned image or empty PDF
  const totalExtractedChars = pages.reduce((acc, p) => acc + p.text.replace(/\s+/g, '').length, 0);

  if (pages.length === 0 || totalExtractedChars < 40) {
    throw new Error(
      'This PDF appears to be scanned or contains only images. Version 1 requires text-based PDFs. Please upload a PDF with readable digital text or notes.'
    );
  }

  return {
    pages: pages.sort((a, b) => a.pageNumber - b.pageNumber),
    totalPages: parsed.numpages || pages.length,
    rawText: parsed.text
  };
};

/**
 * Splits extracted pages into chunks with page numbers and overlaps
 * @param {Array<{ pageNumber: number, text: string }>} pages
 * @param {number} chunkSize Characters per chunk
 * @param {number} overlap Characters overlap between chunks
 * @returns {Array<{ pageNumber: number, content: string, chunkIndex: number }>}
 */
export const chunkExtractedPages = (pages, chunkSize = 700, overlap = 100) => {
  const chunks = [];
  let globalChunkIndex = 0;

  for (const page of pages) {
    const text = page.text.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').trim();
    if (!text || text.length < 20) continue;

    // Split text by paragraphs / sentences or fixed size with boundary awareness
    let start = 0;
    while (start < text.length) {
      let end = start + chunkSize;
      if (end >= text.length) {
        end = text.length;
      } else {
        // Try to break at a period, question mark, newline, or space
        const nextBreak = text.substring(start, end).search(/([.\n\?!]\s+|\n{2,})/);
        const lastPeriod = text.lastIndexOf('. ', end);
        const lastNewline = text.lastIndexOf('\n', end);
        const breakPoint = Math.max(lastPeriod, lastNewline);

        if (breakPoint > start + chunkSize * 0.6) {
          end = breakPoint + 1;
        }
      }

      const chunkContent = text.substring(start, end).trim();
      if (chunkContent.length >= 30) {
        chunks.push({
          pageNumber: page.pageNumber,
          content: chunkContent,
          chunkIndex: globalChunkIndex++
        });
      }

      if (end >= text.length) break;
      start = end - overlap;
      if (start <= 0 || start >= text.length) break;
    }
  }

  return chunks;
};
