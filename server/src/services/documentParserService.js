/**
 * Ruan AI — Document & Multimodal Parser Service
 * Safely extracts text from PDFs, text, markdown, CSV, JSON, and source code files.
 * Validates and prepares images for multimodal LLM vision analysis.
 */

import { PDFParse } from 'pdf-parse';

// Maximum extracted document text character length to protect context window
const MAX_DOCUMENT_CHARS = 100000;

// Supported plain text extensions
const TEXT_EXTENSIONS = new Set([
  'txt', 'md', 'markdown', 'json', 'csv', 'tsv', 'log',
  'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'h', 'hpp',
  'cs', 'html', 'css', 'scss', 'xml', 'yaml', 'yml', 'sql', 'sh', 'bat', 'ps1'
]);

// Supported image extensions and MIME types
const IMAGE_MIME_TYPES = new Set([
  'image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'
]);

export class DocumentParserService {
  /**
   * Identifies file category based on MIME type and filename.
   * @param {string} filename
   * @param {string} [mimeType]
   * @returns {'image' | 'pdf' | 'text' | 'unknown'}
   */
  static getFileType(filename = '', mimeType = '') {
    if (IMAGE_MIME_TYPES.has(mimeType.toLowerCase())) {
      return 'image';
    }

    const ext = filename.split('.').pop()?.toLowerCase() || '';

    if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) {
      return 'image';
    }

    if (ext === 'pdf' || mimeType === 'application/pdf') {
      return 'pdf';
    }

    if (TEXT_EXTENSIONS.has(ext) || mimeType.startsWith('text/')) {
      return 'text';
    }

    return 'unknown';
  }

  /**
   * Parses an uploaded file into structured document content or image payload.
   * 
   * @param {Object} file
   * @param {string} file.name - Original filename
   * @param {string} [file.type] - MIME type
   * @param {string} [file.data] - Base64 encoded string or data URL
   * @param {Buffer} [file.buffer] - Raw file Buffer
   * @returns {Promise<{ type: 'image' | 'document', name: string, content: string, mimeType?: string, pages?: number }>}
   */
  static async parseAttachment(file) {
    if (!file) {
      throw new Error('Attachment object is required');
    }

    const name = file.name || 'unnamed_file';
    let mimeType = file.type || '';
    let buffer = file.buffer;
    const rawData = file.data || file.dataUrl;

    // Decode base64 data URL if buffer is not provided
    if (!buffer && rawData) {
      const match = rawData.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = mimeType || match[1];
        buffer = Buffer.from(match[2], 'base64');
      } else {
        buffer = Buffer.from(rawData, 'base64');
      }
    }

    if (!buffer) {
      throw new Error(`No file content provided for attachment: ${name}`);
    }

    const detectedType = DocumentParserService.getFileType(name, mimeType);

    // 1. Image Attachment
    if (detectedType === 'image') {
      const finalMime = mimeType || 'image/jpeg';
      const base64Str = buffer.toString('base64');
      const dataUrl = `data:${finalMime};base64,${base64Str}`;

      return {
        type: 'image',
        name,
        mimeType: finalMime,
        dataUrl,
        sizeBytes: buffer.length
      };
    }

    // 2. PDF Document
    if (detectedType === 'pdf') {
      let parser = null;
      try {
        parser = new PDFParse({ data: buffer });
        const textResult = await parser.getText();
        let extractedText = textResult && textResult.text ? textResult.text.trim() : '';
        const pages = (textResult && textResult.total) || 1;

        if (extractedText.length > MAX_DOCUMENT_CHARS) {
          extractedText = extractedText.slice(0, MAX_DOCUMENT_CHARS) + '\n\n[...Document truncated for length...]';
        }

        return {
          type: 'document',
          name,
          pages,
          content: extractedText || '(PDF contained no selectable text or scanned pages only.)',
          sizeBytes: buffer.length
        };
      } catch (pdfErr) {
        console.warn(`[DocumentParser] Failed to parse PDF '${name}':`, pdfErr.message);
        throw new Error(`Could not parse PDF '${name}': ${pdfErr.message}`);
      } finally {
        if (parser && typeof parser.destroy === 'function') {
          try {
            await parser.destroy();
          } catch {}
        }
      }
    }

    // 3. Plain Text / Code / Markdown / CSV / JSON
    if (detectedType === 'text') {
      let text = buffer.toString('utf-8');
      if (text.length > MAX_DOCUMENT_CHARS) {
        text = text.slice(0, MAX_DOCUMENT_CHARS) + '\n\n[...File truncated for length...]';
      }

      return {
        type: 'document',
        name,
        content: text,
        sizeBytes: buffer.length
      };
    }

    // 4. Fallback for unrecognized formats (attempt UTF-8 text if valid)
    try {
      let fallbackText = buffer.toString('utf-8');
      // If it looks like mostly printable text
      if (/^[\x20-\x7E\r\n\t]*$/.test(fallbackText.slice(0, 500))) {
        if (fallbackText.length > MAX_DOCUMENT_CHARS) {
          fallbackText = fallbackText.slice(0, MAX_DOCUMENT_CHARS) + '\n\n[...File truncated...]';
        }
        return {
          type: 'document',
          name,
          content: fallbackText,
          sizeBytes: buffer.length
        };
      }
    } catch {}

    throw new Error(`Unsupported file format for '${name}'. Supported formats include images (PNG, JPG, WEBP, GIF), PDFs, text, markdown, CSV, JSON, and source code files.`);
  }

  /**
   * Formats parsed documents into structured LLM context and combines with images.
   * 
   * @param {string} userPrompt - Original text prompt from user
   * @param {Array<Object>} attachments - List of raw file attachment objects
   * @returns {Promise<{ formattedContent: string | Array<Object>, images: Array<Object>, documents: Array<Object> }>}
   */
  static async processAttachmentsForChat(userPrompt, attachments = []) {
    if (!Array.isArray(attachments) || attachments.length === 0) {
      return {
        formattedContent: userPrompt,
        images: [],
        documents: []
      };
    }

    const parsedItems = await Promise.all(
      attachments.map(att => DocumentParserService.parseAttachment(att))
    );

    const images = parsedItems.filter(item => item.type === 'image');
    const documents = parsedItems.filter(item => item.type === 'document');

    let documentContext = '';
    if (documents.length > 0) {
      const docSections = documents.map(doc => {
        const header = doc.pages ? `--- BEGIN DOCUMENT: ${doc.name} (${doc.pages} pages) ---` : `--- BEGIN DOCUMENT: ${doc.name} ---`;
        return `${header}\n${doc.content}\n--- END DOCUMENT: ${doc.name} ---`;
      });
      documentContext = docSections.join('\n\n') + '\n\n';
    }

    const combinedText = documentContext ? `${documentContext}User Prompt:\n${userPrompt || 'Please analyze the attached document(s).'}` : userPrompt;

    // If there are images, format into OpenAI-compatible multimodal content array
    if (images.length > 0) {
      const contentParts = [
        { type: 'text', text: combinedText }
      ];

      for (const img of images) {
        contentParts.push({
          type: 'image_url',
          image_url: {
            url: img.dataUrl
          }
        });
      }

      return {
        formattedContent: contentParts,
        images,
        documents
      };
    }

    return {
      formattedContent: combinedText,
      images: [],
      documents
    };
  }
}

