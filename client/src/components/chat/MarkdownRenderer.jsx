import React from 'react';
import CodeBlock from './CodeBlock';
import './MarkdownRenderer.css';

/**
 * Validates link destination URL.
 * Strictly permits only http, https, and mailto protocols.
 * Rejects javascript:, data:, vbscript:, and any arbitrary or malformed protocols.
 * 
 * @param {string} rawUrl
 * @returns {string|null} Validated URL string, or null if rejected.
 */
export function sanitizeLinkUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();

  // Reject obvious dangerous strings before URL parsing
  if (/^javascript:/i.test(trimmed) || /^data:/i.test(trimmed) || /^vbscript:/i.test(trimmed)) {
    return null;
  }

  // Handle mailto: protocol
  if (/^mailto:[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i.test(trimmed)) {
    return trimmed;
  }

  // Handle relative hash links or root-relative paths
  if (trimmed.startsWith('#') || trimmed.startsWith('/')) {
    return trimmed;
  }

  // Standard absolute URL validation
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.href;
    }
  } catch {
    // Malformed URL string
    return null;
  }

  return null;
}

/**
 * Parses inline markdown (bold, italic, inline code, links) into React elements.
 * Defends against malformed tokens and prevents script injection via URLs.
 * 
 * @param {string} text
 * @returns {React.ReactNode[]}
 */
