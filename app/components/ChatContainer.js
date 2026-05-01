'use client';

import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import MessageBubble from './MessageBubble';
import Lightbox from './Lightbox';

export default function ChatContainer({ messages }) {
  const endOfMessagesRef = useRef(null);
  
  // Extract unique senders
  const senders = Array.from(new Set(messages.filter(m => !m.isSystem && m.sender).map(m => m.sender)));
  
  // POV state: who is "me" (the right side)
  const [pov, setPov] = useState(senders.includes('Atanu') ? 'Atanu' : (senders[0] || 'Unknown'));
  
  // Is this a group chat? (More than 2 people)
  const isGroup = senders.length > 2;
  
  // Filter messages based on search
  const [searchQuery, setSearchQuery] = useState('');
  
  // Responsive sidebar toggling state for Mobile. Initialize properly
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Lightbox state
  const [selectedMedia, setSelectedMedia] = useState(null);

  // Implement Windowing / Lazy Loading
  const defaultCount = 150;
  const [visibleRange, setVisibleRange] = useState({ 
     start: Math.max(0, messages.length - defaultCount), 
     end: messages.length 
  });

  const getAvatarSrc = (name) => {
    if (!name) return null;
    const n = name.toLowerCase();
    if (n.includes('atanu')) return '/atanu.png';
    if (n.includes('narayani')) return '/narayani.png';
    return null;
  };

  const handleAvatarClick = (name) => {
    const src = getAvatarSrc(name);
    if (src) {
      setSelectedMedia({
        list: [{ url: src, filename: `${name}'s Profile`, isVideo: false }],
        initialIndex: 0
      });
    }
  };

  const renderAvatarContent = (name) => {
    const src = getAvatarSrc(name);
    if (src) return <img src={src} alt={name || 'User'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
    return <div className="wa-avatar-placeholder" style={{ backgroundColor: '#6b7c85' }}>{name ? name.charAt(0) : 'U'}</div>;
  };

  let displayedMessages = [];
  if (searchQuery) {
     const filteredMessages = messages.filter(msg => 
       (msg.text && msg.text.toLowerCase().includes(searchQuery.toLowerCase())) ||
       (msg.file && msg.file.toLowerCase().includes(searchQuery.toLowerCase())) ||
       (msg.date && msg.date.toLowerCase().includes(searchQuery.toLowerCase()))
     );
     // Show max 300 results to prevent browser crash
     displayedMessages = filteredMessages.slice(-300);
  } else {
     displayedMessages = messages.slice(visibleRange.start, visibleRange.end);
  }

  const chatAreaRef = useRef(null);
  const topSentinelRef = useRef(null);
  const bottomSentinelRef = useRef(null);
  const [scrollState, setScrollState] = useState({ preservingTop: false, scrollHeight: 0, scrollTop: 0 });
  const [lastScrollTop, setLastScrollTop] = useState(0);
  const [showScrollTopBtn, setShowScrollTopBtn] = useState(false);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);

  // Scroll to bottom only on the first load
  useEffect(() => {
    if (chatAreaRef.current) {
       chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }
  }, []); // Run only once

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    
    const atBottom = scrollHeight - scrollTop - clientHeight < 50;
    const atTop = scrollTop < 50;
    
    if (scrollTop > lastScrollTop + 5) {
      if (!atBottom) {
        setShowScrollBottomBtn(true);
        setShowScrollTopBtn(false);
      }
    } else if (scrollTop < lastScrollTop - 5) {
      if (!atTop) {
        setShowScrollTopBtn(true);
        setShowScrollBottomBtn(false);
      }
    }
    
    if (atBottom) setShowScrollBottomBtn(false);
    if (atTop) setShowScrollTopBtn(false);
    
    setLastScrollTop(scrollTop);
  };

  const jumpToTop = () => {
    setVisibleRange({ start: 0, end: Math.min(messages.length, defaultCount) });
    setShowScrollTopBtn(false);
    setTimeout(() => {
      if (chatAreaRef.current) {
        chatAreaRef.current.scrollTop = 0;
      }
    }, 100);
  };

  const jumpToBottom = () => {
    setVisibleRange({ start: Math.max(0, messages.length - defaultCount), end: messages.length });
    setShowScrollBottomBtn(false);
    setTimeout(() => {
      if (chatAreaRef.current) {
        chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
      }
    }, 100);
  };

  // Maintain scroll position after prepending new elements without paint flashes
  useLayoutEffect(() => {
    if (scrollState.preservingTop && chatAreaRef.current) {
       const heightAdded = chatAreaRef.current.scrollHeight - scrollState.scrollHeight;
       chatAreaRef.current.scrollTop = scrollState.scrollTop + heightAdded;
       setScrollState(s => ({ ...s, preservingTop: false }));
    }
  }, [displayedMessages, scrollState.preservingTop]);

  const handleLoadPrevious = useCallback(() => {
     if (chatAreaRef.current) {
        setScrollState({
           preservingTop: true,
           scrollHeight: chatAreaRef.current.scrollHeight,
           scrollTop: chatAreaRef.current.scrollTop
        });
        setVisibleRange(prev => ({ start: Math.max(0, prev.start - defaultCount), end: prev.end }));
     }
  }, [defaultCount]);

  useEffect(() => {
    if (!topSentinelRef.current || visibleRange.start === 0 || searchQuery) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        handleLoadPrevious();
      }
    }, { root: chatAreaRef.current, rootMargin: '200px' });
    
    observer.observe(topSentinelRef.current);
    return () => observer.disconnect();
  }, [visibleRange.start, searchQuery, handleLoadPrevious]);

  const handleLoadNewer = useCallback(() => {
     setVisibleRange(prev => ({ start: prev.start, end: Math.min(messages.length, prev.end + defaultCount) }));
  }, [messages.length, defaultCount]);

  useEffect(() => {
    if (!bottomSentinelRef.current || visibleRange.end >= messages.length || searchQuery) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        handleLoadNewer();
      }
    }, { root: chatAreaRef.current, rootMargin: '200px' });
    
    observer.observe(bottomSentinelRef.current);
    return () => observer.disconnect();
  }, [visibleRange.end, messages.length, searchQuery, handleLoadNewer]);

  const jumpToMessage = (msgId) => {
     const targetIdx = messages.findIndex(m => m.id === msgId);
     if (targetIdx !== -1) {
        setSearchQuery('');
        setIsSidebarOpen(false);
        setVisibleRange({
           start: Math.max(0, targetIdx - 75),
           end: Math.min(messages.length, targetIdx + 75)
        });
        
        setTimeout(() => {
           const element = document.getElementById(`msg-${msgId}`);
           if (element) {
              element.scrollIntoView({ behavior: 'auto', block: 'center' });
              element.style.transition = 'background-color 0.5s';
              const originalBg = element.style.backgroundColor;
              element.style.backgroundColor = 'rgba(0, 168, 132, 0.3)';
              setTimeout(() => { element.style.backgroundColor = originalBg; }, 1500);
           }
        }, 100);
     }
  };

  // Group consecutive images into albums
  const groupedMessages = [];
  if (searchQuery) {
     groupedMessages.push(...displayedMessages);
  } else {
     let currentGroup = null;
     displayedMessages.forEach((msg) => {
       const fileLower = msg.file?.toLowerCase() || '';
       const isImage = fileLower.endsWith('.jpg') || fileLower.endsWith('.jpeg') || fileLower.endsWith('.png') || fileLower.endsWith('.webp') || fileLower.endsWith('.gif') || fileLower.endsWith('.was');
       const isSticker = (fileLower.endsWith('.webp') || fileLower.endsWith('.was')) && !msg.text;
       const isEligibleImage = isImage && !isSticker && !msg.text && !msg.isSystem && !msg.isDeleted;

       if (isEligibleImage) {
         if (currentGroup && currentGroup.sender === msg.sender && currentGroup.date === msg.date && currentGroup.time === msg.time) {
           currentGroup.album.push(msg);
         } else {
           if (currentGroup) {
             if (currentGroup.album.length > 1) groupedMessages.push(currentGroup);
             else groupedMessages.push(currentGroup.album[0]);
           }
           currentGroup = {
             ...msg,
             isAlbumGroup: true,
             album: [msg]
           };
         }
       } else {
         if (currentGroup) {
           if (currentGroup.album.length > 1) groupedMessages.push(currentGroup);
           else groupedMessages.push(currentGroup.album[0]);
           currentGroup = null;
         }
         groupedMessages.push(msg);
       }
     });
     if (currentGroup) {
       if (currentGroup.album.length > 1) groupedMessages.push(currentGroup);
       else groupedMessages.push(currentGroup.album[0]);
     }
  }

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', minHeight: 0, minWidth: 0, overflow: 'hidden' }}>
      
      {/* Sidebar Mockup */}
      <div className={`wa-sidebar ${!isSidebarOpen ? 'mobile-hidden' : ''}`}>
        <div className="wa-header" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div className="wa-avatar" onClick={() => handleAvatarClick(pov)}>
               {renderAvatarContent(pov)}
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
             <span style={{ fontSize: '13px', color: 'var(--wa-text-secondary)', fontWeight: 500 }}>POV:</span>
             <select 
               value={pov} 
               onChange={e => setPov(e.target.value)}
               style={{ 
                 background: 'var(--wa-input-bg)', 
                 color: 'var(--wa-text-primary)', 
                 border: 'none', 
                 borderRadius: '6px',
                 padding: '6px 8px',
                 fontSize: '13px',
                 outline: 'none',
                 cursor: 'pointer',
                 maxWidth: '120px'
               }}
             >
               {senders.map(s => <option key={s} value={s}>{s}</option>)}
             </select>
          </div>
        </div>
        
        <div className="wa-search-bar">
          <div className="wa-search-input-container">
            <svg viewBox="0 0 24 24" height="24" width="24" preserveAspectRatio="xMidYMid meet" fill="var(--wa-text-secondary)" version="1.1" x="0px" y="0px" enableBackground="new 0 0 24 24" xmlSpace="preserve">
              <path d="M15.009,13.805h-0.636l-0.22-0.219c0.781-0.911,1.256-2.092,1.256-3.386 c0-2.876-2.332-5.207-5.207-5.207c-2.876,0-5.208,2.331-5.208,5.207s2.331,5.208,5.208,5.208c1.293,0,2.474-0.474,3.385-1.255l0.221,0.22v0.635l4.004,3.999l1.194-1.195L15.009,13.805z M10.201,13.805c-1.991,0-3.605-1.614-3.605-3.605 s1.614-3.605,3.605-3.605c1.991,0,3.604,1.614,3.604,3.605S12.192,13.805,10.201,13.805z"></path>
            </svg>
            <input 
               type="text" 
               className="wa-search-input" 
               placeholder="Search messages" 
               value={searchQuery}
               onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="wa-chat-list">
          <div className="wa-chat-item active" onClick={() => setIsSidebarOpen(false)}>
            <div className="wa-avatar" style={{ marginRight: '15px', width: '49px', height: '49px' }} onClick={(e) => { e.stopPropagation(); handleAvatarClick(senders.find(s => s !== pov)); }}>
               {renderAvatarContent(senders.find(s => s !== pov))}
            </div>
            <div className="wa-chat-item-content">
              <div className="wa-chat-item-header">
                <span className="wa-chat-item-title">{senders.find(s => s !== pov) || 'Contact'}</span>
                <span className="wa-chat-item-time">{messages.length > 0 ? messages[messages.length-1].time : ''}</span>
              </div>
              <div className="wa-chat-item-message">
                 {messages.length > 0 ? (messages[messages.length-1].text || messages[messages.length-1].file || 'Message') : '...'}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Chat Area */}
      <div className={`wa-main ${isSidebarOpen ? 'mobile-hidden' : ''}`}>
        <div className="wa-chat-bg"></div>
        
        {/* WhatsApp Header */}
        <div className="wa-header" style={{ position: 'relative', zIndex: 2 }}>
          <div className="mobile-back-btn wa-icon" onClick={() => setIsSidebarOpen(true)}>
             <svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z"></path></svg>
          </div>
          <div className="wa-avatar" onClick={() => handleAvatarClick(senders.find(s => s !== pov))}>
             {renderAvatarContent(senders.find(s => s !== pov))}
          </div>
          <div className="wa-header-info">
            <span className="wa-header-name">{senders.find(s => s !== pov) || 'Contact'}</span>
            <span className="wa-header-status">tap here for contact info</span>
          </div>
          <div className="wa-header-actions" style={{ display: 'flex', gap: '5px', paddingRight: '10px' }}>
            <div className="wa-icon">
              <svg viewBox="0 0 24 24" height="24" width="24" preserveAspectRatio="xMidYMid meet" version="1.1" x="0px" y="0px" enableBackground="new 0 0 24 24" xmlSpace="preserve">
                 <path d="M15.009,13.805h-0.636l-0.22-0.219c0.781-0.911,1.256-2.092,1.256-3.386 c0-2.876-2.332-5.207-5.207-5.207c-2.876,0-5.208,2.331-5.208,5.207s2.331,5.208,5.208,5.208c1.293,0,2.474-0.474,3.385-1.255l0.221,0.22v0.635l4.004,3.999l1.194-1.195L15.009,13.805z M10.201,13.805c-1.991,0-3.605-1.614-3.605-3.605 s1.614-3.605,3.605-3.605c1.991,0,3.604,1.614,3.604,3.605S12.192,13.805,10.201,13.805z"></path>
              </svg>
            </div>
            <div className="wa-icon">
              <svg viewBox="0 0 24 24" height="24" width="24" preserveAspectRatio="xMidYMid meet" version="1.1" x="0px" y="0px" enableBackground="new 0 0 24 24" xmlSpace="preserve">
                 <path d="M12,7c1.104,0,2-0.896,2-2c0-1.105-0.895-2-2-2c-1.104,0-2,0.894-2,2C10,6.105,10.895,7,12,7z M12,9c-1.104,0-2,0.894-2,2 c0,1.104,0.895,2,2,2c1.104,0,2-0.896,2-2C13.999,9.895,13.104,9,12,9z M12,15c-1.104,0-2,0.894-2,2c0,1.104,0.895,2,2,2 c1.104,0,2-0.896,2-2C13.999,15.894,13.104,15,12,15z"></path>
              </svg>
            </div>
          </div>
        </div>

        {/* Scrollable Chat Area */}
        <div className="wa-chat-area" ref={chatAreaRef} onScroll={handleScroll}>
           {searchQuery && displayedMessages.length === 0 && (
             <div className="wa-msg-sys">No matching messages found.</div>
           )}
           
           {searchQuery && displayedMessages.length > 0 && (
             <div className="wa-msg-sys" style={{ alignSelf: 'center', backgroundColor: 'var(--wa-highlight)', color: '#fff', padding: '10px 15px', borderRadius: '20px', fontSize: '14px' }}>Click any message to jump to that moment in chat</div>
           )}
           
           {!searchQuery && visibleRange.start > 0 && (
              <div ref={topSentinelRef} style={{ height: '20px', width: '100%', opacity: 0 }}></div>
           )}
           {!searchQuery && visibleRange.start === 0 && (
              <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                <div className="wa-msg-sys" style={{ display: 'inline-block' }}>
                   Beginning of chat history
                </div>
              </div>
           )}

           {!searchQuery && visibleRange.start === 0 && (
             <div className="wa-msg-sys" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#182229', color: '#ffd279', gap: '6px', maxWidth: '85%' }}>
                <svg viewBox="0 0 10 12" width="10" height="12" fill="currentColor">
                  <path d="M5 0c1.8 0 3 1.2 3 3v1.5h1c.6 0 1 .4 1 1v5c0 .6-.4 1-1 1H1c-.6 0-1-.4-1-1v-5c0-.6.4-1 1-1h1V3c0-1.8 1.2-3 3-3zm0 1.5c-1 0-1.5.8-1.5 1.5v1.5h3V3c0-.7-.5-1.5-1.5-1.5z"></path>
                </svg>
                <span>Messages and calls are end-to-end encrypted. No one outside of this chat, not even WhatsApp, can read or listen to them.</span>
             </div>
           )}
           
           {groupedMessages.map((msg, idx) => {
              let showDateSysMsg = false;
              let showTail = true;
              
              if (idx === 0) {
                 showDateSysMsg = true;
              } else {
                 const prevMsg = groupedMessages[idx-1];
                 if (prevMsg.date !== msg.date) {
                    showDateSysMsg = true;
                 } else if (prevMsg.sender === msg.sender && !prevMsg.isSystem && !msg.isSystem) {
                    showTail = false;
                 }
              }

              return (
                 <div key={msg.id} 
                      id={`msg-${msg.id}`}
                      style={{ 
                         display: 'flex', flexDirection: 'column', width: '100%', 
                         cursor: searchQuery ? 'pointer' : 'default', 
                         padding: '0 0', borderRadius: '4px',
                         marginTop: showTail ? '12px' : '2px',
                         marginBottom: '2px'
                      }}
                      onClick={() => searchQuery && jumpToMessage(msg.id)}
                 >
                   {showDateSysMsg && (
                      <div className="wa-msg-sys">
                         {msg.date}
                      </div>
                   )}
                    <div style={{ opacity: searchQuery ? 0.9 : 1, transition: '0.2s', pointerEvents: searchQuery ? 'none' : 'auto' }}>
                      <MessageBubble msg={msg} pov={pov} showTail={showTail} onImageClick={setSelectedMedia} isGroup={isGroup} />
                    </div>
                 </div>
              );
           })}
           
           {!searchQuery && visibleRange.end < messages.length && (
              <div ref={bottomSentinelRef} style={{ height: '20px', width: '100%', opacity: 0 }}></div>
           )}
        </div>

        {/* Floating Scroll Buttons */}
        {showScrollTopBtn && !searchQuery && (
          <div className="wa-floating-btn top" onClick={jumpToTop} title="Go to first message">
            <svg viewBox="0 0 24 24" width="24" height="24">
               <path fill="currentColor" d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6 1.41 1.41z"></path>
            </svg>
          </div>
        )}
        
        {showScrollBottomBtn && !searchQuery && (
          <div className="wa-floating-btn bottom" onClick={jumpToBottom} title="Go to last message">
             <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"></path>
             </svg>
          </div>
        )}

        {/* Footer / Message Input */}
        <div className="wa-footer" style={{ position: 'relative', zIndex: 2 }}>
           <div className="wa-icon" style={{ padding: '8px', margin: '0 4px' }}>
             <svg viewBox="0 0 24 24" width="24" height="24" preserveAspectRatio="xMidYMid meet" version="1.1" x="0px" y="0px" enableBackground="new 0 0 24 24" xmlSpace="preserve">
               {/* Authentic WhatsApp Plus / Attachment Icon */}
               <path fill="currentColor" d="M11 11V4h2v7h7v2h-7v7h-2v-7H4v-2h7z"></path>
             </svg>
           </div>
           
           <div className="wa-icon" style={{ padding: '8px', margin: '0 4px 0 0' }}>
             <svg viewBox="0 0 24 24" width="24" height="24" preserveAspectRatio="xMidYMid meet" version="1.1" x="0px" y="0px" enableBackground="new 0 0 24 24" xmlSpace="preserve">
               {/* Authentic WhatsApp Smiley Icon */}
               <path fill="currentColor" d="M12,2C6.477,2,2,6.477,2,12s4.477,10,10,10s10-4.477,10-10S17.523,2,12,2z M12,20.5c-4.694,0-8.5-3.806-8.5-8.5 S7.306,3.5,12,3.5s8.5,3.806,8.5,8.5S16.694,20.5,12,20.5z M16.439,10.641c0-0.795-0.644-1.439-1.439-1.439 c-0.795,0-1.439,0.644-1.439,1.439s0.644,1.439,1.439,1.439C15.795,12.08,16.439,11.436,16.439,10.641z M9.001,10.641 c0-0.795-0.644-1.439-1.439-1.439C6.766,9.202,6.122,9.846,6.122,10.641s0.644,1.439,1.439,1.439 C8.357,12.08,9.001,11.436,9.001,10.641z M12,16.602c2.44,0,4.551-1.396,5.551-3.468H6.449C7.449,15.205,9.56,16.602,12,16.602z"></path>
             </svg>
           </div>
           
           <div className="wa-input-container">
              <input type="text" className="wa-input" placeholder="Type a message" disabled />
           </div>
           
           <div className="wa-icon" style={{ padding: '8px 8px 8px 16px' }}>
             <svg viewBox="0 0 24 24" width="24" height="24" preserveAspectRatio="xMidYMid meet" version="1.1" x="0px" y="0px" enableBackground="new 0 0 24 24" xmlSpace="preserve">
                <path fill="currentColor" d="M11.999,14.942c2.001,0,3.531-1.53,3.531-3.531V4.35c0-2.001-1.53-3.531-3.531-3.531 S8.469,2.349,8.469,4.35v7.061C8.469,13.412,9.998,14.942,11.999,14.942z M18.237,11.412c0,3.531-2.942,6.002-6.237,6.002 s-6.237-2.471-6.237-6.002H3.761c0,4.001,3.178,7.297,7.061,7.885v3.884h2.354v-3.884c3.884-0.588,7.061-3.884,7.061-7.885 H18.237z"></path>
             </svg>
           </div>
        </div>
       </div>

      {selectedMedia && (
        <Lightbox media={selectedMedia} onClose={() => setSelectedMedia(null)} />
      )}
    </div>
  );
}
