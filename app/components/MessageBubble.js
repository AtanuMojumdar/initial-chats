import React, { useState, useRef } from 'react';
import { Mic, Play, Pause, Clock, Ban, CheckCheck, FileText, Video, ImageOff } from 'lucide-react';

const AudioPlayer = ({ src, sender, fileName }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [blobUrl, setBlobUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const blobUrlRef = useRef(null);

  React.useEffect(() => {
    setIsLoading(true);
    fetch(src)
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        setBlobUrl(url);
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Audio Blob load failed", err);
        setIsLoading(false);
      });
      
    // Cleanup blob url to prevent memory leak
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
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
             <Mic size={12} color="#fff" />
          </div>
      </div>
      
      <div onClick={togglePlay} className="wa-audio-play-btn">
        {isPlaying ? (
          <Pause size={34} color="currentColor" fill="currentColor" />
        ) : (
          <Play size={34} color="currentColor" fill="currentColor" />
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
                  <Play size={30} color="#fff" fill="#fff" />
                </div>
             </div>
             <div className="wa-video-duration">
                <Video size={14} color="#fff" fill="#fff" style={{marginRight: '4px'}} />
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
            <FileText size={32} color="var(--wa-text-secondary)" className="wa-doc-icon" />
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
               <div style={{ display: 'flex', alignItems: 'center' }}>
                 <Clock size={16} color="currentColor" style={{ marginRight: '6px', flexShrink: 0 }} />
                 <span>Waiting for this message. This may take a while. <a href="#" style={{ color: '#53bdeb', textDecoration: 'none' }}>Learn more</a></span>
               </div>
            ) : msg.text.toLowerCase() === 'media omitted' ? (
               <div style={{ display: 'flex', alignItems: 'center' }}>
                 <ImageOff size={16} color="currentColor" style={{ marginRight: '6px', flexShrink: 0 }} />
                 <span>Media omitted</span>
               </div>
            ) : msg.isDeleted ? (
               <div style={{ display: 'flex', alignItems: 'center' }}>
                 <Ban size={16} color="currentColor" style={{ marginRight: '6px', flexShrink: 0 }} />
                 <span>{msg.text}</span>
               </div>
            ) : renderTextWithLinks(msg.text)}
          </div>
        ) : !msg.file ? (
          <div className="wa-bubble-text" style={{ fontStyle: 'italic', color: 'var(--wa-text-secondary)', fontSize: '13px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
               <ImageOff size={16} color="currentColor" style={{ marginRight: '6px', flexShrink: 0 }} />
               <span>Message or media unsupported</span>
            </div>
          </div>
        ) : null}
        
        <div className={`wa-bubble-meta ${msg.text ? 'with-text' : 'no-text'} ${isSticker ? 'sticker-meta' : ''}`} style={isSticker ? { padding: '2px 4px', borderRadius: '10px', bottom: '2px', right: '2px' } : {}}>
          {msg.isEdited && <span style={{ marginRight: '4px' }}>Edited</span>}
          {msg.time}
          {isOut && (
            <span className="wa-meta-check">
              <CheckCheck size={16} color={isSticker ? "#8696a0" : "#53bdeb"} />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