function parseInline(text) {
  if (!text || typeof text !== 'string') return [];

  try {
    // Match: `code`, [text](url), **bold**, *italic*
    const regex = /(`[^`]+`|\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|\*[^*]+\*|__[^_]+__|_[^_]+_)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }

      const token = match[0];

      if (token.startsWith('`') && token.endsWith('`')) {
        // Inline code
        parts.push(
          <code key={`code_${match.index}`} className="inline-code font-mono">
            {token.slice(1, -1)}
          </code>
        );
      } else if (token.startsWith('[') && token.includes('](') && token.endsWith(')')) {
        // Link with strict protocol validation
        const closingBracket = token.indexOf('](');
        const linkText = token.slice(1, closingBracket);
        const linkUrl = token.slice(closingBracket + 2, -1);
        const safeUrl = sanitizeLinkUrl(linkUrl);

        if (safeUrl) {
          parts.push(
            <a
              key={`link_${match.index}`}
              href={safeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="md-link"
            >
              {linkText}
            </a>
          );
        } else {
          // Protocol rejected (e.g. javascript:). Render safe plain text badge.
          parts.push(
            <span
              key={`unsafe_${match.index}`}
              className="md-unsafe-link"
              title="Link protocol blocked for security (only HTTP, HTTPS, and mailto allowed)"
            >
              {linkText}
            </span>
          );
        }
      } else if (
        (token.startsWith('**') && token.endsWith('**')) ||
        (token.startsWith('__') && token.endsWith('__'))
      ) {
        // Bold
        parts.push(
          <strong key={`bold_${match.index}`} className="md-bold">
            {token.slice(2, -2)}
          </strong>
        );
      } else if (
        (token.startsWith('*') && token.endsWith('*')) ||
        (token.startsWith('_') && token.endsWith('_'))
      ) {
        // Italic
        parts.push(
          <em key={`italic_${match.index}`} className="md-italic">
            {token.slice(1, -1)}
          </em>
        );
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts;
  } catch (err) {
    console.warn('[MarkdownRenderer] Inline parse exception:', err);
    return [text];
  }
}

/**
 * Parses markdown table lines into a React table element.
 * Safely handles malformed rows or uneven columns.
 * 
 * @param {string[]} lines
 * @param {string} keyPrefix
 * @returns {React.ReactElement|null}
 */
function parseTable(lines, keyPrefix) {
  if (!Array.isArray(lines) || lines.length < 2) return null;

  try {
    const parseRow = (line) =>
      line
        .split('|')
        .slice(1, -1)
        .map((c) => c.trim());

    const headers = parseRow(lines[0]);
    if (!headers || headers.length === 0) return null;

    const isSeparator = /^\|?[\s-:]+\|[\s-:]+\|?$/.test(lines[1]);
    if (!isSeparator) return null;

    const dataRows = lines.slice(2).map(parseRow);

    return (
      <div key={keyPrefix} className="md-table-wrapper">
        <table className="md-table">
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={i}>{parseInline(h)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataRows.map((row, rIdx) => (
              <tr key={rIdx}>
                {row.map((cell, cIdx) => (
                  <td key={cIdx}>{parseInline(cell)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  } catch (err) {
    console.warn('[MarkdownRenderer] Table parse exception:', err);
    return null;
  }
}

/**
 * Safe, zero-dependency React Markdown Renderer.
 * Converts markdown text into structured React nodes with support for code blocks, tables, headings, and lists.
 * Preserves safe React rendering with zero dangerous HTML insertion.
 */
export default function MarkdownRenderer({ content }) {
  if (!content || typeof content !== 'string') return null;

  try {
    const blocks = [];
    const lines = content.split('\n');
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // 1. Fenced Code Block
      if (line.trim().startsWith('```')) {
        const lang = line.trim().slice(3).trim();
        const codeLines = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        blocks.push(
          <CodeBlock
            key={`code_${i}`}
            code={codeLines.join('\n')}
            language={lang || 'text'}
          />
        );
        i++;
        continue;
      }

      // 2. Table Block
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        const tableLines = [];
        while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
          tableLines.push(lines[i].trim());
          i++;
        }
        const tableEl = parseTable(tableLines, `table_${i}`);
        if (tableEl) {
          blocks.push(tableEl);
          continue;
        }
        // If table parsing failed, roll back to process lines normally
        i -= tableLines.length;
      }

      // 3. Headings
      if (line.startsWith('# ')) {
        blocks.push(<h1 key={`h1_${i}`} className="md-h1">{parseInline(line.slice(2))}</h1>);
        i++;
        continue;
      }
      if (line.startsWith('## ')) {
        blocks.push(<h2 key={`h2_${i}`} className="md-h2">{parseInline(line.slice(3))}</h2>);
        i++;
        continue;
      }
      if (line.startsWith('### ')) {
        blocks.push(<h3 key={`h3_${i}`} className="md-h3">{parseInline(line.slice(4))}</h3>);
        i++;
        continue;
      }
      if (line.startsWith('#### ')) {
        blocks.push(<h4 key={`h4_${i}`} className="md-h4">{parseInline(line.slice(5))}</h4>);
        i++;
        continue;
      }

      // 4. Blockquotes
      if (line.startsWith('> ')) {
        const quoteLines = [];
        while (i < lines.length && lines[i].startsWith('> ')) {
          quoteLines.push(lines[i].slice(2));
          i++;
        }
        blocks.push(
          <blockquote key={`quote_${i}`} className="md-blockquote">
            {quoteLines.map((ql, qIdx) => (
              <p key={qIdx}>{parseInline(ql)}</p>
            ))}
          </blockquote>
        );
        continue;
      }

      // 5. Unordered Lists (- or *)
      if (/^\s*[-*]\s+/.test(line)) {
        const items = [];
        while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
          items.push(lines[i].replace(/^\s*[-*]\s+/, ''));
          i++;
        }
        blocks.push(
          <ul key={`ul_${i}`} className="md-ul">
            {items.map((item, idx) => (
              <li key={idx}>{parseInline(item)}</li>
            ))}
          </ul>
        );
        continue;
      }

      // 6. Ordered Lists (1., 2., etc.)
      if (/^\s*\d+\.\s+/.test(line)) {
        const items = [];
        while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
          items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
          i++;
        }
        blocks.push(
          <ol key={`ol_${i}`} className="md-ol">
            {items.map((item, idx) => (
              <li key={idx}>{parseInline(item)}</li>
            ))}
          </ol>
        );
        continue;
      }

      // 7. Empty line
      if (!line.trim()) {
        i++;
        continue;
      }

      // 8. Normal Paragraph
      const paraLines = [line];
      i++;
      while (
        i < lines.length &&
        lines[i].trim() &&
        !lines[i].trim().startsWith('```') &&
        !lines[i].trim().startsWith('|') &&
        !lines[i].startsWith('#') &&
        !lines[i].startsWith('> ') &&
        !/^\s*[-*]\s+/.test(lines[i]) &&
        !/^\s*\d+\.\s+/.test(lines[i])
      ) {
        paraLines.push(lines[i]);
        i++;
      }

      blocks.push(
        <p key={`p_${i}`} className="md-para">
          {parseInline(paraLines.join(' '))}
        </p>
      );
    }

    return <div className="ruan-markdown">{blocks}</div>;
  } catch (err) {
    console.error('[MarkdownRenderer] Unhandled parse exception, falling back to plain text:', err);
    return (
      <div className="ruan-markdown fallback-text">
        {content.split('\n').map((line, idx) => (
          <p key={idx} className="md-para">{line || '\u00A0'}</p>
        ))}
      </div>
    );
  }
}
