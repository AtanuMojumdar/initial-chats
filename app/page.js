import { parseChatFile } from '@/utils/chatParser';
import ChatContainer from './components/ChatContainer';

export default async function Page() {
  const messages = await parseChatFile();

  return (
    <div className="wa-container">
      <ChatContainer messages={messages} />
    </div>
  );
}
