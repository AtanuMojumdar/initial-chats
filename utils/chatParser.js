// Server-side parsing of the chat file from Google Drive
import driveMap from '../driveMap.json';

export async function parseChatFile() {
  const fileId = driveMap['WhatsApp Chat with Atanu.txt'];
  if (!fileId) return [];

  const url = `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`;
  const response = await fetch(url, { next: { revalidate: 3600 } });
  
  if (!response.ok) {
    return [];
  }
  
  const content = await response.text();
  const lines = content.split('\n');
  const messages = [];
  
  // Regex to match "5/24/25, 7:22 PM - Atanu: Hi"
  // Handles normal spaces and narrow no-break spaces (\u202f), LTR marks, and encoding artifacts
  const messageRegex = /^(\d{1,2}\/\d{1,2}\/\d{2,4}),\s+(\d{1,2}:\d{2}[\s\u2000-\u206F\uFFFD]*(?:AM|PM|am|pm))\s+-\s+([^:]+):\s*(.*)$/;
  const systemRegex = /^(\d{1,2}\/\d{1,2}\/\d{2,4}),\s+(\d{1,2}:\d{2}[\s\u2000-\u206F\uFFFD]*(?:AM|PM|am|pm))\s+-\s+(.*)$/;
  
  let currentMessage = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() && !currentMessage) continue;

    let cleanLine = line.replace(/[\u200E\u200F\u202A-\u202E]/g, '');
    const match = cleanLine.match(messageRegex);
    if (match) {
      if (currentMessage) {
        messages.push(currentMessage);
      }
      
      let [, date, time, sender, text] = match;
      text = text.trim();
      
      // Check for attached files
      let fileAttached = null;
      // Handle trailing spaces or varied export formats
      const fileMatch = text.match(/^(.*?)\s*\(file attached\)\s*$/i);
      if (fileMatch) {
         fileAttached = fileMatch[1].trim();
         text = ''; 
      } else if (text.trim().match(/^.*\.(jpg|jpeg|png|webp|gif|mp4|avi|mov|webm|mp3|opus|ogg|m4a|wav|wa|was|pdf|docx|xlsx)$/i)) {
         // Some exports just list the filename
         fileAttached = text.trim();
         text = '';
      } else if (text.includes('<Media omitted>')) {
         text = 'Media omitted';
         fileAttached = null;
      }

      let isEdited = false;
      if (text.includes('<This message was edited>')) {
         isEdited = true;
         text = text.replace('<This message was edited>', '').trim();
      } else if (text.match(/\s+\(edited\)$/i)) {
         isEdited = true;
         text = text.replace(/\s+\(edited\)$/i, '').trim();
      }

      let isDeleted = false;
      if (text === 'This message was deleted' || text === 'You deleted this message' || text === 'This message was deleted.' || text === 'You deleted this message.') {
         isDeleted = true;
      }

      currentMessage = {
        id: messages.length + 1,
        date,
        time: time.replace('\u202f', ' '),
        sender: sender.trim(),
        text,
        file: fileAttached,
        isSystem: false,
        isEdited,
        isDeleted
      };
    } else {
      let cleanSysLine = line.replace(/[\u200E\u200F\u202A-\u202E]/g, '');
      const sysMatch = cleanSysLine.match(systemRegex);
      if (sysMatch) {
         if (currentMessage) {
            messages.push(currentMessage);
         }
         currentMessage = {
            id: messages.length + 1,
            date: sysMatch[1],
            time: sysMatch[2].replace('\u202f', ' '),
            sender: 'System',
            text: sysMatch[3].trim(),
            isSystem: true
         };
      } else if (currentMessage) {
        // Multiline message continuation
        currentMessage.text += (currentMessage.text ? '\n' : '') + line.replace('\r', '');
      }
    }
  }

  if (currentMessage) {
    messages.push(currentMessage);
  }

  // Globally Deduplicate messages common in multi-part merged exports
  const deduplicatedMessages = [];
  const seenSignatures = new Set();
  
  for (const msg of messages) {
     let signature;
     if (msg.file && !msg.text && !msg.isSystem) {
        signature = `FILE|${msg.date}|${msg.sender}|${msg.file}`;
     } else {
        signature = `TEXT|${msg.date}|${msg.time}|${msg.sender}|${msg.text}|${msg.file}`;
     }
     
     if (seenSignatures.has(signature)) {
        continue; // Skip absolute global duplicate
     }
     seenSignatures.add(signature);
     deduplicatedMessages.push(msg);
  }

  // Remap IDs tightly
  return deduplicatedMessages.map((m, i) => ({ ...m, id: i + 1 }));
}
