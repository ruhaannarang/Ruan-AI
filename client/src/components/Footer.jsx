import React from 'react';
import { playClickSound } from '../services/sound';
import './Footer.css';

export default function Footer({ onExploreDocs }) {
  const handleScrollTo = (e, targetId) => {
    e.preventDefault();
    playClickSound();
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="footer-wrapper" role="contentinfo">
      <div className="footer-container">
        {/* Top Col: Brand & Info */}
        <div className="footer-main-grid">
          <div className="footer-brand-col">
            <div className="footer-logo">
              <div className="footer-logo-orb" aria-hidden="true"></div>
              <span className="footer-logo-text">RUAN<span className="accent-ai">AI</span></span>
            </div>
            <p className="footer-bio">
              A personal, local-first AI companion designed to run autonomously on your machine. Combining conversational intelligence, streaming voice, persistent memory, and supervised tool workflows into a sovereign experience.
            </p>
            <div className="footer-tagline font-mono">
              YOUR AI. YOUR MACHINE. YOUR RULES.
            </div>
          </div>

          {/* Navigation Column */}
          <div className="footer-links-col">
            <h4 className="footer-col-title font-mono">NAVIGATION</h4>
            <ul className="footer-nav-list">
              <li><a href="#hero" onClick={(e) => handleScrollTo(e, 'hero')}>Home</a></li>
              <li><a href="#about" onClick={(e) => handleScrollTo(e, 'about')}>About Ruan</a></li>
              <li><a href="#capabilities" onClick={(e) => handleScrollTo(e, 'capabilities')}>Core Capabilities</a></li>
              <li><a href="#architecture" onClick={(e) => handleScrollTo(e, 'architecture')}>Modular Architecture</a></li>
              <li><a href="#privacy" onClick={(e) => handleScrollTo(e, 'privacy')}>Privacy &amp; Security</a></li>
              <li><a href="#roadmap" onClick={(e) => handleScrollTo(e, 'roadmap')}>Development Roadmap</a></li>
            </ul>
          </div>

          {/* Documentation Column */}
          <div className="footer-links-col">
            <h4 className="footer-col-title font-mono">DOCUMENTATION</h4>
            <ul className="footer-nav-list">
              <li><a href="#docs" onClick={(e) => { e.preventDefault(); onExploreDocs(); }}>Getting Started</a></li>
              <li><a href="#docs" onClick={(e) => { e.preventDefault(); onExploreDocs(); }}>Local Model Setup</a></li>
              <li><a href="#docs" onClick={(e) => { e.preventDefault(); onExploreDocs(); }}>Voice Architecture</a></li>
              <li><a href="#docs" onClick={(e) => { e.preventDefault(); onExploreDocs(); }}>API Reference</a></li>
              <li><a href="#docs" onClick={(e) => { e.preventDefault(); onExploreDocs(); }}>Security &amp; Sandboxing</a></li>
            </ul>
          </div>

          {/* Repository & Open Source */}
          <div className="footer-links-col">
            <h4 className="footer-col-title font-mono">OPEN SOURCE</h4>
            <p className="footer-os-desc">
              Ruan AI is built openly with a modular architecture and developer-first standards.
            </p>
            <a 
              href="https://github.com/ruhaannarang/Ruan-AI" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="footer-github-link font-mono"
            >
              <span>github.com/ruhaannarang/Ruan-AI</span>
              <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Principles */}
        <div className="footer-bottom-bar">
          <div className="copyright-text">
            © {new Date().getFullYear()} Ruan AI. Developed under the MIT License. All rights reserved.
          </div>
          <div className="footer-meta font-mono">
            <span>LOCAL LOOPBACK (127.0.0.1)</span>
            <span>NO COOKIES</span>
            <span>NO TELEMETRY</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
