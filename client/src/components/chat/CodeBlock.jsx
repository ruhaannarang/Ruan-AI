import React, { useState } from 'react';
import './CodeBlock.css';

/**
 * Lightweight pure React syntax highlighter.
 * Tokenizes code into keywords, strings, comments, numbers, and functions without any external dependencies or unsafe HTML.
 */
function highlightCode(code, language = '') {
  const lang = (language || '').toLowerCase().trim();
  const lines = code.split('\n');

  // Common keywords across JS, TS, Python, Bash, SQL, Go, Rust, C++
  const KEYWORDS = new Set([
    'const', 'let', 'var', 'function', 'return', 'import', 'export', 'default', 'from',
    'if', 'else', 'for', 'while', 'switch', 'case', 'break', 'continue', 'class', 'extends',
    'new', 'this', 'super', 'try', 'catch', 'finally', 'throw', 'async', 'await', 'yield',
    'def', 'elif', 'pass', 'lambda', 'with', 'as', 'in', 'is', 'not', 'and', 'or',
    'select', 'insert', 'update', 'delete', 'where', 'join', 'group', 'by', 'order',
    'true', 'false', 'null', 'undefined', 'None', 'True', 'False'
  ]);

  return lines.map((line, lineIdx) => {
    // Check for comment line
    if (line.trim().startsWith('//') || line.trim().startsWith('#')) {
      return (
        <div key={lineIdx} className="code-line">
          <span className="tok-comment">{line}</span>
        </div>
      );
    }

    // Tokenize line using regex matcher
    const tokens = [];
    const tokenRegex = /(\/\/.*$|#.*$|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\b\d+(?:\.\d+)?\b|\b[A-Za-z_$][A-Za-z0-9_$]*(?=\s*\()|\b[A-Za-z_$][A-Za-z0-9_$]*\b|[{}()[\].,;:+\-*/%=<>!&|^~?])/g;

    let lastIndex = 0;
    let match;

    while ((match = tokenRegex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        tokens.push({
          type: 'plain',
          text: line.slice(lastIndex, match.index)
        });
      }

      const text = match[0];
      let type = 'plain';

      if (text.startsWith('//') || text.startsWith('#')) {
        type = 'comment';
      } else if (text.startsWith('"') || text.startsWith("'") || text.startsWith('`')) {
        type = 'string';
      } else if (/^\d/.test(text)) {
        type = 'number';
      } else if (KEYWORDS.has(text)) {
        type = 'keyword';
      } else if (line[match.index + text.length] === '(') {
        type = 'function';
      } else if (/[{}()[\].,;:+\-*/%=<>!&|^~?]/.test(text)) {
        type = 'punctuation';
      }

      tokens.push({ type, text });
      lastIndex = tokenRegex.lastIndex;
    }

    if (lastIndex < line.length) {
      tokens.push({
        type: 'plain',
        text: line.slice(lastIndex)
      });
    }

    return (
      <div key={lineIdx} className="code-line">
        <span className="line-number" aria-hidden="true">{lineIdx + 1}</span>
        <span className="line-content">
          {tokens.map((tok, tokIdx) => (
            <span key={tokIdx} className={`tok-${tok.type}`}>
              {tok.text}
            </span>
          ))}
        </span>
      </div>
    );
  });
}

export default function CodeBlock({ code, language = 'text' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = code;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Failed to copy code snippet:', err);
    }
  };

  const cleanLang = (language || 'code').replace(/^(language-|lang-)/, '') || 'code';

  return (
    <div className="ruan-code-block" data-language={cleanLang}>
      <div className="code-header">
        <span className="code-lang-badge font-mono">{cleanLang}</span>
        <button
          className={`code-copy-btn font-mono ${copied ? 'copied' : ''}`}
          onClick={handleCopy}
          aria-label={copied ? 'Code snippet copied' : 'Copy code snippet'}
          type="button"
        >
          {copied ? (
            <>
              <svg className="copy-icon check-icon" viewBox="0 0 16 16" fill="currentColor">
                <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
              </svg>
              <span>Copied</span>
            </>
          ) : (
            <>
              <svg className="copy-icon" viewBox="0 0 16 16" fill="currentColor">
                <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 010 1.5h-1.5a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-1.5a.75.75 0 011.5 0v1.5A1.75 1.75 0 019.25 16h-7.5A1.75 1.75 0 010 14.25v-7.5z" />
                <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0114.25 11h-7.5A1.75 1.75 0 015 9.25v-7.5zm1.75-.25a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25h-7.5z" />
              </svg>
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      <div className="code-content-wrapper">
        <pre className="code-pre font-mono">
          <code>{highlightCode(code, cleanLang)}</code>
        </pre>
      </div>
    </div>
  );
}
