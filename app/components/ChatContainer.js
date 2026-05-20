'use client';

import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { Search, ArrowLeft, MoreVertical, Plus, Smile, Mic, ChevronDown, ChevronUp, Lock, LogOut } from 'lucide-react';
import MessageBubble from './MessageBubble';
import Lightbox from './Lightbox';

export default function ChatContainer({ messages }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
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

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth', { method: 'DELETE' });
      if (res.ok) {
        window.location.href = '/login';
      }
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

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

  // Initial scroll to bottom on load
  useEffect(() => {
     if (chatAreaRef.current) {
        chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
     }
  }, []);

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
  useEffect(() => {
      if (scrollState.preservingTop && chatAreaRef.current) {
         const heightAdded = chatAreaRef.current.scrollHeight - scrollState.scrollHeight;
         chatAreaRef.current.scrollTop = scrollState.scrollTop + heightAdded;
         // Defer state update to avoid synchronous setState inside effect
         setTimeout(() => {
            setScrollState(s => ({ ...s, preservingTop: false }));
         }, 0);
      }
   }, [displayedMessages, scrollState.preservingTop, scrollState.scrollHeight, scrollState.scrollTop]);

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
        <div className="wa-header" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div className="wa-avatar" onClick={() => handleAvatarClick(pov)}>
               {renderAvatarContent(pov)}
            </div>
          </div>
          
          <div ref={menuRef} style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                    maxWidth: '90px'
                  }}
                >
                  {senders.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
             </div>
             
             <div 
               className={`wa-icon ${isMenuOpen ? 'active' : ''}`}
               onClick={() => setIsMenuOpen(!isMenuOpen)} 
               title="Menu" 
               style={{ 
                 cursor: 'pointer', 
                 backgroundColor: isMenuOpen ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                 borderRadius: '50%'
               }}
             >
               <MoreVertical size={20} color="currentColor" />
             </div>

             {isMenuOpen && (
               <div className="wa-dropdown-menu">
                 <div className="wa-dropdown-item" onClick={handleLogout}>
                   <LogOut size={16} />
                   <span>Log out</span>
                 </div>
               </div>
             )}
          </div>
        </div>
        
        <div className="wa-search-bar">
          <div className="wa-search-input-container">
            <Search size={20} color="var(--wa-text-secondary)" />
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
             <ArrowLeft size={24} color="currentColor" />
          </div>
          <div className="wa-avatar" onClick={() => handleAvatarClick(senders.find(s => s !== pov))}>
             {renderAvatarContent(senders.find(s => s !== pov))}
          </div>
          <div className="wa-header-info">
            <span className="wa-header-name">{senders.find(s => s !== pov) || 'Contact'}</span>
            <span className="wa-header-status">tap here for contact info</span>
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
              <div className="wa-encryption-notice">
                 <Lock size={12} color="currentColor" style={{ flexShrink: 0, marginTop: '4px' }} />
                 <span>Messages and calls are end-to-end encrypted. Only people in this chat can read, listen to, or share them. <a href="https://faq.whatsapp.com/general/security-and-privacy/end-to-end-encryption" target="_blank" rel="noreferrer">Click to learn more</a></span>
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
                         borderRadius: '4px',
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
            <ChevronUp size={24} color="currentColor" />
          </div>
        )}
        
        {showScrollBottomBtn && !searchQuery && (
          <div className="wa-floating-btn bottom" onClick={jumpToBottom} title="Go to last message">
             <ChevronDown size={24} color="currentColor" />
          </div>
        )}

        {/* Footer / Message Input */}
        <div className="wa-footer" style={{ position: 'relative', zIndex: 2 }}>
           <div className="wa-icon" style={{ padding: '8px', margin: '0 4px' }}>
             <Plus size={24} color="currentColor" strokeWidth={2.5} />
           </div>
           
           <div className="wa-icon" style={{ padding: '8px', margin: '0 4px 0 0' }}>
             <Smile size={24} color="currentColor" />
           </div>
           
           <div className="wa-input-container">
              <input type="text" className="wa-input" placeholder="Type a message" disabled />
           </div>
           
           <div className="wa-icon" style={{ padding: '8px 8px 8px 16px' }}>
             <Mic size={24} color="currentColor" />
           </div>
        </div>
       </div>

      {selectedMedia && (
        <Lightbox media={selectedMedia} onClose={() => setSelectedMedia(null)} />
      )}
    </div>
  );
}
