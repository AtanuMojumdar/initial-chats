'use client';

import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

const Lightbox = ({ media, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(media?.initialIndex || 0);
  const listLen = media?.list?.length || 0;

  const goPrev = () => {
    setCurrentIndex(i => (i > 0 ? i - 1 : i));
  };

  const goNext = () => {
    setCurrentIndex(i => (i < listLen - 1 ? i + 1 : i));
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setCurrentIndex(i => (i > 0 ? i - 1 : i));
      if (e.key === 'ArrowRight') setCurrentIndex(i => (i < listLen - 1 ? i + 1 : i));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, listLen]);

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
          <X size={24} color="currentColor" />
        </div>
      </div>
      
      {currentIndex > 0 && (
        <div className="wa-lightbox-nav prev" onClick={(e) => { e.stopPropagation(); goPrev(); }}>
           <ChevronLeft size={36} color="currentColor" />
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
           <ChevronRight size={36} color="currentColor" />
        </div>
      )}
    </div>
  );
};

export default Lightbox;
