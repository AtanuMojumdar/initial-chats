import React, { useState, useRef } from 'react';

const AudioPlayer = ({ src, sender, fileName }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [blobUrl, setBlobUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  React.useEffect(() => {
    setIsLoading(true);
    fetch(src)
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Audio Blob load failed", err);
        setIsLoading(false);
      });
      
    // Cleanup blob url to prevent memory leak
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  const togglePlay = async () => {
    if (!audioRef.current || !blobUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (error) {
        // Next.js Dev overlay aggressively intercepts console.error, so we fail quietly
        console.warn("Audio format not supported by browser", error);
        setIsPlaying(false);
        if (fileName) {
          setErrorMsg(`"${fileName}" format not supported`);
          setTimeout(() => setErrorMsg(''), 3000);
        }
      }
    }
  };

  const onTimeUpdate = () => {
    const current = audioRef.current.currentTime;
    const dur = audioRef.current.duration;
    setCurrentTime(current);
    setProgress((current / dur) * 100 || 0);
  };

  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const getAvatarSrc = (name) => {
    if (!name) return null;
    const n = name.toLowerCase();
    if (n.includes('atanu')) return '/atanu.png';
    if (n.includes('narayani')) return '/narayani.png';
    return null;
  };

  const avatarSrc = getAvatarSrc(sender);

  return (
    <>
      <div className="wa-audio-avatar-container">
          <div className="wa-audio-avatar">
             {avatarSrc ? (
               <img src={avatarSrc} alt={sender} />
             ) : (
               sender.charAt(0)
             )}
          </div>
          <div className="wa-audio-mic-icon">
             <svg viewBox="0 0 24 24" width="12" height="12" fill="#fff">
                <path d="M11.999 14.942c2.001 0 3.531-1.53 3.531-3.531V4.35c0-2.001-1.53-3.531-3.531-3.531S8.469 2.349 8.469 4.35v7.061C8.469 13.412 9.998 14.942 11.999 14.942z M18.237 11.412c0 3.531-2.942 6.002-6.237 6.002s-6.237-2.471-6.237-6.002H3.761c0 4.001 3.178 7.297 7.061 7.885v3.884h2.354v-3.884c3.884-.588 7.061-3.884 7.061-7.885H18.237z" />
             </svg>
          </div>
      </div>
      
      <div onClick={togglePlay} className="wa-audio-play-btn">
        {isPlaying ? (
          <svg viewBox="0 0 24 24" width="34" height="34" fill="currentColor"><path d="M9 16h2V8H9v8zm4-8v8h2V8h-2z"></path></svg>
        ) : (
          <svg viewBox="0 0 24 24" width="34" height="34" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>
        )}
      </div>
      
      <div className="wa-audio-slider-container">
        {errorMsg ? (
           <div style={{ fontSize: '12px', color: '#db8c8c', paddingBottom: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{errorMsg}</div>
        ) : isLoading ? (
           <div style={{ fontSize: '13px', color: 'var(--wa-text-secondary)', paddingBottom: '10px' }}>Loading media...</div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', width: '100%', height: '24px' }}>
              <input 
                 type="range" 
                 value={progress} 
                 onChange={(e) => {
                   const dur = audioRef.current.duration;
                   if (!isNaN(dur)) {
                       const newTime = (dur / 100) * Number(e.target.value);
                       audioRef.current.currentTime = newTime;
                       setProgress(Number(e.target.value));
                   }
                 }}
                 className="wa-audio-range"
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--wa-text-secondary)', marginTop: '2px', fontWeight: 500 }}>
              <span>{isPlaying || currentTime > 0 ? formatTime(currentTime) : formatTime(duration)}</span>
            </div>
          </>
        )}
      </div>
      <audio 
         ref={audioRef} 
         src={blobUrl || undefined}  
         onTimeUpdate={onTimeUpdate} 
         onLoadedMetadata={() => {
            const dur = audioRef.current.duration;
            if (!isNaN(dur) && isFinite(dur)) {
               setDuration(dur);
            }
         }} 
         onEnded={() => setIsPlaying(false)} 
         onError={(e) => {
            // Next.js Dev mode intercepts console.error, so we fail quietly
            setIsPlaying(false);
         }}
         preload="metadata" 
      />
    </>
  );
};


const LinkPreview = ({ url }) => {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch(`/api/link-preview?url=${encodeURIComponent(url)}`)
      .then(res => res.json())
      .then(d => {
        if (!d.error && (d.title || d.image)) {
          setData(d);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [url]);

  if (loading || !data) return null;

  return (
    <a href={url} target="_blank" rel="noreferrer" className="wa-link-preview">
      {data.image && (
        <img src={data.image} alt={data.title || 'Preview'} className="wa-link-preview-image" onError={(e) => e.target.style.display = 'none'} />
      )}
      <div className="wa-link-preview-content">
        <div className="wa-link-preview-title">{data.title || data.domain}</div>
        {data.description && <div className="wa-link-preview-desc">{data.description}</div>}
        <div className="wa-link-preview-domain">{data.domain}</div>
      </div>
    </a>
  );
};


export default function MessageBubble({ msg, pov, showTail, onImageClick, isGroup }) {
  if (msg.isSystem) {
    return (
      <div className="wa-msg-sys">
        {msg.text}
      </div>
    );
  }

  // Right-side Out bubble determined dynamically by POV state
  const isOut = msg.sender === pov;
  
  const fileLower = msg.file?.toLowerCase() || '';
  const isImage = fileLower.endsWith('.jpg') || fileLower.endsWith('.jpeg') || fileLower.endsWith('.png') || fileLower.endsWith('.webp') || fileLower.endsWith('.gif') || fileLower.endsWith('.was');
  const isVideo = fileLower.endsWith('.mp4') || fileLower.endsWith('.avi') || fileLower.endsWith('.mov') || fileLower.endsWith('.webm');
  const isSticker = (fileLower.endsWith('.webp') || fileLower.endsWith('.was')) && !msg.text;
  const isVisualMedia = (isImage || isVideo) && !isSticker;
  const hasCaption = isVisualMedia && !!msg.text;

  const urlRegex = /(https?:\/\/[^\s]+)/;
  const firstUrlMatch = msg.text ? msg.text.match(urlRegex) : null;
  const firstUrl = firstUrlMatch ? firstUrlMatch[1] : null;

  const renderTextWithLinks = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/; // Removed 'g' flag for the match check below
    const parts = text.split(/(https?:\/\/[^\s]+)/g);
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return <a key={i} href={part} target="_blank" rel="noreferrer" style={{ color: '#53bdeb', textDecoration: 'none' }}>{part}</a>;
      }
      return part;
    });
  };

  const renderMedia = () => {
    if (msg.isAlbumGroup) {
      const images = msg.album;
      const len = images.length;
      let gridClass = 'wa-album-grid';
      if (len === 2) gridClass += ' wa-grid-2';
      else if (len === 3) gridClass += ' wa-grid-3';
      else gridClass += ' wa-grid-4';

      return (
        <div className={gridClass}>
          {images.slice(0, 4).map((img, idx) => {
            const isLast = idx === 3 && len > 4;
            const mediaUrl = `/api/media/${encodeURIComponent(img.file)}`;
            return (
              <div 
                key={img.id} 
                className="wa-album-item"
                onClick={() => onImageClick && onImageClick({ 
                  list: images.map(i => ({ url: `/api/media/${encodeURIComponent(i.file)}`, filename: i.file, date: i.date, time: i.time, sender: i.sender || pov })),
                  initialIndex: idx
                })}
              >
                <img 
                  src={mediaUrl} 
                  loading="lazy" 
                  alt={img.file}
                  onError={(e) => {
                     e.target.onerror = null;
                     e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" fill="%238696a0" viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>';
                     e.target.style.objectFit = 'none';
                     e.target.style.backgroundColor = 'var(--wa-input-bg)';
                  }}
                />
                {isLast && (
                  <div className="wa-album-overlay">
                    <span>+{len - 4}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    if (!msg.file) return null;

    const mediaUrl = `/api/media/${encodeURIComponent(msg.file)}`;

    const isAudio = fileLower.endsWith('.mp3') || fileLower.endsWith('.opus') || fileLower.endsWith('.ogg') || fileLower.endsWith('.m4a') || fileLower.endsWith('.wav') || fileLower.endsWith('.wa');
    const isDoc = fileLower.endsWith('.pdf') || fileLower.endsWith('.docx') || fileLower.endsWith('.xlsx') || fileLower.endsWith('.vcf');

    if (isImage) {
      return (
        <div 
          className="wa-bubble-media" 
          style={isSticker ? { backgroundColor: 'transparent' } : {}}
          onClick={() => onImageClick && onImageClick({ 
            list: [{ url: mediaUrl, filename: msg.file, date: msg.date, time: msg.time, sender: msg.sender || pov }],
            initialIndex: 0
          })}
        >
          <img 
            src={mediaUrl} 
            alt={msg.file} 
            loading="lazy" 
            style={isSticker ? { width: '150px', height: '150px', objectFit: 'contain' } : {}} 
            onError={(e) => {
               // Render missing media placeholder if local file is gone
               e.target.onerror = null;
               e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" fill="%238696a0" viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>';
               e.target.style.objectFit = 'none';
               e.target.style.backgroundColor = 'var(--wa-input-bg)';
            }}
          />
        </div>
      );
    } else if (isVideo) {
      return (
        <div 
          className="wa-bubble-media"
          onClick={() => onImageClick && onImageClick({ 
            list: [{ url: mediaUrl, filename: msg.file, date: msg.date, time: msg.time, isVideo: true, sender: msg.sender || pov }],
            initialIndex: 0
          })}
        >
          <div style={{ position: 'relative' }}>
             <video src={mediaUrl} style={{ maxWidth: '100%', display: 'block' }} preload="metadata"></video>
             <div className="wa-video-overlay">
                <div className="wa-video-play-btn">
                  <svg viewBox="0 0 24 24" width="30" height="30" fill="#fff"><path d="M8 5v14l11-7z"></path></svg>
                </div>
             </div>
             <div className="wa-video-duration">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="#fff" style={{marginRight: '4px'}}>
                  <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
                </svg>
                Video
             </div>
          </div>
        </div>
      );
    } else if (isAudio) {
      return (
        <div className="wa-bubble-audio">
          <AudioPlayer src={mediaUrl} sender={msg.sender} fileName={msg.file} />
        </div>
      );
    } else if (isDoc) {
      return (
        <a href={mediaUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="wa-bubble-doc">
            <svg viewBox="0 0 24 24" className="wa-doc-icon">
              <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
            </svg>
            <div className="wa-doc-info">
              <span className="wa-doc-name">{msg.file}</span>
              <span className="wa-doc-size">Document</span>
            </div>
          </div>
        </a>
      );
    }

    return (
       <div className="wa-bubble-doc">
         <span style={{ fontSize: '13px' }}>File: {msg.file}</span>
       </div>
    );
  }

  return (
    <div className={`wa-msg-row ${isOut ? 'out' : 'in'}`}>
      <div className={`wa-bubble ${showTail ? 'has-tail' : ''} ${isVisualMedia ? 'wa-bubble-visual-media' : ''} ${hasCaption ? 'has-caption' : ''} ${msg.isEdited ? 'is-edited' : ''} ${isSticker ? 'is-sticker' : ''}`} style={isSticker ? { backgroundColor: 'transparent', boxShadow: 'none', padding: 0 } : {}}>
        {!isOut && !isSticker && showTail && isGroup && <div className="wa-bubble-sender">{msg.sender}</div>}
        
        {renderMedia()}

        {firstUrl && !msg.isDeleted && !msg.file && <LinkPreview url={firstUrl} />}
        
        {msg.text ? (
          <div className="wa-bubble-text" style={(msg.isDeleted || msg.text.includes('Waiting for this message') || msg.text.toLowerCase() === 'media omitted') ? { color: 'var(--wa-text-secondary)', fontStyle: 'italic' } : {}}>
            {msg.text.includes('Waiting for this message') ? (
               <div className="wa-msg-italic-box" style={{ padding: 0 }}>
                 <svg viewBox="0 0 24 24" width="16" height="16">
                   <path d="M12,2C6.477,2,2,6.477,2,12s4.477,10,10,10s10-4.477,10-10S17.523,2,12,2z M13.882,15.297l-2.617-2.617 C11.089,12.505,11,12.266,11,12.015V7.001c0-0.553,0.448-1,1-1s1,0.447,1,1v4.601l2.304,2.304c0.39,0.391,0.39,1.024,0,1.414l0,0 C14.913,15.695,14.281,15.695,13.882,15.297z"></path>
                 </svg>
                 <span>Waiting for this message. This may take a while.<a href="#">Learn more</a></span>
               </div>
            ) : msg.text.toLowerCase() === 'media omitted' ? (
               <div className="wa-msg-italic-box" style={{ padding: 0 }}>
                 <svg viewBox="0 0 24 24" width="18" height="18" style={{ marginTop: '2px' }}>
                   <path d="M12.003,3C6.48,3,2,7.48,2,13.003C2,18.525,6.48,23,12.003,23S22.005,18.525,22.005,13.003 C22.005,7.48,17.525,3,12.003,3z M18.368,17.662l-1.414,1.414l-4.95-4.95l-4.95,4.95l-1.414-1.414l4.95-4.95l-4.95-4.95l1.414-1.414 l4.95,4.95l4.95-4.95l1.414,1.414l-4.95,4.95L18.368,17.662z" />
                 </svg>
                 <span style={{ marginTop: '2px' }}>Media omitted</span>
               </div>
            ) : msg.isDeleted ? (
               <div style={{ display: 'flex', alignItems: 'center' }}>
                 <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style={{ marginRight: '6px' }}>
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8 0-1.85.63-3.55 1.69-4.9l11.21 11.21C15.55 19.37 13.85 20 12 20zm6.31-3.1L7.1 5.69C8.45 4.63 10.15 4 12 4c4.41 0 8 3.59 8 8 0 1.85-.63 3.55-1.69 4.9z"></path>
                 </svg>
                 {msg.text}
               </div>
            ) : renderTextWithLinks(msg.text)}
          </div>
        ) : !msg.file ? (
          <div className="wa-bubble-text" style={{ fontStyle: 'italic', color: 'var(--wa-text-secondary)', fontSize: '13px' }}>
            <div className="wa-msg-italic-box" style={{ padding: 0 }}>
               <svg viewBox="0 0 24 24" width="18" height="18" style={{ marginTop: '2px' }}>
                  <path d="M12.003,3C6.48,3,2,7.48,2,13.003C2,18.525,6.48,23,12.003,23S22.005,18.525,22.005,13.003 C22.005,7.48,17.525,3,12.003,3z M18.368,17.662l-1.414,1.414l-4.95-4.95l-4.95,4.95l-1.414-1.414l4.95-4.95l-4.95-4.95l1.414-1.414 l4.95,4.95l4.95-4.95l1.414,1.414l-4.95,4.95L18.368,17.662z" />
               </svg>
               <span style={{ marginTop: '2px' }}>Message or media unsupported</span>
            </div>
          </div>
        ) : null}
        
        <div className={`wa-bubble-meta ${msg.text ? 'with-text' : 'no-text'} ${isSticker ? 'sticker-meta' : ''}`} style={isSticker ? { padding: '2px 4px', borderRadius: '10px', bottom: '2px', right: '2px' } : {}}>
          {msg.isEdited && <span style={{ marginRight: '4px' }}>Edited</span>}
          {msg.time}
          {isOut && (
            <span className="wa-meta-check">
              <svg viewBox="0 0 16 15" width="16" height="15" fill={isSticker ? "#8696a0" : "#53bdeb"}>
                 <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"></path>
              </svg>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
