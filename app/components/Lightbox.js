'use client';

import React, { useState, useEffect } from 'react';

const Lightbox = ({ media, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(media?.initialIndex || 0);

  useEffect(() => {
    setCurrentIndex(media?.initialIndex || 0);
  }, [media]);

  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const goNext = () => {
    if (currentIndex < media.list.length - 1) setCurrentIndex(currentIndex + 1);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, currentIndex, media]);

  if (!media || !media.list || media.list.length === 0) return null;

  const currentMedia = media.list[currentIndex];
  const isVideo = currentMedia.url.toLowerCase().match(/\.(mp4|webm|mov|avi)$/);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };



  const getAvatarSrc = (name) => {
    if (!name) return null;
    const n = name.toLowerCase();
    if (n.includes('atanu')) return '/atanu.png';
    if (n.includes('narayani')) return '/narayani.png';
    return null;
  };

  const renderAvatarContent = (name) => {
    const src = getAvatarSrc(name);
    if (src) return <img src={src} alt={name || 'User'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
    return <div className="wa-avatar-placeholder" style={{ backgroundColor: '#6b7c85', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{name ? name.charAt(0) : 'U'}</div>;
  };

  return (
    <div className="wa-lightbox-overlay" onClick={handleOverlayClick}>
      <div className="wa-lightbox-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div className="wa-avatar" style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
             {renderAvatarContent(currentMedia.sender)}
          </div>
          <div className="wa-lightbox-info">
            <span className="wa-lightbox-name">{currentMedia.sender || 'You'}</span>
            <span className="wa-lightbox-date">{currentMedia.date} at {currentMedia.time} {media.list.length > 1 ? `(${currentIndex + 1}/${media.list.length})` : ''}</span>
          </div>
        </div>
        <div className="wa-lightbox-close" onClick={onClose}>
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path fill="currentColor" d="M19.1,4.9L19.1,4.9c-0.3-0.3-0.6-0.3-0.9,0L12,11.1L5.8,4.9c-0.3-0.3-0.6-0.3-0.9,0l0,0c-0.3,0.3-0.3,0.6,0,0.9L11.1,12 l-6.2,6.2c-0.3,0.3-0.3,0.6,0,0.9l0,0c0.3,0.3,0.6,0.3,0.9,0L12,12.9l6.2,6.2c0.3,0.3,0.6,0.3,0.9,0l0,0c0.3-0.3,0.3-0.6,0-0.9 L12.9,12l6.2-6.2C19.4,5.5,19.4,5.2,19.1,4.9z"></path>
          </svg>
        </div>
      </div>
      
      {currentIndex > 0 && (
        <div className="wa-lightbox-nav prev" onClick={(e) => { e.stopPropagation(); goPrev(); }}>
           <svg viewBox="0 0 24 24" width="36" height="36"><path fill="currentColor" d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z"/></svg>
        </div>
      )}

      <div className="wa-lightbox-content" onClick={handleOverlayClick}>
        {isVideo ? (
          <video src={currentMedia.url} controls autoPlay className="wa-lightbox-media" onClick={(e) => e.stopPropagation()} />
        ) : (
          <img src={currentMedia.url} alt={currentMedia.filename} className="wa-lightbox-media" onClick={(e) => e.stopPropagation()} />
        )}
      </div>

      {currentIndex < media.list.length - 1 && (
        <div className="wa-lightbox-nav next" onClick={(e) => { e.stopPropagation(); goNext(); }}>
           <svg viewBox="0 0 24 24" width="36" height="36"><path fill="currentColor" d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg>
        </div>
      )}
    </div>
  );
};

export default Lightbox;
