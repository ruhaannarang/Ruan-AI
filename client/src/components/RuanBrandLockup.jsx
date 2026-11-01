import React from 'react';
import LogoMark from './LogoMark';
import './RuanBrandLockup.css';

/**
 * Full Ruan AI Brand Lockup Component.
 * Faithfully reproduces the official brand layout:
 * [LogoMark] | Ruan AI
 *              Your AI. Your Machine. Your Rules.
 * 
 * - "Ruan" in pure white title case
 * - "AI" in electric violet (#9055ff / #8B5CF6)
 * - Sleek vertical divider line
 * - Sub-tagline with exact punctuation and casing
 * 
 * @param {Object} props
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Visual scale
 * @param {boolean} [props.showTagline=false] - Whether to show the sub-tagline below Ruan AI
 * @param {boolean} [props.showDivider=true] - Whether to show the vertical divider between mark and text
 * @param {string} [props.className=''] - Additional CSS classes
 */
export default function RuanBrandLockup({
  size = 'md',
  showTagline = false,
  showDivider = true,
  className = ''
}) {
  const iconSizes = {
    sm: 24,
    md: 32,
    lg: 44
  };

  return (
    <div className={`ruan-brand-lockup lockup-${size} ${showTagline ? 'with-tagline' : ''} ${className}`}>
      {/* Icon Mark */}
      <LogoMark size={iconSizes[size] || 32} glow={size === 'lg'} />

      {/* Vertical Divider Line */}
      {showDivider && <div className="brand-lockup-divider" aria-hidden="true" />}

      {/* Typography Group */}
      <div className="brand-lockup-text-group">
        <div className="brand-lockup-title">
          <span className="brand-title-ruan">Ruan</span>
          <span className="brand-title-ai">AI</span>
        </div>

        {showTagline && (
          <div className="brand-lockup-tagline">
            Your AI. Your Machine. Your Rules.
          </div>
        )}
      </div>
    </div>
  );
}
