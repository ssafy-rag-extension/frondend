import { useState } from 'react';
import { SendHorizonal } from 'lucide-react';

type Props = {
  onSend: (msg: string) => void;
};

export default function ChatInput({ onSend }: Props) {
  const [text, setText] = useState('');

  const send = () => {
    const content = text.trim();
    if (!content) return;
    onSend(content);
    setText('');
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') send();
  };

  return (
    <div className="flex flex-col items-center w-full gap-4">
      <div className="w-full max-w-[75%]">
        <div className="rounded-full p-[1px] bg-gradient-to-r from-[#BE7DB1] to-[#81BAFF] shadow-sm">
          <div className="flex items-center rounded-full bg-white px-3 py-2">
            <input
              className="flex-1 text-base border-none text-black placeholder-gray-400 
                   focus:outline-none focus:ring-0 focus:border-none"
              placeholder="레티나 챗봇에게 무엇이든 물어보세요."
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={onKeyDown}
            />
            <button
              className="w-9 h-9 flex items-center justify-center rounded-full 
                   bg-gradient-to-br from-[#BE7DB1] to-[#81BAFF]"
              onClick={send}
            >
              <SendHorizonal size={18} className="text-white" />
            </button>
          </div>
        </div>
      </div>

      <p className="text-sm text-gray-500">레티나 챗봇은 업로드 된 문서를 기반으로 답변합니다.</p>
    </div>
  );
}
