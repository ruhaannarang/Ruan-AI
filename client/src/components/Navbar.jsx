import React, { useState, useEffect } from 'react';
import { getSoundStatus, toggleSound, playClickSound } from '../services/sound';
import RuanBrandLockup from './RuanBrandLockup';
import UserMenu from './auth/UserMenu';
import './Navbar.css';

export default function Navbar({ onOpenDiagnostics, onLaunchApp }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(getSoundStatus());

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSoundToggle = () => {
    const nextState = toggleSound();
    setSoundEnabled(nextState);
  };

  const handleNavClick = (e, targetId) => {
    e.preventDefault();
    playClickSound();
    setMobileMenuOpen(false);
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleLaunch = () => {
    playClickSound();
    setMobileMenuOpen(false);
    if (onLaunchApp) onLaunchApp();
  };

  return (
    <header className={`navbar-wrapper ${isScrolled ? 'scrolled' : ''}`} id="main-navigation">
      <div className="navbar-container">
        {/* Brand Wordmark & Logo */}
        <a 
          href="#hero" 
          className="brand-link" 
          onClick={(e) => handleNavClick(e, 'hero')}
          aria-label="Ruan AI Home"
        >
          <RuanBrandLockup size="sm" showDivider={true} />
        </a>

        {/* Desktop Navigation Links */}
        <nav className="desktop-nav" aria-label="Main Navigation">
          <a href="#about" onClick={(e) => handleNavClick(e, 'about')}>About</a>
          <a href="#capabilities" onClick={(e) => handleNavClick(e, 'capabilities')}>Capabilities</a>
          <a href="#architecture" onClick={(e) => handleNavClick(e, 'architecture')}>Architecture</a>
          <a href="#docs" onClick={(e) => handleNavClick(e, 'docs')}>Documentation</a>
          <a href="#roadmap" onClick={(e) => handleNavClick(e, 'roadmap')}>Roadmap</a>
        </nav>

        {/* Right Action Controls */}
        <div className="nav-controls">
          {/* Sound Toggle */}
          <button
            className={`sound-toggle-btn ${soundEnabled ? 'active' : ''}`}
            onClick={handleSoundToggle}
            aria-label={soundEnabled ? 'Sound effects enabled. Click to mute.' : 'Sound effects muted. Click to enable.'}
            title={soundEnabled ? 'Audio feedback active' : 'Enable audio feedback'}
          >
            <span className="sound-icon" aria-hidden="true">
              {soundEnabled ? '🔊' : '🔇'}
            </span>
            <span className="sound-label font-mono">
              {soundEnabled ? 'AUDIO ON' : 'AUDIO OFF'}
            </span>
          </button>


          {/* Google Account Profile / Sign-in */}
          <UserMenu compact={true} />

          {/* Primary CTA - Launch Ruan App */}
          <button 
            className="btn-primary-cta"
            onClick={handleLaunch}
            aria-label="Launch Ruan AI conversation interface"
          >
            Launch Ruan →
          </button>

          {/* Mobile Menu Toggle Button */}
          <button 
            className="mobile-hamburger-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
          >
            <span className={`hamburger-bar ${mobileMenuOpen ? 'open' : ''}`}></span>
            <span className={`hamburger-bar ${mobileMenuOpen ? 'open' : ''}`}></span>
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-menu-drawer" id="mobile-navigation-drawer">
          <nav className="mobile-nav-links">
            <a href="#about" onClick={(e) => handleNavClick(e, 'about')}>About Ruan</a>
            <a href="#capabilities" onClick={(e) => handleNavClick(e, 'capabilities')}>Core Capabilities</a>
            <a href="#architecture" onClick={(e) => handleNavClick(e, 'architecture')}>Modular Architecture</a>
            <a href="#docs" onClick={(e) => handleNavClick(e, 'docs')}>Documentation</a>
            <a href="#roadmap" onClick={(e) => handleNavClick(e, 'roadmap')}>Development Roadmap</a>
          </nav>
          
          <div className="mobile-menu-actions">
            <button className="mobile-sound-btn" onClick={handleSoundToggle}>
              {soundEnabled ? '🔊 Audio Feedback: Active' : '🔇 Audio Feedback: Muted'}
            </button>
            <button 
              className="mobile-diag-btn"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenDiagnostics();
              }}
            >
              ⚙ View Node Diagnostics
            </button>
            <button 
              className="mobile-cta-btn"
              onClick={handleLaunch}
            >
              Launch Ruan AI App →
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
